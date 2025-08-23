/**
 * Smart calculator hooks that provide transparent auto-save integration
 * Automatically saves calculations and loads cached results when available
 */

import { useCallback, useMemo, useEffect, useState } from 'react';
import { useCalculationByType, useAutoSaveCalculation } from './useCalculationHistory';
import { isCalculationFresh, CALCULATION_FRESHNESS_THRESHOLD } from '../types/savedCalculation';
import { errorHandler } from '../services/ErrorHandler';
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
      // Cache errors are non-critical, so we just log them
      errorHandler.handleCacheError(cacheError, {
        operation: 'load cached calculation',
        symbol,
        calculationType: calculatorType,
      });
    }
  }, [cacheError, symbol, calculatorType]);

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
      
      // Auto-save with explicit validation
      if (autoSave) {
        // Validate prerequisites for saving
        const trimmedSymbol = symbol?.trim();
        if (!trimmedSymbol) {
          errorHandler.logWarning('Cannot auto-save: No symbol provided', {
            operation: 'auto-save validation',
            calculationType: calculatorType,
          });
          return result; // Return result but don't save
        }

        const calculationRequest: SaveCalculationRequest<TInputs> = {
          symbol: trimmedSymbol.toUpperCase(),
          companyName: companyName || `${trimmedSymbol} Corporation`,
          type: calculatorType,
          inputs,
          result,
          dataSnapshot: {
            calculatedAt: new Date().toISOString(),
            freshnessThreshold,
          },
        };

        // Explicit save with error handling (not fire-and-forget)
        try {
          await autoSaveMutation.mutateAsync(calculationRequest);
          errorHandler.logSuccess(`Auto-saved calculation for ${trimmedSymbol} ${calculatorType}`, {
            operation: 'auto-save',
            symbol: trimmedSymbol,
            calculationType: calculatorType,
          });
        } catch (saveError) {
          errorHandler.handleCalculationError(saveError, {
            operation: 'auto-save calculation',
            symbol: trimmedSymbol,
            calculationType: calculatorType,
          });
          // For now, don't interrupt user flow - calculation result is still returned
          // TODO: Add user notification in next phase
        }
      }
      
      return result;
    } catch (error) {
      const calculationError = errorHandler.handleCalculationError(error, {
        operation: 'execute calculation',
        symbol,
        calculationType: calculatorType,
      });
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

// NOTE: Specialized calculator hooks moved to CalculatorHookFactory.ts
// This reduces duplication and follows DRY principle
// Import from there instead: import { useSmartDCFCalculator } from '../services/CalculatorHookFactory';

// NOTE: useSmartMultiCalculator moved to CalculatorHookFactory.ts to avoid circular dependencies
// Import from there instead: import { useSmartMultiCalculator } from '../services/CalculatorHookFactory';