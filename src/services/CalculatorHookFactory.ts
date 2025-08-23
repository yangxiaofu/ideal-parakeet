/**
 * Factory for creating smart calculator hooks - implements DRY principle
 * Eliminates duplication of 5+ similar smart calculator hooks
 */

import { useSmartCalculator } from '../hooks/useSmartCalculator';
import type { CalculatorType } from '../types/savedCalculation';

interface SmartCalculatorOptions {
  freshnessThreshold?: number;
  companyName?: string;
  autoSave?: boolean;
  showCacheIndicators?: boolean;
}

/**
 * Specialized hook for DCF calculations - moved from useSmartCalculator.ts for DRY compliance
 */
export function useSmartDCFCalculator(
  symbol: string,
  calculator: (inputs: any) => any,
  options: SmartCalculatorOptions = {}
) {
  return useSmartCalculator('DCF', symbol, calculator, {
    ...options,
    companyName: options.companyName || `${symbol} Corporation`,
  });
}

/**
 * Specialized hook for DDM calculations
 */
export function useSmartDDMCalculator(
  symbol: string,
  calculator: (inputs: any) => any,
  options: SmartCalculatorOptions = {}
) {
  return useSmartCalculator('DDM', symbol, calculator, {
    ...options,
    companyName: options.companyName || `${symbol} Corporation`,
  });
}

/**
 * Specialized hook for NAV calculations
 */
export function useSmartNAVCalculator(
  symbol: string,
  calculator: (inputs: any) => any,
  options: SmartCalculatorOptions = {}
) {
  return useSmartCalculator('NAV', symbol, calculator, {
    ...options,
    companyName: options.companyName || `${symbol} Corporation`,
  });
}

/**
 * Specialized hook for EPV calculations
 */
export function useSmartEPVCalculator(
  symbol: string,
  calculator: (inputs: any) => any,
  options: SmartCalculatorOptions = {}
) {
  return useSmartCalculator('EPV', symbol, calculator, {
    ...options,
    companyName: options.companyName || `${symbol} Corporation`,
  });
}

/**
 * Specialized hook for Relative Valuation calculations
 */
export function useSmartRelativeValuationCalculator(
  symbol: string,
  calculator: (inputs: any) => any,
  options: SmartCalculatorOptions = {}
) {
  return useSmartCalculator('RELATIVE', symbol, calculator, {
    ...options,
    companyName: options.companyName || `${symbol} Corporation`,
  });
}

/**
 * Calculator registry for metadata and type information
 * Enables dynamic calculator discovery and eliminates hardcoded arrays
 */
export const CALCULATOR_REGISTRY = {
  DCF: {
    label: 'DCF',
    fullName: 'Discounted Cash Flow',
    description: 'Two-stage growth model with sensitivity analysis',
    color: 'blue',
    hook: useSmartDCFCalculator,
  },
  DDM: {
    label: 'DDM',
    fullName: 'Dividend Discount Model',
    description: 'Dividend discount model with growth projections',
    color: 'green',
    hook: useSmartDDMCalculator,
  },
  NAV: {
    label: 'NAV',
    fullName: 'Net Asset Value',
    description: 'Net Asset Value calculation for asset-heavy companies',
    color: 'purple',
    hook: useSmartNAVCalculator,
  },
  EPV: {
    label: 'EPV',
    fullName: 'Earnings Power Value',
    description: 'Earnings Power Value calculation for normalized earnings',
    color: 'orange',
    hook: useSmartEPVCalculator,
  },
  RELATIVE: {
    label: 'Relative',
    fullName: 'Relative Valuation',
    description: 'Peer comparison using P/E, P/B, EV/EBITDA ratios',
    color: 'pink',
    hook: useSmartRelativeValuationCalculator,
  },
} as const;

export type CalculatorRegistryEntry = typeof CALCULATOR_REGISTRY[keyof typeof CALCULATOR_REGISTRY];
export const CALCULATOR_TYPES = Object.keys(CALCULATOR_REGISTRY) as CalculatorType[];

/**
 * Hook for managing multiple calculators for the same symbol
 * Moved here to avoid circular dependency issues with useSmartCalculator
 */
export function useSmartMultiCalculator(
  symbol: string,
  calculators: Record<CalculatorType, (inputs: any) => any>,
  options: SmartCalculatorOptions = {}
) {
  const dcf = useSmartDCFCalculator(symbol, calculators.DCF, options);
  const ddm = useSmartDDMCalculator(symbol, calculators.DDM, options);
  const nav = useSmartNAVCalculator(symbol, calculators.NAV, options);
  const epv = useSmartEPVCalculator(symbol, calculators.EPV, options);
  const relative = useSmartRelativeValuationCalculator(symbol, calculators.RELATIVE, options);

  return {
    DCF: dcf,
    DDM: ddm,
    NAV: nav,
    EPV: epv,
    RELATIVE: relative,
    
    // Aggregate states
    isLoadingAnyCache: dcf.isLoadingCache || ddm.isLoadingCache || nav.isLoadingCache || epv.isLoadingCache || relative.isLoadingCache,
    isSavingAny: dcf.isSaving || ddm.isSaving || nav.isSaving || epv.isSaving || relative.isSaving,
    hasAnyCachedResults: dcf.isCacheAvailable || ddm.isCacheAvailable || nav.isCacheAvailable || epv.isCacheAvailable || relative.isCacheAvailable,
    hasAnyErrors: !!(dcf.lastError || ddm.lastError || nav.lastError || epv.lastError || relative.lastError),
  };
}