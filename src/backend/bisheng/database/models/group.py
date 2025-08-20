from datetime import datetime
from typing import Dict, List, Optional, Any

from sqlmodel import Field, select, Column, DateTime, delete, text, update, or_

from bisheng.database.base import session_getter
from bisheng.database.models.base import SQLModelSerializable

# 默认部门的ID
DefaultGroup = 2


class GroupBase(SQLModelSerializable):
    id: Optional[int] = Field(default=None, primary_key=True)
    parent_id: int = Field(default=0, index=True, description='父级部门ID')
    code: Optional[str] = Field(default=None, index=True, unique=True,
                                description='部门路径，从根节点到当前节点的code路径')
    level: Optional[int] = Field(default=0, index=True, description='部门层级')
    third_id: Optional[str] = Field(default='', index=True, description='第三方部门唯一标识。例如对应到企微里的部门ID')
    group_name: str = Field(index=False, description='前端展示名称', unique=True)
    remark: Optional[str] = Field(default=None, index=False)
    create_user: Optional[int] = Field(default=None, index=True, description="创建用户的ID")
    update_user: Optional[int] = Field(default=None, description="更新用户的ID")
    create_time: Optional[datetime] = Field(default=None, sa_column=Column(
        DateTime, nullable=False, index=True, server_default=text('CURRENT_TIMESTAMP')))
    update_time: Optional[datetime] = Field(default=None,
        sa_column=Column(DateTime,
                         nullable=False,
                         server_default=text('CURRENT_TIMESTAMP'),
                         onupdate=text('CURRENT_TIMESTAMP')))


class Group(GroupBase, table=True):
    # id = 2 表示默认部门
    pass


class GroupRead(GroupBase):
    id: Optional[int] = None
    group_admins: Optional[List[Dict]] = None
    group_operations: Optional[List[Dict]] = []
    group_audits: Optional[List[Dict]] = []

    # 记录从根节点到当前节点的name路径  a/b/c
    parent_group_path: Optional[str] = ''

    # 当前部门下职位的统计信息 {"职位名": 职位下的用户数}
    position_count: Optional[dict] = {}
    role_count: Optional[int] = 0

    # 子部门
    children: Optional[List[Any]] = []


class GroupUpdate(GroupBase):
    role_name: Optional[str] = None
    remark: Optional[str] = None


class GroupCreate(GroupBase):
    group_admins: Optional[List[int]] = None
    group_operations: Optional[List[int]] = []
    group_audits: Optional[List[int]] = []


