import React, { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectTrigger } from '@/components/bs-ui/select';
import { X, ChevronDown, Search } from 'lucide-react';
import PositionSelectTree from './PositionSelectTree';
import { useTranslation } from 'react-i18next';
import { cname } from '@/components/bs-ui/utils';
import { generateUUID } from '@/utils';
import { Badge } from '@/components/bs-ui/badge';
import { SearchInput } from '@/components/bs-ui/input';
import { getUserGroupPositionCountApi } from '@/controllers/API/user';

// 定义部门数据类型
interface Department {
  id: string;
  group_name: string;
  position_count: { [key: string]: number };
  children?: Department[];
}

// 定义组件的 props 类型
interface PositionSelectProps {
  value: { [key: string]: string[] };
  onChange?: (value: { [key: string]: string[] }) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}

// 包装PositionSelectTree为Select组件
const PositionSelect: React.FC<PositionSelectProps> = ({
  value = {},
  onChange,
  className = '',
  placeholder = '',
  disabled = false,
  error = false
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(generateUUID(4));
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 获取部门数据
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoading(true);
      setFetchError(null);
      try {
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
      } catch (err) {
        setFetchError(t('system.fetchFailed'));
        console.error('Failed to fetch departments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  // 格式化选中的值为显示标签
  useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      setSelectedLabels([]);
      return;
    }

    const labels: string[] = [];
    Object.entries(value).forEach(([groupId, positions]) => {
      // 根据groupId从departments中查找对应的部门
      const findDepartment = (depts: Department[]): Department | undefined => {
        for (const dept of depts) {
          if (String(dept.id) === String(groupId)) return dept;
          if (dept.children) {
            const found = findDepartment(dept.children);
            if (found) return found;
          }
        }
        return undefined;
      };
      const department = findDepartment(departments);
      const groupName = department?.group_name || `部门${groupId}`;
      if (positions.length === 0) {
        labels.push(`${groupName}`);
      } else {
        positions.forEach(pos => {
          labels.push(`${pos}（${groupName}）`);
        });
      }
    });

    setSelectedLabels(labels);
  }, [value, departments]);

  // 处理清除选中值
  const handleClearClick = () => {
    if (disabled) return;
    onChange?.({});
  };

  // 处理搜索
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  // 切换下拉框显示/隐藏
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <Select
      disabled={disabled}
      onOpenChange={handleOpenChange}
      required
    >
      <SelectTrigger
        ref={triggerRef}
        className={cname(
          `h-auto group min-h-9 py-1 relative ${error ? 'border-red-500' : 'border-gray-300'}`,
          className
        )}
      >
        {selectedLabels.length > 0 ? (
          <div className="flex flex-wrap w-full gap-1">
            {selectedLabels.map((label, index) => (
              <Badge
                key={index}
                className="flex whitespace-normal items-center gap-1 select-none bg-primary/20 text-primary hover:bg-primary/15 break-all"
                
              >
                {label}
                {/* TODO 删除逻辑 */}
                {!disabled && (
                  <X
                    className="h-3 w-3 min-w-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      // 此处简化处理，实际项目中需要根据label找到对应的value并删除
                      console.log('label', label);
                      
                      handleClearClick();
                    }}
                  ></X>
                )}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-gray-500">{placeholder || t('system.selectPlaceholder')}</span>
        )}
      </SelectTrigger>
      <SelectContent
        id={idRef.current}
        className="w-full max-h-[400px] overflow-y-auto"
      >
        <div className="p-2 border-b">
          <SearchInput
            placeholder={t('system.searchPosition')}
            value={searchValue}
            onChange={handleSearch}
            prefix={<Search size={16} />}
          />
        </div>
        {loading ? (
          <div className="p-4 text-center text-gray-500">{t('system.loading')}</div>
        ) : fetchError ? (
          <div className="p-4 text-center text-red-500">{fetchError}</div>
        ) : (
          <PositionSelectTree
            value={value}
            onChange={onChange}
            searchValue={searchValue}
            departments={departments}
            className="h-full"
          />
        )}
      </SelectContent>
    </Select>
  );
};

export default React.memo(PositionSelect);