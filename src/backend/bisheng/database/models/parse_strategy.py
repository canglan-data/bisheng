from datetime import datetime
from typing import List, Optional, Dict
from sqlalchemy import JSON, func
from sqlmodel import Field, SQLModel, Column, DateTime, select, text, update
from bisheng.database.base import session_getter


class ParseStrategyBase(SQLModel):
    user_id: Optional[int] = Field(default=None, index=True)
    name: str = Field(min_length=1, max_length=50, description='名称')
    is_default: int = Field(default=0, description='是否默认')
    create_time: Optional[datetime] = Field(default=None, sa_column=Column(DateTime, nullable=False, server_default=text('CURRENT_TIMESTAMP')))
    update_time: Optional[datetime] = Field(default=None, sa_column=Column(DateTime, nullable=True, server_default=text('CURRENT_TIMESTAMP'), onupdate=text('CURRENT_TIMESTAMP')))


class ParseStrategy(ParseStrategyBase, table=True):
    __tablename__ = 'parse_strategy'
    id: Optional[int] = Field(default=None, primary_key=True)
    content: Optional[Dict] = Field(default=None, sa_column=Column(JSON), description='解析策略内容')
    is_delete: int = Field(default=0, description='是否删除')


class ParseStrategyRead(ParseStrategyBase):
    id: int
    user_name: Optional[str] = None

class ParseStrategyView(ParseStrategyBase):
    id: int
    user_name: Optional[str] = None
    content: Optional[Dict] = Field(default=None, sa_column=Column(JSON), description='解析策略内容')


class ParseStrategyUpdate(SQLModel):
    name: Optional[str] = None
    content: Optional[Dict] = None
    is_default: int = Field(default=0)


class ParseStrategyCreate(ParseStrategyBase):
    content: Optional[Dict] = Field(default=None, sa_column=Column(JSON), description='解析策略内容')


class ParseStrategyDao:
    @classmethod
    def insert_one(cls, data: ParseStrategy) -> ParseStrategy:
        with session_getter() as session:
            session.add(data)
            session.commit()
            session.refresh(data)
            return data

    @classmethod
    def update_one(cls, data: ParseStrategy) -> ParseStrategy:
        with session_getter() as session:
            session.add(data)
            session.commit()
            session.refresh(data)
            return data

    @classmethod
    def query_by_id(cls, parse_strategy_id: int) -> Optional[ParseStrategy]:
        with session_getter() as session:
            return session.get(ParseStrategy, parse_strategy_id)

    @classmethod
    def query_enable_by_id(cls, parse_strategy_id: int) -> Optional[ParseStrategy]:
        with session_getter() as session:
            statement = (
                select(ParseStrategy)
                .where(ParseStrategy.id == parse_strategy_id, ParseStrategy.is_delete == 0)
            )
            return session.exec(statement).first()



    @classmethod
    def generate_all_strategy_filter(cls, statement, keyword: Optional[str] = None):
        if keyword:
            statement = statement.where(ParseStrategy.name.like(f'%{keyword}%'))
        return statement

    @classmethod
    def get_all_strategy(cls, keyword: Optional[str] = None, page: int = 0, limit: int = 0) -> List[ParseStrategy]:
        statement = select(ParseStrategy).where(ParseStrategy.is_delete == 0)
        statement = cls.generate_all_strategy_filter(statement, keyword=keyword)
        if page and limit:
            statement = statement.offset((page - 1) * limit).limit(limit)
        statement = statement.order_by(
            ParseStrategy.is_default.desc(),
            ParseStrategy.create_time.desc()
        )
        with session_getter() as session:
            return session.exec(statement).all()

    @classmethod
    def count_all_strategy(cls, keyword: Optional[str] = None) -> int:
        statement = select(func.count(ParseStrategy.id)).where(ParseStrategy.is_delete == 0)
        statement = cls.generate_all_strategy_filter(statement, keyword=keyword)
        with session_getter() as session:
            return session.scalar(statement)

    @classmethod
    def get_strategy_by_name(cls, name: str) -> Optional[ParseStrategy]:
        statement = select(ParseStrategy).where(ParseStrategy.name == name, ParseStrategy.is_delete == 0)
        with session_getter() as session:
            return session.exec(statement).first()

    @classmethod
    def update_default_strategy(cls, parse_strategy_id: int) -> None:
        statement = update(ParseStrategy).where(ParseStrategy.is_default == 1, ParseStrategy.id != parse_strategy_id).values(is_default=0)
        with session_getter() as session:
            session.exec(statement)
            session.commit()

    @classmethod
    def delete_strategy(cls, data: ParseStrategy):
        data.is_delete = 1
        cls.update_one(data)
