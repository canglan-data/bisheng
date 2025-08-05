import React from 'react';
import { useState, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from '@/components/bs-ui/button';
import { SearchInput } from '@/components/bs-ui/input';
import { Checkbox } from "@/components/bs-ui/checkBox";
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

  // 获取节点的所有子孙节点ID
  const getAllDescendantIds = (node: any): string[] => {
    let ids: string[] = [];
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any) => {
        ids.push(child.id);
        ids = ids.concat(getAllDescendantIds(child));
      });
    }
    return ids;
  };

  // 获取节点的所有祖先节点ID
  const getAllAncestorIds = (nodeId: string, nodes: any[]): string[] => {
    const findAncestors = (id: string, nodeList: any[]): string[] => {
      for (const node of nodeList) {
        if (node.children && node.children.some((child: any) => child.id === id)) {
          return [node.id, ...findAncestors(node.id, nodeList)];
        }
        if (node.children) {
          const ancestors = findAncestors(id, node.children);
          if (ancestors.length > 0) {
            return [node.id, ...ancestors];
          }
        }
      }
      return [];
    };
    return findAncestors(nodeId, nodes);
  };

  // 查找节点
  const findNode = (nodeId: string, nodes: any[]): any => {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      if (node.children) {
        const found = findNode(nodeId, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  // 检查节点的所有子节点是否都被选中（包括子节点的子孙节点）
  const areAllChildrenSelected = (node: any, selectedIds: string[]): boolean => {
    if (!node.children || node.children.length === 0) return false;
    return node.children.every(child => {
      // 检查子节点是否被选中，或者其子节点是否都被选中
      return selectedIds.includes(child.id) || areAllChildrenSelected(child, selectedIds);
    });
  };

  // 检查节点的所有子孙节点是否都被选中
  const areAllDescendantsSelected = (node: any, selectedIds: string[]): boolean => {
    const allDescendants = getAllDescendantIds(node);
    // 如果没有子孙节点，则不自动选中
    if (allDescendants.length === 0) return false;
    return allDescendants.every(id => selectedIds.includes(id));
  };

  // 处理选择/取消选择
  const handleSelect = (node: any) => {
    const isSelected = value.includes(node.id);
    let newSelectedIds = [...value];
    
    if (isSelected) {
      // 取消选中节点
      newSelectedIds = newSelectedIds.filter(id => id !== node.id);
      
      // 取消该节点的所有子孙节点
      const descendantIds = getAllDescendantIds(node);
      newSelectedIds = newSelectedIds.filter(id => !descendantIds.includes(id));
      
      // 递归取消祖先节点的选中状态
      const ancestorIds = getAllAncestorIds(node.id, options);
      ancestorIds.forEach(ancestorId => {
        const ancestorNode = findNode(ancestorId, options);
        if (ancestorNode && !areAllChildrenSelected(ancestorNode, newSelectedIds)) {
          newSelectedIds = newSelectedIds.filter(id => id !== ancestorId);
        }
      });
    } else {
      // 选中节点
      newSelectedIds.push(node.id);
      
      // 选中该节点的所有子孙节点
      const descendantIds = getAllDescendantIds(node);
      descendantIds.forEach(id => {
        if (!newSelectedIds.includes(id)) {
          newSelectedIds.push(id);
        }
      });
      
      // 检查是否需要自动选中祖先节点
      const ancestorIds = getAllAncestorIds(node.id, options);
      ancestorIds.forEach(ancestorId => {
        const ancestorNode = findNode(ancestorId, options);
        if (ancestorNode && areAllChildrenSelected(ancestorNode, newSelectedIds)) {
          if (!newSelectedIds.includes(ancestorId)) {
            newSelectedIds.push(ancestorId);
          }
        }
      });
    }
    
    // 计算选中状态变化
    const addedIds = newSelectedIds.filter(id => !value.includes(id));
    const removedIds = value.filter(id => !newSelectedIds.includes(id));
    
    // 触发相应的选中和取消选中事件
    addedIds.forEach(id => onChecked(id));
    removedIds.forEach(id => onChecked(id));
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
              checked={isSelected || (node.children && areAllDescendantsSelected(node, value))}
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