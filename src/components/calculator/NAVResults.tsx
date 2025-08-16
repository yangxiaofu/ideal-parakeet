import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { 
 
 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Eye,
  Building,
  DollarSign,
  Target,
  Shield
} from 'lucide-react';
import type { NAVResult } from '../../types/nav';

interface NAVResultsProps {
  result: NAVResult;
  currentPrice?: number;
}

export const NAVResults: React.FC<NAVResultsProps> = ({ result, currentPrice }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'liabilities' | 'quality' | 'scenarios'>('overview');

  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(2)}B`;
    } else if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    } else {
      return `$${Math.round(value).toLocaleString()}`;
    }
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getUpsideColor = (upside: number): string => {
    return upside >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getQualityColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <Shield className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-red-600" />;
  };

  const getWarningIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  // Prepare chart data
  const assetBreakdownData = result.assetBreakdown.map(asset => ({
    category: asset.description,
    bookValue: asset.bookValue / 1_000_000,
    adjustedValue: asset.adjustedValue / 1_000_000,
    adjustmentAmount: asset.adjustmentAmount / 1_000_000,
    qualityScore: asset.qualityScore
  })).filter(item => item.bookValue > 0 || item.adjustedValue > 0);

  const liabilityBreakdownData = result.liabilityBreakdown.map(liability => ({
    category: liability.description,
    bookValue: liability.bookValue / 1_000_000,
    adjustedValue: liability.adjustedValue / 1_000_000,
    adjustmentAmount: liability.adjustmentAmount / 1_000_000
  })).filter(item => item.bookValue > 0 || item.adjustedValue > 0);

  const assetQualityData = result.assetBreakdown
    .filter(asset => asset.adjustedValue > 0)
    .map(asset => ({
      name: asset.description,
      value: asset.adjustedValue,
      quality: asset.qualityScore
    }));

  const liquidationData = result.liquidationAnalysis.map(analysis => ({
    scenario: analysis.scenario.charAt(0).toUpperCase() + analysis.scenario.slice(1),
    value: analysis.liquidationValuePerShare,
    discount: analysis.averageDiscount * 100,
    timeFrame: analysis.timeFrame
  }));

  const scenarioComparisonData = [
    { name: 'Book Value', value: result.bookValuePerShare, color: '#8884d8' },
    { name: 'Adjusted NAV', value: result.navPerShare, color: '#82ca9d' },
    ...liquidationData.map(item => ({ 
      name: `${item.scenario} Liquidation`, 
      value: item.value, 
      color: item.scenario === 'Orderly' ? '#ffc658' : item.scenario === 'Quick' ? '#ff7c7c' : '#8dd1e1'
    }))
  ];

  // Calculate discount/premium to current price
  const currentDiscount = currentPrice ? ((result.navPerShare - currentPrice) / result.navPerShare) * 100 : null;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

  return (
    <div className="space-y-6">
      {/* Main Results Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>NAV Analysis Results</span>
            <div className="flex items-center gap-2">
              {getQualityIcon(result.assetQuality.overallScore)}
              <Badge variant={result.confidenceLevel === 'high' ? 'default' : 
                             result.confidenceLevel === 'medium' ? 'secondary' : 'destructive'}>
                {result.confidenceLevel} confidence
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* NAV Per Share */}
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">${result.navPerShare.toFixed(2)}</div>
              <div className="text-sm text-gray-600">per share</div>
              <div className="text-lg font-semibold mt-1">Adjusted NAV</div>
            </div>

            {/* Book Value Comparison */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700">${result.bookValuePerShare.toFixed(2)}</div>
              <div className="text-sm text-gray-600">per share</div>
              <div className="text-base font-medium mt-1">Book Value</div>
              <div className={`text-xs mt-1 ${result.navPerShare > result.bookValuePerShare ? 'text-green-600' : 'text-red-600'}`}>
                {((result.navPerShare / result.bookValuePerShare - 1) * 100).toFixed(1)}% difference
              </div>
            </div>

            {/* Current Price Comparison */}
            {currentPrice && (
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">${currentPrice.toFixed(2)}</div>
                <div className="text-sm text-gray-600">current price</div>
                <div className="text-base font-medium mt-1">Market Price</div>
                {currentDiscount !== null && (
                  <div className={`text-xs mt-1 font-semibold ${getUpsideColor(currentDiscount)}`}>
                    {currentDiscount > 0 ? 'Discount:' : 'Premium:'} {Math.abs(currentDiscount).toFixed(1)}%
                  </div>
                )}
              </div>
            )}

            {/* Asset Quality Score */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${getQualityColor(result.assetQuality.overallScore)}`}>
                {result.assetQuality.overallScore.toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">out of 100</div>
              <div className="text-base font-medium mt-1">Asset Quality</div>
              <div className="text-xs mt-1 capitalize text-gray-600">
                {result.assetQuality.scoreCategory}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: Eye },
            { key: 'assets', label: 'Asset Breakdown', icon: Building },
            { key: 'liabilities', label: 'Liabilities', icon: DollarSign },
            { key: 'quality', label: 'Asset Quality', icon: Shield },
            { key: 'scenarios', label: 'Liquidation Scenarios', icon: Target }
          ].map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as "overview" | "assets" | "liabilities" | "quality" | "scenarios")}
                className={`${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <IconComponent className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Summary Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>NAV Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Adjusted Assets</span>
                  <span className="text-sm">{formatCurrency(result.totalAdjustedAssets)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Adjusted Liabilities</span>
                  <span className="text-sm">{formatCurrency(result.totalAdjustedLiabilities)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold">Adjusted NAV</span>
                    <span className="text-sm font-semibold">{formatCurrency(result.adjustedNAV)}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Shares Outstanding</span>
                  <span className="text-sm">{(result.sharesOutstanding / 1_000_000).toFixed(1)}M</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-base font-semibold">NAV Per Share</span>
                    <span className="text-base font-semibold text-blue-600">${result.navPerShare.toFixed(2)}</span>
                  </div>
                </div>
                {result.netAdjustments !== 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">Net Adjustments Made</div>
                    <div className={`font-semibold ${result.netAdjustments > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.netAdjustments > 0 ? '+' : ''}{formatCurrency(result.netAdjustments)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scenario Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Valuation Scenarios</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scenarioComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Value per Share ($)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value per Share']}
                  />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-xs text-gray-600">
                Compare NAV across different valuation and liquidation scenarios
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'assets' && (
        <div className="space-y-6">
          {/* Asset Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Asset Value Adjustments</CardTitle>
              <CardDescription>
                Comparison of book values vs. adjusted fair values by asset category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={assetBreakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Value ($M)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `$${value.toFixed(1)}M`, 
                      name === 'bookValue' ? 'Book Value' : 'Adjusted Value'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="bookValue" fill="#8884d8" name="Book Value" />
                  <Bar dataKey="adjustedValue" fill="#82ca9d" name="Adjusted Value" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Asset Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Asset Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Asset Category</th>
                      <th className="text-right py-2 px-4">Book Value</th>
                      <th className="text-right py-2 px-4">Adjusted Value</th>
                      <th className="text-right py-2 px-4">Adjustment</th>
                      <th className="text-right py-2 px-4">Quality Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.assetBreakdown
                      .filter(asset => asset.bookValue > 0 || asset.adjustedValue > 0)
                      .map((asset, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2 px-4 font-medium">{asset.description}</td>
                        <td className="text-right py-2 px-4">{formatCurrency(asset.bookValue)}</td>
                        <td className="text-right py-2 px-4">{formatCurrency(asset.adjustedValue)}</td>
                        <td className={`text-right py-2 px-4 ${asset.adjustmentAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {asset.adjustmentAmount >= 0 ? '+' : ''}{formatPercentage(asset.adjustmentPercentage)}
                        </td>
                        <td className="text-right py-2 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <span className={getQualityColor(asset.qualityScore)}>
                              {asset.qualityScore.toFixed(0)}
                            </span>
                            <div className={`w-2 h-2 rounded-full ${
                              asset.qualityScore >= 80 ? 'bg-green-500' :
                              asset.qualityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'liabilities' && (
        <div className="space-y-6">
          {/* Liability Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Liability Adjustments</CardTitle>
              <CardDescription>
                Comparison of book values vs. adjusted liability values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={liabilityBreakdownData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Value ($M)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `$${value.toFixed(1)}M`, 
                      name === 'bookValue' ? 'Book Value' : 'Adjusted Value'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="bookValue" fill="#ff8042" name="Book Value" />
                  <Bar dataKey="adjustedValue" fill="#ff6b6b" name="Adjusted Value" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Liability Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Liability Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Liability Category</th>
                      <th className="text-right py-2 px-4">Book Value</th>
                      <th className="text-right py-2 px-4">Adjusted Value</th>
                      <th className="text-right py-2 px-4">Adjustment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.liabilityBreakdown
                      .filter(liability => liability.bookValue > 0 || liability.adjustedValue > 0)
                      .map((liability, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2 px-4 font-medium">{liability.description}</td>
                        <td className="text-right py-2 px-4">{formatCurrency(liability.bookValue)}</td>
                        <td className="text-right py-2 px-4">{formatCurrency(liability.adjustedValue)}</td>
                        <td className={`text-right py-2 px-4 ${liability.adjustmentAmount <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {liability.adjustmentAmount >= 0 ? '+' : ''}{formatPercentage(liability.adjustmentPercentage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'quality' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Asset Quality Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Asset Quality Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getQualityColor(result.assetQuality.overallScore)}`}>
                    {result.assetQuality.overallScore.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Overall Quality Score</div>
                  <Badge variant={result.assetQuality.overallScore >= 80 ? 'default' : 
                                result.assetQuality.overallScore >= 60 ? 'secondary' : 'destructive'}
                         className="mt-2">
                    {result.assetQuality.scoreCategory.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Tangible Asset Ratio</span>
                    <span className="text-sm">{formatPercentage(result.assetQuality.tangibleAssetRatio * 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Liquid Asset Ratio</span>
                    <span className="text-sm">{formatPercentage(result.assetQuality.liquidAssetRatio * 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Intangible Asset Ratio</span>
                    <span className="text-sm">{formatPercentage(result.assetQuality.intangibleAssetRatio * 100)}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Quality Indicators</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {result.assetQuality.hasExcessCash ? 
                        <CheckCircle className="h-4 w-4 text-green-500" /> : 
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      }
                      <span className="text-sm">Excess Cash Position (&gt;20%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.assetQuality.hasMarketableSecurities ? 
                        <CheckCircle className="h-4 w-4 text-green-500" /> : 
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      }
                      <span className="text-sm">Has Marketable Securities</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.assetQuality.heavyIntangibles ? 
                        <AlertTriangle className="h-4 w-4 text-red-500" /> : 
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      }
                      <span className="text-sm">
                        {result.assetQuality.heavyIntangibles ? 'Heavy Intangibles (&gt;30%)' : 'Reasonable Intangibles (&lt;30%)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.assetQuality.significantGoodwill ? 
                        <AlertTriangle className="h-4 w-4 text-yellow-500" /> : 
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      }
                      <span className="text-sm">
                        {result.assetQuality.significantGoodwill ? 'Significant Goodwill (&gt;10%)' : 'Minimal Goodwill (&lt;10%)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Asset Composition Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Asset Composition by Value</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={assetQualityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${(value / 1_000_000).toFixed(1)}M`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {assetQualityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`$${(value / 1_000_000).toFixed(1)}M`, 'Value']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          {/* Liquidation Scenarios Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Liquidation Value Analysis</CardTitle>
              <CardDescription>
                Asset values under different liquidation timeframes and market conditions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={liquidationData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="scenario" />
                  <YAxis 
                    label={{ value: 'Value per Share ($)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Liquidation Value per Share']}
                    labelFormatter={(label) => `${label} Liquidation`}
                  />
                  <Bar dataKey="value" fill="#ff7c7c" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Liquidation Details */}
          <Card>
            <CardHeader>
              <CardTitle>Liquidation Scenario Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Scenario</th>
                      <th className="text-right py-2 px-4">Value per Share</th>
                      <th className="text-right py-2 px-4">Average Discount</th>
                      <th className="text-right py-2 px-4">Time Frame</th>
                      <th className="text-right py-2 px-4">vs. NAV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liquidationData.map((scenario, index) => {
                      const vsNAV = ((scenario.value - result.navPerShare) / result.navPerShare) * 100;
                      return (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-2 px-4 font-medium capitalize">{scenario.scenario}</td>
                          <td className="text-right py-2 px-4">${scenario.value.toFixed(2)}</td>
                          <td className="text-right py-2 px-4 text-red-600">{scenario.discount.toFixed(1)}%</td>
                          <td className="text-right py-2 px-4">{scenario.timeFrame}</td>
                          <td className={`text-right py-2 px-4 ${vsNAV >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {vsNAV >= 0 ? '+' : ''}{vsNAV.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-xs text-gray-600">
                Liquidation values assume orderly sale of assets under different time constraints and market conditions.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Warnings and Notes */}
      {result.warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Analysis Warnings & Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.warnings.map((warning, index) => (
                <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  warning.type === 'error' ? 'bg-red-50 border-red-200' :
                  warning.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  {getWarningIcon(warning.type)}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium">{warning.message}</p>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {warning.severity}
                      </Badge>
                    </div>
                    {warning.suggestion && (
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Suggestion:</strong> {warning.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculation Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Calculation Date:</span>
              <span className="ml-2">{result.calculationDate.toLocaleDateString()}</span>
            </div>
            <div>
              <span className="font-medium">Analysis Confidence:</span>
              <Badge variant={result.confidenceLevel === 'high' ? 'default' : 
                             result.confidenceLevel === 'medium' ? 'secondary' : 'destructive'}
                     className="ml-2">
                {result.confidenceLevel}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Total Warnings:</span>
              <span className="ml-2">{result.warnings.length}</span>
            </div>
            <div>
              <span className="font-medium">Asset Quality:</span>
              <span className={`ml-2 font-semibold ${getQualityColor(result.assetQuality.overallScore)}`}>
                {result.assetQuality.scoreCategory.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};