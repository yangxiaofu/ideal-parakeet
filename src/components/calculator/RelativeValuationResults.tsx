import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  Users, 
  Award,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import type { 
  RelativeValuationResult, 
  MultipleTier
} from '../../types/relativeValuation';

interface RelativeValuationResultsProps {
  result: RelativeValuationResult;
  currentPrice?: number;
  symbol?: string;
}

export const RelativeValuationResults: React.FC<RelativeValuationResultsProps> = ({
  result,
  currentPrice,
  symbol
}) => {
  // Prepare chart data
  const multipleChartData = useMemo(() => {
    return result.multiples.map(multiple => ({
      name: multiple.name.replace('-to-', '/'),
      target: multiple.targetValue,
      median: multiple.statistics.median,
      q1: multiple.statistics.q1,
      q3: multiple.statistics.q3,
      percentile: multiple.percentile
    }));
  }, [result.multiples]);

  const valuationRangeData = useMemo(() => [
    {
      scenario: 'Conservative',
      min: result.valuationRanges.conservative.pricePerShare.min,
      max: result.valuationRanges.conservative.pricePerShare.max,
      color: '#EF4444'
    },
    {
      scenario: 'Moderate',
      min: result.valuationRanges.moderate.pricePerShare.min,
      max: result.valuationRanges.moderate.pricePerShare.max,
      color: '#F59E0B'
    },
    {
      scenario: 'Optimistic',
      min: result.valuationRanges.optimistic.pricePerShare.min,
      max: result.valuationRanges.optimistic.pricePerShare.max,
      color: '#10B981'
    }
  ], [result.valuationRanges]);

  // Removed unused peerComparisonData

  const getTierIcon = (tier: MultipleTier['tier']) => {
    switch (tier) {
      case 'premium':
        return <Award className="h-5 w-5 text-yellow-500" />;
      case 'market':
        return <Target className="h-5 w-5 text-blue-500" />;
      case 'discount':
        return <TrendingDown className="h-5 w-5 text-green-500" />;
      case 'deep-discount':
        return <TrendingDown className="h-5 w-5 text-green-600" />;
      default:
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTierColor = (tier: MultipleTier['tier']) => {
    switch (tier) {
      case 'premium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'market':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'discount':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'deep-discount':
        return 'text-green-700 bg-green-100 border-green-300';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRecommendationIcon = (rating: RelativeValuationResult['recommendation']['overallRating']) => {
    switch (rating) {
      case 'strong-buy':
      case 'buy':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'sell':
      case 'strong-sell':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  const getRecommendationColor = (rating: RelativeValuationResult['recommendation']['overallRating']) => {
    switch (rating) {
      case 'strong-buy':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'buy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'sell':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'strong-sell':
        return 'text-red-700 bg-red-100 border-red-300';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Custom tooltip for multiple comparison chart
  const MultipleTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; payload?: { percentile?: number } }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm text-blue-600">
              Target: <span className="font-semibold">{payload[0]?.value?.toFixed(2)}</span>
            </p>
            <p className="text-sm text-gray-600">
              Peer Median: <span className="font-semibold">{payload[1]?.value?.toFixed(2)}</span>
            </p>
            <p className="text-sm text-gray-500">
              Percentile: <span className="font-semibold">{payload[0]?.payload?.percentile?.toFixed(0)}th</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Valuation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span>Valuation Summary</span>
            {symbol && <Badge variant="outline">{symbol}</Badge>}
          </CardTitle>
          <CardDescription>
            Relative valuation analysis based on {result.peerAnalysis.qualifyingPeers} comparable companies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Valuation */}
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Current Price</div>
              <div className="text-2xl font-semibold text-gray-900">
                {formatCurrency(result.currentPricePerShare)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Market Cap: {formatCurrency(result.currentMarketCap)}
              </div>
            </div>

            {/* Fair Value Range */}
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600 mb-1">Fair Value Range</div>
              <div className="text-lg font-semibold text-blue-900">
                {formatCurrency(result.valuationRanges.moderate.pricePerShare.min)} - {formatCurrency(result.valuationRanges.moderate.pricePerShare.max)}
              </div>
              <div className="text-sm text-blue-600 mt-1">
                Moderate Case
              </div>
            </div>

            {/* Upside/Downside */}
            <div className={`text-center p-4 rounded-lg ${
              result.recommendation.upside > 0 
                ? 'bg-green-50' 
                : result.recommendation.upside < -10 
                ? 'bg-red-50' 
                : 'bg-gray-50'
            }`}>
              <div className={`text-sm mb-1 ${
                result.recommendation.upside > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                Potential {result.recommendation.upside > 0 ? 'Upside' : 'Downside'}
              </div>
              <div className={`text-2xl font-semibold flex items-center justify-center gap-2 ${
                result.recommendation.upside > 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.recommendation.upside > 0 ? (
                  <TrendingUp className="h-6 w-6" />
                ) : (
                  <TrendingDown className="h-6 w-6" />
                )}
                {formatPercentage(Math.abs(result.recommendation.upside) / 100)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Recommendation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getRecommendationIcon(result.recommendation.overallRating)}
            Investment Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getRecommendationColor(result.recommendation.overallRating)}`}>
                <span className="font-semibold text-lg uppercase">
                  {result.recommendation.overallRating.replace('-', ' ')}
                </span>
                <Badge variant="outline">{result.recommendation.confidence} confidence</Badge>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Key Factors
                </h4>
                <ul className="space-y-1">
                  {result.recommendation.keyFactors.map((factor, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border ${getTierColor(result.companyTier.tier)}`}>
                {getTierIcon(result.companyTier.tier)}
                <span className="font-medium">{result.companyTier.tier.replace('-', ' ')} Tier</span>
              </div>
              <p className="text-sm text-gray-600 mt-2 mb-4">{result.companyTier.description}</p>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Risk Factors
                </h4>
                <ul className="space-y-1">
                  {result.recommendation.risks.map((risk, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="w-1 h-1 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Multiple Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Multiple Analysis</CardTitle>
          <CardDescription>
            Comparison of valuation multiples vs peer group medians
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Multiple</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Target</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Peer Median</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Percentile</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Implied Value</th>
                </tr>
              </thead>
              <tbody>
                {result.multiples.map((multiple, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{multiple.name}</td>
                    <td className="py-3 px-4 text-right">{multiple.targetValue.toFixed(2)}x</td>
                    <td className="py-3 px-4 text-right">{multiple.statistics.median.toFixed(2)}x</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-1 rounded text-xs ${
                        multiple.percentile >= 75 
                          ? 'bg-red-100 text-red-700'
                          : multiple.percentile <= 25
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {multiple.percentile.toFixed(0)}th
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatCurrency(multiple.impliedPricePerShare)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Multiple Comparison Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={multipleChartData} margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis 
                  label={{ value: 'Multiple (x)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<MultipleTooltip />} />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="rect"
                />
                <Bar dataKey="target" fill="#3B82F6" name="Target Company" />
                <Bar dataKey="median" fill="#94A3B8" name="Peer Median" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Valuation Ranges */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation Scenarios</CardTitle>
          <CardDescription>
            Price ranges based on different peer group assumptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {valuationRangeData.map((range, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: range.color }}
                  />
                  <span className="font-medium">{range.scenario}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatCurrency(range.min)} - {formatCurrency(range.max)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {currentPrice && (
                      `${((range.min / currentPrice - 1) * 100).toFixed(0)}% to ${((range.max / currentPrice - 1) * 100).toFixed(0)}%`
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Peer Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Peer Group Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-semibold text-blue-900">
                {result.peerAnalysis.qualifyingPeers}
              </div>
              <div className="text-sm text-blue-600">Qualifying Peers</div>
              <div className="text-xs text-gray-500 mt-1">
                of {result.peerAnalysis.totalPeers} total
              </div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-semibold text-green-900">
                {formatCurrency(result.peerAnalysis.medianMarketCap)}
              </div>
              <div className="text-sm text-green-600">Median Market Cap</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-semibold text-purple-900">
                {formatPercentage(result.peerAnalysis.medianGrowthRate)}
              </div>
              <div className="text-sm text-purple-600">Median Growth Rate</div>
            </div>
          </div>

          {/* Relative Positioning */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-4">Relative Positioning vs Peers</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-lg font-semibold ${
                  result.relativePositioning.growthPremium > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.relativePositioning.growthPremium > 0 ? '+' : ''}{result.relativePositioning.growthPremium.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Growth Premium</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-semibold ${
                  result.relativePositioning.profitabilityPremium > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.relativePositioning.profitabilityPremium > 0 ? '+' : ''}{result.relativePositioning.profitabilityPremium.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Profitability Premium</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-semibold ${
                  result.relativePositioning.sizePremium > 0 ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {result.relativePositioning.sizePremium > 0 ? '+' : ''}{result.relativePositioning.sizePremium.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Size Premium</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-semibold ${
                  result.relativePositioning.overallPremium > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.relativePositioning.overallPremium > 0 ? '+' : ''}{result.relativePositioning.overallPremium.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Overall Premium</div>
              </div>
            </div>
          </div>

          {/* Excluded Peers */}
          {result.peerAnalysis.excludedPeers.length > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-yellow-600" />
                Excluded Peers ({result.peerAnalysis.excludedPeers.length})
              </h4>
              <div className="space-y-2">
                {result.peerAnalysis.excludedPeers.slice(0, 3).map((peer, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{peer.symbol}</span>
                    <span className="text-gray-600 ml-2">- {peer.excludeReason}</span>
                  </div>
                ))}
                {result.peerAnalysis.excludedPeers.length > 3 && (
                  <div className="text-sm text-gray-500">
                    ...and {result.peerAnalysis.excludedPeers.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Methodology Note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Methodology Note</h4>
              <p className="text-sm text-blue-800">
                This relative valuation analysis uses {result.multiples.length} valuation multiples 
                compared against {result.peerAnalysis.qualifyingPeers} comparable companies. 
                {result.peerAnalysis.excludedPeers.length > 0 && 
                  ` ${result.peerAnalysis.excludedPeers.length} companies were excluded as statistical outliers.`
                } Valuation ranges represent different confidence levels based on peer group statistics.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};