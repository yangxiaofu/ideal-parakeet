import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { TrendingUp, TrendingDown, Info, DollarSign, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DDMResult, DDMSensitivity, DDMInputs } from '../../types/ddm';
import { calculateDDMSensitivity } from '../../utils/ddmCalculator';

interface DDMResultsProps {
  result: DDMResult;
  inputs: {
    currentDividend: number;
    requiredReturn: number;
    gordonGrowthRate?: number;
    stableGrowthRate?: number;
  };
  currentPrice?: number;
  symbol?: string;
}

export const DDMResults: React.FC<DDMResultsProps> = ({
  result,
  inputs,
  currentPrice,
  symbol = 'the company'
}) => {
  const [showSensitivity, setShowSensitivity] = useState(false);
  const [sensitivity, setSensitivity] = useState<DDMSensitivity | null>(null);
  
  // Calculate upside/downside if current price is available
  const upside = currentPrice ? ((result.intrinsicValuePerShare - currentPrice) / currentPrice) * 100 : null;
  const isUndervalued = upside !== null && upside > 0;
  
  // Prepare chart data for dividend projections
  const chartData = result.dividendProjections.slice(0, 10).map(proj => ({
    year: `Year ${proj.year}`,
    dividend: parseFloat(proj.dividend.toFixed(2)),
    presentValue: parseFloat(proj.presentValue.toFixed(2)),
    growthRate: parseFloat((proj.growthRate * 100).toFixed(2))
  }));
  
  // Calculate sensitivity if not already done
  const handleShowSensitivity = () => {
    if (!sensitivity) {
      const ddmInputs = {
        currentDividend: inputs.currentDividend,
        sharesOutstanding: 1, // Per share calculation
        requiredReturn: inputs.requiredReturn,
        modelType: result.modelType,
        gordonGrowthRate: inputs.gordonGrowthRate,
        stableGrowthRate: inputs.stableGrowthRate
      } as DDMInputs;
      
      const sens = calculateDDMSensitivity(ddmInputs);
      setSensitivity(sens);
    }
    setShowSensitivity(!showSensitivity);
  };
  
  // Model description
  const getModelDescription = () => {
    switch (result.modelType) {
      case 'gordon':
        return 'Assumes constant dividend growth rate forever';
      case 'zero':
        return 'Assumes dividends remain constant with no growth';
      case 'two-stage':
        return 'High growth period followed by stable growth';
      case 'multi-stage':
        return 'Multiple growth phases transitioning to stable growth';
      default:
        return '';
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Main Valuation Result */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>DDM Valuation Result</span>
            <span className="text-sm font-normal text-gray-500">
              {result.modelType === 'gordon' && 'Gordon Growth Model'}
              {result.modelType === 'zero' && 'Zero Growth Model'}
              {result.modelType === 'two-stage' && 'Two-Stage Model'}
              {result.modelType === 'multi-stage' && 'Multi-Stage Model'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Intrinsic Value */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Intrinsic Value per Share</span>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-900">
                ${result.intrinsicValuePerShare.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">{getModelDescription()}</p>
            </div>
            
            {/* Current Price Comparison */}
            {currentPrice && (
              <div className={`rounded-lg p-4 ${isUndervalued ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Current Price</span>
                  {isUndervalued ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className={`text-2xl font-bold ${isUndervalued ? 'text-green-900' : 'text-red-900'}`}>
                  ${currentPrice.toFixed(2)}
                </div>
                <p className={`text-sm font-medium mt-1 ${isUndervalued ? 'text-green-700' : 'text-red-700'}`}>
                  {upside! > 0 ? '+' : ''}{upside!.toFixed(1)}% {isUndervalued ? 'Upside' : 'Downside'}
                </p>
              </div>
            )}
          </div>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-gray-500">Current Yield</p>
              <p className="text-sm font-semibold">{(result.currentDividendYield * 100).toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Forward Yield</p>
              <p className="text-sm font-semibold">{(result.forwardDividendYield * 100).toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total PV Dividends</p>
              <p className="text-sm font-semibold">${result.totalPVofDividends.toFixed(2)}</p>
            </div>
            {result.terminalValuePV && (
              <div>
                <p className="text-xs text-gray-500">Terminal Value PV</p>
                <p className="text-sm font-semibold">${result.terminalValuePV.toFixed(2)}</p>
              </div>
            )}
          </div>
          
          {/* Recommendation */}
          {currentPrice && (
            <div className={`border rounded-lg p-3 ${
              isUndervalued ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
            }`}>
              <div className="flex items-start gap-2">
                <Info className={`h-4 w-4 mt-0.5 ${isUndervalued ? 'text-green-600' : 'text-yellow-600'}`} />
                <div className="text-sm">
                  {isUndervalued ? (
                    <p className="text-green-800">
                      Based on the DDM analysis, {symbol} appears to be <strong>undervalued</strong> by {upside!.toFixed(1)}%.
                      The intrinsic value of ${result.intrinsicValuePerShare.toFixed(2)} suggests potential upside from the current price.
                    </p>
                  ) : (
                    <p className="text-yellow-800">
                      Based on the DDM analysis, {symbol} appears to be <strong>overvalued</strong> by {Math.abs(upside!).toFixed(1)}%.
                      Consider waiting for a better entry point or reassessing growth assumptions.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Dividend Projections Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Dividend Projections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              <Legend />
              <Bar yAxisId="left" dataKey="dividend" fill="#3B82F6" name="Dividend ($)" />
              <Bar yAxisId="left" dataKey="presentValue" fill="#10B981" name="Present Value ($)" />
              <Line yAxisId="right" type="monotone" dataKey="growthRate" stroke="#F59E0B" name="Growth Rate (%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Detailed Projections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Dividend Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Year</th>
                  <th className="text-right py-2">Dividend</th>
                  <th className="text-right py-2">Growth Rate</th>
                  <th className="text-right py-2">Discount Factor</th>
                  <th className="text-right py-2">Present Value</th>
                </tr>
              </thead>
              <tbody>
                {result.dividendProjections.slice(0, 10).map((proj) => (
                  <tr key={proj.year} className="border-b">
                    <td className="py-2">{proj.year}</td>
                    <td className="text-right">${proj.dividend.toFixed(3)}</td>
                    <td className="text-right">{(proj.growthRate * 100).toFixed(1)}%</td>
                    <td className="text-right">{proj.discountFactor.toFixed(4)}</td>
                    <td className="text-right font-medium">${proj.presentValue.toFixed(3)}</td>
                  </tr>
                ))}
                {result.terminalValue && (
                  <tr className="border-t-2 font-semibold">
                    <td className="py-2">Terminal</td>
                    <td className="text-right" colSpan={3}>
                      Terminal Value: ${result.terminalValue.toFixed(2)}
                    </td>
                    <td className="text-right">${result.terminalValuePV?.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="border-t-2 font-bold bg-gray-50">
                  <td className="py-2" colSpan={4}>Total Intrinsic Value per Share</td>
                  <td className="text-right py-2">${result.intrinsicValuePerShare.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Sensitivity Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Sensitivity Analysis</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleShowSensitivity}
            >
              {showSensitivity ? 'Hide' : 'Show'} Analysis
            </Button>
          </CardTitle>
        </CardHeader>
        {showSensitivity && sensitivity && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Growth Rate Sensitivity */}
              <div>
                <h4 className="text-sm font-medium mb-2">Growth Rate Sensitivity</h4>
                <div className="space-y-1">
                  {sensitivity.growthRateSensitivity.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{(item.growthRate * 100).toFixed(1)}%</span>
                      <span className={item.percentChange > 0 ? 'text-green-600' : 'text-red-600'}>
                        ${item.value.toFixed(2)} ({item.percentChange > 0 ? '+' : ''}{item.percentChange.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Discount Rate Sensitivity */}
              <div>
                <h4 className="text-sm font-medium mb-2">Discount Rate Sensitivity</h4>
                <div className="space-y-1">
                  {sensitivity.discountRateSensitivity.map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span>{(item.discountRate * 100).toFixed(1)}%</span>
                      <span className={item.percentChange > 0 ? 'text-green-600' : 'text-red-600'}>
                        ${item.value.toFixed(2)} ({item.percentChange > 0 ? '+' : ''}{item.percentChange.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Sensitivity Matrix */}
            <div>
              <h4 className="text-sm font-medium mb-2">Valuation Matrix (Growth vs Discount Rate)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="p-1 text-left">Growth \ Discount</th>
                      {sensitivity.matrix[0]?.values.map((v, i) => (
                        <th key={i} className="p-1 text-right">
                          {(v.discountRate * 100).toFixed(1)}%
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivity.matrix.map((row, i) => (
                      <tr key={i}>
                        <td className="p-1 font-medium">{(row.growthRate * 100).toFixed(1)}%</td>
                        {row.values.map((v, j) => (
                          <td key={j} className={`p-1 text-right ${
                            v.value > result.intrinsicValuePerShare ? 'text-green-600' :
                            v.value < result.intrinsicValuePerShare ? 'text-red-600' : 'font-bold'
                          }`}>
                            ${v.value > 0 ? v.value.toFixed(0) : 'N/A'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};