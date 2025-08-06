import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import { Checkbox } from '@/components/bs-ui/checkBox';
import { SearchInput } from '@/components/bs-ui/input';
import { useTranslation } from 'react-i18next';
import { getUserGroupPositionCountApi, getUserPositionCountApi } from '@/controllers/API/user'; // 假设的API接口

// 定义节点类型
interface TreeNode {
  id: string;
  title: string;
  type: 'group' | 'position';
  children?: TreeNode[];
  rawData?: any;
  group_id?: string;
  position_name?: string;
}

// 定义组件的 props 类型
interface PositionSelectTreeProps {
  value: { [key: string]: string[] };
  onChange?: (value: { [key: string]: string[] }) => void;
  className?: string;
}

// 树形职位选择组件
const PositionSelectTree: React.FC<PositionSelectTreeProps> = ({
  value = {},
  onChange,
  className = ""
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState('');
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const departmentMap = useMemo(() => new Map<string, any>(), []);


  console.log('value', value);
  
  // 组件挂载时请求数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getUserGroupPositionCountApi();
        // 接口请求后进行过滤，递归移除没有职位且没有子部门的节点
        const filterTreeData = (data: any[]): any[] => {
          return data.map(dept => {
            // 递归过滤子部门
            let filteredChildren: any[] = [];
            if (dept.children && dept.children.length > 0) {
              filteredChildren = filterTreeData(dept.children);
            }
            // 检查是否有职位
            const hasPositions = dept.position_count && Object.keys(dept.position_count).length > 0
            // 检查是否有子部门
            const hasChildren = filteredChildren.length > 0;
            // 保留有职位或有子部门的节点
            if (hasPositions || hasChildren) {
              return {
                ...dept,
                children: filteredChildren
              };
            }
            return null;
          }).filter(dept => dept !== null);
        };
        const filteredDepartments = filterTreeData(response || []);
        setDepartments(filteredDepartments);
      } catch (error) {
        console.error('Failed to fetch departments and positions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 将原始数据转换为树形结构
  useEffect(() => {
    if (departments.length === 0) return;

    // 递归构建部门树并添加职位节点，过滤掉没有职位的组织架构
    const buildTree = (depts: any[]): TreeNode[] => {
      return depts.map(dept => {
        // 存储部门原始数据到Map
        departmentMap.set(String(dept.id), dept);

        // 创建部门节点
        const groupNode: TreeNode = {
          id: `group_${dept.id}`,
          title: dept.group_name,
          type: 'group',
          rawData: dept,
          children: []
        };

        // 处理职位节点
        const positionNodes: TreeNode[] = [];
        if (dept.position_count && typeof dept.position_count === 'object') {
          Object.entries(dept.position_count).forEach(([positionName, count]) => {
              positionNodes.push({
                id: `position_${dept.id}_${positionName}`,
                title: `${positionName}`,
                type: 'position',
                group_id: dept.id,
                position_name: positionName
              });
          });
        }

        // 处理子部门
        const childDeptNodes: TreeNode[] = [];
        if (dept.children && dept.children.length > 0) {
          // 递归构建子部门树
          childDeptNodes.push(...buildTree(dept.children));
        }

        // 合并职位节点和子部门节点
        groupNode.children = [...positionNodes, ...childDeptNodes];

        return groupNode;
      });
    };

    const newTreeData = buildTree(departments);
    setTreeData(newTreeData);
  }, [departments, departmentMap]);

  // 监听value变化，更新checkedKeys 
  useEffect(() => {
    if (treeData.length === 0) return;
    const keys: string[] = [];
    // 当value为空时，清空keys
    if (Object.keys(value).length === 0) {
      if (JSON.stringify(keys) !== JSON.stringify(checkedKeys)) {
        setCheckedKeys(keys);
      }
      return;
    }
    // 遍历所有选中的部门和职位
    Object.entries(value).forEach(([pureGroupId, positions]) => {
      console.log('[groupId, positions]', [pureGroupId, positions]);

      // 检查是否全选部门
      const dept = departmentMap.get(pureGroupId);
      if (dept && dept.position_count) {
        const validPositions = Object.keys(dept.position_count)
        console.log('validPositions', validPositions);
        console.log(dept.group_name,dept, positions.length, validPositions.length, dept.children.length);
        
        // 检查是否所有子部门都被选中
        const areAllChildrenSelected = dept.children && dept.children.length > 0
          ? dept.children.every(child => checkedKeys.includes(`group_${child.id}`))
          : true; // 如果没有子部门，则视为满足条件

        // 如果选中的职位与部门所有有效职位相同，且所有子部门都被选中，则同时选中部门节点和所有职位节点
        if (positions.length === validPositions.length && 
          positions.every(pos => validPositions.includes(pos)) && 
          areAllChildrenSelected) {
          keys.push(`group_${pureGroupId}`);
          validPositions.forEach(pos => {
            keys.push(`position_${pureGroupId}_${pos}`);
          });
        } else {
          // 否则只选中具体职位节点
          positions.forEach(pos => {
            keys.push(`position_${pureGroupId}_${pos}`);
          });
        }
      } else {
        // 如果部门不存在，仍然添加部门节点（可能是外部传入的无效部门）
        keys.push(`group_${pureGroupId}`);
      }
    });

    // 只有当keys与当前checkedKeys不同时才更新，避免不必要的重渲染
    if (JSON.stringify(keys) !== JSON.stringify(checkedKeys)) {
      setCheckedKeys(keys);
    }
    console.log('keys', keys);
    
    console.log("------------------------------------------------------")
  }, [value, treeData, departmentMap]);

  // 处理搜索
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  // 获取节点的所有子孙节点ID
  const getAllDescendantIds = (node: TreeNode): string[] => {
    let ids: string[] = [];
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        ids.push(child.id);
        ids = ids.concat(getAllDescendantIds(child));
      });
    }
    return ids;
  };

  // 获取节点的所有祖先节点ID
  const getAllAncestorIds = (nodeId: string, nodes: TreeNode[]): string[] => {
    const findAncestors = (id: string, nodeList: TreeNode[]): string[] => {
      for (const node of nodeList) {
        if (node.children && node.children.some((child) => child.id === id)) {
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
  const findNode = (nodeId: string, nodes: TreeNode[]): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      if (node.children) {
        const found = findNode(nodeId, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  // 检查节点的所有子节点是否都被选中
  const areAllChildrenSelected = (node: TreeNode, selectedIds: string[]): boolean => {
    if (!node.children || node.children.length === 0) return false;
    return node.children.every(child => {
      return selectedIds.includes(child.id);
    });
  };

  // 检查节点的所有子孙节点是否都被选中
  const areAllDescendantsSelected = (node: TreeNode, selectedIds: string[]): boolean => {
    const allDescendants = getAllDescendantIds(node);
    if (allDescendants.length === 0) return false;
    return allDescendants.every(id => selectedIds.includes(id));
  };

  // 格式化选中的节点为提交数据
  const formatSelectedData = (selectedKeys: string[]): { [key: string]: string[] } => {
    const groupPositions: { [key: string]: Set<string> } = {};

    selectedKeys.forEach(key => {
      if (key.startsWith('group_')) {
        // 部门节点
        const groupId = key.replace('group_', '');
        const groupKey = `${groupId}`;
        // 确保即使没有职位，部门也能被选中
        if (!groupPositions[groupKey]) {
          groupPositions[groupKey] = new Set();
        }
        
        const dept = departmentMap.get(groupId);
        if (dept && dept.position_count) {
          // 获取所有有效职位
          Object.keys(dept.position_count)
            .forEach(pos => {
              groupPositions[groupKey].add(`${pos}`);
            });
        }
      } else if (key.startsWith('position_')) {
        // 职位节点
        const parts = key.split('_');
        if (parts.length >= 3) {
          const groupId = parts[1];
          const positionName = parts.slice(2).join('_'); // 处理职位名称中可能的下划线
          const groupKey = `${groupId}`;
          if (!groupPositions[groupKey]) {
            groupPositions[groupKey] = new Set();
          }
          groupPositions[groupKey].add(`${positionName}`);
        }
      }
    });

    // 转换Set为数组
    const result: { [key: string]: string[] } = {};
    Object.entries(groupPositions).forEach(([groupKey, positionsSet]) => {
      result[groupKey] = Array.from(positionsSet);
    });

    return result;
  };

  // 处理选择/取消选择
  const handleSelect = (node: TreeNode) => {
    // 使用函数式更新确保获取最新状态
    setCheckedKeys(prevCheckedKeys => {
      let newCheckedKeys = [...prevCheckedKeys];
      const isSelected = prevCheckedKeys.includes(node.id);

      if (isSelected) {
        // 取消选中节点
        newCheckedKeys = newCheckedKeys.filter(id => id !== node.id);

        // 如果是部门节点，取消该节点的所有子孙节点
        if (node.type === 'group') {
          const descendantIds = getAllDescendantIds(node);
          newCheckedKeys = newCheckedKeys.filter(id => !descendantIds.includes(id));
        }

        // 递归更新祖先节点的选中状态
        const updateAncestorStates = (nodeId: string) => {
          const ancestorIds = getAllAncestorIds(nodeId, treeData);
          ancestorIds.forEach(ancestorId => {
            const ancestorNode = findNode(ancestorId, treeData);
            if (ancestorNode && ancestorNode.type === 'group') {
              const childNodes = ancestorNode.children || [];
              const positionChildren = childNodes.filter(n => n.type === 'position');
              const selectedPositionChildren = positionChildren.filter(n => newCheckedKeys.includes(n.id));

              // 如果所有职位子节点都被取消选中，则取消选中父部门节点
              if (positionChildren.length > 0 && selectedPositionChildren.length === 0) {
                newCheckedKeys = newCheckedKeys.filter(id => id !== ancestorId);
              } else if (selectedPositionChildren.length > 0 && selectedPositionChildren.length < positionChildren.length) {
                // 如果部分职位子节点被选中，则确保父部门节点未被选中
                newCheckedKeys = newCheckedKeys.filter(id => id !== ancestorId);
              }
            }
          });
        };

        updateAncestorStates(node.id);
      } else {
        // 选中节点
        newCheckedKeys.push(node.id);

        // 如果是部门节点，选中该节点的所有子孙节点
        if (node.type === 'group') {
          const descendantIds = getAllDescendantIds(node);
          // 确保所有子孙节点都被添加到选中列表
          const allDescendants = [...descendantIds, node.id];
          newCheckedKeys = Array.from(new Set([...newCheckedKeys, ...allDescendants]));
        } else if (node.type === 'position') {
          // 对于职位节点，直接选中该节点
          // 检查是否需要自动选中父部门节点
          const updateParentGroupState = (nodeId: string) => {
            const ancestorIds = getAllAncestorIds(nodeId, treeData);
            ancestorIds.forEach(ancestorId => {
              const ancestorNode = findNode(ancestorId, treeData);
              if (ancestorNode && ancestorNode.type === 'group') {
                const childNodes = ancestorNode.children || [];
                const positionChildren = childNodes.filter(n => n.type === 'position');
                const selectedPositionChildren = positionChildren.filter(n => newCheckedKeys.includes(n.id));

                // 如果所有职位子节点都被选中，则选中父部门节点
                if (positionChildren.length > 0 && selectedPositionChildren.length === positionChildren.length) {
                  if (!newCheckedKeys.includes(ancestorId)) {
                    newCheckedKeys.push(ancestorId);
                  }
                } else if (newCheckedKeys.includes(ancestorId)) {
                  // 如果部分职位子节点被选中，则取消选中父部门节点
                  newCheckedKeys = newCheckedKeys.filter(id => id !== ancestorId);
                }
              }
            });
          };

          updateParentGroupState(node.id);
        }
      }

      // 格式化并触发onChange
      const formattedData = formatSelectedData(newCheckedKeys);
      if (onChange) {
        // 使用setTimeout确保状态更新完成后再触发onChange
        setTimeout(() => {
          onChange(formattedData);
        }, 0);
      }

      return newCheckedKeys;
    });
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
  const renderTree = (nodes: TreeNode[], level = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedNodes.has(node.id);
      const isSelected = checkedKeys.includes(node.id);
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

            <span onClick={() => handleSelect(node)}>{node.title}</span>
          </div>
          {/* 递归渲染子节点 */}
          {isExpanded && hasChildren && (
            <div className="pl-4">{renderTree(node.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  // 过滤搜索结果
  const filteredTreeData = useMemo(() => {
    if (!searchValue) return treeData;

    const filterNode = (node: TreeNode): TreeNode | null => {
      // 检查当前节点是否匹配搜索
      const isMatch = node.title.toLowerCase().includes(searchValue.toLowerCase());

      // 如果有子节点，递归过滤
      if (node.children && node.children.length > 0) {
        const filteredChildren = node.children
          .map(child => filterNode(child))
          .filter((child): child is TreeNode => child !== null);

        // 如果当前节点匹配或有匹配的子节点，则返回节点
        if (isMatch || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren
          };
        }
      }

      // 如果当前节点匹配且没有子节点，返回节点
      return isMatch ? node : null;
    };

    return treeData
      .map(node => filterNode(node))
      .filter((node): node is TreeNode => node !== null);
  }, [treeData, searchValue]);

  return (
    <div className={`h-full ${className}`}>
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <span className="text-gray-500">{t('loading')}...</span>
        </div>
      ) : (
        <>
          <div className="mb-4 relative">
            <SearchInput
              placeholder={t('position.selectPlaceholder')}
              onChange={handleSearch}
              value={searchValue}
              className="w-full md:w-[240px]"
            />
          </div>
          <div className="p-4 overflow-y-auto max-h-80 border border-gray-200 rounded-md">
            {renderTree(filteredTreeData)}
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(PositionSelectTree);
