// 审计系统操作页面
import { Button } from "@/components/bs-ui/button";
import { DatePicker } from "@/components/bs-ui/calendar/datePicker";
import AutoPagination from "@/components/bs-ui/pagination/autoPagination";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/bs-ui/select";
import MultiSelect from "@/components/bs-ui/select/multi";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/bs-ui/table";
import { getActionsApi, getActionsByModuleApi, getLogsApi, getModulesApi, getOperatorsApi, exportLogApi } from "@/controllers/API/log";
import { getAuditGroupsApi, getUserGroupsApi } from "@/controllers/API/user";
import { useTable } from "@/util/hook";
import { downloadFile, formatDate } from "@/util/utils";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { transformEvent, transformModule, transformObjectType } from "../utils";
import { LoadingIcon } from "@/components/bs-icons/loading";
import { X } from "lucide-react";
import { checkSassUrl } from "@/components/bs-comp/FileView";

const useGroups = () => {
    const [groups, setGroups] = useState([])
    const loadData = () => {
        getAuditGroupsApi().then((res: any) => setGroups(res.data))
    }
    return { groups, loadData }
}
const useModules = () => {
    const [modules, setModules] = useState([])
    const loadModules = () => {
        getModulesApi().then(res => setModules(res.data))
    }
    return { modules, loadModules }
}

