import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { DDMInputForm } from './DDMInputForm';
import { DDMResults } from './DDMResults';
import { calculateDDM } from '../../utils/ddmCalculator';
import type { DDMInputs, DDMResult } from '../../types/ddm';

interface DDMCalculatorProps {
  symbol?: string;
  currentPrice?: number;
  defaultDividend?: number;
  defaultSharesOutstanding?: number;
  historicalDividends?: Array<{ year: string; value: number }>;
  historicalShares?: Array<{ year: string; value: number }>;
  onCalculationComplete?: (intrinsicValue: number) => void;
}

export const DDMCalculator: React.FC<DDMCalculatorProps> = ({
  symbol,
  currentPrice,
  defaultDividend = 0,
  defaultSharesOutstanding = 0,
  historicalDividends = [],
  historicalShares = [],
  onCalculationComplete
}) => {
  const [result, setResult] = useState<DDMResult | null>(null);
  const [lastInputs, setLastInputs] = useState<DDMInputs | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = (inputs: DDMInputs) => {
    try {
      setError(null);
      const calculationResult = calculateDDM(inputs);
      setResult(calculationResult);
      setLastInputs(inputs);
      
      // Notify parent component
      if (onCalculationComplete) {
        onCalculationComplete(calculationResult.intrinsicValuePerShare);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
      setResult(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardContent className="pt-6">
          <DDMInputForm
            onCalculate={handleCalculate}
            defaultDividend={defaultDividend}
            defaultShares={defaultSharesOutstanding}
            historicalDividends={historicalDividends}
            historicalShares={historicalShares}
          />
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {/* Results Section */}
      {result && lastInputs && (
        <DDMResults
          result={result}
          inputs={{
            currentDividend: lastInputs.currentDividend,
            requiredReturn: lastInputs.requiredReturn,
            gordonGrowthRate: lastInputs.gordonGrowthRate,
            stableGrowthRate: lastInputs.stableGrowthRate
          }}
          currentPrice={currentPrice}
          symbol={symbol}
        />
      )}

      {/* Instructions for first-time users */}
      {!result && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold mb-2">Dividend Discount Model Calculator</h3>
              <p className="text-sm text-gray-600 max-w-2xl mx-auto mb-4">
                The DDM values a stock based on the present value of its future dividend payments.
                Choose your model type based on the company's dividend growth characteristics:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto text-left">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-1">Gordon Growth Model</h4>
                  <p className="text-xs text-gray-600">
                    Best for mature companies with stable, predictable dividend growth
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-1">Zero Growth Model</h4>
                  <p className="text-xs text-gray-600">
                    For preferred stocks or companies with constant dividends
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-1">Two-Stage Model</h4>
                  <p className="text-xs text-gray-600">
                    For companies transitioning from high growth to stable growth
                  </p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-1">Multi-Stage Model</h4>
                  <p className="text-xs text-gray-600">
                    For complex growth patterns with multiple transition phases
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