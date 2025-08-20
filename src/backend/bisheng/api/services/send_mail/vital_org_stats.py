import io
import json
from datetime import datetime, timedelta

from bisheng.api.v1.schema.send_mail import VitalOrgStatsConfig
from bisheng.database.models.config import ConfigDao, ConfigKeyEnum
from bisheng.database.models.user import UserDao
from bisheng.utils.email_client import EmailClient
from bisheng.database.models.user_group import UserGroupDao
from bisheng.database.models.group import GroupDao
from bisheng.database.models.message import ChatMessageDao
import pandas as pd
from loguru import logger


class VitalOrgStatsService:
    @classmethod
    def send(cls, date=None,debug=False):
        if date is None:
            date = datetime.now().date()
        ret = {}
        config = ConfigDao.get_config(ConfigKeyEnum.VITAL_ORG_STATS)
        if config:
            ret = json.loads(config.value)
        config = VitalOrgStatsConfig(**ret)
        if not config.should_execute_on_date(date):
            return

        start_day = date - timedelta(days=config.execution_interval_days)
        end_day = date - timedelta(days=1)
        group_ids = config.group_ids
        group_infos = GroupDao.get_group_by_ids(group_ids)
        # 统计范围不局限于本身组织和子组织，也包括子组织的子组织
        child_group_infos = {one:GroupDao.get_all_child_groups_by_id([one]) for one in group_ids}
        all_group_id = []  # 所有组织的id
        group_name = {}
        for g in group_infos:
            group_name[g.id] = g.group_name
        # 将子组织和服组织对应起来，父组织和自己对应
        group_root = {}  # 组织的根id
        for k,gl in child_group_infos.items():
            if k not in group_root:
                group_root[k] = []
            group_root[k].append(k)
            all_group_id.append(k)
            for g in gl:
                if g.id not in group_root:
                    group_root[g.id] = []
                group_name[g.id] = g.group_name
                all_group_id.append(g.id)
                group_root[g.id].append(k)
        all_group_id = list(set(all_group_id))
        # 注意此处一个用户可能属于多个组织
        group_user = UserGroupDao.get_groups_users(group_ids=all_group_id) # 获取所有组织，子组织的用户。
        all_user_id = [one.user_id for one in group_user]
        all_users_info,total = UserDao.filter_users(all_user_id, None, None, None)
        all_user_id = [one.user_id for one in all_users_info]
        group_user = [one for one in group_user if one.user_id in all_user_id]
        flow_ids = config.flow_ids
        messages = ChatMessageDao.get_msg_by_filter(user_ids=all_user_id, flow_ids=flow_ids, start_time=start_day,
                                                    end_time=date)
        messages.sort(key=lambda x: (x.user_id, x.flow_id, x.chat_id, x.create_time))
        user_chat_num = {}
        user_chat_status = {}
        for msg in messages:
            if msg.user_id not in user_chat_num:
                user_chat_num[msg.user_id] = 0
            key = f'{msg.user_id}_{msg.flow_id}_{msg.chat_id}'
            if msg.category == "question":
                user_chat_status[key] = 1
                continue
            if msg.category in ("answer", "stream_msg", "output_msg") and user_chat_status.get(key, 0) == 1:
                user_chat_num[msg.user_id] += 1
                user_chat_status[key] = 0
        ginfo_index = {g.id: {"name": g.group_name} for g in group_infos}
        group_includes_user = {}
        group_includes_user2 = {}
        for user in group_user:
            if user.user_id not in all_user_id:
                continue
            if user.group_id not in group_includes_user2:
                group_includes_user2[user.group_id] = []
            group_includes_user2[user.group_id].append(user.user_id)
            if user.group_id not in group_root:
                continue
            ugids = group_root[user.group_id]
            if user.group_id in config.group_ids:
                ugids.append(user.group_id)
            ugids = list(set(ugids))
            for ugid in ugids:
                if "member" not in ginfo_index[ugid]:
                    ginfo_index[ugid]["member"] = set()
                if user.user_id in ginfo_index[ugid]["member"]:
                    continue
                if ugid not in group_includes_user:
                    group_includes_user[ugid] = []
                group_includes_user[ugid].append(user.user_id)
                ginfo_index[ugid]["member"].add(user.user_id)
                if "total_user_num" not in ginfo_index[ugid]:
                    ginfo_index[ugid]["total_user_num"] = 0
                    ginfo_index[ugid]["total_chat_num"] = 0
                    ginfo_index[ugid]["ok_user_num"] = 0
                ginfo_index[ugid]["total_user_num"] += 1
                ginfo_index[ugid]["total_chat_num"] += user_chat_num.get(user.user_id, 0)
                if user_chat_num.get(user.user_id, 0) >= config.min_qa_count:
                    ginfo_index[ugid]["ok_user_num"] += 1
        df = pd.DataFrame.from_dict(ginfo_index, orient="index").reset_index(drop=True)
        df["用户组织架构"] = df["name"]
        df["使用覆盖率%"] = df["ok_user_num"] / df["total_user_num"].where(df["total_user_num"] != 0, 1) * 100
        df["人均AI次数"] = df["total_chat_num"] / df["total_user_num"].where(df["total_user_num"] != 0, 1)
        df.fillna(0, inplace=True)
        df["使用覆盖率%"] = df["使用覆盖率%"].apply(lambda x: f"{round(x, 2):.2f}%")
        df["人均AI次数"] = df["人均AI次数"].apply(lambda x: f"{round(x, 2):.2f}")
        df_s = df
        df = df[["用户组织架构", "使用覆盖率%", "人均AI次数"]]
        file_name = f"HR活力组织提数报表{start_day.strftime('%Y-%m-%d')}至{end_day.strftime('%Y-%m-%d')}.xlsx"
        email_client = EmailClient(mail=str(config.sender_email), password=config.sender_password,
                                   msg_from=config.msg_from,
                                   server_host=config.smtp_host, server_port=config.smtp_port,debug=debug)
        email_client.set_title(f"HR活力组织提数报表{date.strftime('%Y-%m-%d')}")
        email_client.set_content(
            f"""各位领导好：\n    附件为{start_day.strftime('%Y-%m-%d')}至{end_day.strftime('%Y-%m-%d')}的“HR活力组织提数报表”，请注意查收。""")
        email_client.set_receiver([str(x) for x in config.recipient_emails])
        csv_buffer = io.BytesIO()
        df.to_excel(csv_buffer, index=False)
        csv_buffer.seek(0)
        email_client.add_file_obj(csv_buffer, file_name)
        if debug:
            csv_buffer2 = io.BytesIO()
            df_s.to_excel(csv_buffer2)
            file_name = f"HR活力组织提数报表{start_day.strftime('%Y-%m-%d')}至{end_day.strftime('%Y-%m-%d')}_debug.xlsx"
            email_client.add_file_obj(csv_buffer2, file_name)
            csv_buffer3 = io.BytesIO()
            child_group = {}
            for k, v in group_root.items():
                for one in v:
                    if one not in child_group:
                        child_group[one] = set()
                    child_group[one].add(k)
            child_group_debug = {k: {"子组织":str(list(v)),"组织名称":group_name.get(k,"-")} for k, v in child_group.items()}
            pd.DataFrame(child_group_debug).T.to_excel(csv_buffer3)
            file_name = f"组织的子组织信息_debug.xlsx"
            email_client.add_file_obj(csv_buffer3, file_name)
            csv_buffer4 = io.BytesIO()
            user_chat_num_debug = {k: {"聊天次数":v} for k, v in user_chat_num.items()}
            pd.DataFrame(user_chat_num_debug).T.to_excel(csv_buffer4)
            file_name = f"用户的聊天次数信息_debug.xlsx"
            email_client.add_file_obj(csv_buffer4, file_name)
            csv_buffer5 = io.BytesIO()
            group_includes_user_debug = {k: {"成员":str(set(v)), "组织名称":group_name.get(k,"-")} for k, v in group_includes_user.items()}
            pd.DataFrame(group_includes_user_debug).T.to_excel(csv_buffer5)
            file_name = f"组织(包含子组织)的成员_debug.xlsx"
            email_client.add_file_obj(csv_buffer5, file_name)
            csv_buffer6 = io.BytesIO()
            group_includes_user2_debug = {k: {"成员":str(set(v)), "组织名称":group_name.get(k,"-")} for k, v in group_includes_user2.items()}
            pd.DataFrame(group_includes_user2_debug).T.to_excel(csv_buffer6)
            file_name = f"组织(不包含子组织)的成员_debug.xlsx"
            email_client.add_file_obj(csv_buffer6, file_name)
        success = email_client.send_mail()
        if not success:
            logger.warning(f"活力组织统计邮件发送失败，时间：{date}")
            raise Exception(f"活力组织统计邮件发送失败，时间：{date}")
        logs = {
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "sender_email": config.sender_email,
            "recipient_emails": config.recipient_emails,
            "file_name": file_name,
            "success": success,
            "user_chat_num": user_chat_num,
        }
        return json.dumps(logs)
