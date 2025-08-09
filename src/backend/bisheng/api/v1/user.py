import hashlib
import json
import random
import string
from base64 import b64encode
from datetime import datetime
from io import BytesIO
from typing import Annotated, Dict, List, Optional

from bisheng.api.services.role import RoleService
from bisheng.database.models.group import GroupDao
from bisheng.database.models.mark_task import MarkTaskDao
import rsa
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request, Path
from fastapi.encoders import jsonable_encoder
from fastapi.security import OAuth2PasswordBearer
from fastapi_jwt_auth import AuthJWT
from sqlmodel import delete, select, func
from captcha.image import ImageCaptcha

from bisheng.utils import generate_uuid
from bisheng.api.errcode.base import UnAuthorizedError
from bisheng.api.errcode.user import (UserNotPasswordError, UserPasswordExpireError,
                                      UserValidateError, UserPasswordError)
from bisheng.api.JWT import ACCESS_TOKEN_EXPIRE_TIME
from bisheng.api.utils import get_request_ip
from bisheng.api.services.audit_log import AuditLogService
from bisheng.api.services.captcha import verify_captcha
from bisheng.api.services.user_service import (UserPayload, gen_user_jwt, gen_user_role, get_login_user,
                                               get_admin_user, UserService)
from bisheng.api.v1.schemas import UnifiedResponseModel, resp_200, CreateUserReq
from bisheng.database.models.mark_task import MarkTaskDao

from bisheng.cache.redis import redis_client
from bisheng.database.base import session_getter
from bisheng.database.models.group import GroupDao
from bisheng.database.models.role import Role, RoleCreate, RoleDao, RoleUpdate
from bisheng.database.constants import AdminRole, DefaultRole
from bisheng.database.models.role_access import RoleAccess, RoleRefresh, RoleAccessDao
from bisheng.database.models.role import Role, RoleCreate, RoleDao, RoleUpdate, AdminRole, DefaultRole
from bisheng.database.models.role_access import AccessType, RoleAccess, RoleRefresh
from bisheng.database.models.role_position import RolePosition, RolePositionDao
from bisheng.database.models.user import User, UserCreate, UserDao, UserLogin, UserRead, UserUpdate
from bisheng.database.models.user_group import UserGroupDao
from bisheng.database.models.user_role import UserRole, UserRoleCreate, UserRoleDao
from bisheng.settings import settings
from bisheng.utils.constants import CAPTCHA_PREFIX, RSA_KEY, USER_PASSWORD_ERROR, USER_CURRENT_SESSION
from bisheng.utils.logger import logger
from bisheng.api.services.permission_service import PermissionService

# build router
router = APIRouter(prefix='', tags=['User'])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='token')


@router.post('/user/regist')
async def regist(*, user: UserCreate):
    # 验证码校验
    if settings.get_from_db('use_captcha'):
        if not user.captcha_key or not await verify_captcha(user.captcha, user.captcha_key):
            raise HTTPException(status_code=500, detail='验证码错误')

    db_user = User.model_validate(user)

    # check if user already exist
    user_exists = UserDao.get_user_by_username(db_user.user_name)
    if user_exists:
        raise HTTPException(status_code=500, detail='用户名已存在')
    if len(db_user.user_name) > 30:
        raise HTTPException(status_code=500, detail='用户名最长 30 个字符')
    try:
        db_user.password = UserService.decrypt_md5_password(user.password)
        # 判断下admin用户是否存在
        admin = UserDao.get_user(1)
        if admin:
            db_user = UserDao.add_user_and_default_role(db_user)
        else:
            db_user.user_id = 1
            db_user = UserDao.add_user_and_admin_role(db_user)
        # 将用户写入到默认用户组下
        UserGroupDao.add_default_user_group(db_user.user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'数据库写入错误， {str(e)}') from e
    return resp_200(db_user)


