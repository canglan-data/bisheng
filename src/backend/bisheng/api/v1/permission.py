from bisheng.api.v1.schemas import resp_200, resp_500
from bisheng.api.services.permission_service import PermissionService
from bisheng.api.services.user_service import UserPayload, get_admin_user, get_login_user
from fastapi import APIRouter, Query, Depends, Request, Body
from loguru import logger

router = APIRouter(prefix='/permission', tags=['OpenAPI', 'Permission'])


@router.get('/get_group_admin_position')
async def get_group_admin_position(request: Request):
    result = PermissionService.get_group_admin_position_dict(is_from_api=True)

    return resp_200(data=result)


@router.post('/set_group_admin_position')
async def set_group_admin_position(request: Request, data: dict, login_user: UserPayload = Depends(get_admin_user)):
    logger.debug(f"set_default_user_admin_position data:{data} user:{login_user.user_name}")
    PermissionService.set_group_admin_position_dict(data)

    result = PermissionService.get_group_admin_position_dict(is_from_api=True)
    return resp_200(data=result)


@router.get('/position_role_count')
async def position_role_count(request: Request, login_user: UserPayload = Depends(get_login_user)):
    manage_role_ids = []
    if not login_user.is_admin():
        manage_role_ids = PermissionService.get_manage_role_ids(login_user.user_id)
        if not manage_role_ids:
            return resp_200(data={})

    count_dict = PermissionService.get_position_role_count_dict(role_ids=manage_role_ids)

    return resp_200(data=count_dict)


@router.get('/position_user_count')
async def position_user_count(request: Request, login_user: UserPayload = Depends(get_login_user)):
    manage_user_ids = []
    if not login_user.is_admin():
        manage_user_ids = PermissionService.get_manage_user_ids(login_user.user_id)
        if not manage_user_ids:
            return resp_200(data={})

    count_dict = PermissionService.get_position_user_count_dict(user_ids=manage_user_ids)

    return resp_200(data=count_dict)


@router.get('/role_user_count')
async def position_user_count(request: Request, login_user: UserPayload = Depends(get_login_user)):
    manage_user_ids = []
    manage_role_ids = []
    if not login_user.is_admin():
        manager_group_ids = PermissionService.get_manage_user_group_ids(login_user.user_id)
        manage_user_ids = PermissionService.get_manage_user_ids(login_user.user_id, manager_group_ids)
        manage_role_ids = PermissionService.get_manage_role_ids(login_user.user_id, manager_group_ids)
        if not manage_user_ids or not manage_role_ids:
            return resp_200(data={})

    from bisheng.database.models.role import DefaultRole, AdminRole
    count_dict = PermissionService.get_role_user_count(user_ids=manage_user_ids, role_ids=manage_role_ids)
    data = []
    role = count_dict.pop(AdminRole, None)
    if role:
        data.append(role)

    role = count_dict.pop(DefaultRole, None)
    if role:
        data.append(role)

    roles = list(count_dict.values())
    roles.sort(key=lambda item: item['role_id'], reverse=True)

    data.extend(roles)

    for d in data:
        d['user_count'] = len(d['user_ids'])
        del d['user_ids']

    return resp_200(data=data)