export default function SystemLog() {
    const { t } = useTranslation()
    const { users, selectedRef, loadUsers, searchUser } = useUsers()
    const { groups, loadData } = useGroups()
    const { modules, loadModules } = useModules()
    const { page, pageSize, loading, data: logs, total, setPage, filterData } = useTable({ pageSize: 20 }, (param) =>
        getLogsApi({ ...param })
    )
    const init = {
        userIds: [],
        groupId: '',
        start: undefined,
        end: undefined,
        moduleId: '',
        action: '',
        monitorResult: []
    }

    const [actions, setActions] = useState<any[]>([])
    const [keys, setKeys] = useState({ ...init })

    const handleActionOpen = async () => {
        setActions((keys.moduleId ? await getActionsByModuleApi(keys.moduleId) : await getActionsApi()))
    }
    const handleSearch = () => {
        const startTime = keys.start && formatDate(keys.start, 'yyyy-MM-dd HH:mm:ss')
        const endTime = keys.end && formatDate(keys.end, 'yyyy-MM-dd HH:mm:ss').replace('00:00:00', '23:59:59')
        filterData({ ...keys, start: startTime, end: endTime, monitorResult: keys.monitorResult })
    }
    const handleReset = () => {
        setKeys({ ...init })
        filterData(init)
    }
    const handleExport = () => {
        const startTime = keys.start && formatDate(keys.start, 'yyyy-MM-dd HH:mm:ss')
        const endTime = keys.end && formatDate(keys.end, 'yyyy-MM-dd HH:mm:ss').replace('00:00:00', '23:59:59')
        exportLogApi({
            ...keys,
            start: startTime,
            end: endTime
        }).then(res => {
            const fileUrl = res.file;
            downloadFile(__APP_ENV__.BASE_URL + fileUrl, `系统操作${formatDate(new Date(), 'yyyy-MM-dd')}.xlsx`);
        })
    }
    useEffect(() => {
        loadUsers()
    }, [])

    {/* 定义操作监测结果映射 */}
    const monitorResultMap = {
        pass: t('log.pass'),
        set_group_admin: t('log.setGroupAdmin'),
        not_work_time: t('log.notWorkTime')
    };

    return <div className="relative">
        {loading && (
            <div className="absolute left-0 top-0 z-10 flex h-full w-full items-center justify-center bg-[rgba(255,255,255,0.6)] dark:bg-blur-shared">
               <LoadingIcon />
            </div>
        )}
        <div className="h-[calc(100vh-128px)] overflow-y-auto px-2 py-4 pb-10">
            <div className="flex flex-wrap gap-4">
                <div className="w-[200px] relative">
                    <MultiSelect contentClassName="overflow-y-auto max-w-[200px]" multiple
                        options={users}
                        value={keys.userIds}
                        placeholder={t('log.selectUser')}
                        onLoad={loadUsers}
                        onSearch={(key) => { searchUser(key); selectedRef.current = keys.userIds }}
                        onChange={(values) => { setKeys({ ...keys, userIds: values }); console.log(values) }}
                    ></MultiSelect>
                </div>
                <div className="w-[200px] relative">
                <Select 
                onOpenChange={loadData} 
                value={keys.groupId} 
                onValueChange={(value) => setKeys({ ...keys, groupId: value })}
                >
                <SelectTrigger className="w-[200px] group">
                    <div className="flex flex-1 items-center justify-between overflow-hidden">
                    <div className="flex-1 truncate mr-2 min-w-0 text-left">
                        <SelectValue placeholder={t('log.selectUserGroup')} />
                    </div>
                    {keys.groupId && (
                        <X
                        className="
                            h-3.5 w-3.5 min-w-3.5
                            opacity-0 group-hover:opacity-100
                            transition-opacity duration-200
                            bg-black rounded-full
                            flex items-center justify-center
                            flex-shrink-0
                        "
                        color="#ffffff"
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault(); // 防止触发select打开
                            setKeys({ ...keys, groupId: "" });
                        }}
                        />
                    )}
                    </div>
                </SelectTrigger>
                <SelectContent className="max-w-[200px]">
                    <SelectGroup>
                    {groups.map(g => (
                        <SelectItem value={g.id} key={g.id} className="truncate">
                        {g.group_name}
                        </SelectItem>
                    ))}
                    </SelectGroup>
                </SelectContent>
                </Select>
                </div>
                <div className="w-[180px] relative">
                    <DatePicker value={keys.start} placeholder={t('log.startDate')} onChange={(t) => setKeys({ ...keys, start: t })} />
                </div>
                <div className="w-[180px] relative">
                    <DatePicker value={keys.end} placeholder={t('log.endDate')} onChange={(t) => setKeys({ ...keys, end: t })} />
                </div>
                <div className="w-[180px] relative">
                <Select 
                    value={keys.moduleId} 
                    onOpenChange={loadModules} 
                    onValueChange={(value) => setKeys({ ...keys, action: '', moduleId: value, monitorResult: [] })}
                >
                    <SelectTrigger className="w-[180px] group">
                        <div className="flex flex-1 items-center justify-between overflow-hidden">
                        <span className="flex-1 truncate text-left mr-2 min-w-0">
                            {keys.moduleId ? (
                            modules.find(m => m.value === keys.moduleId)?.name 
                                ? t(modules.find(m => m.value === keys.moduleId).name)
                                : t('log.systemModule')
                            ) : (
                            <span className="text-muted-foreground">{t('log.systemModule')}</span>
                            )}
                        </span>
                        {keys.moduleId && (
                            <X
                            className="
                                h-3.5 w-3.5 min-w-3.5
                                opacity-0 group-hover:opacity-100
                                transition-opacity duration-200
                                bg-black rounded-full
                                flex items-center justify-center
                                flex-shrink-0
                            "
                            color="#ffffff"
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setKeys({ ...keys, moduleId: "", action: "" });
                            }}
                            />
                        )}
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                        {modules.map(m => (
                            <SelectItem value={m.value} key={m.value} className="truncate">
                            {t(m.name)}
                            </SelectItem>
                        ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                </div>
                <div className="w-[180px] relative">
                <Select 
                value={keys.action} 
                onOpenChange={handleActionOpen}
                onValueChange={(value) => setKeys({ ...keys, action: value })}
                >
                <SelectTrigger className="w-[180px] group">
                    <div className="flex flex-1 items-center justify-between overflow-hidden">
                    <span className="flex-1 truncate text-left mr-2 min-w-0">
                        {keys.action ? (
                        actions.find(a => a.value === keys.action)?.name 
                            ? t(actions.find(a => a.value === keys.action).name)
                            : t('log.actionBehavior')
                        ) : (
                        <span className="text-muted-foreground">{t('log.actionBehavior')}</span>
                        )}
                    </span>
                    {keys.action && (
                        <X
                        className="
                            h-3.5 w-3.5 min-w-3.5
                            opacity-0 group-hover:opacity-100
                            transition-opacity duration-200
                            bg-black rounded-full
                            flex items-center justify-center
                            flex-shrink-0
                        "
                        color="#ffffff"
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setKeys({ ...keys, action: "" });
                        }}
                        />
                    )}
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                    {actions.map(a => (
                        <SelectItem value={a.value} key={a.value} className="truncate">
                        {t(a.name)}
                        </SelectItem>
                    ))}
                    </SelectGroup>
                </SelectContent>
                </Select>
                </div>
                
                {keys.moduleId === 'system' && (
                <div className="w-[200px] relative">
                <MultiSelect 
                    contentClassName="overflow-y-auto max-w-[200px]" 
                    multiple
                    options={[
                        { label: t('log.pass'), value: 'pass' },
                        { label: t('log.setGroupAdmin'), value: 'set_group_admin' },
                        { label: t('log.notWorkTime'), value: 'not_work_time' }
                    ]}
                    value={keys.monitorResult}
                    placeholder={t('log.operationMonitor')}
                    onChange={(values) => setKeys({ ...keys, monitorResult: values })}
                ></MultiSelect>
                </div>
                )}
                <div>
                    <Button className="mr-3 px-6" onClick={handleSearch}>
                        {t('log.searchButton')}
                    </Button>
                    <Button variant="outline" className="mr-3 px-6" onClick={handleReset}>
                        {t('log.resetButton')}
                    </Button>
                    {keys.moduleId === 'system' && (
                    <Button className="px-6" onClick={handleExport}>
                        {t('log.exportButton')}
                    </Button>
                    )}
                </div>
            </div>
            <Table className="mb-[50px]">
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[200px]">{t('log.auditId')}</TableHead>
                        <TableHead className="w-[200px] min-w-[100px]">{t('log.username')}</TableHead>
                        <TableHead className="w-[150px] min-w-[100px]">{t('log.userRole')}</TableHead>
                        <TableHead className="w-[150px] min-w-[100px]">{t('log.userGroup')}</TableHead>
                        <TableHead className="w-[150px] min-w-[100px]">{t('log.userPosition')}</TableHead>
                        <TableHead className="w-[200px] min-w-[100px]">{t('log.operationTime')}</TableHead>
                        <TableHead className="w-[100px] min-w-[100px]">{t('log.systemModule')}</TableHead>
                        <TableHead className="w-[150px] min-w-[100px]">{t('log.operationAction')}</TableHead>
                        <TableHead className="w-[150px] min-w-[100px]">{t('log.objectType')}</TableHead>
                        <TableHead className="w-[200px] min-w-[100px]">{t('log.operationObject')}</TableHead>
                        <TableHead className="w-[150px]">{t('log.ipAddress')}</TableHead>
                        <TableHead className="w-[250px] min-w-[250px]">{t('log.remark')}</TableHead>
                        <TableHead className="w-[150px] min-w-[100px]">{t('log.operationMonitor')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.map((log: any) => (
                        <TableRow key={log.id}>
                            <TableCell>{log.id}</TableCell>
                            <TableCell><div className="max-w-[200px] break-all truncate-multiline">{log.operator_name}</div></TableCell>
                            <TableCell>{log.operator_info?.roles.join(',') || '无'}</TableCell>
                            <TableCell>{log.operator_info?.groups.join(',') || '无'}</TableCell>
                            <TableCell>{log.operator_info?.position || '无'}</TableCell>
                            <TableCell>{log.create_time.replace('T', ' ')}</TableCell>
                            <TableCell>{transformModule(log.system_id)}</TableCell>
                            <TableCell>{transformEvent(log.event_type)}</TableCell>
                            <TableCell>{transformObjectType(log.object_type)}</TableCell>
                            <TableCell><div className="max-w-[200px] break-all truncate-multiline">{log.object_name || '无'}</div></TableCell>
                            <TableCell>{log.ip_address}</TableCell>
                            <TableCell className="max-w-[250px]">
                                <div className="whitespace-pre-line break-all">{log.note?.replace('编辑后', `\n编辑后`) || '无'}</div>
                            </TableCell>
                            <TableCell>
                                {log.monitor_result ? log.monitor_result.map((item, index) => (
                                    <span key={index} className={item === 'pass' ? 'text-green-500' : 'text-red-500'}>
                                        {monitorResultMap[item] || '无'}{index < log.monitor_result.length - 1 ? ',' : ''}
                                    </span>
                                )) : '无'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                {!logs.length && <TableFooter>
                    <TableRow>
                        <TableCell colSpan={9} className="text-center text-gray-400">{t('build.empty')}</TableCell>
                    </TableRow>
                </TableFooter>}
            </Table>
            {!logs.length && <div className="h-[700px]"></div>}
        </div>
        {/* 分页 */}
        {/* <Pagination count={10}></Pagination> */}
        <div className="bisheng-table-footer bg-background-login">
            <p className="desc pl-4">{t('log.auditManagement')}</p>
            <AutoPagination
                className="float-right justify-end w-full mr-6"
                page={page}
                pageSize={pageSize}
                total={total}
                onChange={(newPage) => setPage(newPage)}
            />
        </div>
    </div>
};


const useUsers = () => {
    const [users, setUsers] = useState<any[]>([]);
    const userRef = useRef([])
    const selectedRef = useRef([])

    const loadUsers = () => {
        getOperatorsApi().then(res => {
            const options = res.map((u: any) => ({ label: u.user_name, value: u.user_id }))
            userRef.current = options
            setUsers(options)
        })
    }
    const search = (name) => {
        const newUsers = userRef.current.filter(u => u.label.toLowerCase().includes(name.toLowerCase())
            || selectedRef.current.includes(u.value))
        setUsers(newUsers)
    }

    return {
        users,
        selectedRef,
        loadUsers,
        searchUser(name) {
            search(name)
        }
    }
}