import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/bs-ui/button";
import { Input, SearchInput } from "@/components/bs-ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/bs-ui/tabs";
import ShadTooltip from "@/components/ShadTooltipComponent";
import { createParseStrategy, editParseStrategy, getParseStrategy, getParseStrategyList } from "@/controllers/API";
import { useTable } from "@/util/hook";
import { ArrowLeft } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
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
import { cn } from "@/util/utils";
import RuleTable from "./components/RuleTable";
import RuleFile from "./components/RuleFile";
import { captureAndAlertRequestErrorHoc } from "@/controllers/request";
import { QuestionTooltip } from "@/components/bs-ui/tooltip";
import { message } from "@/components/bs-ui/toast/use-toast";

const initialStrategies = [
    { id: '1', regex: '\\n\\n', position: 'after', rule: '双换行后切分，用于分隔段落' },
    { id: '2', regex: '\\n', position: 'after', rule: '单换行后切分，用于分隔普通换行' }
];

export default function ParseStrategyDetail({editId, onBack}: {editId: string, onBack: () => void}) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [showDetatilModel, setShowDetatilModel] = useState(false)

    const [data, setData] = useState({
        name: '',
        is_default: false,
    })

    const {
        rules,
        setRules,
        applyEachCell,
        setApplyEachCell,
        cellGeneralConfig,
        setCellGeneralConfig,
        strategies,
        setStrategies
    } = useFileProcessingRules(initialStrategies);

    const isEdit = !!editId;

    const fetchDetail = async () => {
        const res = await getParseStrategy(editId);
        const { name, is_default, content } = res;
        const { cellGeneralConfig, ...rules} = content;
        setData({
            name: name,
            is_default: !!is_default,
        })
        setRules(rules);
        setCellGeneralConfig(cellGeneralConfig);
    }

    useEffect(() => {
        if (isEdit) {
            fetchDetail()
        }
    }, [editId])

    const handleSubmit = () => {
        const { 
            pageHeaderFooter, 
            chunkOverlap, 
            chunkSize,
            enableFormula, 
            forceOcr,
            retainImages,
            separator,
            separatorRule,
            chunkByChapter,
            chunkLevel,
            chunkAddChapter,
            headerChunkSize
        } = rules;
        
        const params = {
            ...data,
            content: {
                separator,
                separator_rule: separatorRule,
                chunk_size: chunkSize,
                chunk_overlap: chunkOverlap,
                retain_images: retainImages,
                enable_formula: enableFormula,
                force_ocr: forceOcr,
                fileter_page_header_footer: pageHeaderFooter,
                enable_header_split: chunkByChapter,
                header_split_max_level: chunkLevel,
                enable_header_split_chunk_chapter: chunkAddChapter,
                header_split_chunk_size: headerChunkSize,
                cellGeneralConfig: cellGeneralConfig,
            }
        };

        if (isEdit) {
            // 调用修改接口
            captureAndAlertRequestErrorHoc(editParseStrategy(editId, params).then(() => {
                message({
                    variant: 'success',
                    description: '保存成功'
                });
                onBack();
            }));
        } else {
            // 调用新建接口
            captureAndAlertRequestErrorHoc(createParseStrategy(params).then(() => {
                message({
                    variant: 'success',
                    description: '创建成功'
                })
                onBack();
            }));
        }
    }

    return <div className="px-2 py-4 size-full pb-20 relative">
        <div className="h-full">
            <div className="flex items-center gap-x-3">
                <ShadTooltip content={t('back')} side="right">
                    <button className="extra-side-bar-buttons w-[36px]" onClick={() => {onBack()}}>
                        <ArrowLeft strokeWidth={1.5} className="side-bar-button-size" />
                    </button>
                </ShadTooltip>
                <span>{isEdit ? t('lib.editParseStrategy') : t('lib.createParseStrategy')}</span>
            </div>
            <div className="h-full pl-10 pt-8 pr-20 overflow-y-auto">
                <p className="text-base pb-2">{"解析策略名称"}</p>
                <Input
                    id="name"
                    maxLength={50}
                    value={data.name}
                    onChange={(e) => {
                        setData({
                            ...data,
                            name: e.target.value,
                        })
                    }} placeholder="请输入解析策略名称" />
                <div className="flex pt-4 gap-2 items-center text-sm">
                    <Checkbox
                        checked={data.is_default}
                        onCheckedChange={(checked: boolean) => {
                            setData({
                                ...data,
                                is_default: checked,
                            })
                        }}
                        id="is_default" />
                    <p className="text-gray-400">{"设为默认策略"}
                        <QuestionTooltip content={'勾选后，会将此解析策略设置为默认解析策略'} />
                    </p>
                </div>
                <div className={cn("flex flex-col max-w-[760px] pt-4 pb-8")}>
                    <Tabs
                        defaultValue={'file'}
                        className="flex flex-col h-full"
                    >
                        {/* 标签页头部 */}
                        <div className="">
                            <TabsList className="">
                                <TabsTrigger id="knowledge_file_tab" value="file" className="roundedrounded-xl">{t('lib.defaultStrategy')}</TabsTrigger>
                                <TabsTrigger id="knowledge_table_tab" value="table">{t('lib.customStrategy')}</TabsTrigger>
                            </TabsList>
                        </div>
                        {/* 文件文档设置 */}
                        <TabsContent value="file">
                            <Suspense>
                                <RuleFile
                                    rules={rules}
                                    setRules={setRules}
                                    strategies={strategies}
                                    setStrategies={setStrategies}
                                />
                            </Suspense>
                        </TabsContent>
                        {/* 表格文档设置 */}
                        <TabsContent value="table">
                            <Suspense>
                                <RuleTable
                                    rules={rules}
                                    setRules={setRules}
                                    forTemplate
                                    applyEachCell={applyEachCell}
                                    setApplyEachCell={setApplyEachCell}
                                    cellGeneralConfig={cellGeneralConfig}
                                    setCellGeneralConfig={setCellGeneralConfig}
                                />
                            </Suspense>
                        </TabsContent>
                        
                    </Tabs>
                </div>
                <div className="bisheng-table-footer px-6 bg-background-login">
                    <p className="desc">{t('lib.libraryParseSetting')}</p>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => onBack()} className="px-8">{t('lib.cancel')}</Button>
                        <Button onClick={() => handleSubmit()} className="px-8">{isEdit ? t('lib.save') : t('lib.cearte')}</Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
}

