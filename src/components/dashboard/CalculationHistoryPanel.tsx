/**
 * Calculation History Panel - main container for history functionality
 * Implements the left panel of the enhanced dashboard (40% width)
 * Follows SoC principles with focused responsibility
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { HistoryFilters } from './HistoryFilters';
import { HistoryTable } from './HistoryTable';
import { useCalculationList } from '../../hooks/useCalculationHistory';
import type { SavedCalculation, CalculatorType } from '../../types/savedCalculation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalculationHistoryPanelProps {
  onCalculationSelect: (calculation: SavedCalculation) => void;
  selectedCalculationId?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const CalculationHistoryPanel: React.FC<CalculationHistoryPanelProps> = ({
  onCalculationSelect,
  selectedCalculationId,
  collapsed = false,
  onToggleCollapse
}) => {
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<CalculatorType | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'createdAt' | 'symbol' | 'type'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Fetch calculation history
  const { data: calculations = [], isLoading, error } = useCalculationList();

  // Filter and sort calculations
  const filteredAndSortedCalculations = useMemo(() => {
    let filtered = calculations;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(calc =>
        calc.symbol.toLowerCase().includes(query) ||
        calc.companyName?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (selectedType !== 'ALL') {
      filtered = filtered.filter(calc => calc.type === selectedType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortBy) {
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'createdAt':
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
      }

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [calculations, searchQuery, selectedType, sortBy, sortDirection]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('ALL');
    setSortBy('createdAt');
    setSortDirection('desc');
  };

  if (collapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="w-full h-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="transform -rotate-90 whitespace-nowrap text-sm text-gray-500 font-medium">
            History
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Calculation History</CardTitle>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Filters */}
        <HistoryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          onClearFilters={clearFilters}
          resultCount={filteredAndSortedCalculations.length}
        />

        {/* Table */}
        <div className="flex-1 overflow-hidden">
          {error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-red-500 text-center">
                <div className="mb-2">Error loading calculations</div>
                <div className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</div>
              </div>
            </div>
          ) : (
            <HistoryTable
              calculations={filteredAndSortedCalculations}
              onCalculationClick={onCalculationSelect}
              loading={isLoading}
              selectedCalculationId={selectedCalculationId}
            />
          )}
        </div>

        {/* Export Actions */}
        {filteredAndSortedCalculations.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Implement CSV export
                  console.log('Export CSV:', filteredAndSortedCalculations);
                }}
                className="flex-1"
                disabled
              >
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Implement PDF export
                  console.log('Export PDF:', filteredAndSortedCalculations);
                }}
                className="flex-1"
                disabled
              >
                Export PDF
              </Button>
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center">
              Export functionality coming soon
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};