/**
 * History filters component for calculation history panel
 * Provides search and filtering capabilities following KISS principles
 */

import React from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { CALCULATOR_REGISTRY } from '../../services/CalculatorHookFactory';
import type { CalculatorType } from '../../types/savedCalculation';

interface HistoryFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType: CalculatorType | 'ALL';
  onTypeChange: (type: CalculatorType | 'ALL') => void;
  sortBy: 'createdAt' | 'symbol' | 'type';
  onSortByChange: (sortBy: 'createdAt' | 'symbol' | 'type') => void;
  sortDirection: 'asc' | 'desc';
  onSortDirectionChange: (direction: 'asc' | 'desc') => void;
  onClearFilters: () => void;
  resultCount?: number;
}

// Generate calculator types from registry to follow DRY principle
const CALCULATOR_TYPES: Array<{ value: CalculatorType | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Types' },
  ...Object.entries(CALCULATOR_REGISTRY).map(([key, config]) => ({
    value: key as CalculatorType,
    label: config.label,
  })),
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date' },
  { value: 'symbol', label: 'Symbol' },
  { value: 'type', label: 'Type' },
] as const;

export const HistoryFilters: React.FC<HistoryFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  sortBy,
  onSortByChange,
  sortDirection,
  onSortDirectionChange,
  onClearFilters,
  resultCount
}) => {
  const hasActiveFilters = searchQuery.trim() !== '' || selectedType !== 'ALL';

  return (
    <div className="space-y-4 p-4 border-b border-gray-200 bg-gray-50">
      {/* Search Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Search Calculations
        </label>
        <Input
          type="text"
          placeholder="Search by symbol or company name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Calculator Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Calculator Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value as CalculatorType | 'ALL')}
            className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {CALCULATOR_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as 'createdAt' | 'symbol' | 'type')}
            className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Direction */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Sort Order
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={sortDirection === 'desc' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSortDirectionChange('desc')}
              className="flex-1"
            >
              Newest
            </Button>
            <Button
              type="button"
              variant={sortDirection === 'asc' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSortDirectionChange('asc')}
              className="flex-1"
            >
              Oldest
            </Button>
          </div>
        </div>
      </div>

      {/* Results Summary and Clear Filters */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {resultCount !== undefined && (
            <span>
              {resultCount} calculation{resultCount !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
        
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-blue-600 hover:text-blue-700"
          >
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
};