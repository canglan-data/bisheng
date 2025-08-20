from datetime import datetime
from typing import List, Optional

from sqlalchemy import Column, DateTime, text
from sqlmodel import Field, select, delete

from bisheng.database.base import session_getter
from bisheng.database.models.base import SQLModelSerializable


class RolePositionBase(SQLModelSerializable):
    role_id: int = Field(index=True)
    group_id: int = Field(index=True)
    position: str = Field(default='')
    create_time: Optional[datetime] = Field(default=None, sa_column=Column(
        DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP')))
    update_time: Optional[datetime] = Field(default=None, sa_column=Column(
        DateTime, nullable=False, index=True, server_default=text('CURRENT_TIMESTAMP'),
        onupdate=text('CURRENT_TIMESTAMP')))


class RolePosition(RolePositionBase, table=True):
    __tablename__ = 'role_position'
    id: Optional[int] = Field(default=None, primary_key=True)


class RolePositionDao:

    @classmethod
    def delete(cls, role_ids: list[int], group_ids: list[int] = None):
        with session_getter() as session:
            statement = delete(RolePosition).where(RolePosition.role_id.in_(role_ids))
            if group_ids:
                statement = statement.where(RolePosition.group_id.in_(group_ids))

            session.exec(statement)
            session.commit()

    @classmethod
    def select(cls, role_ids: List[int] = None, group_ids: list[int] = None, positions: list[str] = None) -> List[RolePosition]:
        with session_getter() as session:
            statement = select(RolePosition)
            if role_ids:
                statement = statement.where(RolePosition.role_id.in_(role_ids))
            if group_ids:
                statement = statement.where(RolePosition.group_id.in_(group_ids))
            if positions:
                statement = statement.where(RolePosition.position.in_(positions))
            return session.exec(statement).all()

    @classmethod
    def insert(cls, data: RolePosition):
        with session_getter() as session:
            session.add(data)
            session.commit()
            session.refresh(data)
            return data

    @classmethod
    def batch_insert(cls, data: list[RolePosition]) -> int:
        lines = []
        params = {}
        for i, rp in enumerate(data):
            lines.append(f"(:role_id_{i}, :group_id_{i}, :position_{i})")
            params[f"role_id_{i}"] = rp.role_id
            params[f"group_id_{i}"] = rp.group_id
            params[f"position_{i}"] = rp.position

        lines_str = ",".join(lines)
        sql = f"INSERT INTO role_position (role_id, group_id, position) VALUES {lines_str};"

        with session_getter() as session:
            statement = text(sql)
            result = session.exec(statement, params=params)
            session.commit()

        return result.rowcount