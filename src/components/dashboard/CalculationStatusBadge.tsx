/**
 * Status badge component for calculation freshness indicators
 * Following KISS principles with clear visual hierarchy
 */

import React from 'react';
import { Badge } from '../ui/badge';
import { getCalculationAge, type SavedCalculation } from '../../types/savedCalculation';

interface CalculationStatusBadgeProps {
  calculation: SavedCalculation;
  showAge?: boolean;
}

export const CalculationStatusBadge: React.FC<CalculationStatusBadgeProps> = ({
  calculation,
  showAge = false
}) => {
  const age = getCalculationAge(calculation);
  
  // Determine status and styling
  const getStatusInfo = () => {
    const ageInHours = (new Date().getTime() - calculation.createdAt.getTime()) / (1000 * 60 * 60);
    
    if (ageInHours < 24) {
      return {
        status: 'Fresh',
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    } else if (ageInHours < 168) { // 7 days
      return {
        status: 'Stale',
        variant: 'secondary' as const, 
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      };
    } else {
      return {
        status: 'Old',
        variant: 'outline' as const,
        className: 'bg-gray-100 text-gray-600 border-gray-300'
      };
    }
  };

  const { status, className } = getStatusInfo();

  return (
    <div className="flex items-center gap-2">
      <Badge className={className}>
        {status}
      </Badge>
      {showAge && (
        <span className="text-xs text-gray-500">
          {age}
        </span>
      )}
    </div>
  );
};