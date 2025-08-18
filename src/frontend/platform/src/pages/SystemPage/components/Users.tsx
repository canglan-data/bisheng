import { FilterIcon } from "@/components/bs-icons/filter";
import { bsConfirm } from "@/components/bs-ui/alertDialog/useConfirm";
import { Button } from "@/components/bs-ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/bs-ui/popover";
import FilterUserGroup from "@/components/bs-ui/select/filter";
import FilterTreeUserGroup from "@/components/bs-ui/select/treeFilter";
import { getRolesCountApi, getUserGroupsApi, getUserGroupsCountApi, getUserPositionCountApi } from "@/controllers/API/user";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchInput } from "../../../components/bs-ui/input";
import AutoPagination from "../../../components/bs-ui/pagination/autoPagination";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow
} from "../../../components/bs-ui/table";
import { userContext } from "../../../contexts/userContext";
import { disableUserApi, getUsersApi } from "../../../controllers/API/user";
import { captureAndAlertRequestErrorHoc } from "../../../controllers/request";
import { useTable } from "../../../util/hook";
import UserRoleModal from "./UserRoleModal";
import UserPwdModal from "@/pages/LoginPage/UserPwdModal";
import { PlusIcon } from "@/components/bs-icons";
import CreateUser from "./CreateUser";
import { message } from "@/components/bs-ui/toast/use-toast";
import { UsersFilter } from "./UserFilter";

