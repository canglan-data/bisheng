import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/bs-ui/button";
import { SearchInput } from "@/components/bs-ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/bs-ui/tabs";
import ShadTooltip from "@/components/ShadTooltipComponent";
import { deleteParseStrategy, getParseStrategyList } from "@/controllers/API";
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
import { bsConfirm } from "@/components/bs-ui/alertDialog/useConfirm";
import { captureAndAlertRequestErrorHoc } from "@/controllers/request";
import ParseStrategyDetail from "./ParseStrategyDetail";
import { message } from "@/components/bs-ui/toast/use-toast";

export default function ParseSettingModelConfig() {
    const { t } = useTranslation()
    const navigate = useNavigate()

    const [showDetatilModel, setShowDetatilModel] = useState(false)
    const [editId, setEditId] = useState('')

    const { page, pageSize, data: datalist, total, loading, setPage, search, reload } = useTable({ cancelLoadingWhenReload: true }, (param) =>
        getParseStrategyList({ ...param, name: param.keyword })
    )

    const handleDelete = (id: string) => {
        bsConfirm({
            title: t('prompt'),
            desc: t('lib.confirmDeleteParse'),
            onOk(next) {
                captureAndAlertRequestErrorHoc(deleteParseStrategy(id).then(res => {
                    message({
                        variant: 'success',
                        description: '删除成功'
                    })
                    reload();
                }));
                next()
            },
        })
    }

    if (showDetatilModel) return <ParseStrategyDetail editId={editId} onBack={() => {
        setShowDetatilModel(false);
        reload();
    }} />
    
    return <div className="px-2 py-4 size-full pb-20 relative overflow-y-auto">
        <div className="">
            <div className="flex justify-between">
                <div className="flex items-center gap-x-3">
                    <ShadTooltip content={t('back')} side="right">
                        <button className="extra-side-bar-buttons w-[36px]" onClick={() => {
                             navigate(-1);
                         }}>
                            <ArrowLeft strokeWidth={1.5} className="side-bar-button-size" />
                        </button>
                    </ShadTooltip>
                    <span>{t('lib.libraryParseSetting')}</span>
                </div>
                <div className="flex justify-end gap-4 items-center right-0 top-[-44px]">
                    <SearchInput placeholder="搜索解析策略名称" onChange={(e) => search(e.target.value)} />
                    <Button className="px-8 text-[#FFFFFF]" onClick={() => {
                        setEditId('');
                        setShowDetatilModel(true);
                    }}>{t('create')}</Button>
                </div>
            </div>
            <div className="pb-20">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('lib.id')}</TableHead>
                            <TableHead>{t('lib.ParseName')}</TableHead>
                            <TableHead>{t('createTime')}</TableHead>
                            <TableHead>{t('lib.createUser')}</TableHead>
                            <TableHead className="text-right">{t('operations')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {datalist.map((el: any) => (
                            <TableRow key={el.id}>
                                <TableCell>{el.id}</TableCell>
                                <TableCell className="font-medium">
                                    {/* TODO: 如果是默认的需要搞一个标签 */}
                                    <div className="truncate-multiline flex items-center">
                                        {el.name}
                                        {el.is_default && <label className="text-xm bg-[#E0E7F7] text-pirmary block">默认</label>}
                                    </div>
                                    
                                </TableCell>
                                <TableCell>{el.create_time.replace('T', ' ')}</TableCell>
                                <TableCell className=" break-all">
                                    <div className=" truncate-multiline">{el.user_name || '--'}</div>
                                </TableCell>
                                <TableCell className="text-right" onClick={() => {
                                    // @ts-ignore
                                    window.parsename = [el.name, el.description];
                                }}>
                                    <Button variant="link" onClick={() => {
                                        setShowDetatilModel(true);
                                        setEditId(el.id);
                                    }} className="text-primary px-0 pl-2">{t('lib.details')}</Button>
                                    <Button variant="link" onClick={() => handleDelete(el.id)} className="text-red-500 px-0 pl-2">{t('delete')}</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="bisheng-table-footer px-6 bg-background-login">
                    <p className="desc">{t('lib.libraryParseSetting')}</p>
                    <div>
                        <AutoPagination
                            page={page}
                            pageSize={pageSize}
                            total={total}
                            onChange={(newPage) => setPage(newPage)}
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
}