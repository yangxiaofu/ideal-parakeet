import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { DCFResult } from '../../types';

interface DCFResultsProps {
  result: DCFResult;
}

export const DCFResults: React.FC<DCFResultsProps> = ({ result }) => {
  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(2)}B`;
    } else if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  };

  const formatNumber = (value: number): string => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    } else if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    } else {
      return value.toLocaleString();
    }
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getScenarioLabel = (scenario: string): string => {
    switch (scenario) {
      case 'bull':
        return 'Bull Case';
      case 'bear':
        return 'Bear Case';
      default:
        return 'Base Case';
    }
  };

  const getConfidenceColor = (confidence: string): string => {
    switch (confidence) {
      case 'high':
        return 'text-green-600';
      case 'low':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getUpsideColor = (upside: number): string => {
    return upside >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Main Results Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>DCF Valuation Results</span>
            <span className="text-sm font-normal text-gray-500">
              {getScenarioLabel(result.scenario)} - <span className={getConfidenceColor(result.confidence)}>{result.confidence} confidence</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Intrinsic Value */}
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">${result.intrinsicValuePerShare.toFixed(2)}</div>
              <div className="text-sm text-gray-600">per share</div>
              <div className="text-lg font-semibold mt-1">Intrinsic Value</div>
            </div>

            {/* Current Price Comparison */}
            {result.currentPrice && result.upside !== undefined && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Current Price</span>
                  <span>${result.currentPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Upside</span>
                  <span className={`font-semibold ${getUpsideColor(result.upside)}`}>
                    {result.upside > 0 ? '+' : ''}{result.upside.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Total Present Value</div>
              <div className="text-lg font-semibold">{formatCurrency(result.totalPresentValue)}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Terminal Value</div>
              <div className="text-lg font-semibold">{formatCurrency(result.terminalValue)}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Shares Outstanding</div>
              <div className="text-lg font-semibold">{formatNumber(result.sharesOutstanding)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow Projections */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Year</th>
                  <th className="text-right py-2 px-4">Free Cash Flow</th>
                  <th className="text-right py-2 px-4">Growth Rate</th>
                  <th className="text-right py-2 px-4">Present Value</th>
                </tr>
              </thead>
              <tbody>
                {result.projections.map((projection) => (
                  <tr key={projection.year} className="border-b border-gray-100">
                    <td className="py-2 px-4">{projection.year}</td>
                    <td className="text-right py-2 px-4">{formatCurrency(projection.freeCashFlow)}</td>
                    <td className="text-right py-2 px-4">{formatPercentage(projection.growthRate)}</td>
                    <td className="text-right py-2 px-4">{formatCurrency(projection.presentValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};