@router.post('/user/sso')
async def sso(*, request: Request, user: UserCreate):
    """ 给闭源网关提供的登录接口 """
    if settings.get_system_login_method().bisheng_pro:  # 判断sso 是否打开
        account_name = user.user_name
        user_exist = UserDao.get_unique_user_by_name(account_name)
        if not user_exist:
            # 判断下平台是否存在用户
            user_all = UserDao.get_all_users(page=1, limit=1)
            # 自动创建用户
            user_exist = User.model_validate(user)
            logger.info('act=create_user account={}', account_name)
            default_admin = settings.get_system_login_method().admin_username
            # 如果平台没有用户或者用户名和配置的管理员用户名一致，则插入为超级管理员
            if len(user_all) == 0 or (default_admin and default_admin == account_name):
                # 创建为超级管理员
                user_exist = UserDao.add_user_and_admin_role(user_exist)
            else:
                # 创建为普通用户
                user_exist = UserDao.add_user_and_default_role(user_exist)
            UserGroupDao.add_default_user_group(user_exist.user_id)

        access_token, refresh_token, _, _ = gen_user_jwt(user_exist)

        # 设置登录用户当前的cookie, 比jwt有效期多一个小时
        redis_client.set(USER_CURRENT_SESSION.format(user_exist.user_id), access_token, ACCESS_TOKEN_EXPIRE_TIME + 3600)

        # 记录审计日志
        AuditLogService.user_login(UserPayload(**{
            'user_name': user_exist.user_name,
            'user_id': user_exist.user_id,
        }), get_request_ip(request))
        return resp_200({'access_token': access_token, 'refresh_token': refresh_token})
    else:
        raise ValueError('不支持接口')


def get_error_password_key(username: str):
    return USER_PASSWORD_ERROR.format(username)


def clear_error_password_key(username: str):
    # 清理密码错误次数的计数
    error_key = get_error_password_key(username)
    redis_client.delete(error_key)


@router.post('/user/login')
async def login(*, request: Request, user: UserLogin, Authorize: AuthJWT = Depends()):
    # 验证码校验
    if settings.get_from_db('use_captcha'):
        if not user.captcha_key or not await verify_captcha(user.captcha, user.captcha_key):
            raise HTTPException(status_code=500, detail='验证码错误')

    password = UserService.decrypt_md5_password(user.password)

    db_user = UserDao.get_user_by_username(user.user_name)
    # 检查密码
    if not db_user or not db_user.password:
        return UserValidateError.return_resp()

    if 1 == db_user.delete:
        raise HTTPException(status_code=500, detail='该账号已被禁用，请联系管理员')

    password_conf = settings.get_password_conf()

    if db_user.password and db_user.password != password:
        # 判断是否需要记录错误次数
        if not password_conf.login_error_time_window or not password_conf.max_error_times:
            return UserValidateError.return_resp()
        # 错误次数加1
        error_key = get_error_password_key(user.user_name)
        error_num = redis_client.incr(error_key)
        if error_num == 1:
            # 首次设置key的过期时间
            redis_client.expire_key(error_key, password_conf.login_error_time_window * 60)
        if error_num and int(error_num) >= password_conf.max_error_times:
            # 错误次数到达上限，封禁账号
            db_user.delete = 1
            UserDao.update_user(db_user)
            raise HTTPException(status_code=500, detail='由于登录失败次数过多，该账号被自动禁用，请联系管理员处理')
        return UserValidateError.return_resp()

    # 判断下密码是否长期未修改
    if db_user.password and password_conf.password_valid_period and password_conf.password_valid_period > 0:
        if (datetime.now() - db_user.password_update_time).days >= password_conf.password_valid_period:
            return UserPasswordExpireError.return_resp()

    access_token, refresh_token, role, web_menu = gen_user_jwt(db_user)

    # Set the JWT cookies in the response
    Authorize.set_access_cookies(access_token)
    Authorize.set_refresh_cookies(refresh_token)

    # 设置登录用户当前的cookie, 比jwt有效期多一个小时
    redis_client.set(USER_CURRENT_SESSION.format(db_user.user_id), access_token, ACCESS_TOKEN_EXPIRE_TIME + 3600)

    # 记录审计日志
    AuditLogService.user_login(UserPayload(**{
        'user_name': db_user.user_name,
        'user_id': db_user.user_id,
        'role': role
    }), get_request_ip(request))
    return resp_200(UserRead(role=str(role), web_menu=web_menu, access_token=access_token, **db_user.__dict__))


