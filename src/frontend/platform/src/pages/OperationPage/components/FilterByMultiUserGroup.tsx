import { useRef, useState } from "react";
import { getSendEmailGroupsApi } from "@/controllers/API/log";
import { buildUserGroupTreeOptimized } from "@/util/utils";
import { Select, SelectContent, SelectTrigger } from "@/components/bs-ui/select";
import { Badge } from "@/components/bs-ui/badge";
import { SearchInput } from "@/components/bs-ui/input";
import { Checkbox } from "@/components/bs-ui/checkBox";
import { X, ChevronRight } from "lucide-react";
import { cname } from "@/components/bs-ui/utils";
import { generateUUID } from "@/utils";

// 多选层级用户组组件
export default function FilterByMultiUserGroup({ value = [], onChange }) {
    const { groups, loadData, searchData } = useGroups();

    return (
        <div className="w-auto relative">
            <MultiLevelSelect
                options={groups}
                value={value}
                onChange={onChange}
                onSearch={searchData}
                onLoad={loadData}
                placeholder="用户组织架构"
            />
        </div>
    );
}

// 多级选择组件
const MultiLevelSelect = ({ 
    options = [], 
    value = [], 
    onChange, 
    onSearch,
    onLoad,
    placeholder = "",
    className = "",
    contentClassName = "overflow-y-auto max-w-auto"
}) => {
    const [open, setOpen] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const inputRef = useRef(null);
    const idRef = useRef(generateUUID(4));

    // 处理下拉框打开/关闭
    const handleOpenChange = (isOpen) => {
        setOpen(isOpen);
        // 当下拉框打开时，每次都加载数据
        if (isOpen) {
            onLoad?.();
        }
    };

    // 处理搜索
    const handleSearch = (e) => {
        onSearch?.(e?.target?.value || '');
    };

    // 处理选择/取消选择
    const handleSelect = (node) => {
        const nodeValue = { value: node.id, label: node.group_name };
        const isSelected = value.some(item => item.value === node.id);
        
        let newValue;
        if (isSelected) {
            newValue = value.filter(item => item.value !== node.id);
        } else {
            newValue = [...value, nodeValue];
        }
        
        onChange(newValue);
    };

    // 切换展开/折叠状态
    const toggleExpand = (nodeId) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    };

    // 递归渲染树形结构
    const renderTree = (nodes, level = 0) => {
        // 只渲染到二级
        if (level > 2) return null;
        
        return nodes.map((node) => {
            const isExpanded = expandedNodes.has(node.id);
            const isSelected = value.some(item => item.value === node.id);
            const hasChildren = node.children && node.children.length > 0;

            return (
                <div key={node.id} className="pl-2">
                    <div
                        className={`flex items-center gap-2 cursor-pointer hover:bg-blue-100 rounded-md p-1`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => handleSelect(node)}
                        />
                        
                        {hasChildren && (
                            <ChevronRight
                                size={18}
                                className={`cursor-pointer ${isExpanded ? 'rotate-90' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(node.id);
                                }}
                            />
                        )}
                        
                        <span onClick={() => handleSelect(node)}>{node.group_name}</span>
                    </div>
                    
                    {/* 递归渲染子节点，但限制最多二级 */}
                    {isExpanded && hasChildren && level < 2 && (
                        <div className="pl-4">{renderTree(node.children, level + 1)}</div>
                    )}
                </div>
            );
        });
    };

    // 清除所有选择
    const handleClearAll = () => {
        onChange([]);
    };

    return (
        <Select open={open} onOpenChange={handleOpenChange}>
            <SelectTrigger className={cname(`group min-h-9 py-1 h-auto`, className)}>
                <div className="text-foreground inline-flex flex-1 flex-row justify-between items-center overflow-hidden">
                    {value.length > 0 ? (
                        <div className="flex flex-wrap w-full">
                            {value.map(item => (
                                <Badge 
                                    key={item.value}
                                    onPointerDown={(e) => e.stopPropagation()} 
                                    className="flex whitespace-normal items-center gap-1 select-none bg-primary/20 text-primary hover:bg-primary/15 m-[2px]"
                                >
                                    {item.label}
                                    <X 
                                        className="h-3 w-3 min-w-3" 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onChange(value.filter(val => val.value !== item.value));
                                        }}
                                    />
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-600">{placeholder}</div>
                    )}
                    
                    {value.length > 0 && (
                        <X
                            className="group-hover:block hidden bg-border text-[#666] rounded-full p-0.5 min-w-[14px] mt-1"
                            width={14}
                            height={14}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={handleClearAll}
                        />
                    )}
                </div>
            </SelectTrigger>
            
            <SelectContent
                id={idRef.current}
                className={contentClassName}
                headNode={
                    <div className="p-2">
                        <SearchInput 
                            ref={inputRef} 
                            inputClassName="h-8 dark:border-gray-700" 
                            placeholder="搜索用户组织架构" 
                            onChange={handleSearch} 
                            iconClassName="w-4 h-4" 
                        />
                    </div>
                }
            >
                <div className="overflow-y-auto max-h-60">
                    <div className="p-2">{renderTree(options)}</div>
                </div>
            </SelectContent>
        </Select>
    );
};

const useGroups = () => {
    const [groups, setGroups] = useState([]);
    const [flatGroups, setFlatGroups] = useState([])
    const loadLock = useRef(false);
    const keyWordRef = useRef("");

    // 加载用户组数据
    const loadData = async (name = '') => {
        try {
            if (loadLock.current) return;
            loadLock.current = true;
            
            const res = await getSendEmailGroupsApi({ keyword: name, page: 1, page_size: 5000 });
            const options = buildUserGroupTreeOptimized(res.records);
            keyWordRef.current = name;
            setGroups(options);
            setFlatGroups(res.records)
            setTimeout(() => {
                loadLock.current = false;
            }, 500);
        } catch (error) {
            console.error("Error loading groups:", error);
            loadLock.current = false;
        }
    };

    return {
        groups,
        flatGroups,
        loadData,
        searchData: loadData
    };
};