export default function Users(params) {
    const { user } = useContext(userContext);
    const { t } = useTranslation()

    const { page, pageSize, data: users, total, setPage, search, reload, filterData } = useTable({ pageSize: 20 }, (param) =>
        getUsersApi({
            ...param,
            name: param.keyword
        })
    )

    // 禁用确认
    const handleDelete = (user) => {
        bsConfirm({
            title: `${t('prompt')}!`,
            desc: t('system.confirmDisable'),
            okTxt: t('disable'),
            onOk(next) {
                captureAndAlertRequestErrorHoc(disableUserApi(user.user_id, 1).then(res => {
                    reload()
                    // 禁用成功提示
                    message({
                        variant: 'success',
                        title: t('tip'),
                        description: t('system.disableSuccess')
                    });
                }))
                next()
            }
        })
    }
    const handleEnableUser = (user) => {
        captureAndAlertRequestErrorHoc(disableUserApi(user.user_id, 0).then(res => {
            reload()
            // 开启成功提示
            message({
                variant: 'success',
                title: t('tip'),
                description: t('system.enableSuccess')
            });
        }))
    }

    // 编辑
    const [currentUser, setCurrentUser] = useState(null)
    const userPwdModalRef = useRef(null)
    const handleRoleChange = () => {
        setCurrentUser(null)
        reload()
    }

    // 获取用户组类型数据
    const [userGroups, setUserGroups] = useState([])
    const getUserGoups = async () => {
        const res: any = await getUserGroupsCountApi()
        setUserGroups(res)
    }
    // 获取角色类型数据
    const [roles, setRoles] = useState([])
    const getRoles = async () => {
        const res: any = await getRolesCountApi()
        const roles = res.map(item => ({
            ...item,
            id: item.role_id,
            role_name: `${item.role_name}(${item.user_count})`,
        }))
        setRoles(roles)
    }
    const [positions, setPositions] = useState([])
    const getPositions = async () => {
        const res: any = await getUserPositionCountApi()
        const positions = Object.keys(res).map(key => ({
            position_name: `${key}(${res[key]})`,
            id: key
        }))
        setPositions(positions)
    }
    // 已选项上浮
    const handleGroupChecked = (values) => {
        setUserGroups(values)
    }
    const handleRoleChecked = (values) => {
        setRoles(values)
    }
    const handlePositionChecked = (values) => {
        setPositions(values)
    }

    const [openCreate, setOpenCreate] = useState(false)

    useEffect(() => {
        getUserGoups()
        getRoles()
        getPositions()
        return () => { setUserGroups([]); setRoles([]); setPositions([]) }
    }, [])

    // 系统管理员(超管、组超管)
    const isAdmin = useMemo(() => {
        return user.role === 'admin';
    }, [user])
    
    // 拥有权限管理权限
    const hasGroupAdminRole = useMemo(() => {
        return user.role === 'group_admin';
    }, [user])

    const operations = (el) => {
        const isSuperAdmin = el.roles.some(role => role.id === 1)
        // 禁止编辑admin用户
        {/* 0806 隐藏重置密码 + 编辑 */}
        if (isSuperAdmin) return <div>
            {/* <Button variant="link" disabled className="px-0">{t('edit')}</Button> */}
            {/* <Button variant="link" disabled className="px-0 pl-4">{t('system.resetPwd')}</Button> */}
            {/* <Button variant="link" className="px-0 pl-4" onClick={() => userPwdModalRef.current.open(el.user_id)}>{t('system.resetPwd')}</Button> */}
            <Button variant="link" disabled className="text-red-500 px-0 pl-4">{t('disable')}</Button>
        </div>

        return <div>
            {/* 编辑 */}
            {/* <Button variant="link" disabled={user.user_id === el.user_id} onClick={() => setCurrentUser(el)} className="px-0">{t('edit')}</Button> */}
            {/* TODO： 隐藏重置密码 */}
            {(isAdmin || hasGroupAdminRole) &&
                <Button variant="link" className="px-0 pl-4" onClick={() => userPwdModalRef.current.open(el.user_id)}>{t('system.resetPwd')}</Button>}
            {/* 禁用 */}
            {
                el.delete === 1 ? <Button variant="link" onClick={() => handleEnableUser(el)} className="text-green-500 px-0 pl-4">{t('enable')}</Button> :
                    <Button variant="link" disabled={user.user_id === el.user_id} onClick={() => handleDelete(el)} className="text-red-500 px-0 pl-4">{t('disable')}</Button>
            }
        </div>
    }

    return <div className="relative">
        <div className="h-[calc(100vh-128px)] overflow-y-auto pb-10">
            <div className="flex justify-end gap-6">
                <div className="w-[180px] relative">
                    <SearchInput placeholder={t('system.username')} onChange={(e) => search(e.target.value)}></SearchInput>
                </div>
                {/* {user.role === 'admin' && <Button className="flex justify-around" onClick={() => setOpenCreate(true)}>
                    <PlusIcon className="text-primary" />
                    <span className="text-[#fff] mx-4">{t('create')}</span>
                </Button>} */}
            </div>
            <Table className="mb-[50px]">
                {/* <TableCaption>用户列表.</TableCaption> */}
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[200px]">{t('system.username')}</TableHead>
                        <TableHead className="w-[200px]">
                            <div className="flex items-center">
                                {t('system.userPosition')}
                                <UsersFilter
                                    options={positions}
                                    nameKey='position_name'
                                    onChecked={handlePositionChecked}
                                    placeholder={t('system.searchUserPositions')}
                                    onFilter={(ids) => filterData({ positions: ids })}
                                ></UsersFilter>
                            </div>
                        </TableHead>
                        <TableHead>
                            <div className="flex items-center">
                                {t('system.userGroup')}
                                <UsersFilter
                                    options={userGroups}
                                    nameKey='group_name'
                                    onChecked={handleGroupChecked}
                                    placeholder={t('system.searchUserGroups')}
                                    onFilter={(ids) => filterData({ groupId: ids })}
                                    byTree
                                ></UsersFilter>
                            </div>
                        </TableHead>
                        <TableHead>
                            <div className="flex items-center">
                                {t('system.role')}
                                <UsersFilter
                                    options={roles}
                                    nameKey='role_name'
                                    onChecked={handleRoleChecked}
                                    placeholder={t('system.searchRoles')}
                                    onFilter={(ids) => filterData({ roleId: ids })}
                                ></UsersFilter>
                            </div>
                        </TableHead>
                        <TableHead>{t('system.changeTime')}</TableHead>
                        <TableHead className="text-right w-[164px]">{t('operations')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((el: any) => (
                        <TableRow key={el.id}>
                            <TableCell className="font-medium max-w-md truncate">{el.user_name}</TableCell>
                            <TableCell>{el.position}</TableCell>
                            <TableCell className="break-all">
                                <div className="max-h-[200px] overflow-y-auto">{(el.groups || []).map(el => el.name).join(',')}</div>
                            </TableCell>
                            <TableCell className="break-all">
                                <div className="max-h-[200px] overflow-y-auto">{(el.roles || []).map(el => el.name).join(',')}</div>
                            </TableCell>
                            <TableCell>{el.update_time.replace('T', ' ')}</TableCell>
                            <TableCell className="text-right">{operations(el)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    {!users.length && <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-400">{t('build.empty')}</TableCell>
                    </TableRow>}
                </TableFooter>
            </Table>
        </div>
        {/* 分页 */}
        {/* <Pagination count={10}></Pagination> */}
        <div className="bisheng-table-footer bg-background-login">
            <p className="desc">{t('system.userList')}</p>
            <AutoPagination
                className="float-right justify-end w-full mr-6"
                page={page}
                pageSize={pageSize}
                total={total}
                onChange={(newPage) => setPage(newPage)}
            />
        </div>

        <CreateUser open={openCreate} onClose={(bool) => { setOpenCreate(bool); reload() }} onSave={reload} />
        <UserRoleModal user={currentUser} onClose={() => setCurrentUser(null)} onChange={handleRoleChange}></UserRoleModal>
        <UserPwdModal ref={userPwdModalRef} />
    </div>
};