@router.get('/user/admin')
async def get_admins(login_user: UserPayload = Depends(get_login_user)):
    """
    获取所有的超级管理员账号
    """
    # check if user already exist
    if not login_user.is_admin():
        raise HTTPException(status_code=500, detail='无查看权限')
    try:
        # 获取所有超级管理员账号
        admins = UserRoleDao.get_admins_user()
        admins_ids = [admin.user_id for admin in admins]
        admin_users = UserDao.get_user_by_ids(admins_ids)
        res = [UserRead(**one.__dict__) for one in admin_users]
        return resp_200(res)
    except Exception:
        raise HTTPException(status_code=500, detail='用户信息失败')


@router.get('/user/info')
async def get_info(login_user: UserPayload = Depends(get_login_user)):
    # check if user already exist
    try:
        user_id = login_user.user_id
        db_user = UserDao.get_user(user_id)
        role, web_menu = gen_user_role(db_user)
        admin_group = UserGroupDao.get_user_admin_group(user_id)
        admin_group = [one.group_id for one in admin_group]
        return resp_200(UserRead(role=str(role), web_menu=web_menu, admin_groups=admin_group, **db_user.__dict__))
    except Exception:
        raise HTTPException(status_code=500, detail='用户信息失败')


@router.post('/user/logout', status_code=201)
async def logout(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    Authorize.unset_jwt_cookies()
    return resp_200()


@router.get('/user/list_v2', status_code=201)
async def list_user_v2(*,
                    name: Optional[str] = None,
                    page_size: Optional[int] = 10,
                    page_num: Optional[int] = 1,
                    group_id: Annotated[List[int], Query()] = None,
                    role_id: Annotated[List[int], Query()] = None,
                    position: Annotated[List[str], Query()] = None,
                    group_role_type: Optional[str] = None,
                    expand: Optional[list[str]] = Query([]),
                    login_user: UserPayload = Depends(get_login_user)):

    manage_group_ids = None
    manage_role_ids = None
    if not login_user.is_admin():
        manage_group_ids = PermissionService.get_manage_user_group_ids(login_user.user_id)
        group_id = list(set(manage_group_ids) & set(group_id)) if group_id is not None else manage_group_ids
        if not group_id:
            return resp_200({'data': [], 'total': 0})

        if role_id:
            manage_role_ids = PermissionService.get_manage_role_ids(login_user.user_id, manage_group_ids)
            role_id = list(set(manage_role_ids) & set(role_id)) if role_id is not None else manage_role_ids
            if not role_id:
                return resp_200({'data': [], 'total': 0})

        logger.debug(f"list_user_v2 manage_group_ids:{manage_group_ids} group_id:{group_id} manage_role_ids:{manage_role_ids} role_id:{role_id}")

    user_ids = None
    if group_id:
        user_ids = UserGroupDao.get_groups_user(group_id)
        if not user_ids:
            return resp_200({'data': [], 'total': 0})

    if role_id:
        result = PermissionService.get_role_user_linked_list(role_ids=role_id)
        if not result:
            return resp_200({'data': [], 'total': 0})
        role_user_ids = [d['user_id'] for d in result]
        user_ids = list(set(user_ids) & set(role_user_ids)) if user_ids else role_user_ids

    if user_ids is not None and len(user_ids) == 0:  # 取交集后没有符合条件的用户
        user_ids = [0]  # 追加一个不存在的用户，使数据不能查出来

    users, total_count = UserDao.filter_users(user_ids, name, page_num, page_size, positions=position)
    if not users:
        return resp_200({'data': [], 'total': 0})

    res = []
    for one in users:
        one_data = one.model_dump()
        res.append(one_data)

    user_ids = [u['user_id'] for u in res]
    if 'roles' in expand:
        manage_role_ids = PermissionService.get_manage_role_ids(login_user.user_id, manage_group_ids)
        result = PermissionService.get_user_role_dict(user_ids=user_ids, role_ids=manage_role_ids)
        for one in res:
            one['roles'] = result.get(one['user_id'], [])

    if 'groups' in expand:
        result = PermissionService.get_user_group_dict(user_ids=user_ids, group_ids=manage_group_ids)
        for one in res:
            one['groups'] = result.get(one['user_id'], [])

    return resp_200({'data': res, 'total': total_count})



@router.get('/user/list', status_code=201)
async def list_user(*,
                    name: Optional[str] = None,
                    page_size: Optional[int] = 10,
                    page_num: Optional[int] = 1,
                    group_id: Annotated[List[int], Query()] = None,
                    role_id: Annotated[List[int], Query()] = None,
                    group_role_type: Optional[str] = None,
                    login_user: UserPayload = Depends(get_login_user)):
    groups = group_id if group_id else []
    roles = role_id
    user_admin_groups = []
    if not login_user.is_admin():
        # 查询下是否是其他用户组的管理员
        if group_role_type == 'audit':
            user_audit_groups = UserGroupDao.get_user_audit_or_admin_group(login_user.user_id)
            user_audit_groups = [one.group_id for one in user_audit_groups]
            groups = user_audit_groups
        elif group_role_type == 'operation':
            user_operation_groups = UserGroupDao.get_user_operation_or_admin_group(login_user.user_id)
            user_operation_groups = [one.group_id for one in user_operation_groups]
            groups = user_operation_groups
        else:
            user_admin_groups = UserGroupDao.get_user_admin_group(login_user.user_id)
            user_admin_groups = [one.group_id for one in user_admin_groups]
            groups = user_admin_groups
        # 不是任何用户组的管理员无查看权限
        if not groups:
            raise HTTPException(status_code=500, detail='无查看权限')
        # 将筛选条件的group_id和管理员有权限的groups做交集
        if group_id:
            groups = list(set(groups) & set(group_id))
            if not groups:
                raise HTTPException(status_code=500, detail='无查看权限')
        # 查询用户组下的角色, 和角色筛选条件做交集，得到真正去查询的角色ID
        group_roles = RoleDao.get_role_by_groups(groups, None, 0, 0, include_parent=True)
        if role_id:
            roles = list(set(role_id) & set([one.id for one in group_roles]))

    # 通过用户组和角色过滤出来的用户id
    user_ids = []
    if roles:
        # 获取绑定角色, 有绑定角色则查询对应用户组内的所有用户
        bind_roles = RoleDao.get_role_by_ids(roles, is_bind_all=True)
        role_groups = [one.group_id for one in bind_roles]
        if role_groups:
            all_child_groups = GroupDao.get_all_child_groups_by_id(role_groups)
            role_groups.extend([one.id for one in all_child_groups])
            group_user_ids = UserGroupDao.get_groups_user(role_groups)
            user_ids.extend(list(set(group_user_ids)))

        roles_user_ids = UserRoleDao.get_roles_user(roles)
        if not roles_user_ids and not bind_roles:
            return resp_200({'data': [], 'total': 0})
        user_ids.extend([one.user_id for one in roles_user_ids])

    if groups:
        # 查询用户组下的用户ID
        groups_user_ids = UserGroupDao.get_groups_user(groups)
        if not groups_user_ids:
            return resp_200({'data': [], 'total': 0})
        group_user_ids = list(set(groups_user_ids))
        # 如果user_ids不为空，说明是roles一起做交集筛选，否则是只做用户组筛选
        if user_ids:
            user_ids = list(set(user_ids) & set(group_user_ids))
            if not user_ids:
                return resp_200({'data': [], 'total': 0})
        else:
            user_ids = list(set(group_user_ids))

    users, total_count = UserDao.filter_users(user_ids, name, page_num, page_size)
    res = []
    for one in users:
        one_data = one.model_dump()
        user_roles = login_user.get_user_roles(one.user_id)
        user_groups = login_user.get_user_groups(one.user_id)
        # 如果不是超级管理，则需要将数据过滤, 不能看到非他管理的用户组内的角色和用户组列表
        if user_admin_groups:
            for i in range(len(user_roles) - 1, -1, -1):
                if user_roles[i]["group_id"] not in user_admin_groups:
                    del user_roles[i]
            for i in range(len(user_groups) - 1, -1, -1):
                if user_groups[i]["id"] not in user_admin_groups:
                    del user_groups[i]
        one_data["roles"] = user_roles
        one_data["groups"] = user_groups

        # 获取用户组里所有的绑定角色
        one_data["roles"].extend(login_user.get_group_bind_role([one['id'] for one in user_groups]))
        res.append(one_data)

    return resp_200({'data': res, 'total': total_count})


@router.post('/user/update', status_code=201)
async def update(*,
                 request: Request,
                 user: UserUpdate,
                 login_user: UserPayload = Depends(get_login_user)):
    db_user = UserDao.get_user(user.user_id)
    if not db_user:
        raise HTTPException(status_code=500, detail='用户不存在')

    if not login_user.is_admin():
        # 检查下是否是用户组的管理员
        user_group = UserGroupDao.get_user_group(db_user.user_id)
        user_group = [one.group_id for one in user_group]
        if not login_user.check_groups_admin(user_group):
            raise HTTPException(status_code=500, detail='无查看权限')

    # check if user already exist
    if db_user and user.delete is not None:
        # 判断是否是管理员
        with session_getter() as session:
            admin = session.exec(
                select(UserRole).where(UserRole.role_id == 1,
                                       UserRole.user_id == user.user_id)).first()
        if admin:
            raise HTTPException(status_code=500, detail='不能操作管理员')
        if user.delete == db_user.delete:
            return resp_200()
        db_user.delete = user.delete
    if db_user.delete == 0:  # 启用用户
        # 清理密码错误次数的计数
        clear_error_password_key(db_user.user_name)
    with session_getter() as session:
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
    update_user_delete_hook(request, login_user, db_user)
    return resp_200()


def update_user_delete_hook(request: Request, login_user: UserPayload, user: User) -> bool:
    logger.info(f'update_user_delete_hook: {request}, user={user}')
    if user.delete == 0:  # 启用用户
        AuditLogService.recover_user(login_user, get_request_ip(request), user)
    elif user.delete == 1:  # 禁用用户
        AuditLogService.forbid_user(login_user, get_request_ip(request), user)
    return True


@router.post('/role/add', status_code=201)
async def create_role(*,
                      request: Request,
                      role: RoleCreate,
                      login_user: UserPayload = Depends(get_login_user)):
    service = RoleService(request=request, login_user=login_user)
    try:
        # role.group_positions = {
        #     "70": ["员工职务", "空"],
        #     "72": ["员工职务", "空"]
        # }
        role.group_id = 0  # 不需要原来的所属组
        db_role = service.add_role(role)
        create_role_hook(request, login_user, db_role)
        return resp_200(db_role)
    except Exception as e:
        logger.exception(f'add role error e:{e}')
        raise HTTPException(status_code=500, detail='添加失败，检查是否重复添加')


def create_role_hook(request: Request, login_user: UserPayload, db_role: Role) -> bool:
    logger.info(f'create_role_hook: {login_user.user_name}, role={db_role}')
    AuditLogService.create_role(login_user, get_request_ip(request), db_role)

@router.get('/role/{role_id}', status_code=200)
async def get_role_info(*, request: Request, login_user: UserPayload = Depends(get_login_user),
                        role_id: int = Path(...)):
    service = RoleService(request=request, login_user=login_user)
    db_role = service.get_role_info(role_id)

    return resp_200(db_role)

@router.patch('/role/{role_id}', status_code=201)
async def update_role(*,
                      request: Request,
                      role_id: int,
                      role: RoleUpdate,
                      login_user: UserPayload = Depends(get_login_user)):
    service = RoleService(request=request, login_user=login_user)
    # role.group_positions = {
    #     "70": ["员工职务", "空"],
    #     "72": ["员工职务", "空"]
    # }

    db_role = service.update_role(role_id, role)
    update_role_hook(request, login_user, db_role)
    return resp_200(db_role)



def update_role_hook(request: Request, login_user: UserPayload, db_role: Role) -> bool:
    logger.info(f'update_role_hook: {login_user.user_name}, role={db_role}')
    AuditLogService.update_role(login_user, get_request_ip(request), db_role)


@router.get('/role/list', status_code=200)
async def get_role(*,
                   role_name: str = None,
                   page: int = 0,
                   limit: int = 0,
                   login_user: UserPayload = Depends(get_login_user)):
    """
    获取用户可见的角色列表， 根据用户权限不同返回不同的数据
    """
    # 参数处理
    if role_name:
        role_name = role_name.strip()

    # 判断是否是超级管理员
    if login_user.is_admin():
        # 是超级管理员获取全部
        group_ids = []
    else:
        # 查询下是否是其他用户组的管理员
        user_groups = UserGroupDao.get_user_admin_group(login_user.user_id)
        group_ids = [one.group_id for one in user_groups if one.is_group_admin]
        if not group_ids:
            raise HTTPException(status_code=500, detail='无查看权限')

    # 查询所有的角色列表
    res = RoleDao.get_role_by_groups(group_ids, role_name, page, limit, include_parent=True)
    total = RoleDao.count_role_by_groups(group_ids, role_name, include_parent=True)
    return resp_200(data={"data": res, "total": total})


@router.delete('/role/{role_id}', status_code=200)
async def delete_role(*,
                      request: Request,
                      role_id: int, login_user: UserPayload = Depends(get_login_user)):
    db_role = RoleDao.get_role_by_id(role_id)
    if not db_role:
        return resp_200()

    if not login_user.is_admin():
        role_ids = PermissionService.get_manage_role_ids(login_user.user_id)
        if role_id not in role_ids:
            return HTTPException(status_code=500, detail='无当前角色管理权限')

    if db_role.id == AdminRole or db_role.id == DefaultRole:
        raise HTTPException(status_code=500, detail='内置角色不能删除')

    # 删除role相关的数据
    try:
        RoleDao.delete_role(role_id)
        # 清理绑定的职位
        RolePositionDao.delete([role_id])
        # 清理绑定的资源
        RoleAccessDao.delete([role_id])
        # 清理绑定的用户
        UserRoleDao.delete_role_users(db_role.id)
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=500, detail='删除角色失败')
    AuditLogService.delete_role(login_user, get_request_ip(request), db_role)
    return resp_200()


