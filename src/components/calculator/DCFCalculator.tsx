import React, { useState, useEffect } from 'react';
import { DCFInputForm } from './DCFInputForm';
import { DCFResults } from './DCFResults';
import { calculateDCFIntrinsicValue } from '../../utils/dcfCalculator';
import { useSmartDCFCalculator } from '../../services/CalculatorHookFactory';
import type { DCFInputs, DCFResult } from '../../types';

interface HistoricalValue {
  year: string;
  value: number;
}

interface DCFCalculatorProps {
  symbol?: string;
  currentPrice?: number;
  defaultBaseFCF?: number;
  defaultSharesOutstanding?: number;
  historicalFCF?: HistoricalValue[];
  historicalShares?: HistoricalValue[];
  onCalculationComplete?: (
    intrinsicValue: number, 
    metadata?: {
      confidence?: 'high' | 'medium' | 'low';
      fromCache?: boolean;
      cacheAge?: string;
    }
  ) => void;
}

export const DCFCalculator: React.FC<DCFCalculatorProps> = ({ 
  symbol, 
  currentPrice,
  defaultBaseFCF,
  defaultSharesOutstanding,
  historicalFCF,
  historicalShares,
  onCalculationComplete
}) => {
  const [result, setResult] = useState<DCFResult | null>(null);
  const [showCachedResult, setShowCachedResult] = useState(false);

  // Smart calculator with auto-save and caching
  const {
    calculate: smartCalculate,
    cachedResult,
    isCacheAvailable,
    isCalculationFresh,
    cacheAge,
    isLoadingCache,
    isSaving,
    lastError
  } = useSmartDCFCalculator(
    symbol || '',
    calculateDCFIntrinsicValue,
    {
      companyName: symbol ? `${symbol} Corporation` : undefined,
      autoSave: true,
      showCacheIndicators: true
    }
  );

  const [loading, setLoading] = useState(false);
  const error = lastError?.message || null;

  const handleCalculate = async (inputs: DCFInputs) => {
    setLoading(true);
    setShowCachedResult(false);
    
    try {
      const dcfResult = await smartCalculate(inputs);
      
      // Add current price and upside calculation if available
      if (currentPrice && currentPrice > 0) {
        const upside = ((dcfResult.intrinsicValuePerShare - currentPrice) / currentPrice) * 100;
        setResult({
          ...dcfResult,
          currentPrice,
          upside
        });
      } else {
        setResult(dcfResult);
      }
      
      // Report the result to parent with metadata
      if (onCalculationComplete) {
        onCalculationComplete(dcfResult.intrinsicValuePerShare, {
          confidence: 'medium', // DCF typically has medium confidence
          fromCache: false,
          cacheAge: undefined
        });
      }
    } catch (err) {
      console.error('DCF calculation failed:', err);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUseCachedResult = () => {
    if (cachedResult) {
      // Add current price and upside calculation if available
      if (currentPrice && currentPrice > 0) {
        const upside = ((cachedResult.intrinsicValuePerShare - currentPrice) / currentPrice) * 100;
        setResult({
          ...cachedResult,
          currentPrice,
          upside
        });
      } else {
        setResult(cachedResult);
      }
      
      setShowCachedResult(true);
      
      // Report the cached result to parent with metadata
      if (onCalculationComplete) {
        onCalculationComplete(cachedResult.intrinsicValuePerShare, {
          confidence: 'medium', // Maintain same confidence
          fromCache: true,
          cacheAge: cacheAge || undefined
        });
      }
    }
  };

  const handleReset = () => {
    setResult(null);
    setShowCachedResult(false);
  };

  // Auto-load cached result if available and fresh
  useEffect(() => {
    if (isCacheAvailable && isCalculationFresh && !result && !showCachedResult) {
      handleUseCachedResult();
    }
  }, [isCacheAvailable, isCalculationFresh, result, showCachedResult]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            DCF Valuation Calculator
            {symbol && <span className="text-blue-600 ml-2">({symbol})</span>}
          </h2>
          <p className="text-gray-600 mt-1">
            Calculate intrinsic value using Discounted Cash Flow analysis
          </p>
        </div>
        {result && (
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Calculate Again
          </button>
        )}
      </div>

      {/* Current Price Display */}
      {currentPrice && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">Current Market Price</span>
            <span className="text-lg font-semibold text-blue-900">${currentPrice.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Cache Status and Auto-Save Indicators */}
      {(isCacheAvailable || isSaving || isLoadingCache) && (
        <div className="space-y-3">
          {/* Loading Cache */}
          {isLoadingCache && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-sm text-gray-600">Loading previous calculations...</span>
              </div>
            </div>
          )}

          {/* Cached Result Available */}
          {isCacheAvailable && !showCachedResult && !result && (
            <div className={`border rounded-lg p-4 ${
              isCalculationFresh 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isCalculationFresh ? 'bg-green-400' : 'bg-yellow-400'
                  }`}></div>
                  <div>
                    <span className={`text-sm font-medium ${
                      isCalculationFresh ? 'text-green-900' : 'text-yellow-900'
                    }`}>
                      {isCalculationFresh ? 'Fresh calculation available' : 'Previous calculation found'}
                    </span>
                    {cacheAge && (
                      <p className={`text-xs mt-1 ${
                        isCalculationFresh ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        Calculated {cacheAge}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleUseCachedResult}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    isCalculationFresh
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  }`}
                >
                  Use Previous Result
                </button>
              </div>
            </div>
          )}

          {/* Cached Result Being Shown */}
          {showCachedResult && result && (
            <div className={`border rounded-lg p-3 ${
              isCalculationFresh 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isCalculationFresh ? 'bg-green-400' : 'bg-yellow-400'
                  }`}></div>
                  <span className={`text-xs ${
                    isCalculationFresh ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    Showing cached result from {cacheAge}
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className={`text-xs underline ${
                    isCalculationFresh ? 'text-green-700 hover:text-green-900' : 'text-yellow-700 hover:text-yellow-900'
                  }`}
                >
                  Recalculate with new data
                </button>
              </div>
            </div>
          )}

          {/* Auto-Save Status */}
          {isSaving && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-700">Saving calculation...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Calculation Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      {!result && (
        <DCFInputForm 
          onSubmit={handleCalculate}
          loading={loading}
          initialValues={
            defaultBaseFCF && defaultSharesOutstanding
              ? {
                  baseFCF: defaultBaseFCF,
                  sharesOutstanding: defaultSharesOutstanding,
                  discountRate: 0.15,
                  terminalGrowthRate: 0.03,
                  projectionYears: 10,
                  scenario: 'base',
                  fcfGrowthRates: [] // Will be generated dynamically
                }
              : undefined
          }
          historicalFCF={historicalFCF}
          historicalShares={historicalShares}
        />
      )}

      {/* Results */}
      {result && (
        <DCFResults result={result} />
      )}
    </div>
  );
};