from typing import List, Tuple, Optional
from fastapi import HTTPException
from bisheng.api.errcode.base import NotFoundError, UnAuthorizedError
from bisheng.api.services.base import BaseService
from bisheng.api.services.user_service import UserPayload
from bisheng.database.models.parse_strategy import (
    ParseStrategy, ParseStrategyCreate, ParseStrategyDao,
    ParseStrategyUpdate, ParseStrategyRead, ParseStrategyView
)
from bisheng.database.models.role_access import AccessType
from bisheng.database.models.user import UserDao


class ParseStrategyService(BaseService):

    @classmethod
    def get_strategy(
        cls,
        keyword: Optional[str] = None,
        page: int = 1,
        limit: int = 10,
    ) -> Tuple[List[ParseStrategyRead], int]:
        res = ParseStrategyDao.get_all_strategy(keyword, page=page, limit=limit)
        total = ParseStrategyDao.count_all_strategy(keyword)
        return cls.convert_strategy_read(res), total

    @classmethod
    def convert_strategy_read(
        cls, strategy_list: List[ParseStrategy]
    ) -> List[ParseStrategyRead]:
        user_ids = {s.user_id for s in strategy_list if s.user_id}
        user_info = UserDao.get_user_by_ids(list(user_ids))
        user_dict = {u.user_id: u.user_name for u in user_info}
        return [
            ParseStrategyRead(
                **s.model_dump(),
                user_name=user_dict.get(s.user_id, str(s.user_id)),
            )
            for s in strategy_list
        ]

    @classmethod
    def get_strategy_info(cls, parse_strategy_id: int) -> ParseStrategyView:
        db_strategy = ParseStrategyDao.query_by_id(parse_strategy_id)
        if not db_strategy:
            raise NotFoundError.http_exception()
        db_user = UserDao.get_user(db_strategy.user_id)

        return ParseStrategyView(
            **db_strategy.model_dump(),
            user_name=db_user.user_name if db_user else db_strategy.user_id,
        )

    @classmethod
    def create_strategy(cls, login_user: UserPayload, parse_strategy: ParseStrategyCreate) -> ParseStrategy:
        if not login_user.is_admin():
            raise UnAuthorizedError.http_exception()

        if ParseStrategyDao.get_strategy_by_name(parse_strategy.name):
            raise HTTPException(status_code=500, detail="该解析策略名称已存在，请重新输入。")

        db_strategy = ParseStrategy(**parse_strategy.model_dump())
        db_strategy.user_id = login_user.user_id
        db_strategy = ParseStrategyDao.insert_one(db_strategy)

        if db_strategy.is_default:
            ParseStrategyDao.update_default_strategy(db_strategy.id)
        return db_strategy

    @classmethod
    def update_strategy(cls, login_user: UserPayload, parse_strategy_id: int, parse_strategy: ParseStrategyUpdate) -> ParseStrategyView:
        if not login_user.is_admin():
            raise UnAuthorizedError.http_exception()

        db_strategy = ParseStrategyDao.query_enable_by_id(parse_strategy_id)
        if not db_strategy:
            raise NotFoundError.http_exception()

        if parse_strategy.name and parse_strategy.name != db_strategy.name:
            if ParseStrategyDao.get_strategy_by_name(parse_strategy.name):
                raise HTTPException(status_code=500, detail="该解析策略名称已存在，请重新输入。")
            db_strategy.name = parse_strategy.name

        if db_strategy.is_default != parse_strategy.is_default:
            db_strategy.is_default = parse_strategy.is_default
            if parse_strategy.is_default:
                ParseStrategyDao.update_default_strategy(db_strategy.id)

        db_strategy.content = parse_strategy.content
        db_strategy = ParseStrategyDao.update_one(db_strategy)

        user = UserDao.get_user(db_strategy.user_id)
        return ParseStrategyView(
            **db_strategy.model_dump(),
            user_name=user.user_name if user else str(db_strategy.user_id),
        )

    @classmethod
    def delete_strategy(cls, login_user: UserPayload, id: int) -> bool:
        if not login_user.is_admin():
            raise UnAuthorizedError.http_exception()
        strategy = ParseStrategyDao.query_enable_by_id(id)
        if not strategy:
            raise NotFoundError.http_exception()

        ParseStrategyDao.delete_strategy(strategy)
        return True