@router.post('/user/role_add', status_code=200)
async def user_addrole(*,
                       request: Request,
                       user_role: UserRoleCreate,
                       login_user: UserPayload = Depends(get_login_user)):
    """
    重新设置用户的角色。根据权限不同改动的数据范围不同
    """
    # 获取用户的之前的角色列表
    old_roles = UserRoleDao.get_user_roles(user_role.user_id)
    old_roles = [one.role_id for one in old_roles]
    # 判断下被编辑角色是否是超级管理员，超级管理员不允许编辑
    user_role_list = UserRoleDao.get_user_roles(user_role.user_id)
    if any(one.role_id == AdminRole for one in user_role_list):
        raise HTTPException(status_code=500, detail='系统管理员不允许编辑')
    if any(one == AdminRole for one in user_role.role_id):
        raise HTTPException(status_code=500, detail='不允许设置为系统管理员')

    if not login_user.is_admin():
        # 判断拥有哪些用户组的管理权限
        admin_group = UserGroupDao.get_user_admin_group(login_user.user_id)
        admin_group = [one.group_id for one in admin_group]
        if not admin_group:
            raise HTTPException(status_code=500, detail='无权限')
        # 获取管理组下的所有角色列表
        admin_roles = RoleDao.get_role_by_groups(admin_group, '', 0, 0)
        admin_roles = [one.id for one in admin_roles]
        # 做交集，获取用户组管理员可见的角色列表
        for i in range(len(old_roles) - 1, -1, -1):
            if old_roles[i] not in admin_roles:
                del old_roles[i]
        # 判断下重新设置的角色列表是否都在 用户组管理员的名下
        for i in range(len(user_role.role_id) - 1, -1, -1):
            if user_role.role_id[i] not in admin_roles:
                raise HTTPException(status_code=500, detail=f'无权限添加角色{user_role.role_id[i]}')

    need_add_role = []
    need_delete_role = old_roles.copy()
    for one in user_role.role_id:
        if one not in old_roles:
            # 需要新增的角色
            need_add_role.append(one)
        else:
            # 剩余的就是需要删除的角色列表
            if one in need_delete_role:
                need_delete_role.remove(one)
    if need_add_role:
        UserRoleDao.add_user_roles(user_role.user_id, need_add_role)
    if need_delete_role:
        # 删除对应的角色列表
        UserRoleDao.delete_user_roles(user_role.user_id, need_delete_role)
    update_user_role_hook(request, login_user, user_role.user_id, old_roles, user_role.role_id)
    return resp_200()


