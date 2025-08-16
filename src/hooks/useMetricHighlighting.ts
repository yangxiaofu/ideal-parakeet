import { useMemo } from 'react';
import type { CalculatorModel } from '../components/calculator/CalculatorTabs';

/**
 * Custom hook to determine which financial metrics should be highlighted
 * based on the active calculator tab
 */
export function useMetricHighlighting(activeCalculator: CalculatorModel): string[] {
  return useMemo(() => {
    switch (activeCalculator) {
      case 'DCF':
        return [
          'Free Cash Flow',
          'Operating Cash Flow',
          'Revenue'
        ];
      
      case 'DDM':
        return [
          'Dividends Paid',
          'Dividend per Share',
          'Payout Ratio'
        ];
      
      case 'NAV':
        return [
          'Total Assets',
          'Total Liabilities',
          'Total Equity',
          'Book Value/Share'
        ];
      
      case 'EPV':
        return [
          'Net Income',
          'Operating Income',
          'EPS',
          'Operating Margin'
        ];
      
      case 'SUMMARY':
      default:
        return [];
    }
  }, [activeCalculator]);
}

/**
 * Get the color scheme for a specific calculator
 */
export function getCalculatorColorScheme(calculator: CalculatorModel): {
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
} {
  switch (calculator) {
    case 'DCF':
      return {
        bgColor: 'bg-green-50',
        borderColor: 'border-l-green-400',
        badgeBg: 'bg-green-100',
        badgeText: 'text-green-700'
      };
    
    case 'DDM':
      return {
        bgColor: 'bg-yellow-50',
        borderColor: 'border-l-yellow-400',
        badgeBg: 'bg-yellow-100',
        badgeText: 'text-yellow-700'
      };
    
    case 'NAV':
      return {
        bgColor: 'bg-blue-50',
        borderColor: 'border-l-blue-400',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-700'
      };
    
    case 'EPV':
      return {
        bgColor: 'bg-purple-50',
        borderColor: 'border-l-purple-400',
        badgeBg: 'bg-purple-100',
        badgeText: 'text-purple-700'
      };
    
    default:
      return {
        bgColor: '',
        borderColor: '',
        badgeBg: '',
        badgeText: ''
      };
  }
}

/**
 * Get the label for a metric badge based on the calculator
 */
export function getMetricBadgeLabel(metric: string): string {
  const metricToCalculator: Record<string, string> = {
    'Free Cash Flow': 'DCF',
    'Operating Cash Flow': 'DCF',
    'Revenue': 'DCF',
    'Dividends Paid': 'DDM',
    'Dividend per Share': 'DDM',
    'Payout Ratio': 'DDM',
    'Total Assets': 'NAV',
    'Total Liabilities': 'NAV',
    'Total Equity': 'NAV',
    'Book Value/Share': 'NAV',
    'Net Income': 'EPV',
    'Operating Income': 'EPV',
    'EPS': 'EPV',
    'Operating Margin': 'EPV'
  };
  
  const calculator = metricToCalculator[metric];
  return calculator ? `Key for ${calculator}` : '';
}