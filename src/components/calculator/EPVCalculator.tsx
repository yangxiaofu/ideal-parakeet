import React, { useState } from 'react';
import { EPVInputForm } from './EPVInputForm';
import { EPVResults } from './EPVResults';
import { calculateEPVIntrinsicValue } from '../../utils/epvCalculator';
import type { EPVInputs, EPVResult } from '../../types/epv';

interface EPVCalculatorProps {
  symbol?: string;
  currentPrice?: number;
  defaultNormalizedEarnings?: number;
  defaultSharesOutstanding?: number;
  historicalEarnings?: Array<{
    year: number;
    netIncome: number;
    operatingIncome: number;
    revenue: number;
    date: string;
  }>;
  onCalculationComplete?: (
    intrinsicValue: number, 
    metadata?: {
      confidence?: 'high' | 'medium' | 'low';
      fromCache?: boolean;
      cacheAge?: string;
    }
  ) => void;
}

export const EPVCalculator: React.FC<EPVCalculatorProps> = ({
  symbol,
  currentPrice,
  defaultNormalizedEarnings,
  defaultSharesOutstanding,
  historicalEarnings,
  onCalculationComplete
}) => {
  const [result, setResult] = useState<EPVResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async (inputs: EPVInputs) => {
    setLoading(true);
    setError(null);
    
    try {
      const epvResult = calculateEPVIntrinsicValue(inputs);
      
      // Add current price and upside calculation if available
      if (currentPrice && currentPrice > 0) {
        const upside = ((epvResult.epvPerShare - currentPrice) / currentPrice) * 100;
        const priceToEPV = currentPrice / epvResult.epvPerShare;
        
        setResult({
          ...epvResult,
          currentPrice,
          upside,
          priceToEPV
        });
      } else {
        setResult(epvResult);
      }
      
      // Report the result to parent
      if (onCalculationComplete) {
        onCalculationComplete(epvResult.epvPerShare);
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
            EPV Calculator
            {symbol && <span className="text-blue-600 ml-2">({symbol})</span>}
          </h2>
          <p className="text-gray-600 mt-1">
            Conservative valuation based on current sustainable earnings
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
        <EPVInputForm
          onSubmit={handleCalculate}
          loading={loading}
          historicalEarnings={historicalEarnings}
          symbol={symbol}
          sharesOutstanding={defaultSharesOutstanding || 0}
          initialValues={
            defaultNormalizedEarnings && defaultSharesOutstanding
              ? {
                  symbol: symbol || '',
                  historicalEarnings: historicalEarnings || [],
                  normalizationMethod: 'average',
                  normalizationPeriod: Math.min(5, historicalEarnings?.length || 5),
                  earningsAdjustments: [],
                  maintenanceCapex: {
                    historicalCapex: [],
                    historicalDepreciation: [],
                    averageCapex: 0,
                    averageDepreciation: 0,
                    maintenanceCapex: 0,
                    growthCapex: 0,
                    capexAsPercentOfSales: 0,
                    method: 'manual'
                  },
                  costOfCapitalMethod: 'wacc',
                  costOfCapitalComponents: {
                    riskFreeRate: 0.045,
                    marketRiskPremium: 0.065,
                    beta: 1.0,
                    costOfEquity: 0,
                    costOfDebt: 0.05,
                    weightOfEquity: 0.8,
                    weightOfDebt: 0.2,
                    taxRate: 0.21,
                    wacc: 0
                  },
                  sharesOutstanding: defaultSharesOutstanding,
                  includeMaintenanceCapex: true,
                  taxAdjustments: true,
                  earningsQuality: 'good',
                  businessStability: 'stable',
                  competitivePosition: 'average'
                }
              : undefined
          }
        />
      )}

      {/* Results */}
      {result && (
        <EPVResults result={result} onReset={handleReset} />
      )}
    </div>
  );
};