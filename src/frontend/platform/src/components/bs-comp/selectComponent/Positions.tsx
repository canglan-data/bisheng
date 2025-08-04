import MultiSelect from "@/components/bs-ui/select/multi";
import { getUserPositionApi, getUsersApi } from "@/controllers/API/user";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function PositionSelect({ multiple = false, lockedValues = [], value, disabled = false, onChange, children }:
    { multiple?: boolean, lockedValues?: any[], value: any, disabled?: boolean, onChange: (a: any) => any, children?: (fun: any) => React.ReactNode }) {

    const { t } = useTranslation()
    const [options, setOptions] = useState<any>([]);
    const [keyword, setKeyword] = useState('')

    const pageRef = useRef(1)
    const reload = (page, name) => {
        setKeyword(name);
        getUserPositionApi().then(res => {
            const opts = Object.keys(res).map(key => ({
                label: key,
                value: key
            })) || [];
            setOptions(_ops => page > 1 ? [..._ops, ...opts] : opts)
        })
    }

    useEffect(() => {
        reload(1, '')
    }, [])

    // 加载更多
    const loadMore = (name) => {
        // reload(pageRef.current + 1, name)
    }

    return <MultiSelect
        contentClassName=" max-w-[630px]"
        multiple={multiple}
        value={value}
        lockedValues={lockedValues}
        disabled={disabled}
        options={options.filter(item => {
            if (keyword) {
                return item.label.includes(keyword)
            }
            return true
        })}
        placeholder={'选择用户职位'}
        searchPlaceholder={'搜索用户职位'}
        onChange={onChange}
        onLoad={() => reload(1, '')}
        onSearch={(val) => reload(1, val)}
        onScrollLoad={(val) => loadMore(val)}
    >
        {children?.(reload)}
    </MultiSelect>
};
