/**
 * Smart calculator hooks that provide transparent auto-save integration
 * Automatically saves calculations and loads cached results when available
 */

import { useCallback, useMemo, useEffect, useState } from 'react';
import { useCalculationByType, useAutoSaveCalculation } from './useCalculationHistory';
import { isCalculationFresh, CALCULATION_FRESHNESS_THRESHOLD } from '../types/savedCalculation';
import type {
  CalculationInputs,
  CalculatorType,
  SavedCalculation,
  SaveCalculationRequest,
} from '../types/savedCalculation';

interface SmartCalculatorOptions {
  freshnessThreshold?: number;
  companyName?: string;
  autoSave?: boolean;
  showCacheIndicators?: boolean;
}

interface SmartCalculatorReturn<TInputs extends CalculationInputs, TResult> {
  calculate: (inputs: TInputs) => Promise<TResult>;
  cachedResult: TResult | null;
  cachedCalculation: SavedCalculation | null;
  isCacheAvailable: boolean;
  isCalculationFresh: boolean;
  cacheAge: string | null;
  isLoadingCache: boolean;
  isSaving: boolean;
  lastError: Error | null;
}

/**
 * Smart calculator hook that handles auto-save and cache loading
 */
export function useSmartCalculator<TInputs extends CalculationInputs, TResult>(
  calculatorType: CalculatorType,
  symbol: string,
  calculator: (inputs: TInputs) => TResult | Promise<TResult>,
  options: SmartCalculatorOptions = {}
): SmartCalculatorReturn<TInputs, TResult> {
  const {
    freshnessThreshold = CALCULATION_FRESHNESS_THRESHOLD,
    companyName,
    autoSave = true,
  } = options;

  // State for error handling
  const [lastError, setLastError] = useState<Error | null>(null);

  // Fetch cached calculation
  const {
    data: cachedCalculation,
    isLoading: isLoadingCache,
    error: cacheError
  } = useCalculationByType(symbol, calculatorType);

  // Auto-save mutation
  const autoSaveMutation = useAutoSaveCalculation();

  // Handle cache error gracefully
  useEffect(() => {
    if (cacheError) {
      // Only log cache errors, don't set them as user-facing errors
      console.warn('Cache loading failed:', cacheError);
      // Don't set lastError for cache failures - they're not critical
    }
  }, [cacheError]);

  // Calculate derived cache properties
  const cacheInfo = useMemo(() => {
    if (!cachedCalculation) {
      return {
        isCacheAvailable: false,
        isCalculationFresh: false,
        cacheAge: null,
        cachedResult: null,
      };
    }

    const isFresh = isCalculationFresh(cachedCalculation, freshnessThreshold);
    const age = getCacheAge(cachedCalculation);
    
    return {
      isCacheAvailable: true,
      isCalculationFresh: isFresh,
      cacheAge: age,
      cachedResult: cachedCalculation.result as TResult,
    };
  }, [cachedCalculation, freshnessThreshold]);

  // Smart calculation function with auto-save
  const calculate = useCallback(async (inputs: TInputs): Promise<TResult> => {
    try {
      setLastError(null);
      
      // Perform the calculation
      const result = await calculator(inputs);
      
      // Auto-save if enabled
      if (autoSave && symbol) {
        const calculationRequest: SaveCalculationRequest<TInputs> = {
          symbol: symbol.toUpperCase(),
          companyName,
          type: calculatorType,
          inputs,
          result,
          dataSnapshot: {
            calculatedAt: new Date().toISOString(),
            freshnessThreshold,
          },
        };

        // Fire and forget - don't block UI on save
        autoSaveMutation.mutate(calculationRequest, {
          onError: (error) => {
            console.warn('Failed to auto-save calculation:', error);
            // Don't set lastError for auto-save failures to avoid interrupting user flow
          }
        });
      }
      
      return result;
    } catch (error) {
      const calculationError = error instanceof Error ? error : new Error('Calculation failed');
      setLastError(calculationError);
      throw calculationError;
    }
  }, [
    calculator,
    autoSave,
    symbol,
    companyName,
    calculatorType,
    freshnessThreshold,
    autoSaveMutation
  ]);

  return {
    calculate,
    cachedResult: cacheInfo.cachedResult,
    cachedCalculation: cachedCalculation || null,
    isCacheAvailable: cacheInfo.isCacheAvailable,
    isCalculationFresh: cacheInfo.isCalculationFresh,
    cacheAge: cacheInfo.cacheAge,
    isLoadingCache,
    isSaving: autoSaveMutation.isPending,
    lastError,
  };
}

/**
 * Helper function to get human-readable cache age
 */
function getCacheAge(calculation: SavedCalculation): string {
  const now = new Date().getTime();
  const calculationTime = calculation.createdAt.getTime();
  const diffMs = now - calculationTime;
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Specialized hook for DCF calculations with DCF-specific optimizations
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
 * Hook for managing multiple calculators for the same symbol
 * Useful for the dashboard that shows multiple valuation methods
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