def update_user_role_hook(request: Request, login_user: UserPayload, user_id: int,
                          old_roles: List[int], new_roles: List[int]):
    logger.info(f'update_user_role_hook, user_id: {user_id}, old_roles: {old_roles}, new_roles: {new_roles}')
    # 写入审计日志
    role_info = RoleDao.get_role_by_ids(old_roles + new_roles)
    group_ids = list(set([role.group_id for role in role_info]))
    role_dict = {one.id: one.role_name for one in role_info}
    note = "编辑前角色："
    for one in old_roles:
        note += role_dict[one] + "、"
    note = note.rstrip("、")
    note += "编辑后角色："
    for one in new_roles:
        note += role_dict[one] + "、"
    note = note.rstrip("、")
    AuditLogService.update_user(login_user, get_request_ip(request), user_id, group_ids, note)


@router.post('/role_access/refresh', status_code=200)
async def access_refresh(*, request: Request, data: RoleRefresh, login_user: UserPayload = Depends(get_login_user)):
    db_role = RoleDao.get_role_by_id(data.role_id)
    if not db_role:
        raise HTTPException(status_code=500, detail='角色不存在')
    if db_role.id == AdminRole:
        raise HTTPException(status_code=500, detail='系统管理员不允许编辑')

    if not login_user.is_admin():
        manage_role_ids = PermissionService.get_manage_role_ids(login_user.user_id)
        if data.role_id not in manage_role_ids:
            return UnAuthorizedError.return_resp()

    # 小权限的管理员会把大权限的管理员添加的授权记录也提交上来，这里不用判断大小权限的数据范围

    role_id = data.role_id
    access_type = data.type
    access_id = data.access_id
    # delete old access
    with session_getter() as session:
        session.exec(
            delete(RoleAccess).where(RoleAccess.role_id == role_id,
                                     RoleAccess.type == access_type))
        session.commit()
    # 添加新的权限
    with session_getter() as session:
        for third_id in access_id:
            role_access = RoleAccess(role_id=role_id, third_id=str(third_id), type=access_type)
            session.add(role_access)
        session.commit()
    update_role_hook(request, login_user, db_role)
    return resp_200()


