import React, { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectTrigger } from '@/components/bs-ui/select';
import { X, ChevronDown, Search } from 'lucide-react';
import PositionSelectTree from './PositionSelectTree';
import { useTranslation } from 'react-i18next';
import { cname } from '@/components/bs-ui/utils';
import { generateUUID } from '@/utils';
import { Badge } from '@/components/bs-ui/badge';
import { SearchInput } from '@/components/bs-ui/input';

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

  // 格式化选中的值为显示标签
  useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      setSelectedLabels([]);
      return;
    }

    const labels: string[] = [];
    Object.entries(value).forEach(([groupId, positions]) => {
      // 简化处理，实际项目中可能需要根据groupId获取部门名称
      // TODO：获取部门名称
      const groupLabel = `部门${groupId}`;
      if (positions.length === 0) {
        labels.push(groupLabel);
      } else {
        positions.forEach(pos => {
          labels.push(`${groupLabel}-${pos}`);
        });
      }
    });

    setSelectedLabels(labels);
  }, [value]);

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
          `group min-h-9 py-1 relative ${error ? 'border-red-500' : 'border-gray-300'}`,
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
        className="w-full p-2"
      >
        <div className="max-h-96 overflow-y-auto">
          <PositionSelectTree
            value={value}
            onChange={onChange}
            className="h-full"
          />
        </div>
      </SelectContent>
    </Select>
  );
};

export default React.memo(PositionSelect);