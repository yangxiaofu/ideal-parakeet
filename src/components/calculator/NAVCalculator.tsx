import React, { useState } from 'react';
import { NAVInputForm } from './NAVInputForm';
import { NAVResults } from './NAVResults';
import { calculateNAV } from '../../utils/navCalculator';
import type { NAVInputs, NAVResult } from '../../types/nav';
import type { BalanceSheet } from '../../types';

interface NAVCalculatorProps {
  symbol?: string;
  currentPrice?: number;
  balanceSheet?: BalanceSheet;
  onCalculationComplete?: (navPerShare: number) => void;
}

export const NAVCalculator: React.FC<NAVCalculatorProps> = ({ 
  symbol, 
  currentPrice,
  balanceSheet,
  onCalculationComplete
}) => {
  const [result, setResult] = useState<NAVResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async (inputs: NAVInputs) => {
    if (!balanceSheet) {
      setError('Balance sheet data is required for NAV calculation');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const navResult = calculateNAV(inputs, balanceSheet);
      
      // Store the result as is
      setResult(navResult);
      
      // Report the result to parent
      if (onCalculationComplete) {
        onCalculationComplete(navResult.navPerShare);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during NAV calculation';
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

  if (!balanceSheet) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Balance Sheet Required</h3>
        <p className="text-gray-600">
          Please select a company to load balance sheet data for NAV calculation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Net Asset Value Calculator
            {symbol && <span className="text-blue-600 ml-2">({symbol})</span>}
          </h2>
          <p className="text-gray-600 mt-1">
            Calculate fair value based on adjusted book value of assets and liabilities
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

      {/* Balance Sheet Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Balance Sheet Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Assets</span>
            <div className="font-semibold">${(balanceSheet.totalAssets / 1_000_000).toFixed(1)}M</div>
          </div>
          <div>
            <span className="text-gray-600">Total Liabilities</span>
            <div className="font-semibold">${(balanceSheet.totalLiabilities / 1_000_000).toFixed(1)}M</div>
          </div>
          <div>
            <span className="text-gray-600">Book Value</span>
            <div className="font-semibold">${((balanceSheet.totalAssets - balanceSheet.totalLiabilities) / 1_000_000).toFixed(1)}M</div>
          </div>
        </div>
      </div>

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
        <NAVInputForm 
          onSubmit={handleCalculate}
          loading={loading}
          balanceSheet={balanceSheet}
        />
      )}

      {/* Results */}
      {result && (
        <NAVResults 
          result={result} 
          currentPrice={currentPrice}
        />
      )}
    </div>
  );
};