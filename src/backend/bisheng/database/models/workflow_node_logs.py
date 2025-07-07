from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime
from enum import IntEnum

from sqlalchemy import Column, DateTime, Text, JSON, func, text, and_, or_
from sqlmodel import Field, select, Session
from sqlalchemy.exc import IntegrityError

from bisheng.database.base import session_getter
from bisheng.database.models.base import SQLModelSerializable


class LogType(IntEnum):
    NORMAL = 0  # 普通日志
    DEBUG = 1  # 调试日志
    WARNING = 2  # 警告日志
    ERROR = 3  # 错误日志
    SYSTEM = 4  # 系统日志


class WorkflowNodeLogBase(SQLModelSerializable):
    flow_id: str = Field(index=True, description='工作流ID')
    chat_id: str = Field(index=True, description='会话ID')
    log_type: int = Field(default=0, description='日志类型')
    logs: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON), description='JSON格式的日志内容')
    node_id: Optional[str] = Field(default=None, index=True, description='节点ID')
    node_name: Optional[str] = Field(default=None, index=True, description='节点名称')
    create_time: Optional[datetime] = Field(default=None, sa_column=Column(
        DateTime, nullable=False, index=True, server_default=text('CURRENT_TIMESTAMP')))
    update_time: Optional[datetime] = Field(default=None,
                                            sa_column=Column(DateTime,
                                                             nullable=False,
                                                             server_default=text('CURRENT_TIMESTAMP'),
                                                             onupdate=text('CURRENT_TIMESTAMP')))


class WorkflowNodeLog(WorkflowNodeLogBase, table=True):
    __tablename__ = "workflow_node_logs"
    id: UUID = Field(default_factory=uuid4, primary_key=True, unique=True)


class WorkflowNodeLogDao:
    @classmethod
    def insert_one(cls, data: WorkflowNodeLog) -> Optional[WorkflowNodeLog]:
        """插入单条记录"""
        with session_getter() as session:
            try:
                session.add(data)
                session.commit()
                session.refresh(data)
                return data
            except IntegrityError:
                session.rollback()
                return None

    @classmethod
    def get_by_id(cls, id: UUID) -> Optional[WorkflowNodeLog]:
        """通过ID获取记录"""
        with session_getter() as session:
            return session.get(WorkflowNodeLog, id)

    @classmethod
    def get_by_flow_id(cls, flow_id: str) -> List[WorkflowNodeLog]:
        """通过flow_id获取记录列表"""
        with session_getter() as session:
            statement = select(WorkflowNodeLog).where(WorkflowNodeLog.flow_id == flow_id)
            return session.exec(statement).all()

    @classmethod
    def get_by_chat_id(cls, chat_id: str) -> List[WorkflowNodeLog]:
        """通过chat_id获取记录列表"""
        with session_getter() as session:
            statement = select(WorkflowNodeLog).where(WorkflowNodeLog.chat_id == chat_id)
            return session.exec(statement).all()

    @classmethod
    def get_by_node_id(cls, node_id: str) -> List[WorkflowNodeLog]:
        """通过node_id获取记录列表"""
        with session_getter() as session:
            statement = select(WorkflowNodeLog).where(WorkflowNodeLog.node_id == node_id)
            return session.exec(statement).all()

    @classmethod
    def get_by_log_type(cls, log_type: LogType) -> List[WorkflowNodeLog]:
        """通过log_type获取记录列表"""
        with session_getter() as session:
            statement = select(WorkflowNodeLog).where(WorkflowNodeLog.log_type == log_type)
            return session.exec(statement).all()

    @classmethod
    def update_by_id(cls, id: UUID, update_data: Dict[str, Any]) -> bool:
        """通过ID更新记录"""
        with session_getter() as session:
            record = session.get(WorkflowNodeLog, id)
            if not record:
                return False

            for key, value in update_data.items():
                if hasattr(record, key):
                    setattr(record, key, value)

            try:
                session.commit()
                session.refresh(record)
                return True
            except IntegrityError:
                session.rollback()
                return False

    @classmethod
    def delete_by_id(cls, id: UUID) -> bool:
        """通过ID删除记录"""
        with session_getter() as session:
            record = session.get(WorkflowNodeLog, id)
            if not record:
                return False

            session.delete(record)
            session.commit()
            return True

    @classmethod
    def delete_by_flow_id(cls, flow_id: str) -> int:
        """通过flow_id删除记录"""
        with session_getter() as session:
            statement = select(WorkflowNodeLog).where(WorkflowNodeLog.flow_id == flow_id)
            records = session.exec(statement).all()

            count = len(records)
            for record in records:
                session.delete(record)

            session.commit()
            return count

    @classmethod
    def get_latest_logs(cls, limit: int = 10) -> List[WorkflowNodeLog]:
        """获取最新的日志记录"""
        with session_getter() as session:
            statement = select(WorkflowNodeLog).order_by(WorkflowNodeLog.create_time.desc()).limit(limit)
            return session.exec(statement).all()

    @classmethod
    def count_by_flow_id(cls, flow_id: str) -> int:
        """统计指定flow_id的记录数量"""
        with session_getter() as session:
            statement = select(func.count(WorkflowNodeLog.id)).where(WorkflowNodeLog.flow_id == flow_id)
            return session.exec(statement).one()