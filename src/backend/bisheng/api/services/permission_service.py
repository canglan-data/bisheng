import json

from bisheng.api.services.user_service import UserPayload
from bisheng.database.base import session_getter
from loguru import logger
from bisheng.database.models.config import ConfigDao, Config, ConfigKeyEnum
from bisheng.database.models.user_group import UserGroup, UserGroupDao
from bisheng.database.models.group import GroupDao
from bisheng.database.models.role import Role, UserRole
from bisheng.database.models.role_position import RolePositionDao, RolePosition
from typing import List
from sqlmodel import Field, select, update, func, Column, DateTime, delete, text


class PermissionService:

    @staticmethod
    def get_all_position_list() -> list:
        """
        获取所有的职位列表
        """
        position_list = []
        with session_getter() as session:
            statement = text("select distinct(u.position) as position from user as u where u.position != '';")
            result = session.exec(statement)

            for d in result:
                position_list.append(d.position)

        position_list = sorted(position_list, key=len, reverse=True)
        return position_list


    @staticmethod
    def set_group_admin_position_dict(position_map: dict):
        """
        设置组管理员关联职位
        {"职位":True|False,...}
        """
        all_list = PermissionService.get_all_position_list()
        new_position_map = {}
        for p in all_list:
            new_position_map[p] = position_map.get(p, False)

        config_obj = Config()
        config_obj.key = ConfigKeyEnum.GROUP_ADMIN_POSITION.value
        config_obj.value = json.dumps(new_position_map, ensure_ascii=False)
        return ConfigDao.insert_or_update(config_obj)


    @staticmethod
    def get_group_admin_position_dict(is_from_api: bool = False) -> dict:
        """
        获取组管理员职位设置
        {"职位":True|False,...}
        """
        db_map = {}
        config_obj = ConfigDao.get_config(ConfigKeyEnum.GROUP_ADMIN_POSITION)
        if config_obj:
            db_map = json.loads(config_obj.value)

        if is_from_api:
            # API设置页，填充全部职位，因为职位可能已经增加
            all_list = PermissionService.get_all_position_list()
            new_position_map = {}
            for position in all_list:
                new_position_map[position] = db_map.get(position, False)

            db_map = new_position_map

        return db_map


    @staticmethod
    def get_position_linked_group_admin_dict(user_id: int = None):
        """
        获取职位关联的管理员字典
        user_id：当前用户通过职位成为了哪些组的管理员
        """
        position_map = PermissionService.get_group_admin_position_dict()
        if not position_map:
            return {}

        position_list = []
        for position in position_map.keys():
            if position_map.get(position):
                position_list.append(position)

        if not position_list:
            return {}

        group_dict = {}

        with session_getter() as session:
            sql = """select u.user_id,u.user_name,u.position,ug.group_id,g.group_name,g.parent_id,g.`level` from user as u 
                            LEFT JOIN usergroup as ug on u.user_id = ug.user_id 
                            LEFT JOIN `group` as g on ug.group_id = g.id 
                            where ug.is_group_admin = 0 and u.position in :position_list"""

            if user_id:
                sql += f" and u.user_id = {user_id}"

            statement = text(sql)
            result = session.exec(statement, params={"position_list": position_list})

            for d in result:
                data = d._asdict()
                if data['group_id'] not in group_dict:
                    group_dict[data['group_id']] = {
                        "group_id": data.get('group_id'),
                        "group_name": data.get('group_name'),
                        "parent_id": data.get('parent_id'),
                        "admin_dict": {}
                    }

                group_dict[data['group_id']]['admin_dict'][data.get("user_id")] = {
                    "user_id": data.get("user_id"),
                    "user_name": data.get("user_name"),
                    "position": data.get("position")
                }
        return group_dict

    @staticmethod
    def get_manage_user_group(user_id: int) -> List[UserGroup]:
        """
        获取管理的用户组
        """
        # 手动指定的管理员
        added_group_id_dict = {}
        group_ids = []
        with session_getter() as session:
            statement = select(UserGroup).where(UserGroup.user_id == user_id).where(UserGroup.is_group_admin == 1)
            result = list(session.exec(statement).all())

            for ug in result:
                added_group_id_dict[ug.group_id] = True
                group_ids.append(ug.group_id)

        # 职位直接赋予的管理员
        group_dict = PermissionService.get_position_linked_group_admin_dict(user_id=user_id)
        if group_dict:
            group_ids += list(group_dict.keys())

        # 也可以管理下级组织
        if group_ids:
            sub_groups = GroupDao.get_all_child_groups_by_id(group_ids=group_ids)
            for g in sub_groups:
                group_ids.append(g.id)

            for group_id in group_ids:
                # 手动添加过的就忽略
                if group_id not in added_group_id_dict:
                    user_group = UserGroup(user_id=user_id, group_id=group_id)
                    user_group.is_group_admin = True
                    result.append(user_group)

        return result

    @staticmethod
    def get_manage_user_group_ids(user_id: int) -> list[int]:
        """
        获取管理的用户组ID列表
        """
        result = []
        user_group_list = PermissionService.get_manage_user_group(user_id=user_id)
        for ug in user_group_list:
            result.append(ug.group_id)

        return list(set(result))

    @staticmethod
    def get_manage_role_ids(user_id: int, manage_group_ids: list[int] = None) -> list[int]:
        from bisheng.database.models.role import DefaultRole
        if not manage_group_ids:
            manage_group_ids = PermissionService.get_manage_user_group_ids(user_id)

        if not manage_group_ids:
            return []

        role_ids = []
        with session_getter() as session:
            sql = """select r.id from role as r
                                    LEFT JOIN role_position as rp on r.id = rp.role_id 
                                    where r.id > :default_role_id and (r.group_id in :group_ids or rp.group_id in :group_ids)"""

            statement = text(sql)
            result = session.exec(statement, params={"default_role_id": DefaultRole, "group_ids": manage_group_ids})

            for d in result:
                role_ids.append(d.id)

        return list(set(role_ids))

    @staticmethod
    def get_group_position_count_dict(group_ids: list[int]):
        """
        获取用户组下职位信息统计字典
        """
        group_dict = {}
        with session_getter() as session:
            sql = """select u.user_id,u.user_name,u.position,ug.group_id,g.group_name,g.parent_id,g.`level` from user as u 
                            LEFT JOIN usergroup as ug on u.user_id = ug.user_id 
                            LEFT JOIN `group` as g on ug.group_id = g.id 
                            where ug.is_group_admin = 0 and u.position != ''"""

            if group_ids:
                sql += f" and g.id in :group_ids"

            statement = text(sql)
            result = session.exec(statement, params={"group_ids": group_ids})

            for d in result:
                data = d._asdict()
                group_id = data['group_id']
                position = data['position']
                if group_id not in group_dict:
                    group_dict[group_id] = {}

                if position not in group_dict[group_id]:
                    group_dict[group_id][position] = 0

                group_dict[group_id][position] += 1

            for group_id in group_dict.keys():
                position_count = group_dict[group_id]
                group_dict[group_id] = dict(sorted(position_count.items(), key=lambda item: len(item[0]), reverse=True))

            return group_dict

    @staticmethod
    def get_manage_resource_group_ids(user: UserPayload, include_from_root_group: bool = True):
        """
        获取当前管理员在访问管理资源时，使用的group_ids范围
        include_from_root_group: 将当前管理的组升级为根目录
        """
        if user.is_admin():
            all_group = GroupDao.get_all_group()
            group_ids = [g.id for g in all_group]
        else:
            group_ids = PermissionService.get_manage_user_group_ids(user_id=user.user_id)
            if group_ids and include_from_root_group:
                root_codes = set()  # 保存全部根目录code
                groups = GroupDao.get_group_by_ids(group_ids)
                for g in groups:
                    root_codes.add(g.code.split('|')[0])

                new_group_ids = []
                # 根目录下的所有用户组
                all_group = GroupDao.get_all_group()
                for g in all_group:
                    code = g.code.split('|')[0]
                    if code in root_codes:  # 同一根目录
                        new_group_ids.append(g.id)

                # logger.debug(f'jjxx get_group_resource_group_ids user:{user.user_name} group_ids:{group_ids} root_codes:{root_codes} new_group_ids:{new_group_ids}')
                group_ids = new_group_ids

        # logger.debug(f'jjxx get_group_resource_group_ids user:{user.user_name} group_ids:{group_ids}')

        return group_ids

    @staticmethod
    def update_role_group_positions(user: UserPayload, role: Role, group_positions: dict):
        insert = []
        if user.is_admin():
            for group_id, positions in group_positions.items():
                for position in positions:
                    role_position = RolePosition(role_id=role.id, group_id=group_id, position=position)
                    insert.append(role_position)

            RolePositionDao.delete([role.id])  # 先删再插入
        else:
            user_admin_group = PermissionService.get_manage_user_group(user.user_id)
            group_ids = [ug.group_id for ug in user_admin_group]
            if not group_ids:
                raise ValueError('当前管理员未管理任何组')

            for group_id, positions in group_positions.items():
                if int(group_id) in group_ids:  # 当前管理员有权限的组
                    for position in positions:
                        role_position = RolePosition(role_id=role.id, group_id=group_id, position=position)
                        insert.append(role_position)

            if not insert:
                raise ValueError('未找到可关联的职位')

            RolePositionDao.delete([role.id], group_ids)  # 先删再插入

        for role_position in insert:
            RolePositionDao.insert(role_position)

    @staticmethod
    def get_role_group_positions(role_ids: list[int]):
        if not role_ids:
            return {}

        all_group_dict = GroupDao.get_all_group_dict()
        role_position_dict = {}
        role_group_dict = {}
        with session_getter() as session:
            sql = """select r.id,r.group_id,rp.group_id as linked_group_id,rp.position from role as r
                                            LEFT JOIN role_position as rp on r.id = rp.role_id 
                                            where r.id in :role_ids"""

            statement = text(sql)
            result = session.exec(statement, params={"role_ids": role_ids})

            for d in result:
                if d.position:
                    if d.id not in role_position_dict:
                        role_position_dict[d.id] = []
                    role_position_dict[d.id].append(d.position)

                for group_id in [d.group_id, d.linked_group_id]:
                    if group_id:
                        if d.id not in role_group_dict:
                            role_group_dict[d.id] = {}

                        group = all_group_dict.get(group_id)
                        if group:
                            role_group_dict[d.id][group_id] = group

            for role_id, positions in role_position_dict.items():
                position_list = list(set(positions))
                position_list = sorted(position_list, key=len, reverse=True)
                role_position_dict[role_id] = position_list

            for role_id, group_dict in role_group_dict.items():
                role_group_dict[role_id] = list(group_dict.values())

        return role_group_dict, role_position_dict

    @staticmethod
    def get_role_ids_by_group(group_ids: list[int]):
        if not group_ids:
            return []

        result = []
        with session_getter() as session:
            sql = """select r.id,r.group_id,rp.group_id as linked_group_id,rp.position from role as r
                                            LEFT JOIN role_position as rp on r.id = rp.role_id 
                                            """

            sql += " where r.group_id in :group_ids or rp.group_id in :group_ids"

            statement = text(sql)
            result2 = session.exec(statement, params={"group_ids": group_ids})

            for d in result2:
                result.append(d.id)

        return list(set(result))

    @staticmethod
    def get_group_role_count_dict(group_ids: list[int]):
        count_dict = {}
        with session_getter() as session:
            sql = """select r.id,r.group_id,rp.group_id as linked_group_id,rp.position from role as r
                                            LEFT JOIN role_position as rp on r.id = rp.role_id 
                                            """

            if group_ids:
                sql += " where r.group_id in :group_ids or rp.group_id in :group_ids"

            statement = text(sql)
            result = session.exec(statement, params={"group_ids": group_ids})

            for d in result:
                for group_id in [d.group_id, d.linked_group_id]:
                    if group_id:
                        if group_id not in count_dict:
                            count_dict[group_id] = []

                        count_dict[group_id].append(d.id)

            for group_id, role_id_list in count_dict.items():
                count_dict[group_id] = len(list(set(role_id_list)))

        return count_dict

    @staticmethod
    def get_position_role_count_dict(role_ids: list[int] = []):
        count_dict = {}
        with session_getter() as session:
            where = ""
            if role_ids:
                where = " where role_id in :role_ids"

            sql = f"select position,count(distinct(role_id)) as num from role_position {where} group by position"

            statement = text(sql)
            result = session.exec(statement, params={"role_ids": role_ids})

            for d in result:
                count_dict[d.position] = d.num

            count_dict = dict(sorted(count_dict.items(), key=lambda item: len(item[0]), reverse=True))

        return count_dict

    @staticmethod
    def get_manage_user_ids(admin_user_id: int, manage_group_ids: list[int] = None):
        if manage_group_ids is None:
            manage_group_ids = PermissionService.get_manage_user_group_ids(admin_user_id)

        if not manage_group_ids:
            return []

        user_ids = UserGroupDao.get_groups_user(group_ids=manage_group_ids)
        return user_ids

    @staticmethod
    def get_position_user_count_dict(user_ids: list[int] = []):
        count_dict = {}
        with session_getter() as session:
            where = ""
            if user_ids:
                where = " and user_id in :user_ids"

            sql = f"select position,count(distinct(user_id)) as num from user where position != '' {where} group by position"

            statement = text(sql)
            result = session.exec(statement, params={"user_ids": user_ids})

            for d in result:
                count_dict[d.position] = d.num

            count_dict = dict(sorted(count_dict.items(), key=lambda item: len(item[0]), reverse=True))

        return count_dict

    @staticmethod
    def get_role_user_linked_list(role_ids: list[int] = [], user_ids: list[int] = []) -> list[dict]:
        with session_getter() as session:
            # 职位赋予的角色
            sql1 = """select 'position' as source,rp.group_id,rp.role_id,r.role_name,u.* from role_position rp
	left JOIN role r on rp.role_id = r.id
	left JOIN usergroup ug on ug.group_id = rp.group_id
	left JOIN `user` u on u.user_id = ug.user_id and u.position = rp.position
	where ug.is_group_admin = 0 and u.position != ''"""

            if user_ids:
                sql1 += " and u.user_id in :user_ids"

            if role_ids:
                sql1 += " and rp.role_id in :role_ids"

            sql2 = """select 'user_role' as source,0 as group_id,r.id as role_id,r.role_name,u.* from userrole ur
	left JOIN role r on ur.role_id = r.id
	left JOIN `user` u on u.user_id = ur.user_id
	where r.id > 0"""

            if user_ids:
                sql2 += " and u.user_id in :user_ids"

            if role_ids:
                sql2 += " and ur.role_id in :role_ids"

            statement = text(f" {sql1} UNION ALL {sql2}")

            result = session.exec(statement, params={"role_ids": role_ids, "user_ids": user_ids})
            result2 = [d._asdict() for d in result]

            return result2

    @staticmethod
    def get_role_user_count(role_ids: list[int] = [], user_ids: list[int] = []) -> dict:
        count_dict = {}

        result = PermissionService.get_role_user_linked_list(role_ids=role_ids, user_ids=user_ids)

        for d in result:
            if d['role_id'] not in count_dict:
                count_dict[d['role_id']] = {
                    "role_id": d['role_id'],
                    "role_name": d['role_name'],
                    "user_ids": set()
                }

            count_dict[d['role_id']]['user_ids'].add(d['user_id'])

        return count_dict

    @staticmethod
    def get_user_role_dict(role_ids: list[int] = [], user_ids: list[int] = []) -> dict:
        result = PermissionService.get_role_user_linked_list(role_ids=role_ids, user_ids=user_ids)

        result_dict = {}
        for d in result:
            if d['user_id'] not in result_dict:
                result_dict[d['user_id']] = {}

            result_dict[d['user_id']][d['role_id']] = {
                "id": d['role_id'],
                "name": d['role_name'],
                "group_id": d['group_id']
            }

        for user_id, role_dict in result_dict.items():
            result_dict[user_id] = list(role_dict.values())

        return result_dict

    @staticmethod
    def get_user_roles(user_id: int) -> list[UserRole]:
        result = PermissionService.get_user_role_dict(user_ids=[user_id])
        if not result:
            return []

        data = []
        roles = result.get(user_id, [])
        for role in roles:
            data.append(UserRole(user_id=user_id, role_id=role['id']))

        return data

    @staticmethod
    def get_user_role_ids(user_id: int) -> list[int]:
        user_roles = PermissionService.get_user_roles(user_id)
        return [ur.role_id for ur in user_roles]

    @staticmethod
    def get_group_user_linked_list(group_ids: list[int] = [], user_ids: list[int] = []) -> list[dict]:
        with session_getter() as session:
            sql2 = """select ug.user_id,ug.group_id,g.* from usergroup ug
        	left JOIN `group` g on ug.group_id = g.id
        	where ug.is_group_admin = 0 and g.id > 0"""

            if user_ids:
                sql2 += " and ug.user_id in :user_ids"

            if group_ids:
                sql2 += " and g.id in :group_ids"

            statement = text(sql2)

            result = session.exec(statement, params={"group_ids": group_ids, "user_ids": user_ids})
            result2 = [d._asdict() for d in result]

            return result2


    @staticmethod
    def get_user_group_dict(group_ids: list[int] = [], user_ids: list[int] = []) -> dict:
        result = PermissionService.get_group_user_linked_list(group_ids=group_ids, user_ids=user_ids)

        result_dict = {}
        for d in result:
            if d['user_id'] not in result_dict:
                result_dict[d['user_id']] = {}

            result_dict[d['user_id']][d['group_id']] = {
                "id": d['group_id'],
                "name": d['group_name'],
            }

        for user_id, group_dict in result_dict.items():
            result_dict[user_id] = list(group_dict.values())

        return result_dict