const useFileProcessingRules = (initialStrategies) => {
    const [rules, setRules] = useState({
            separator: ['\\n\\n', '\\n'],
            separatorRule: ['after', 'after'],
            chunkSize: "1000",
            chunkOverlap: "0",
            retainImages: true,
            enableFormula: true,
            forceOcr: true,
            pageHeaderFooter: true,
            // 是否按章节切分
            chunkByChapter: false,
            // 切分层级
            chunkLevel: '3',
            // 切片追加章节标题
            chunkAddChapter: true,
            // 层级切分下的size
            headerChunkSize: "1000",
        });
    const [applyEachCell, setApplyEachCell] = useState(false); // 为每个表格单独设置
    const [cellGeneralConfig, setCellGeneralConfig] = useState({
        slice_length: 10,
        append_header: true,
        header_start_row: 1,
        header_end_row: 1
    });
    const [strategies, setStrategies] = useState(initialStrategies);

    // Update rules when strategies change
    useEffect(() => {
        const [separator, separatorRule] = strategies.reduce(([_separator, _separatorRule], strategy) => {
            const { regex, position } = strategy;
            return [[..._separator, regex], [..._separatorRule, position]];
        }, [[], []]);

        setRules(prev => ({
            ...prev,
            separator,
            separatorRule
        }));    
    }, [strategies]);

    return {
        rules,
        setRules,
        applyEachCell,
        setApplyEachCell,
        cellGeneralConfig,
        setCellGeneralConfig,
        strategies,
        setStrategies
    };
};