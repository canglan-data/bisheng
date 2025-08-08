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
    const { groups, loadData, flatGroups, searchData } = useGroups();

    return (
        <div className="w-auto relative">
            <MultiLevelSelect
                options={groups}
                flatGroups={flatGroups}
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
    flatGroups = [],
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

    // 获取所有后代节点ID
    const getAllDescendants = (nodeId) => {
        const descendants = [nodeId];
        const findChildren = (id) => {
            const children = flatGroups.filter(g => g.parent_id === id);
            children.forEach(child => {
                descendants.push(child.id);
                findChildren(child.id);
            });
        };
        findChildren(nodeId);
        return descendants;
    };

    // 更新父节点选择状态
    const updateParentSelection = (nodeId, currentValue) => {
        const node = flatGroups.find(g => g.id === nodeId);
        if (!node || !node.parent_id) return currentValue;
        
        const parentId = node.parent_id;
        const parentNode = flatGroups.find(g => g.id === parentId);
        if (!parentNode) return currentValue;
        
        // 获取父节点的所有子节点
        const parentChildren = flatGroups.filter(g => g.parent_id === parentId);
        // 检查是否所有子节点都未被选中
        const allUnselected = parentChildren.every(child => 
            !currentValue.some(v => v.value === child.id)
        );
        // 检查是否所有子节点都被选中
        const allSelected = parentChildren.every(child => 
            currentValue.some(v => v.value === child.id)
        );
        
        let newValue = [...currentValue];
        if (allUnselected) {
            // 所有子节点都未被选中，取消父节点
            newValue = newValue.filter(v => v.value !== parentId);
        } else if (allSelected) {
            // 所有子节点都被选中，选中父节点
            if (!newValue.some(v => v.value === parentId)) {
                newValue.push({ value: parentId, label: parentNode.group_name });
            }
        } else {
            // 部分子节点被选中，取消父节点
            newValue = newValue.filter(v => v.value !== parentId);
        }
        
        // 递归检查父节点的父节点
        return updateParentSelection(parentId, newValue);
    };

    // 处理选择/取消选择
    const handleSelect = (node) => {
        const nodeValue = { value: node.id, label: node.group_name };
        const isSelected = value.some(item => item.value === node.id);
        const descendants = getAllDescendants(node.id);
        
        let newValue;
        if (isSelected) {
            // 取消选择：移除当前节点及其所有后代
            newValue = value.filter(item => !descendants.includes(item.value));
        } else {
            // 选择：添加当前节点及其所有后代
            newValue = [...value];
            // 添加当前节点
            if (!newValue.some(v => v.value === node.id)) {
                newValue.push(nodeValue);
            }
            // 添加所有后代
            descendants.forEach(id => {
                if (id !== node.id) {
                    const childNode = flatGroups.find(g => g.id === id);
                    if (childNode && !newValue.some(v => v.value === id)) {
                        newValue.push({ value: id, label: childNode.group_name });
                    }
                }
            });
        }
        
        // 无论选择还是取消选择，都更新父节点状态
        newValue = updateParentSelection(node.id, newValue);
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
        // if (level > 2) return null;
        
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
                    
                    {/* 递归渲染子节点 */}
                    {/* level < 2 */}
                    {isExpanded && hasChildren && (
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
                                            // 取消选择时触发级联更新
                                            let newValue = value.filter(val => val.value !== item.value);
                                            newValue = updateParentSelection(item.value, newValue);
                                            onChange(newValue);
                                        }}
                                    />
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <div className="text-gray-500">{placeholder}</div>
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