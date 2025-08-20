import UsersSelect from "@/components/bs-comp/selectComponent/Users";
import SelectGroup from "@/components/bs-comp/selectGroup";
import { Button } from "@/components/bs-ui/button";
import { Label } from "@/components/bs-ui/label";
import AutoPagination from "@/components/bs-ui/pagination/autoPagination";
import { RadioGroup, RadioGroupItem } from "@/components/bs-ui/radio";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/bs-ui/table";
import { useToast } from "@/components/bs-ui/toast/use-toast";
import { QuestionTooltip, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/bs-ui/tooltip";
import { locationContext } from "@/contexts/locationContext";
import { getGroupFlowsApi, saveGroupApi } from "@/controllers/API/pro";
import { getAdminsApi, getUserGroupTreeApi, getUserPositionApi, saveUserGroup, saveUserPositionApi, updateUserGroup } from "@/controllers/API/user";
import { captureAndAlertRequestErrorHoc } from "@/controllers/request";
import { useTable } from "@/util/hook";
import { CircleHelp } from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input, SearchInput } from "../../../components/bs-ui/input";
import { useQuery } from "react-query";
import PositionSelect from "@/components/bs-comp/selectComponent/Positions";

export default function EditUserGroupManages({ onChange }) {
    const { t } = useTranslation()
    const { toast } = useToast() // 类似于alert

    const [form, setForm] = useState({
        groupName: '',
        adminUser: '',
        groupLimit: 0,
        positions: [],
    })
    const [options, setOptions] = useState([])
    
    const handleSave = async () => {
        const positionObj = {}
        options.forEach(element => {
            const selectedPositions = form.positions.map(pos => pos.value)
            if (selectedPositions.includes(element.value)) {
                positionObj[element.value] = true
            }else{
                positionObj[element.value] = false
            }
        });
        await captureAndAlertRequestErrorHoc(saveUserPositionApi(positionObj).then(
            (res) => {
                toast({ title: t('prompt'), description: '保存成功', variant: 'success' });
                onChange(true);
            }
        ))
    }

    useEffect(() => {
        init()
    }, [])

    const init = async () => {
        const res = await getUserPositionApi()
        const resOptions = Object.keys(res).map(key => ({
            label: key,
            value: key
        })) || [];
        const selectedOptions = Object.keys(res).filter(key => res[key]).map(key => ({
            label: key,
            value: key
        })) || [];
        setOptions(resOptions)
        setForm({
            ...form,
            positions: selectedOptions
        })
    }

 
    return <div className="max-w-[630px] mx-auto pt-4 h-[calc(100vh-128px)] overflow-y-auto pb-10 scrollbar-hide">
        <div className="font-bold mt-4">
            <p className="text-xl mb-4">部门默认管理员
                <QuestionTooltip
                    content={'选择对应“用户职位”成为部门默认管理员，则该用户职位自动管理本部门及其子部门的成员和数据。'}
                />
            </p>
            <PositionSelect
                multiple
                value={form.positions}
                onChange={(positions) => setForm({ ...form, positions })}
            />
        </div>
        <div className="flex justify-center items-center absolute bottom-0 w-[630px] h-[8vh] gap-4 mt-[100px] bg-background-login">
            <Button variant="outline" className="px-16" onClick={onChange}>{t('cancel')}</Button>
            <Button className="px-16" onClick={handleSave}>{t('save')}</Button>
        </div>
    </div>
}
