import { LoadingIcon } from "@/components/bs-icons/loading";
import { Button } from "@/components/bs-ui/button";
import ShadTooltip from "@/components/ShadTooltipComponent";
import { getOperationChatStatisticsApi } from "@/controllers/API/log";
import { useTable } from "@/util/hook";
import { formatDate } from "@/util/utils";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/bs-ui/card";
import { Input } from "@/components/bs-ui/input";
import { QuestionTooltip } from "@/components/bs-ui/tooltip";
import MultiSelect from "@/components/bs-ui/select/multi";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/bs-ui/select";
import { DatePicker } from "@/components/bs-ui/calendar/datePicker";
import FilterByApp from "@/components/bs-comp/filterTableDataComponent/FilterByApp";
import { message } from "@/components/bs-ui/toast/use-toast";

export const getStrTime = (date) => {
    const start_date = date[0] && (formatDate(date[0], 'yyyy-MM-dd') + ' 00:00:00')
    const end_date = date[1] && (formatDate(date[1], 'yyyy-MM-dd') + ' 23:59:59')
    return [start_date, end_date]
}

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


    useEffect(() => {
            // // On initial load, fetch the latest configuration and set it to formData
            // getChatAnalysisConfigApi().then(config => {
            //     setFormData(config);
            // });
        }, []);

    const handleFilterChange = (filterType, value) => {
        // const updatedFilters = { ...filters, [filterType]: value };
        // setFilters(updatedFilters);
    };

    const handleSave = () => {
        if (!form.appName) {
            return message({
                variant: 'warning',
                description: '不可为空',
            });
        }
        console.log(form, 'kkkk')

        // Simulate saving the configuration (API call)
        // captureAndAlertRequestErrorHoc(updateChatAnalysisConfigApi(formData).then(() => {
        //     toast({
        //         variant: 'success',
        //         description: '配置已生效',
        //     });
        //     onBack();  // Close the page after successful save
        // }))
    };

    const handleCancel = () => {
        onBack();  // Close the page without saving
    };

    return (
        <div className="relative size-full py-4">
            {/* {loading && <div className="absolute w-full h-full top-0 left-0 flex justify-center items-center z-10 bg-[rgba(255,255,255,0.6)] dark:bg-blur-shared">
                <LoadingIcon />
            </div>} */}
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
                            {/* Application Name */}
                            <label className="text-right font-medium"><span className="text-red-500">*</span>应用名称</label>
                            <FilterByApp isAudit={false} value={form.appName} onChange={(value) => setForm({...form, appName: value})} style="w-auto" selectStyle="max-w-auto"/>

                            <label className="text-right font-medium"><span className="text-red-500">*</span>用户组织架构</label>
                            <div className="flex items-center space-x-2">
                                <MultiSelect options={[]} ></MultiSelect>
                            </div>

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
                                <Input type="number" value={form.answerTime} onChange={(e) => setForm({...form, answerTime: Number(e.target.value)})}></Input>
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
                                <Input type="text" className="pr-40" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value})} />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@aviva-cofco.com.cn</span>
                            </div>

                            {/* Authorization Code */}
                            <label className="text-right font-medium"><span className="text-red-600">*</span>邮箱授权码</label>
                            <div className="flex items-center gap-2 relative">
                                <Input type="text" placeholder="请输入16位授权码" className="flex-grow" value={form.emailCode} onChange={(e) => setForm({ ...form, emailCode: e.target.value})}/>
                                <div className="absolute left-full ml-2">
                                    <QuestionTooltip
                                    content={
                                        <div>
                                        <p className="font-medium mb-2">如何申请/获取企业微信邮箱授权码？</p>
                                        <p>登录首页(QQ邮箱) → 加密（私密）→ （账号）</p>
                                        <p>找到（POSTA认证密码）→ 点击【开启】删除（请验证密码）</p>
                                        <p>选择【生成授权码】→ 获取完成此页面 → 获得你的授权码（如abc072244@jb679）</p>
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
                                 
                            <label className="text-right font-medium"></label>
                            <div className="text-[#1890ff] hover:text-[#40a9ff] transition-colors text-sm right-3 text-right" onClick={() => {
                                setForm({ ...form, receivedEmails: [...form.receivedEmails, ''] });
                                }}
                            > + 添加邮箱</div>
                           
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

