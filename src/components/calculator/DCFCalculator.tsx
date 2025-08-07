import React, { useState } from 'react';
import { DCFInputForm } from './DCFInputForm';
import { DCFResults } from './DCFResults';
import { calculateDCFIntrinsicValue } from '../../utils/dcfCalculator';
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
  onCalculationComplete?: (intrinsicValue: number) => void;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async (inputs: DCFInputs) => {
    setLoading(true);
    setError(null);
    
    try {
      const dcfResult = calculateDCFIntrinsicValue(inputs);
      
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
      
      // Report the result to parent
      if (onCalculationComplete) {
        onCalculationComplete(dcfResult.intrinsicValuePerShare);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during calculation';
      setError(errorMessage);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

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