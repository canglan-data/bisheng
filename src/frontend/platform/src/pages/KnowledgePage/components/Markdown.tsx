import { Label } from "@/components/bs-ui/label";
import { Switch } from "@/components/bs-ui/switch";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import AceEditor from "react-ace";
import { useTranslation } from "react-i18next";
import Vditor from 'vditor';
import 'vditor/dist/index.css';

const VditorEditor = forwardRef(({ edit, markdown, hidden }, ref) => {
    const vditorRef = useRef(null);
    const readyRef = useRef(false);
    const valurCacheRef = useRef('');

    useEffect(() => {
        // console.log('markdown :>> ', markdown);
        const processedMarkdown = markdown?.replace(/^( {4,})/gm, '   ')
        .replaceAll('(bisheng/', '(/bisheng/') || ''

        if (!hidden && vditorRef.current && readyRef.current) {
            vditorRef.current.setValue(processedMarkdown);
        } else {
            valurCacheRef.current = processedMarkdown;
        }
    }, [markdown, hidden])

    useImperativeHandle(ref, () => ({
        getResult() {
            return vditorRef.current.getValue()
        }
    }))

    useEffect(() => {
        vditorRef.current = new Vditor('vditor', {
            cdn: location.origin + '/vditor',
            height: '100%',
            toolbarConfig: {
                hide: true,
                pin: true,
            },
            mode: 'ir',  // 'sv' for split view, 'ir' for instant rendering
            preview: {
                markdown: {
                    toc: true,
                    mark: true,
                },
                math: {
                    "inlineDigit": true
                }
            },
            cache: {
                enable: false,
            },
            after: () => {
                console.log('Vditor is ready');
                readyRef.current = true;

                if (valurCacheRef.current) {
                    vditorRef.current.setValue(valurCacheRef.current);
                }
                !edit && vditorRef.current.disabled();
            },
        });

        return () => {
            vditorRef.current.destroy();
        };
    }, []);

    // vditorRef.current.getValue()
    // vditorRef.current.getHTML();
    // vditorRef.current.getText();
    return <div id="vditor" className={`${hidden ? 'hidden' : ''} overflow-y-auto`}></div>;
});

const AceEditorCom = ({ markdown, hidden, onChange }) => {

    if (hidden) return null

    return <AceEditor
        value={markdown || ''}
        mode="markdown"
        theme={"twilight"}
        highlightActiveLine={true}
        showPrintMargin={false}
        fontSize={14}
        showGutter
        enableLiveAutocompletion
        name="CodeEditor"
        onChange={onChange}
        onValidate={(e) => console.error('ace validate :>> ', e)}
        className="h-full w-full rounded-lg border-[1px] border-border custom-scroll"
    />
}

export default forwardRef(function Markdown({ edit, isUns, title, q, value, chunkHeader }, ref) {
    const [val, setValue] = useState('')
    const [cap, setCapter] = useState(undefined)
    const [isAce, setIsAce] = useState(false)
    const { t } = useTranslation('knowledge')
    useEffect(() => {
        setValue(value);
        setCapter(chunkHeader);
    }, [value, chunkHeader])

    const valueVditorRef = useRef(null)
    const capterVditorRef = useRef(null)

    const hasChunkHeader = typeof chunkHeader === 'string';

    useImperativeHandle(ref, () => ({
        getValue() {
            const _value = isAce ? val : valueVditorRef.current.getResult()
            return _value
        },
        getCapter() {
            if (!hasChunkHeader) return undefined;
            const _value = isAce ? cap : capterVditorRef.current.getResult() 
            return _value
        },
        setValue(_value) {
            setValue(_value)
        },
        setCapter(_value) {
            setCapter(_value)
        }
    }))

    const hangleCheckChagne = (checked) => {
        if (!checked) {
            setValue(valueVditorRef.current.getResult())
            if (hasChunkHeader) setCapter(capterVditorRef.current.getResult())
        }
        setIsAce(!checked)
    }

    {/* markdown */ }
    return <div >
        <div className="flex justify-between items-center mb-2 h-10">
            <Label>
                <span className="text-red-500">*</span>
                #{q} {t('splitContent')}
            </Label>
            {!isUns && <span>{title}</span>}
            {edit && <div className="flex items-center gap-2">
                <Label>{t('markdownPreview')}</Label>
                <Switch checked={!isAce} onCheckedChange={hangleCheckChagne} />
            </div>}
        </div>
        <div className="border mb-2 h-[calc(100vh-104px)] flex flex-col">
            {hasChunkHeader && (
                <div className="h-[10%] border-b">
                    <AceEditorCom hidden={!isAce} markdown={cap} onChange={setCapter} />
                    <VditorEditor ref={capterVditorRef} edit={edit} hidden={isAce} markdown={cap} />
                </div>
            )}
            <div className={hasChunkHeader ? "h-[90%]" : "h-full"}>
                <AceEditorCom hidden={!isAce} markdown={val} onChange={setValue} />
                <VditorEditor ref={valueVditorRef} edit={edit} hidden={isAce} markdown={val} />
            </div>
        </div>
    </div >
});