@router.get('/role_access/list', status_code=200)
async def access_list(*, role_id: int, type: Optional[int] = None, login_user: UserPayload = Depends(get_login_user)):
    db_role = RoleDao.get_role_by_id(role_id)
    if not db_role:
        raise HTTPException(status_code=500, detail='角色不存在')

    if not login_user.is_admin():
        manage_role_ids = PermissionService.get_manage_role_ids(login_user.user_id)
        if role_id not in manage_role_ids:
            return UnAuthorizedError.return_resp()

    sql = select(RoleAccess).where(RoleAccess.role_id == role_id)
    count_sql = select(func.count(RoleAccess.id)).where(RoleAccess.role_id == role_id)
    if type:
        sql.where(RoleAccess.type == type)
        count_sql.where(RoleAccess.type == type)

    with session_getter() as session:
        db_role_access = session.exec(sql).all()
        total_count = session.scalar(count_sql)

    return resp_200({
        'data': [jsonable_encoder(access) for access in db_role_access],
        'total': total_count
    })


@router.get('/user/get_captcha', status_code=200)
async def get_captcha():
    # generate captcha
    chr_all = string.ascii_letters + string.digits
    chr_4 = ''.join(random.sample(chr_all, 4))
    image = ImageCaptcha().generate_image(chr_4)
    # 对image 进行base 64 编码
    buffered = BytesIO()
    image.save(buffered, format='PNG')

    capthca_b64 = b64encode(buffered.getvalue()).decode()
    logger.info('get_captcha captcha_char={}', chr_4)
    # generate key, 生成简单的唯一id，
    key = CAPTCHA_PREFIX + generate_uuid()[:8]
    redis_client.set(key, chr_4, expiration=300)

    # 增加配置，是否必须使用验证码
    return resp_200({
        'captcha_key': key,
        'captcha': capthca_b64,
        'user_capthca': settings.get_from_db('use_captcha') or False
    })


