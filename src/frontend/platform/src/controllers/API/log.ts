import { paramsSerializer } from ".";
import axios from "../request";

// 获取操作过组下资源的所有用户
export async function getOperatorsApi(): Promise<[]> {
    return await axios.get('/api/v1/audit/operators')
}

// 审计视角 获取用户所管理的用户组内的应用
export async function getAuditGroupsApi(params: { keyword, page, page_size }): Promise<[]> {
    return await axios.get('/api/v1/group/audit/resources', { params })
}

// 运营视角 获取用户所管理的用户组内的应用
export async function getOperationGroupsApi(params: { keyword, page, page_size }): Promise<[]> {
    return await axios.get('/api/v1/group/operation/resources', { params })
}

// 分页获取审计列表
export async function getLogsApi({ page, pageSize, userIds, groupId = '', start, end, moduleId = '', action = '', monitorResult = [] }: {
    page: number,
    pageSize: number,
    userIds?: number[],
    groupId?: string,
    start?: string,
    end?: string,
    moduleId?: string,
    action?: string,
    monitorResult?: string[]
}): Promise<{ data: any[], total: number }> {
    const uids = userIds?.reduce((pre, val) => `${pre}&operator_ids=${val}`, '') || ''
    const startStr = start ? `&start_time=${start}` : ''
    const endStr = end ? `&end_time=${end}` : ''
    const monitorStr = params.monitorResult?.reduce((pre, val) => `${pre}&monitor_result=${val}`, '') || ''
    return await axios.get(
        `/api/v1/audit?page=${page}&limit=${pageSize}&group_ids=${groupId}${uids}` +
        `&system_id=${moduleId}&event_type=${action}` + startStr + endStr + monitorStr
    )
}

// 获取会话分析策略配置
export async function getChatAnalysisConfigApi(): Promise<any> {
    return await axios.get('/api/v1/audit/session/config').then(res => {
        const formData = {
            reviewEnabled: res.flag,          // Map flag to reviewEnabled
            reviewKeywords: res.prompt,      // Map prompt to reviewKeywords
            reviewFrequency: res.day_cron === 'day' ? 'daily' : 'weekly',  // Check if it's daily or weekly
            reviewTime: res.hour_cron,       // Map hour_cron to reviewTime
            reviewDay: '',                    // Default empty, to be set if frequency is weekly
        };

        // Set reviewDay only if the frequency is weekly
        if (formData.reviewFrequency === 'weekly') {
            formData.reviewDay = res.day_cron; // Map the backend day to reviewDay (e.g., 'mon', 'tues', etc.)
        }

        return formData;
    })
}

// 更新会话分析策略配置
export async function updateChatAnalysisConfigApi(formData: { reviewEnabled: boolean, reviewKeywords: string, reviewFrequency: string, reviewTime: string, reviewDay: string }) {
    const backendData = {
        flag: formData.reviewEnabled,         // Map reviewEnabled to flag
        prompt: formData.reviewKeywords,      // Map reviewKeywords to prompt
        day_cron: formData.reviewFrequency === 'daily' ? 'day' : formData.reviewDay,  // Convert frequency and day
        hour_cron: formData.reviewTime,      // Map reviewTime to hour_cron
    };

    return await axios.post('/api/v1/audit/session/config', backendData)
}


// 系统模块
export async function getModulesApi(): Promise<{ data: any[] }> {
    return {
        data: [{ name: 'log.chat', value: 'chat' }, { name: 'log.build', value: 'build' }, { name: 'log.knowledge', value: 'knowledge' }, { name: 'log.system', value: 'system' }]
    }
}

const actions = [
    { name: 'log.createChat', value: 'create_chat' },
    { name: 'log.deleteChat', value: 'delete_chat' },
    { name: 'log.createBuild', value: 'create_build' },
    { name: 'log.updateBuild', value: 'update_build' },
    { name: 'log.deleteBuild', value: 'delete_build' },
    { name: 'log.createKnowledge', value: 'create_knowledge' },
    { name: 'log.deleteKnowledge', value: 'delete_knowledge' },
    { name: 'log.uploadFile', value: 'upload_file' },
    { name: 'log.deleteFile', value: 'delete_file' },
    { name: 'log.updateUser', value: 'update_user' },
    { name: 'log.forbidUser', value: 'forbid_user' },
    { name: 'log.recoverUser', value: 'recover_user' },
    { name: 'log.createUserGroup', value: 'create_user_group' },
    { name: 'log.deleteUserGroup', value: 'delete_user_group' },
    { name: 'log.updateUserGroup', value: 'update_user_group' },
    { name: 'log.createRole', value: 'create_role' },
    { name: 'log.deleteRole', value: 'delete_role' },
    { name: 'log.updateRole', value: 'update_role' },
    { name: 'log.userLogin', value: 'user_login' }
];

