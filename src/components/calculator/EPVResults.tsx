import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart } from 'recharts';
import type { EPVResult } from '../../types/epv';
import { calculateEPVSensitivity } from '../../utils/epvCalculator';
import { formatCurrency } from '../../utils/formatters';

interface EPVResultsProps {
  result: EPVResult;
  onReset?: () => void;
}

export const EPVResults: React.FC<EPVResultsProps> = ({ result, onReset }) => {
  const sensitivity = calculateEPVSensitivity(result);
  
  // Format numbers for display
  const formatLargeNumber = (num: number): string => {
    if (Math.abs(num) >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    } else if (Math.abs(num) >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    } else if (Math.abs(num) >= 1e3) {
      return `$${(num / 1e3).toFixed(2)}K`;
    }
    return formatCurrency(num);
  };
  
  // Color scheme for confidence levels
  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Prepare sensitivity chart data
  const costOfCapitalChartData = sensitivity.costOfCapitalSensitivity.map((item) => ({
    costOfCapital: `${(item.costOfCapital * 100).toFixed(1)}%`,
    epvPerShare: item.epvPerShare,
    percentChange: item.percentChange,
    isBase: Math.abs(item.percentChange) < 0.1 // Identify base case
  }));
  
  const earningsChartData = sensitivity.earningsSensitivity.map((item) => ({
    earningsChange: `${item.earningsChange > 0 ? '+' : ''}${item.earningsChange.toFixed(0)}%`,
    epvPerShare: item.epvPerShare,
    percentChange: item.percentChange,
    isBase: Math.abs(item.earningsChange) < 0.1
  }));
  
  const capexChartData = sensitivity.maintenanceCapexSensitivity.map((item) => ({
    capexPercent: `${item.maintenanceCapexPercent.toFixed(0)}%`,
    epvPerShare: item.epvPerShare,
    percentChange: item.percentChange,
    isBase: item.maintenanceCapexPercent === (result.maintenanceCapex / result.normalizedEarnings * 100)
  }));
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">EPV Valuation Results</h2>
          <p className="text-gray-600 mt-1">
            Conservative intrinsic value based on current earning power
          </p>
        </div>
        {onReset && (
          <Button onClick={onReset} variant="outline">
            Calculate Again
          </Button>
        )}
      </div>
      
      {/* Key Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 text-center">
          <div className="text-sm font-medium text-gray-600 mb-1">EPV Per Share</div>
          <div className="text-3xl font-bold text-blue-600">${result.epvPerShare.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">Earnings Power Value</div>
        </Card>
        
        <Card className="p-6 text-center">
          <div className="text-sm font-medium text-gray-600 mb-1">Total EPV</div>
          <div className="text-3xl font-bold text-gray-900">{formatLargeNumber(result.epvTotalValue)}</div>
          <div className="text-xs text-gray-500 mt-1">Enterprise Value</div>
        </Card>
        
        <Card className="p-6 text-center">
          <div className="text-sm font-medium text-gray-600 mb-1">Earnings Yield</div>
          <div className="text-3xl font-bold text-green-600">{(result.earningsYield * 100).toFixed(1)}%</div>
          <div className="text-xs text-gray-500 mt-1">Inverse of P/E</div>
        </Card>
        
        <Card className="p-6 text-center">
          <div className="text-sm font-medium text-gray-600 mb-1">Confidence Level</div>
          <Badge className={`text-sm font-medium ${getConfidenceColor(result.confidenceLevel)}`}>
            {result.confidenceLevel.charAt(0).toUpperCase() + result.confidenceLevel.slice(1)}
          </Badge>
          <div className="text-xs text-gray-500 mt-1">Assessment Quality</div>
        </Card>
      </div>
      
      {/* Current Price Comparison */}
      {result.currentPrice && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Current Price</div>
              <div className="text-2xl font-bold text-gray-900">${result.currentPrice.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Upside/Downside</div>
              <div className={`text-2xl font-bold ${result.upside && result.upside > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {result.upside ? `${result.upside > 0 ? '+' : ''}${result.upside.toFixed(1)}%` : 'N/A'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-1">Price to EPV</div>
              <div className="text-2xl font-bold text-gray-900">
                {result.priceToEPV ? `${result.priceToEPV.toFixed(2)}x` : 'N/A'}
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Earnings Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Normalized Earnings Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Normalized Earnings</span>
                <span className="font-medium">{formatLargeNumber(result.normalizedEarnings)}</span>
              </div>
              {result.maintenanceCapex > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Less: Maintenance Capex</span>
                  <span className="font-medium text-red-600">({formatLargeNumber(result.maintenanceCapex)})</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-medium text-gray-900">Adjusted Earnings</span>
                <span className="font-semibold">{formatLargeNumber(result.adjustedEarnings)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cost of Capital</span>
                <span className="font-medium">{(result.costOfCapital * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
          <div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-900">Quality Metrics</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Earnings Quality Score</span>
                  <span>{result.earningsNormalization.qualityScore.toFixed(0)}/100</span>
                </div>
                <div className="flex justify-between">
                  <span>Earnings Volatility</span>
                  <span>{(result.earningsNormalization.volatility * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Trend</span>
                  <Badge variant="outline" className="text-xs">
                    {result.earningsNormalization.trend}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Competitive Moat Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Competitive Moat Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-1">Economic Moat</div>
            <Badge className={result.moatAnalysis.hasEconomicMoat ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {result.moatAnalysis.hasEconomicMoat ? 'Present' : 'None'}
            </Badge>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-1">Moat Strength</div>
            <Badge variant="outline">{result.moatAnalysis.moatStrength}</Badge>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-1">Sustainability</div>
            <Badge variant="outline">{result.moatAnalysis.moatSustainability}</Badge>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-1">Competitive Pressure</div>
            <Badge 
              className={
                result.moatAnalysis.competitivePressure === 'low' 
                  ? 'bg-green-100 text-green-800' 
                  : result.moatAnalysis.competitivePressure === 'medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }
            >
              {result.moatAnalysis.competitivePressure}
            </Badge>
          </div>
        </div>
      </Card>
      
      {/* Sensitivity Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost of Capital Sensitivity */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost of Capital Sensitivity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costOfCapitalChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="costOfCapital" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'EPV per Share']}
                  labelStyle={{ color: '#374151' }}
                />
                <Bar dataKey="epvPerShare" name="EPV per Share">
                  {costOfCapitalChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isBase ? '#3B82F6' : '#93C5FD'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        {/* Earnings Sensitivity */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Sensitivity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earningsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="earningsChange" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'EPV per Share']}
                  labelStyle={{ color: '#374151' }}
                />
                <Bar dataKey="epvPerShare" name="EPV per Share">
                  {earningsChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isBase ? '#10B981' : '#6EE7B7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      
      {/* Maintenance Capex Sensitivity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Capex Sensitivity</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={capexChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="capexPercent" 
                tick={{ fontSize: 12 }}
                label={{ value: 'Capex as % of Earnings', position: 'insideBottom', offset: -10 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'EPV per Share']}
                labelStyle={{ color: '#374151' }}
              />
              <Bar dataKey="epvPerShare" name="EPV per Share">
                {capexChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isBase ? '#F59E0B' : '#FCD34D'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      
      {/* Warnings */}
      {result.warnings && result.warnings.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Important Considerations</h3>
          <div className="space-y-3">
            {result.warnings.map((warning, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg border-l-4 ${
                  warning.type === 'error' 
                    ? 'bg-red-50 border-red-400'
                    : warning.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-400'
                    : 'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Badge 
                      className={`${
                        warning.severity === 'high' 
                          ? 'bg-red-100 text-red-800'
                          : warning.severity === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {warning.severity}
                    </Badge>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{warning.message}</p>
                    {warning.suggestion && (
                      <p className="text-xs text-gray-600 mt-1">
                        <strong>Suggestion:</strong> {warning.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      {/* EPV Methodology */}
      <Card className="p-6 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">EPV Methodology</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>Earnings Power Value (EPV)</strong> represents the value of a company assuming no future growth. 
            It focuses solely on the company's current ability to generate sustainable profits.
          </p>
          <p>
            <strong>Formula:</strong> EPV = Normalized Earnings ÷ Cost of Capital
          </p>
          <p>
            This conservative approach is ideal for:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Mature, stable businesses with predictable earnings</li>
            <li>Establishing a "floor" value without growth speculation</li>
            <li>Companies with strong competitive moats</li>
            <li>Value investing with margin of safety</li>
          </ul>
          <p className="text-xs text-gray-600 mt-4">
            Calculated on {result.calculationDate.toLocaleDateString()} using {result.sharesOutstanding.toLocaleString()} shares outstanding.
          </p>
        </div>
      </Card>
    </div>
  );
};