@router.get('/user/public_key', status_code=200)
async def get_rsa_publish_key():
    # redis 存储
    key = RSA_KEY
    # redis lock
    if redis_client.setNx(key, 1):
        # Generate a key pair
        (pubkey, privkey) = rsa.newkeys(512)

        # Save the keys to strings
        redis_client.set(key, (pubkey, privkey), 3600)
    else:
        pubkey, privkey = redis_client.get(key)

    pubkey_str = pubkey.save_pkcs1().decode()

    return resp_200({'public_key': pubkey_str})


@router.post('/user/reset_password', status_code=200)
async def reset_password(
        *,
        user_id: int = Body(embed=True),
        password: str = Body(embed=True),
        login_user: UserPayload = Depends(get_login_user),
):
    """
    管理员重置用户密码
    """
    # 获取要修改密码的用户信息
    user_info = UserDao.get_user(user_id)
    if not user_info:
        raise HTTPException(status_code=404, detail='用户不存在')
    user_payload = UserPayload(**{
        'user_id': user_info.user_id,
        'user_name': user_info.user_name,
        'role': ''
    })
    # 如果被修改的用户是系统管理员， 需要判断是否是本人
    if user_payload.is_admin() and login_user.user_id != user_id:
        raise HTTPException(status_code=500, detail='系统管理员只能本人重置密码')

    # 查询用户所在的用户组
    user_groups = UserGroupDao.get_user_group(user_info.user_id)
    user_group_ids = [one.group_id for one in user_groups]

    # 检查是否有分组的管理权限
    if not login_user.check_groups_admin(user_group_ids):
        raise HTTPException(status_code=403, detail='没有权限重置密码')

    user_info.password = UserService.decrypt_md5_password(password)
    user_info.password_update_time = datetime.now()
    UserDao.update_user(user_info)

    clear_error_password_key(user_info.user_name)
    return resp_200()


