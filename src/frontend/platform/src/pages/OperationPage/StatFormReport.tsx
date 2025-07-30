import { Button } from "@/components/bs-ui/button";
import ShadTooltip from "@/components/ShadTooltipComponent";
import { configVitalOrgStatusApi, getConfigVitalOrgStatusApi, getOperationGroupsApi, getSendEmailGroupsApi } from "@/controllers/API/log";
import { formatDate } from "@/util/utils";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/bs-ui/card";
import { Input } from "@/components/bs-ui/input";
import { QuestionTooltip } from "@/components/bs-ui/tooltip";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/bs-ui/select";
import { DatePicker } from "@/components/bs-ui/calendar/datePicker";
import FilterByApp from "@/components/bs-comp/filterTableDataComponent/FilterByApp";
import { message, toast } from "@/components/bs-ui/toast/use-toast";
import { captureAndAlertRequestErrorHoc } from "@/controllers/request";
import { uniq } from "lodash-es";
import FilterByMultiUsergroup from "./components/FilterByMultiUserGroup";

export default function StatFormReport({ onBack, onJump }) {
    const [form, setForm] = useState({
        appName: [],
        selectedDepartments: [],
        selectPeriod: '7',
        selectDay: '',
        answerTime: 5,
        email: '',
        emailCode: '',
        receivedEmails: ['']
    });

    const loadApps = async (name: string = "") => {
        try {
            const res = await getOperationGroupsApi({ keyword: name, page: 1, page_size: 5000 });
            const options = res.data.map((a: any) => ({
                label: a.name,
                value: a.id,
            }));
            return options;
        } catch (error) {
            console.error("Error loading apps:", error);
            return [];
        }
    };

    const loadGroups = async (name: string = "") => {
        try {
            const res = await getSendEmailGroupsApi({ keyword: name, page: 1, page_size: 5000 });
            const groups = res.records.map((a: any) => ({
                label: a.group_name,
                value: a.id,
            }));
            return groups;
        } catch (error) {
            console.error("Error loading groups:", error);
            return [];
        }
    };
    


    useEffect(() => {
        // On initial load, fetch the latest configuration and set it to formData
        const fetchData = async () => {
            try {
                const appOptions = await loadApps("");
                const groupOptions = await loadGroups("")
                const config = await getConfigVitalOrgStatusApi();
                
                if (config.appName && Array.isArray(config.appName) && appOptions.length > 0) {
                    config.appName = config.appName.map(item => {
                        const appInfo = appOptions.find(app => app.value === item.value);
                        return appInfo ? appInfo : item;
                    });
                }
                if (config.selectedDepartments && Array.isArray(config.selectedDepartments) && groupOptions.length > 0) {
                    config.selectedDepartments = config.selectedDepartments.map(item => {
                        const appInfo = groupOptions.find(app => app.value === Number(item.value));
                        return appInfo ? appInfo : item;
                    });
                }
                
                // set form
                // 进入页面时移除所有邮箱后缀
                if (config.email) {
                    config.email = config.email.replace(/@aviva-cofco\.com\.cn$/, '');
                }
                if (config.receivedEmails && Array.isArray(config.receivedEmails)) {
                    config.receivedEmails = config.receivedEmails.map(email => 
                        email.replace(/@aviva-cofco\.com\.cn$/, '')
                    );
                }
                setForm(config);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        
        fetchData();
    }, []);

    const handleSave = () => {
        if (!form.appName || form.appName.length === 0) {
            return message({
                variant: 'warning',
                description: '应用名称不可为空',
            });
        }
        
        if (!form.selectedDepartments || form.selectedDepartments.length === 0) {
            return message({
                variant: 'warning',
                description: '用户组织架构不可为空',
            });
        }
        
        if (!form.selectPeriod) {
            return message({
                variant: 'warning',
                description: '统计周期不可为空',
            });
        }
        
        if (!form.selectDay) {
            return message({
                variant: 'warning',
                description: '开始日期不可为空',
            });
        }
        
        if (!form.answerTime) {
            return message({
                variant: 'warning',
                description: '问答次数不可为空',
            });
        }
        
        if (!form.email) {
            return message({
                variant: 'warning',
                description: '发送邮箱不可为空',
            });
        }
        
        if (!form.emailCode) {
            return message({
                variant: 'warning',
                description: '邮箱授权码不可为空',
            });
        }
        
        if (!form.receivedEmails || form.receivedEmails.length === 0 || !form.receivedEmails[0]) {
            return message({
                variant: 'warning',
                description: '收件邮箱不可为空',
            });
        }

        // if (form.emailCode.length !== 16) {
        //     return message({
        //         variant: 'warning',
        //         description: '邮箱授权码必须为16位',
        //     });
        // }

        //Simulate saving the configuration (API call)
        captureAndAlertRequestErrorHoc(configVitalOrgStatusApi({
            sender_email: form.email.trim() ? `${form.email.trim()}@aviva-cofco.com.cn` : '',
            sender_password: form.emailCode,
            recipient_emails: uniq(form.receivedEmails.map(email => 
              email.trim() ? `${email.trim()}@aviva-cofco.com.cn` : ''
            ).filter(Boolean)),
            execution_interval_days: Number(form.selectPeriod),
            start_date: formatDate(new Date(form.selectDay), 'yyyy-MM-dd'),
            min_qa_count: form.answerTime,
            flow_ids: form.appName?.map(el => el.value) || undefined,
            group_ids: form.selectedDepartments?.map(el => Number(el.value)) || undefined,
        }).then(() => {
            toast({
                variant: 'success',
                description: '配置已生效',
            });
            onBack();  // Close the page after successful save
        }))
    };

    const handleCancel = () => {
        onBack();  // Close the page without saving
    };

    return (
        <div className="relative size-full py-4">
            <div className="flex ml-6 items-center gap-x-3">
                <ShadTooltip content="返回" side="right">
                    <button className="extra-side-bar-buttons w-[36px]" onClick={onBack}>
                        <ArrowLeft strokeWidth={1.5} className="side-bar-button-size" />
                    </button>
                </ShadTooltip>
                {/* 活力组织统计组件 */}
                <span>活力组织统计</span>
            </div>
            <div className="mb-8 w-auto mx-16 max-w-[1280px] min-w-[490px] h-[calc(100vh-220px)] overflow-y-auto">
                <Card className="border-[#BEC6D6] transition bg-background-new mt-4">
                    <CardHeader>
                        <CardTitle>
                        <div className="flex gap-2 items-center">
                            <span className="text-lg"> 统计规则</span>
                        </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-fit">
                        <div className="grid grid-cols-[max-content_1fr] gap-4 items-center max-w-[640px]">
                            <label className="text-right font-medium"><span className="text-red-500">*</span>应用名称</label>
                            <FilterByApp isAudit={false} value={form.appName} onChange={(value) => setForm({...form, appName: value})} style="w-auto" selectStyle="max-w-auto"/>

                            <label className="text-right font-medium"><span className="text-red-500">*</span>用户组织架构</label>

                            <FilterByMultiUsergroup
                                value={form.selectedDepartments}
                                onChange={(value) => setForm({...form, selectedDepartments: value})} 
                            />

                            <label className="text-right font-medium"><span className="text-red-500">*</span>统计周期</label>
                            <div className="flex items-center space-x-2">
                                 <Select value={form.selectPeriod} onValueChange={(value) => setForm({...form, selectPeriod: value})} >
                                    <SelectTrigger className="h-8 w-1/2">
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value="7">7天</SelectItem>
                                            <SelectItem value="14">14天</SelectItem>
                                            <SelectItem value="30">30天</SelectItem>
                                            <SelectItem value="60">60天</SelectItem>
                                            <SelectItem value="90">90天</SelectItem>
                                            <SelectItem value="180">180天</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <DatePicker
                                    value={form.selectDay}
                                    placeholder="开始日期"
                                    onChange={(value) => setForm({...form, selectDay: value})}
                                    displayFormat="yyyy年MM月dd日 (E) 开始"
                                    />
                            </div>

                            <label className="text-right font-medium"><span className="text-red-500">*</span>问答次数</label>
                            <div className="relative">
                                <Input type="number" min={1} max={100} value={form.answerTime} onChange={(e) => setForm({...form, answerTime: Number(e.target.value)})}></Input>
                            </div>
                            
                        </div>
                    </CardContent>
                </Card>
                        
                <Card className="border-[#BEC6D6] transition bg-background-new my-4">
                    <CardHeader>
                        <CardTitle>
                            <div className="flex gap-2 items-center">
                            <span className="text-lg">邮箱设置</span>
                        </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-fit">
                        <div className="grid grid-cols-[max-content_1fr] gap-4 items-center max-w-[640px]">
                            {/* Sender Email */}
                            <label className="text-right font-medium"><span className="text-red-500">*</span>发送邮箱</label>
                            <div className="relative">
                                <Input type="text" className="pr-40" maxLength={256} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value})} />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@aviva-cofco.com.cn</span>
                            </div>

                            {/* Authorization Code */}
                            <label className="text-right font-medium"><span className="text-red-600">*</span>邮箱授权码</label>
                            <div className="flex items-center gap-2 relative">
                                <Input type="text" placeholder="请输入16位授权码" maxLength={50} className="flex-grow" value={form.emailCode} onChange={(e) => setForm({ ...form, emailCode: e.target.value})}/>
                                <div className="absolute left-full ml-2">
                                    <QuestionTooltip
                                    content={
                                        <div>
                                        <p className="font-medium mb-2">如何申请/获取企业微信邮箱授权码？</p>
                                        <p>1. 登录网页版QQ邮箱 → 顶部【设置】→ 【账号】</p>
                                        <p>2. 找到【POP3/IMAP服务】→ 点击【开启】服务（需验证密保）</p>
                                        <p>3. 点击【生成授权码】→ 按提示发送短信 → 获得<b>16位授权码</b>（如 `abcd1234efgh5678`）</p>
                                        </div>
                                    }
                                    />
                                </div>
                            </div>

                            {/* Recipient Email */}   
                            {form.receivedEmails?.map((email, index) => (
                                <>
                                    <label className="text-right font-medium">{index === 0 &&<><span className="text-red-500">*</span>收件邮箱</>}</label>
                                    <div className="space-y-2">
                                        <div key={index} className="relative">
                                        <Input
                                            type="text"
                                            className="pr-40"
                                            value={email}
                                            maxLength={256}
                                            onChange={(e) => {
                                            const newEmails = [...form.receivedEmails];
                                            newEmails[index] = e.target.value;
                                            setForm({ ...form, receivedEmails: newEmails });
                                            }}
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 flex items-center text-sm">
                                            @aviva-cofco.com.cn
                                            {form.receivedEmails.length > 1 && (
                                            <div
                                                className="ml-2 text-gray-500 hover:text-gray-700" onClick={() => {
                                                const newEmails = form.receivedEmails.filter((_, i) => i !== index);
                                                setForm({ ...form, receivedEmails: newEmails });
                                                }}
                                                > × </div>)}
                                            </div>
                                        </div>
                                    </div>
                                </>
                                ))}
                                 
                            {(form.receivedEmails.length < 10) &&<>
                            <label className="text-right font-medium"></label>
                            <div className="text-[#1890ff] hover:text-[#40a9ff] transition-colors text-sm right-3 text-right" onClick={() => {
                                setForm({ ...form, receivedEmails: [...form.receivedEmails, ''] });
                                }}
                            > + 添加邮箱</div></>}
                           
                        </div>
                    </CardContent>
                </Card>

                 <div className="absolute right-0 bottom-0 p-4 flex gap-4">
                    <Button variant="outline" className="w-36" onClick={handleCancel}>取消</Button>
                    <Button className="w-36" onClick={handleSave}>保存</Button>
                </div>
            </div>
    </div>
    );
}

