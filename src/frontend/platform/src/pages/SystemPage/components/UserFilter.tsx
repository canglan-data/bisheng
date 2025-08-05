import { useMemo, useState } from "react";
import { FilterIcon } from "@/components/bs-icons/filter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/bs-ui/popover";
import FilterUserGroup from "@/components/bs-ui/select/filter";
import FilterTreeUserGroup from "@/components/bs-ui/select/treeFilter";

export function UsersFilter({ options, onChecked, nameKey, placeholder, onFilter, byTree = false }) {
    const [open, setOpen] = useState(false)
    const [_value, setValue] = useState([])
    const [searchKey, setSearchKey] = useState('')
    // 点击 checkbox
    const handlerChecked = (id) => {
        setValue(val => {
            const index = val.indexOf(id)
            index === -1 ? val.push(id) : val.splice(index, 1)
            return [...val]
        })
        // 已选项上浮
        const checked = options.filter(o => _value.includes(o.id))
        const uncheck = options.filter(o => !_value.includes(o.id))
        onChecked([...checked, ...uncheck])
    }

    const filterData = () => {
        onFilter(_value)
        setOpen(false)
    }
    // 搜索
    const _options = useMemo(() => {
        if (!searchKey) return options
        return options.filter(a => a[nameKey].toUpperCase().includes(searchKey.toUpperCase()))
    }, [searchKey, options])
    // 重置
    const reset = () => {
        setValue([])
        setSearchKey('')
    }

    return <Popover open={open} onOpenChange={(bln) => { setOpen(bln); setSearchKey('') }}>
        <PopoverTrigger>
            {/* @ts-ignore */}
            <FilterIcon onClick={() => setOpen(!open)} className={_value.length ? 'text-primary ml-3' : 'text-gray-400 ml-3'} />
        </PopoverTrigger>
        <PopoverContent>
            {byTree ? 
                <FilterTreeUserGroup
                    value={_value}
                    options={_options}
                    nameKey={nameKey}
                    placeholder={placeholder}
                    onChecked={handlerChecked}
                    search={(e) => setSearchKey(e.target.value)}
                    onClearChecked={reset}
                    onOk={filterData}
                />
                : <FilterUserGroup
                    value={_value}
                    options={_options}
                    nameKey={nameKey}
                    placeholder={placeholder}
                    onChecked={handlerChecked}
                    search={(e) => setSearchKey(e.target.value)}
                    onClearChecked={reset}
                    onOk={filterData}
            />}
        </PopoverContent>
    </Popover>
}