@router.post('/user/change_password', status_code=200)
async def change_password(*,
                          password: str = Body(embed=True),
                          new_password: str = Body(embed=True),
                          login_user: UserPayload = Depends(get_login_user)):
    """
    登录用户 修改自己的密码
    """
    user_info = UserDao.get_user(login_user.user_id)
    if not user_info.password:
        return UserNotPasswordError.return_resp()

    password = UserService.decrypt_md5_password(password)

    # 已登录用户告知是密码错误
    if user_info.password != password:
        return UserPasswordError.return_resp()

    user_info.password = UserService.decrypt_md5_password(new_password)
    user_info.password_update_time = datetime.now()
    UserDao.update_user(user_info)

    clear_error_password_key(user_info.user_name)
    return resp_200()


@router.post('/user/change_password_public', status_code=200)
async def change_password_public(*,
                                 username: str = Body(embed=True),
                                 password: str = Body(embed=True),
                                 new_password: str = Body(embed=True)):
    """
    未登录用户 修改自己的密码
    """

    user_info = UserDao.get_user_by_username(username)
    if not user_info.password:
        return UserValidateError.return_resp()

    if user_info.password != UserService.decrypt_md5_password(password):
        return UserValidateError.return_resp()

    user_info.password = UserService.decrypt_md5_password(new_password)
    user_info.password_update_time = datetime.now()
    UserDao.update_user(user_info)

    clear_error_password_key(username)
    return resp_200()

@router.get('/user/mark', status_code=200)
async def has_mark_access(*,request: Request, login_user: UserPayload = Depends(get_login_user)):
    """
    获取当前用户是否有标注权限,判断当前用户是否为admin 或者是用户组管理员
    """
    user_groups = UserGroupDao.get_user_group(login_user.user_id)
    user_group_ids = [one.group_id for one in user_groups]

    has_mark_access = False
    # 检查是否有分组的管理权限
    task = MarkTaskDao.get_task(login_user.user_id)
    if task:
        has_mark_access = True

    return resp_200(data=has_mark_access)


@router.post('/user/create', status_code=200)
async def create_user(*,
                      request: Request,
                      admin_user: UserPayload = Depends(get_admin_user),
                      req: CreateUserReq):
    """
    超级管理员创建用户
    """
    logger.info(f'create_user username={admin_user.user_name}, username={req.user_name}')
    data = UserService.create_user(request, admin_user, req)
    return resp_200(data=data)


def md5_hash(string):
    md5 = hashlib.md5()
    md5.update(string.encode('utf-8'))
    return md5.hexdigest()