// 全部操作行为
export async function getActionsApi() {
    return actions
}

// 系统模块下操作行为
export async function getActionsByModuleApi(moduleId) {
    switch (moduleId) {
        case 'chat': return actions.filter(a => a.value.includes('chat'))
        case 'build': return actions.filter(a => a.value.includes('build'))
        case 'knowledge': return actions.filter(a => a.value.includes('knowledge') || a.value.includes('file'))
        case 'system': return actions.filter(a => 
            (a.value.includes('user') || a.value.includes('role')) && 
            !a.value.includes('user_group')
        )
    }
}

// 应用数据标记列表
export async function getChatLabelsApi(params) {
    const { page, pageSize, keyword } = params

    return await axios.get('/api/v1/chat/app/list', {
        params: {
            page_num: page,
            page_size: pageSize,
            keyword
        }
    })
}

// 标注任务列表
export async function getMarksApi({ status, pageSize, page }): Promise<{}> {
    return await axios.get('/api/v1/mark/list', {
        params: {
            page_num: page,
            page_size: pageSize,
            status
        }
    }).then(res => {
        res.data = res.list
        return res
    })
}

// 创建标注任务
export async function createMarkApi(data: { app_list: string[], user_list: string[] }) {
    return await axios.post('/api/v1/mark/create_task', data)
}

// 删除标注任务
export async function deleteMarkApi(task_id) {
    return await axios.delete('/api/v1/mark/del', { params: { task_id } })
}

// 标注会话列表
export async function getMarkChatsApi({ task_id, keyword, page, pageSize, mark_status, mark_user }) {
    return await axios.get('/api/v1/chat/app/list', {
        params: {
            task_id,
            keyword,
            mark_status,
            mark_user: mark_user?.join(','),
            page_num: page,
            page_size: pageSize
        }
    })
}

// 获取用户标注权限
export async function getMarkPermissionApi(): Promise<boolean> {
    return await axios.get('/api/v1/user/mark')
}

// 更新标注状态
export async function updateMarkStatusApi(data: { session_id: string, task_id: number, status: number }) {
    return await axios.post('/api/v1/mark/mark', data)
}

// 获取下一个标注会话
export async function getNextMarkChatApi({ action, chat_id, task_id }) {
    return await axios.get('/api/v1/mark/next', {
        params: {
            action,
            chat_id,
            task_id
        }
    })
}

// 获取会话标注状态
export async function getMarkStatusApi({ chat_id, task_id }) {
    return await axios.get('/api/v1/mark/get_status', {
        params: {
            chat_id,
            task_id
        }
    })
}
/**
 * 获取应用分组列表
 * @param params 请求参数：keyword（关键词）、page（页码）、page_size（每页大小）
 * @param config axios 配置，包含 signal（用于取消请求）
 * @returns 返回分组列表数据
 */
export async function getGroupsApi(
    params: { keyword: string; page: number; page_size: number },
    config?: { signal?: AbortSignal } // 接收 AbortSignal
): Promise<any[]> {
    return await axios.get("/api/v1/group/manage/resources", {
        params, // 请求参数
        signal: config?.signal, // 绑定 AbortSignal
    });
}


// 获取审计应用列表
// export async function getAuditAppListApi(params: {
//     flow_ids,
//     user_ids,
//     group_ids,
//     start_date,
//     end_date,
//     feedback,
//     sensitive_status,
//     page,
//     page_size
// }) {
//     return await axios.get('/api/v1/audit/session', {
//         params, paramsSerializer
//     })
// }

// 导出审计日志
export async function exportLogApi(params: {
    userIds?: number[],
    groupId?: string,
    start?: string,
    end?: string,
    moduleId?: string,
    action?: string,
    monitorResult?: string[]
}) {
    const uids = params.userIds?.reduce((pre, val) => `${pre}&operator_ids=${val}`, '') || ''
    const startStr = params.start ? `&start_time=${params.start}` : ''
    const endStr = params.end ? `&end_time=${params.end}` : ''
    const monitorStr = params.monitorResult?.reduce((pre, val) => `${pre}&monitor_result=${val}`, '') || ''
    return await axios.get(
        `/api/v1/audit?export=1${uids}&group_ids=${params.groupId || ''}` +
        `&system_id=${params.moduleId || ''}&event_type=${params.action || ''}` + startStr + endStr + monitorStr)
}

// 导出csv

export async function exportCsvApi(params: {
    flow_ids,
    user_ids,
    group_ids,
    start_date,
    end_date,
    feedback,
    sensitive_status
}) {
    return await axios.get('/api/v1/audit/session/export', {
        params, paramsSerializer
    })
}

