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
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  console.log('FilterTreeUserGroupvalue', value, options);
  

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

  return (
    <div className="h-full">
      <div>
          <SearchInput
            ref={inputRef}
            placeholder={placeholder}
            onChange={handleSearch}
            className="w-[240px]"
          />
        </div>
      <div className="p-4 overflow-y-auto max-h-60">
        {renderTree(options)}
      </div>
      <div className="flex justify-between mt-4">
        <Button variant="outline" className="px-8 h-8" onClick={onClearChecked}>{t('system.reset')}</Button>
        <Button className="px-8 h-8" onClick={onOk}>{t('system.confirm')}</Button>
      </div>
    </div>
  );
};

export default React.memo(FilterTreeUserGroup);