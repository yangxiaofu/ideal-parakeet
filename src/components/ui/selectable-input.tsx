import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from './input';
import { formatCurrency, formatShares } from '../../utils/formatters';

interface HistoricalValue {
  year: string;
  value: number;
}

interface SelectableInputProps {
  id: string;
  label: string;
  value: number | string;
  onChange: (value: number) => void;
  historicalValues?: HistoricalValue[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  formatType?: 'currency' | 'shares' | 'number';
  showGrowthRate?: boolean;
}

export const SelectableInput: React.FC<SelectableInputProps> = ({
  id,
  label,
  value,
  onChange,
  historicalValues = [],
  placeholder,
  disabled = false,
  error,
  formatType = 'number',
  showGrowthRate = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatValue = (val: number): string => {
    switch (formatType) {
      case 'currency':
        return formatCurrency(val);
      case 'shares':
        return formatShares(val);
      default:
        return val.toLocaleString();
    }
  };

  const calculateGrowthRate = (currentValue: number, previousValue: number): string => {
    if (previousValue === 0) return 'N/A';
    const growth = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
  };

  const handleSelect = (selectedValue: number) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-2">
          <Input
            id={id}
            type="number"
            placeholder={placeholder}
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            disabled={disabled}
            className="flex-1"
          />
          {historicalValues.length > 0 && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              disabled={disabled}
              className="px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              aria-label="Select from history"
            >
              <span className="hidden sm:inline">Select from history</span>
              <span className="sm:hidden">History</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Dropdown Menu */}
        {isOpen && historicalValues.length > 0 && (
          <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-3 py-1 border-b border-gray-100 mb-1">
                Select Historical Value
              </div>
              {historicalValues.map((item, index) => {
                const isLatest = index === 0;
                const growthRate = showGrowthRate && index < historicalValues.length - 1
                  ? calculateGrowthRate(item.value, historicalValues[index + 1].value)
                  : null;

                return (
                  <button
                    key={item.year}
                    type="button"
                    onClick={() => handleSelect(item.value)}
                    className={`w-full text-left px-3 py-2 rounded hover:bg-blue-50 transition-colors flex items-center justify-between group ${
                      isLatest ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.year}</span>
                      {isLatest && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          Latest
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatValue(item.value)}
                      </span>
                      {growthRate && (
                        <span className={`text-xs ${
                          growthRate.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {growthRate}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};