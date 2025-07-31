import io
import json
from datetime import datetime, timedelta

from bisheng.api.v1.schema.send_mail import VitalOrgStatsConfig
from bisheng.database.models.config import ConfigDao, ConfigKeyEnum
from bisheng.utils.email_client import EmailClient
from bisheng.database.models.user_group import UserGroupDao
from bisheng.database.models.group import GroupDao
from bisheng.database.models.message import ChatMessageDao
import pandas as pd
from loguru import logger


class VitalOrgStatsService:
    @classmethod
    def send(cls, date=None):
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
        group_user = UserGroupDao.get_groups_users(group_ids=group_ids)
        group_infos = GroupDao.get_group_by_ids(group_ids)
        all_user_id = [one.user_id for one in group_user]
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
        for user in group_user:
            if "total_user_num" not in ginfo_index[user.group_id]:
                ginfo_index[user.group_id]["total_user_num"] = 0
                ginfo_index[user.group_id]["total_chat_num"] = 0
                ginfo_index[user.group_id]["ok_user_num"] = 0
            ginfo_index[user.group_id]["total_user_num"] += 1
            ginfo_index[user.group_id]["total_chat_num"] += user_chat_num.get(user.user_id, 0)
            if user_chat_num.get(user.user_id, 0) >= config.min_qa_count:
                ginfo_index[user.group_id]["ok_user_num"] += 1
        df = pd.DataFrame.from_dict(ginfo_index, orient="index").reset_index(drop=True)
        df["用户组织架构"] = df["name"]
        df["使用覆盖率%"] = df["ok_user_num"] / df["total_user_num"].where(df["total_user_num"] != 0, 1) * 100
        df["人均AI次数"] = df["total_chat_num"] / df["total_user_num"].where(df["total_user_num"] != 0, 1)
        df = df[["用户组织架构", "使用覆盖率%", "人均AI次数"]]
        df.fillna(0, inplace=True)
        df["使用覆盖率%"] = df["使用覆盖率%"].apply(lambda x: f"{round(x, 2):.2f}%")
        df["人均AI次数"] = df["人均AI次数"].apply(lambda x: f"{round(x, 2):.2f}")

        file_name = f"HR活力组织提数报表{start_day.strftime('%Y-%m-%d')}至{end_day.strftime('%Y-%m-%d')}.xlsx"
        email_client = EmailClient(mail=str(config.sender_email), password=config.sender_password,
                                   msg_from=config.msg_from,
                                   server_host=config.smtp_host, server_port=config.smtp_port)
        email_client.set_title(f"HR活力组织提数报表{date.strftime('%Y-%m-%d')}")
        email_client.set_content(
            f"""各位领导好：\n    附件为{start_day.strftime('%Y-%m-%d')}至{end_day.strftime('%Y-%m-%d')}的“HR活力组织提数报表”，请注意查收。""")
        email_client.set_receiver([str(x) for x in config.recipient_emails])
        csv_buffer = io.BytesIO()
        df.to_excel(csv_buffer, index=False)
        csv_buffer.seek(0)
        email_client.add_file_obj(csv_buffer, file_name)
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
        }
        return json.dumps(logs)
