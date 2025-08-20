from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from bisheng.api.services.parse_strategy_service import ParseStrategyService
from bisheng.api.services.user_service import UserPayload, get_login_user
from bisheng.api.v1.schemas import resp_200
from bisheng.database.models.parse_strategy import ParseStrategyCreate, ParseStrategyUpdate

router = APIRouter(prefix='/parse-strategy', tags=['ParseStrategy'])


@router.post('/create')
def create_strategy(
    *,
    login_user: UserPayload = Depends(get_login_user),
    parse_strategy: ParseStrategyCreate,
):
    db_strategy = ParseStrategyService.create_strategy(login_user, parse_strategy)
    return resp_200(db_strategy)


@router.get('')
def get_strategies(
    *,
    keyword: Optional[str] = None,
    page_size: int = Query(10, ge=1, description="分页大小"),
    page_num: int = Query(1, ge=1, description="页码")
):
    res, total = ParseStrategyService.get_strategy(keyword, page_num, page_size)
    return resp_200(data={'data': res, 'total': total})


@router.get('/{parse_strategy_id}')
def get_strategy_info(
    *,
    parse_strategy_id: int
):
    res = ParseStrategyService.get_strategy_info(parse_strategy_id)
    return resp_200(data=res)


@router.put('/{parse_strategy_id}')
def update_strategy(
    *,
    login_user: UserPayload = Depends(get_login_user),
    parse_strategy_id: int,
    strategy: ParseStrategyUpdate,
):
    res = ParseStrategyService.update_strategy(login_user, parse_strategy_id, strategy)
    return resp_200(data=res)


@router.delete('/{parse_strategy_id}')
def delete_strategy(
    *,
    parse_strategy_id: int,
    login_user: UserPayload = Depends(get_login_user),
):
    ParseStrategyService.delete_strategy(login_user, parse_strategy_id)
    return resp_200(message='删除成功')
