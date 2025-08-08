import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { RelativeValuationInputForm } from './RelativeValuationInputForm';
import { RelativeValuationResults } from './RelativeValuationResults';
import { calculateRelativeValuation } from '../../utils/relativeValuationCalculator';
import type { 
  RelativeValuationInputs, 
  RelativeValuationResult,
  PeerCompany 
} from '../../types/relativeValuation';

interface RelativeValuationCalculatorProps {
  symbol?: string;
  currentPrice?: number;
  defaultCompanyData?: {
    symbol: string;
    name: string;
    marketCap: number;
    enterpriseValue: number;
    revenue: number;
    ebitda: number;
    netIncome: number;
    bookValue: number;
    sharesOutstanding: number;
    debt: number;
    cash: number;
  };
  suggestedPeers?: PeerCompany[];
  onCalculationComplete?: (intrinsicValue: number) => void;
}

export const RelativeValuationCalculator: React.FC<RelativeValuationCalculatorProps> = ({
  symbol,
  currentPrice,
  defaultCompanyData,
  suggestedPeers = [],
  onCalculationComplete
}) => {
  const [result, setResult] = useState<RelativeValuationResult | null>(null);
  const [lastInputs, setLastInputs] = useState<RelativeValuationInputs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async (inputs: RelativeValuationInputs) => {
    try {
      setError(null);
      setIsCalculating(true);
      
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const calculationResult = calculateRelativeValuation(inputs);
      setResult(calculationResult);
      setLastInputs(inputs);
      
      // Calculate weighted average of implied values for parent callback
      if (onCalculationComplete && calculationResult.multiples.length > 0) {
        const validMultiples = calculationResult.multiples.filter(m => m.impliedPricePerShare > 0);
        if (validMultiples.length > 0) {
          const avgImpliedPricePerShare = validMultiples.reduce(
            (sum, m) => sum + m.impliedPricePerShare, 0
          ) / validMultiples.length;
          
          // Pass per-share value to be consistent with other calculators (DCF, DDM)
          onCalculationComplete(avgImpliedPricePerShare);
        }
      }
    } catch (err) {
      console.error('Relative valuation calculation failed:', err);
      setError(err instanceof Error ? err.message : 'Calculation failed');
      setResult(null);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleRecalculate = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      {!result && (
        <Card>
          <CardContent className="pt-6">
            <RelativeValuationInputForm
              onCalculate={handleCalculate}
              defaultCompanyData={defaultCompanyData}
              suggestedPeers={suggestedPeers}
            />
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isCalculating && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Calculating Relative Valuation</h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Analyzing peer group multiples and determining fair value ranges...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800 mb-1">
                  Calculation Error
                </h3>
                <p className="text-sm text-red-700">
                  {error}
                </p>
                <button
                  onClick={handleRecalculate}
                  className="text-sm text-red-600 underline hover:text-red-800 mt-2"
                >
                  Try Again
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {result && lastInputs && (
        <>
          <RelativeValuationResults
            result={result}
            currentPrice={currentPrice}
            symbol={symbol}
          />
          
          {/* Recalculate Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <button
                  onClick={handleRecalculate}
                  className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Modify Analysis
                </button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Instructions for first-time users */}
      {!result && !error && !isCalculating && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold mb-2">Relative Valuation Analysis</h3>
              <p className="text-sm text-gray-600 max-w-2xl mx-auto mb-4">
                Compare your company against industry peers using multiple valuation ratios.
                This method helps identify whether a stock is fairly valued, overvalued, or undervalued
                relative to comparable companies.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto text-left mt-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2">📊 Multiple Ratios</h4>
                  <p className="text-xs text-gray-600">
                    Choose from P/E, P/S, EV/EBITDA, P/B, and PEG ratios based on your company's characteristics
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2">👥 Peer Analysis</h4>
                  <p className="text-xs text-gray-600">
                    Add comparable companies to create a robust peer group for accurate benchmarking
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-2">📈 Valuation Ranges</h4>
                  <p className="text-xs text-gray-600">
                    Get conservative, moderate, and optimistic value ranges with confidence indicators
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};