/**
 * History table component for displaying calculation history
 * Follows KISS principles with clear, scannable layout
 */

import React from 'react';
import { CalculationStatusBadge } from './CalculationStatusBadge';
import { formatCurrency } from '../../utils/formatters';
import { formatDistanceToNow } from 'date-fns';
import { CALCULATOR_REGISTRY } from '../../services/CalculatorHookFactory';
import { usePriceWithFreshness } from '../../contexts/PriceContext';
import { calculateValuationDelta } from '../../utils/valuationComparison';
import type { SavedCalculation } from '../../types/savedCalculation';

interface HistoryTableProps {
  calculations: SavedCalculation[];
  onCalculationClick: (calculation: SavedCalculation) => void;
  loading?: boolean;
  selectedCalculationId?: string;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  calculations,
  onCalculationClick,
  loading = false,
  selectedCalculationId
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading calculations...</div>
      </div>
    );
  }

  if (calculations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <div className="mb-2">No calculations found</div>
        <div className="text-sm">Start by analyzing a company to see your history here</div>
      </div>
    );
  }

  const getCalculationValue = (calculation: SavedCalculation): number | null => {
    const result = calculation.result as Record<string, unknown>;
    
    // Extract intrinsic value based on calculator type
    if (calculation.type === 'DCF' && typeof result?.intrinsicValuePerShare === 'number') {
      return result.intrinsicValuePerShare;
    } else if (calculation.type === 'DDM' && typeof result?.intrinsicValuePerShare === 'number') {
      return result.intrinsicValuePerShare;
    } else if (calculation.type === 'NAV' && typeof result?.navPerShare === 'number') {
      return result.navPerShare;
    } else if (calculation.type === 'EPV' && typeof result?.epvPerShare === 'number') {
      return result.epvPerShare;
    } else if (calculation.type === 'RELATIVE' && typeof result?.averageValue === 'number') {
      return result.averageValue;
    }
    
    return null;
  };

  const getCalculatorBadgeColor = (type: string) => {
    const config = CALCULATOR_REGISTRY[type as keyof typeof CALCULATOR_REGISTRY];
    if (!config) {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
    
    const color = config.color;
    return `bg-${color}-100 text-${color}-800 border-${color}-200`;
  };

  // Component for valuation comparison display
  const ValuationComparison: React.FC<{ 
    calculation: SavedCalculation; 
    intrinsicValue: number; 
  }> = ({ calculation, intrinsicValue }) => {
    const { priceData, isFresh, needsRefresh } = usePriceWithFreshness(calculation.symbol);
    
    if (!priceData || !isFresh) {
      return (
        <div className="text-xs text-gray-400">
          {needsRefresh ? 'Price stale' : 'No price data'}
        </div>
      );
    }

    const { percentage, status } = calculateValuationDelta(intrinsicValue, priceData.price);
    
    const getStatusColor = () => {
      switch (status) {
        case 'undervalued': return 'text-green-600';
        case 'overvalued': return 'text-red-600';
        default: return 'text-gray-600';
      }
    };

    const getStatusIcon = () => {
      switch (status) {
        case 'undervalued': return '↗';
        case 'overvalued': return '↘';
        default: return '→';
      }
    };

    return (
      <div className="text-xs">
        <div className="font-medium text-gray-900">
          {formatCurrency(priceData.price)}
        </div>
        <div className={`flex items-center ${getStatusColor()}`}>
          <span className="mr-1">{getStatusIcon()}</span>
          <span>{percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-hidden">
      <div className="overflow-y-auto max-h-[600px]">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {calculations.map((calculation) => {
              const value = getCalculationValue(calculation);
              const isSelected = calculation.id === selectedCalculationId;
              
              return (
                <tr
                  key={calculation.id}
                  onClick={() => onCalculationClick(calculation)}
                  className={`cursor-pointer transition-colors hover:bg-blue-50 ${
                    isSelected ? 'bg-blue-100 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-900">
                        {calculation.symbol}
                      </div>
                      {calculation.companyName && (
                        <div className="text-sm text-gray-500 truncate max-w-32">
                          {calculation.companyName}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCalculatorBadgeColor(calculation.type)}`}>
                      {calculation.type}
                    </span>
                  </td>
                  
                  <td className="px-4 py-4 text-right">
                    {value !== null ? (
                      <div className="font-medium text-gray-900">
                        {formatCurrency(value)}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">
                        N/A
                      </div>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 text-right">
                    {value !== null ? (
                      <ValuationComparison 
                        calculation={calculation} 
                        intrinsicValue={value} 
                      />
                    ) : (
                      <div className="text-xs text-gray-400">
                        N/A
                      </div>
                    )}
                  </td>
                  
                  <td className="px-4 py-4">
                    <CalculationStatusBadge calculation={calculation} />
                  </td>
                  
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">
                      {formatDistanceToNow(calculation.createdAt, { addSuffix: true })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {calculation.createdAt.toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};