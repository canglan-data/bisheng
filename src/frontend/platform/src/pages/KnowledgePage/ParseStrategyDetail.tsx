import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/bs-ui/button";
import { Input, SearchInput } from "@/components/bs-ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/bs-ui/tabs";
import ShadTooltip from "@/components/ShadTooltipComponent";
import { getParseStrategyList } from "@/controllers/API";
import { useTable } from "@/util/hook";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/bs-ui/table";
import AutoPagination from "@/components/bs-ui/pagination/autoPagination";
import { Checkbox } from "@/components/bs-ui/checkBox";
import Tip from "@/components/bs-ui/tooltip/tip";

export default function ParseStrategyDetail({editId, onBack}: {editId: string, onBack: () => void}) {
    const { t } = useTranslation()
    const navigate = useNavigate()

    const [showDetatilModel, setShowDetatilModel] = useState(false)

    // const []

    const isEdit = !!editId;

    const { page, pageSize, data: datalist, total, loading, setPage, search, reload } = useTable({ cancelLoadingWhenReload: true }, (param) =>
        getParseStrategyList({ ...param, name: param.keyword })
    )

    const handleDelete = (id: string) => {

    }

    const handleSubmit = (isEdit: boolean) => {
        const params = {

        };

        if (isEdit) {
            // 调用修改接口

        } else {
            // 调用新建接口

        }
    }

    return <div className="px-2 py-4 size-full pb-20 relative overflow-y-auto">
        <div className="">
            <div className="flex items-center gap-x-3">
                <ShadTooltip content={t('back')} side="right">
                    <button className="extra-side-bar-buttons w-[36px]" onClick={() => {onBack()}}>
                        <ArrowLeft strokeWidth={1.5} className="side-bar-button-size" />
                    </button>
                </ShadTooltip>
                <span>{isEdit ? t('lib.editParseStrategy') : t('lib.createParseStrategy')}</span>
            </div>
            <div className="pl-10 pt-10 pr-20">
                <p className="text-base pb-2">{"解析策略名称"}</p>
                <Input placeholder="请输入解析策略名称" />
                <div className="flex pt-4 gap-2 items-center text-sm">
                    <Checkbox id="terms" />
                    <p className="text-gray-400">{"设为默认策略"}
                        <Tip content={"123"} side="top">1234</Tip>
                    </p>
                </div>
                <div className="bisheng-table-footer px-6 bg-background-login">
                    <p className="desc">{t('lib.libraryParseSetting')}</p>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => onBack()} className="px-8">{t('lib.cancel')}</Button>
                        <Button onClick={() => handleSubmit(el.id)} className="px-8">{isEdit ? t('lib.save') : t('lib.cearte')}</Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
}