import { Checkbox } from "@/components/bs-ui/checkBox";
import { Input } from "@/components/bs-ui/input";
import { Label } from "@/components/bs-ui/label";
import { locationContext } from "@/contexts/locationContext";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import FileUploadSplitStrategy from "./FileUploadSplitStrategy";
import { QuestionTooltip } from "@/components/bs-ui/tooltip";
import { Switch } from "@/components/bs-ui/switch";

export default function RuleFile({
    rules,
    setRules,
    strategies,
    setStrategies,
}) {
    const { appConfig } = useContext(locationContext)
    const { t } = useTranslation('knowledge');
    const handleSettingChange = (key, value) => {
        setRules((prevRules) => ({
            ...prevRules,
            [key]: value,
        }));
    }

    return (
        <div className="flex-1 flex flex-col relative max-w-[760px] mx-auto">
            <div
                className="flex flex-col gap-4"
                style={{ gridTemplateColumns: '114px 1fr' }}
            >
                <div className="space-y-4 p-4 border rounded-lg">
                    {/* 顶部标题 - 作为整个容器的标题 */}
                    <h3 className="font-bold text-gray-800 text-left text-md">
                        {t('splitSettings')}
                    </h3>

                    {/* 输入框组 - 水平排列 */}
                    <div className="flex gap-4">
                        {/* 第一个输入项 */}
                        <div className="w-1/2 flex items-center gap-3">
                            <Label htmlFor="splitLength" className="whitespace-nowrap text-sm min-w-[100px]">
                                {t('splitLength')}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="splitLength"
                                    type="number"
                                    step="100"
                                    min={0}
                                    value={rules.chunkSize}
                                    onChange={(e) => handleSettingChange('chunkSize', e.target.value)}
                                    placeholder={t('splitSizePlaceholder')}
                                    className="flex-1 min-w-[150px]"
                                    onBlur={(e) => {
                                        !e.target.value && handleSettingChange('chunkSize', '1000');
                                    }}
                                />
                                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400">字符</span>
                            </div>
                        </div>

                        {/* 第二个输入项 */}
                        <div className="w-1/2 flex items-center gap-3">
                            <Label htmlFor="chunkOverlap" className="whitespace-nowrap text-sm min-w-[100px]">
                                {t('chunkOverlap')}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="chunkOverlap"
                                    type="number"
                                    step="10"
                                    min={0}
                                    value={rules.chunkOverlap}
                                    onChange={(e) => handleSettingChange('chunkOverlap', e.target.value)}
                                    placeholder={t('chunkOverlapPlaceholder')}
                                    className="flex-1 min-w-[150px]"
                                    onBlur={(e) => {
                                        !e.target.value && handleSettingChange('chunkOverlap', '0');
                                    }}
                                />
                                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400">字符</span>
                            </div>
                        </div>
                    </div>
                    {/* 新增的勾选框字段 - 左下方 */}
                    <div className="flex items-center gap-2 pt-2">
                        <Checkbox
                            id="retain"
                            checked={rules.retainImages}
                            onCheckedChange={(checked) => handleSettingChange('retainImages', checked)}
                        />
                        <Label htmlFor="keepImages" className="text-sm text-gray-700 flex items-center">
                            {t('keepImages')}
                            <QuestionTooltip content="解析时将保留文档中的图片内容， 以支持问答时图文并茂的回复。" />
                        </Label>
                    </div>
                </div>
                <div className=" p-4 border rounded-lg">
                    <Label htmlFor="splitMethod" className="flex justify-start text-md text-left font-bold text-gray-800">
                        {t('splitMethod')}
                    </Label>
                    <FileUploadSplitStrategy data={strategies} onChange={setStrategies} />
                </div>
                <div className=" p-4 border rounded-lg">
                    <Label htmlFor="levelSplitRules" className="flex justify-start text-md text-left font-bold text-gray-800">
                        <div className="flex gap-2 items-center">
                            {t('levelSplitRules')}
                            <QuestionTooltip content={<img src={__APP_ENV__.BASE_URL + '/assets/knowledge/level-split.png'} alt="level_split" className='block w-[384px] h-[223px]' />} />
                            <Switch
                                id="chunkByChapter"
                                checked={rules.chunkByChapter}
                                onCheckedChange={(checked) => handleSettingChange('chunkByChapter', checked)}
                            />
                        </div>
                    </Label>
                    {rules.chunkByChapter && <div>
                        <p className='text-xs text-gray-500 pt-1 pb-6'>{t('levelSplitHint')}</p>
                        <div className="flex items-center flex-wrap">
                            <div className="w-1/2 flex items-center gap-3">
                                <Label htmlFor="splitLength" className="whitespace-nowrap text-sm min-w-[100px]">
                                    {t('levelSplit')}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="splitLength"
                                        type="number"
                                        step="1"
                                        min={1}
                                        max={5}
                                        value={rules.chunkLevel}
                                        onChange={(e) => handleSettingChange('chunkLevel', e.target.value)}
                                        placeholder={t('splitSizePlaceholder')}
                                        className="flex-1 min-w-[150px]"
                                        onBlur={(e) => {
                                            !e.target.value && handleSettingChange('chunkLevel', '3');
                                        }}
                                    />
                                    <span className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400">层</span>
                                </div>
                            </div>
            
                            <div className="w-1/2 flex items-center gap-2">
                                <Checkbox
                                    id="_chunkAddChapter"
                                    checked={rules.chunkAddChapter}
                                    onCheckedChange={(checked) => handleSettingChange('chunkAddChapter', checked)}
                                />
                                <Label htmlFor="keepImages" className="text-sm text-gray-700 flex items-center">
                                    {t('levelSplitAddTitle')}
                                    <QuestionTooltip content={<img src={__APP_ENV__.BASE_URL + '/assets/knowledge/split-add-title.png'} alt="split_add_title" className='block w-[384px] h-[153px]' />} />
                                </Label>
                            </div>

                            <div className="w-1/2 flex items-center gap-3 pt-4">
                                <Label htmlFor="splitLength" className="whitespace-nowrap text-sm min-w-[100px]">
                                    {t('splitLength')}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="splitLength"
                                        type="number"
                                        step="100"
                                        min={0}
                                        value={rules.headerChunkSize}
                                        onChange={(e) => handleSettingChange('headerChunkSize', e.target.value)}
                                        placeholder={t('splitSizePlaceholder')}
                                        className="flex-1 min-w-[150px]"
                                        onBlur={(e) => {
                                            !e.target.value && handleSettingChange('headerChunkSize', '1000');
                                        }}
                                    />
                                    <span className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400">字符</span>
                                </div>
                            </div>
                        </div>
                    </div>}
                </div>
                {
                    appConfig.enableEtl4lm && <div className="space-y-4 p-4 border rounded-lg">
                        {/* 顶部标题 - 作为整个容器的标题 */}
                        <h3 className="text-md font-bold text-gray-800 text-left ">
                            {t('pdfAnalysis')}
                        </h3>
                        {/* 新增的勾选框字段 - 左下方 */}
                        <div className="flex items-center gap-2 pt-2">
                            <Checkbox
                                checked={rules.forceOcr}
                                onCheckedChange={(checked) => handleSettingChange('forceOcr', checked)}
                            />
                            <Label htmlFor="ocrForce" className="text-sm text-gray-700">
                                {t('ocrForce')}
                            </Label>
                            <Checkbox
                                checked={rules.enableFormula}
                                onCheckedChange={(checked) => handleSettingChange('enableFormula', checked)}
                            />
                            <Label htmlFor="enableRec" className="text-sm text-gray-700">
                                {t('enableRec')}
                            </Label>
                        </div>
                    </div>
                }
            </div>
        </div>
    )
}
