import { useState, useEffect } from 'react';

interface QuickEditCellProps {
  value: string | number;
  onSave: (val: string | number) => void;
  type?: string;
  prefix?: string;
  options?: string[];
  className?: string;
}

export const QuickEditCell = ({ value, onSave, type = "text", prefix = "", options, className = "" }: QuickEditCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue != value) {
      onSave(currentValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  if (isEditing) {
    if (options) {
      return (
        <select
          autoFocus
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full min-w-[80px] px-2 py-1 bg-white dark:bg-gray-800 border border-blue-500 rounded text-gray-900 dark:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }
    return (
        <input
          autoFocus
          type={type}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full min-w-[80px] px-2 py-1 bg-white dark:bg-gray-800 border border-blue-500 rounded text-gray-900 dark:text-white"
          onClick={(e) => e.stopPropagation()}
        />
    );
  }

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
      className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded border border-transparent hover:border-gray-300 transition-all ${className}`}
    >
      {prefix}{value || '-'}
    </div>
  );
};
