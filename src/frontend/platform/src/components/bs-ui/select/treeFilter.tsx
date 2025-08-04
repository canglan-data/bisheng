import React from 'react';
import { useState, useRef } from "react";
import { Select, SelectContent, SelectTrigger } from ".";

import { X, ChevronRight, FilterIcon } from "lucide-react";
import { Button } from '@/components/bs-ui/button';
import { SearchInput } from '@/components/bs-ui/input';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Checkbox } from "@/components/bs-ui/checkBox";
import { Badge } from "@/components/bs-ui/badge";
import { cname } from "@/components/bs-ui/utils";
import { generateUUID } from "@/utils";
import { useTranslation } from "react-i18next";

export const TableHeadEnumFilter = ({ options, onChange }: { options: { label: string, value: string }[], onChange: (value: string) => void }) => {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<string>('')

  return <Select value={value} onOpenChange={setOpen} onValueChange={(v) => { setValue(v); onChange(v) }}>
    <SelectTrigger className='outline-none' >
      <FilterIcon onClick={() => setOpen(!open)} className={value ? 'text-primary ml-3' : 'text-gray-400 ml-3'} />
    </SelectTrigger>
    <SelectContent>
      <div className="p-2">
        {options.map(el => (
          <div key={el.value} className="mb-1">
            <Button
              variant={value === el.value ? "primary" : "ghost"}
              className="w-full justify-start"
              onClick={() => { setValue(el.value); onChange(el.value); setOpen(false); }}
            >
              {el.label}
            </Button>
          </div>
        ))}
      </div>
    </SelectContent>
  </Select>
}


// 定义组件的 props 类型
interface TreeFilterUserGroupProps {
  value: any[];
  options: { id: string; [key: string]: any }[];
  nameKey?: string;
  placeholder: string;
  onChecked: (id: string) => void;
  search: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearChecked: () => void;
  onOk: () => void;
  className?: string;
}

// 树形过滤组件
const FilterTreeUserGroup: React.FC<TreeFilterUserGroupProps> = ({
  value = [],
  options = [],
  nameKey = 'name',
  placeholder,
  onChecked,
  search,
  onClearChecked,
  onOk,
  className = ""
}) => {
  const [open, setOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(generateUUID(4));
  const { t } = useTranslation();

  // 处理下拉框打开/关闭
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  // 处理搜索
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    search(e);
  };

  // 处理选择/取消选择
  const handleSelect = (node: any) => {
    onChecked(node.id);
  };

  // 切换展开/折叠状态
  const toggleExpand = (nodeId: string) => {
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
  const renderTree = (nodes: any[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedNodes.has(node.id);
      const isSelected = value.includes(node.id);
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
            
            <span onClick={() => handleSelect(node)}>{node[nameKey]}</span>
          </div>
          
          {/* 递归渲染子节点 */}
          {isExpanded && hasChildren && (
            <div className="pl-4">{renderTree(node.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  // 清除所有选择
  const handleClearAll = () => {
    onClearChecked();
  };

  // 处理确认按钮
  const handleOk = () => {
    onOk();
    setOpen(false);
  };

  return (
    <Select open={open} onOpenChange={handleOpenChange}>
      <SelectTrigger className={cname(`group min-h-9 py-1 h-auto`, className)}>
        <div className="text-foreground inline-flex flex-1 flex-row justify-between items-center overflow-hidden">
          {value.length > 0 ? (
            <div className="flex flex-wrap w-full">
              {value.map(id => {
                const node = options.find(item => item.id === id);
                return (
                  <Badge 
                    key={id}
                    onPointerDown={(e) => e.stopPropagation()} 
                    className="flex whitespace-normal items-center gap-1 select-none bg-primary/20 text-primary hover:bg-primary/15 m-[2px]"
                  >
                    {node ? node[nameKey] : id}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center">
              <span className="text-gray-600 mr-2">{placeholder}</span>
              <FilterIcon className="text-gray-400" size={18} />
            </div>
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
        className="overflow-y-auto max-w-auto"
      >
        <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <SearchInput
              ref={inputRef}
              placeholder={placeholder}
              onChange={handleSearch}
              className="w-[calc(100%-60px)]"
            />
          </div>
        <div className="p-4 overflow-y-auto max-h-60">
          {renderTree(options)}
        </div>
        <div className="flex justify-between mt-4">
          <Button variant="ghost" className="px-8 h-8" onClick={onClearChecked}>{t('system.reset')}</Button>
          <Button className="px-8 h-8" onClick={onOk}>{t('system.confirm')}</Button>
        </div>
      </SelectContent>
    </Select>
  );
};

export default React.memo(FilterTreeUserGroup);