// 包装csv的表格数据
export async function exportCsvDataApi(params: {
    flow_ids,
    user_ids,
    group_ids,
    start_date,
    end_date,
    feedback,
    sensitive_status
}) {
    return await axios.get('/api/v1/audit/session/export/data', {
        params, paramsSerializer
    })
}


// 审计视角 获取会话的统计数据
export async function getAuditChatStatisticsApi(params: { flow_ids, group_ids, start_date, end_date, page, page_size, order_field, order_type }) {
    return await axios.get('/api/v1/audit/session/chart', {
        params,
        paramsSerializer
    })
}


// 审计视角 获取报告下载链接
export async function getAuditReportDownloadLinkApi(params: { flow_ids, group_ids, start_date, end_date }) {
    return await axios.get('/api/v1/audit/session/chart/export', { params, paramsSerializer })
}

// 运营视角 获取会话的统计数据
export async function getOperationChatStatisticsApi(params: { flow_ids, group_ids, start_date, end_date, page, page_size, order_field, order_type }) {
    return await axios.get('/api/v1/operation/session/chart', {
        params,
        paramsSerializer
    })
}

// 运营视角 获取报告下载链接
export async function getOperationReportDownloadLinkApi(params: { flow_ids, group_ids, start_date, end_date }) {
    return await axios.get('/api/v1/operation/session/chart/export', { params, paramsSerializer })
}


// 获取审计应用列表
export async function getAuditAppListApi(params: {
    flow_ids,
    user_ids,
    group_ids,
    start_date,
    end_date,
    feedback,
    review_status,
    page,
    page_size,
    keyword,
}) {
    return await axios.get('/api/v1/audit/session', {
        params, paramsSerializer
    })
}

//导出审计信息exportAduitDataApi
export async function exportAduitDataApi(params: {
    flow_ids,
    user_ids,
    group_ids,
    start_date,
    end_date,
    feedback,
    review_status,
    keyword,
}) {
    return await axios.get('/api/v1/audit/export', {
        params, paramsSerializer
    })
}

//导出运营信息exportAduitDataApi
export async function exportOperationDataApi(params: {
    flow_ids,
    user_ids,
    group_ids,
    start_date,
    end_date,
    feedback,
    keyword,
}) {
    return await axios.get('/api/v1/operation/export', {
        params, paramsSerializer
    })
}

// 手动审查应用使用情况
export async function auditApi(params: {
    flow_ids,
    user_ids,
    group_ids,
    start_date,
    end_date,
    feedback,
    review_status
}): Promise<[]> {
    return await axios.get('/api/v1/audit/session/review', { params, paramsSerializer })
}

// 获取运营应用列表
export async function getOperationAppListApi(params: {
    flow_ids,
    user_ids,
    group_ids,
    start_date,
    end_date,
    feedback,
    page,
    page_size,
    keyword,
}) {
    return await axios.get('/api/v1/operation/session', {
        params, paramsSerializer
    })
}

// 获取邮件配置信息
export async function getConfigVitalOrgStatusApi(): Promise<any> {
    return await axios.get('/api/v1/operation/session/vital_org_status_config').then(res => {
        const formData = {
            appName: res.flow_ids?.map(id => ({ value: id, label: id })),
            selectedDepartments: res.group_ids ? res.group_ids.map(id => ({ value: id.toString(), label: id.toString() })) : [],
            selectPeriod: res.execution_interval_days?.toString() || '7',
            selectDay: res.start_date ? new Date(res.start_date) : '',
            answerTime: res.min_qa_count || 5,
            email: res.sender_email || '',
            emailCode: res.sender_password || '',
            receivedEmails: res.recipient_emails || ['']
        };
        
        return formData;
    })
}

// 更新邮件任务
export async function configVitalOrgStatusApi(params: {
        sender_email: string,
        sender_password: string,
        recipient_emails: string[]
        execution_interval_days: number,
        start_date: string,
        min_qa_count: number,
        flow_ids: string[],
        group_ids: number[],
    }) {
    const backendData = {
        ...params,
        execution_hour: 10,
        execution_minute: 0,
         // msg_from?: string,
        smtp_host: "smtp.qq.com",
        smtp_port: 465
    };
    return await axios.post('/api/v1/operation/session/vital_org_status_config', backendData)
}

// 获取用户组织架构相关应用
export async function getSendEmailGroupsApi(params: { keyword, page, page_size }) {
    return await axios.get('/api/v1/operation/send_mail/group/list', { params })
}

// 获取运营应用列表
export async function getChatLogs(id: string) {
    return await axios.get(`/api/v1/chat/log/${id}`);
}