class GroupDao(GroupBase):

    @staticmethod
    def generate_group_code(parent_code: str, group_id: int) -> str:
        """
        parent_code: 表示父部门的code
        current_level_code: 表示当前部门所在层级的最新code
         001: 代表第一层级的第一个部门
         001|001: 代表第二层级的第一个部门，且父部门属于编码为A1的部门
        """
        if parent_code:
            return f'{parent_code}|{group_id:0>3}'
        else:
            return f'{group_id:0>3}'

    @staticmethod
    def parse_parent_code(group_code: str) -> List[str]:
        """ 解析出父部门的code """
        code_list = group_code.split('|')
        if len(code_list) == 1:
            return []
        res = []
        prev = ''
        for one in code_list[:-1]:
            prev = f'{prev}|{one}' if prev else one
            res.append(prev)
        return res

    @classmethod
    def get_user_group(cls, group_id: int) -> Group | None:
        with session_getter() as session:
            statement = select(Group).where(Group.id == group_id)
            return session.exec(statement).first()

    @classmethod
    def insert_group(cls, group: GroupCreate) -> Group:
        """ 插入部门，设置部门的code和层级 """
        with session_getter() as session:
            group_add = Group.validate(group)

            # 判断所属的父部门
            parent_group_code = ""
            if group.parent_id != 0:
                parent_group = session.exec(select(Group).where(Group.id == group.parent_id)).first()
                if not parent_group:
                    raise ValueError('父级部门不存在')
                group_add.level = parent_group.level + 1
                parent_group_code = parent_group.code
            else:
                group_add.level = 0

            # 先插入获取部门ID
            session.add(group_add)
            session.commit()
            session.refresh(group_add)

            # 设置部门的code
            group_add.code = cls.generate_group_code(parent_group_code, group_add.id)
            session.add(group_add)
            session.commit()
            session.refresh(group_add)
            return group_add

    @classmethod
    def get_all_group(cls) -> list[Group]:
        with session_getter() as session:
            statement = select(Group).order_by(Group.update_time.desc())
            return session.exec(statement).all()

    @classmethod
    def get_all_group_dict(cls) -> dict:
        result = {}
        all_group = GroupDao.get_all_group()
        for g in all_group:
            result[g.id] = g

        return result

    @classmethod
    def get_group_by_ids(cls, ids: List[int]) -> list[Group]:
        if not ids:
            raise ValueError('ids is empty')
        with session_getter() as session:
            statement = select(Group).where(Group.id.in_(ids)).order_by(Group.update_time.desc())
            return session.exec(statement).all()

    @classmethod
    def delete_group(cls, group_id: int):
        with session_getter() as session:
            session.exec(delete(Group).where(Group.id == group_id))
            session.commit()

    @classmethod
    def delete_groups(cls, group_ids: List[int]):
        with session_getter() as session:
            session.exec(delete(Group).where(Group.id.in_(group_ids)))
            session.commit()

    @classmethod
    def update_group(cls, group: Group) -> Group:
        with session_getter() as session:
            session.add(group)
            session.commit()
            session.refresh(group)
            return group

    @classmethod
    def update_parent_group(cls, group: Group, parent_group: Group):
        """ 切换父部门 """
        group.parent_id = parent_group.id
        group.level = parent_group.level + 1
        group.code = cls.generate_group_code(parent_group.code, group.id)
        with session_getter() as session:
            session.add(group)
            session.commit()
            session.refresh(group)
        # 递归更新子部门的code
        child_groups = cls.get_child_groups_by_id(group.id)
        for one in child_groups:
            cls.update_parent_group(one, group)
        return group

    @classmethod
    def update_groups(cls, groups: List[Group]) -> List[Group]:
        with session_getter() as session:
            session.add_all(groups)
            session.commit()
            return groups

    @classmethod
    def update_group_update_user(cls, group_id: int, user_id: int):
        """ 提供给闭源模块 """
        with session_getter() as session:
            statement = update(Group).where(Group.id == group_id).values(update_user=user_id,
                                                                         update_time=datetime.now())
            session.exec(statement)
            session.commit()

    @classmethod
    def get_child_groups(cls, group_code: str, level: int = None) -> list[Group]:
        """ 获取指定部门的子部门 """
        statement = select(Group).where(Group.code.like(f'{group_code}|%'))
        if level:
            statement = statement.where(Group.level == level)
        statement = statement.order_by(Group.id.asc())
        with session_getter() as session:
            return session.exec(statement).all()

    @classmethod
    def get_all_child_groups_by_id(cls, group_ids: list[int]) -> List[Group]:
        """ 根据部门ID列表 获取指定部门的所有子部门 """
        groups_info = cls.get_group_by_ids(group_ids)
        statement = select(Group)
        or_list = []
        for one in groups_info:
            or_list.append(Group.code.like(f'{one.code}|%'))
        if not or_list:
            return []
        statement = statement.where(or_(*or_list))
        with session_getter() as session:
            return session.exec(statement).all()

    @classmethod
    def get_child_groups_by_id(cls, group_id: int) -> list[Group]:
        """ 获取指定部门的直接子部门 """
        with session_getter() as session:
            statement = select(Group).where(Group.parent_id == group_id)
            return session.exec(statement).all()

    @classmethod
    def get_parent_groups(cls, group_code: str, level: int = None) -> List[Group]:
        """ 获取指定部门的父部门 """
        parent_group_code = cls.parse_parent_code(group_code)
        if not parent_group_code:
            return []
        statement = select(Group).where(Group.code.in_(parent_group_code))
        if level:
            statement = statement.where(Group.level == level)
        statement = statement.order_by(Group.id.asc())
        with session_getter() as session:
            return session.exec(statement).all()

    @classmethod
    def get_parent_groups_by_ids(cls, group_ids: list[int], level: int = None) -> List[Group]:
        """ 获取指定部门的父部门 """
        if not group_ids:
            return []
        statement = select(Group).where(Group.id.in_(group_ids))
        if level:
            statement = statement.where(Group.level == level)
        statement = statement.order_by(Group.id.asc())
        with session_getter() as session:
            all_groups = session.exec(statement).all()
            if not all_groups:
                return []
            # 获取所有的父部门的code
            parent_group_code = []
            for one in all_groups:
                parent_group_code.extend(cls.parse_parent_code(one.code))
            parent_group_code = list(set(parent_group_code))
            if not parent_group_code:
                return []
            # 获取所有的父部门
            return session.exec(select(Group).where(Group.code.in_(parent_group_code))).all()

    @classmethod
    def get_group_by_code(cls, group_code: str) -> Group | None:
        with session_getter() as session:
            statement = select(Group).where(Group.code == group_code)
            return session.exec(statement).first()

    @classmethod
    def get_group_by_third_id(cls, third_id: str):
        with session_getter() as session:
            statement = select(Group).where(Group.third_id == third_id)
            return session.exec(statement).first()
