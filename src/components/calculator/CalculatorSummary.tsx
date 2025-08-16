import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, AlertCircle, CheckCircle, Clock, Archive } from 'lucide-react';
import { formatRelativeTime, getTimestampColor } from '../../utils/dateFormatters';
import type { CalculatorModel } from './CalculatorTabs';

interface CalculatorResult {
  model: CalculatorModel;
  intrinsicValue: number;
  currentPrice?: number;
  upside?: number;
  confidence?: 'high' | 'medium' | 'low';
  timestamp?: Date;
  fromCache?: boolean;
  cacheAge?: string;
}

interface CalculatorSummaryProps {
  symbol: string;
  companyName: string;
  currentPrice?: number;
  results: CalculatorResult[];
}

export const CalculatorSummary: React.FC<CalculatorSummaryProps> = ({
  symbol,
  companyName,
  currentPrice,
  results
}) => {
  // Calculate average intrinsic value
  const averageValue = results.length > 0
    ? results.reduce((sum, r) => sum + r.intrinsicValue, 0) / results.length
    : 0;
  
  // Calculate average upside
  const averageUpside = currentPrice && averageValue
    ? ((averageValue - currentPrice) / currentPrice) * 100
    : 0;
  
  // Find min and max values
  const minValue = results.length > 0 
    ? Math.min(...results.map(r => r.intrinsicValue))
    : 0;
  const maxValue = results.length > 0
    ? Math.max(...results.map(r => r.intrinsicValue))
    : 0;
  
  // Find most recent calculation
  const mostRecentCalculation = results
    .filter(r => r.timestamp)
    .sort((a, b) => (b.timestamp!.getTime() - a.timestamp!.getTime()))[0];
  
  const getModelName = (model: CalculatorModel): string => {
    switch(model) {
      case 'DCF': return 'Discounted Cash Flow';
      case 'DDM': return 'Dividend Discount Model';
      case 'NAV': return 'Net Asset Value';
      case 'EPV': return 'Earnings Power Value';
      default: return model;
    }
  };
  
  const getConfidenceColor = (confidence?: string): string => {
    switch(confidence) {
      case 'high': return 'text-green-600';
      case 'low': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };
  
  const getUpsideColor = (upside: number): string => {
    if (upside > 20) return 'text-green-600';
    if (upside > 0) return 'text-green-500';
    if (upside > -10) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Calculations Yet</h3>
            <p className="text-sm text-gray-600">
              Complete at least one valuation model to see the summary comparison.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation Summary for {companyName} ({symbol})</CardTitle>
          {mostRecentCalculation && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>
                Last updated {formatRelativeTime(mostRecentCalculation.timestamp!)}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Average Intrinsic Value */}
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                ${averageValue.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Average Intrinsic Value</div>
              <div className="text-xs text-gray-500 mt-2">
                Range: ${minValue.toFixed(2)} - ${maxValue.toFixed(2)}
              </div>
            </div>
            
            {/* Current Price */}
            {currentPrice && (
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  ${currentPrice.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Current Market Price</div>
                <div className={`text-lg font-semibold mt-2 ${getUpsideColor(averageUpside)}`}>
                  {averageUpside > 0 ? '+' : ''}{averageUpside.toFixed(1)}% 
                  <span className="text-xs font-normal ml-1">
                    ({averageUpside > 0 ? 'Undervalued' : 'Overvalued'})
                  </span>
                </div>
              </div>
            )}
            
            {/* Confidence Score */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <span className="text-3xl font-bold text-gray-900">
                  {results.length}/4
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">Models Completed</div>
              <div className="text-xs text-gray-500 mt-2">
                {results.length === 1 ? 'Limited confidence' : 
                 results.length === 2 ? 'Moderate confidence' :
                 results.length === 3 ? 'Good confidence' :
                 'High confidence'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Model Results */}
      <Card>
        <CardHeader>
          <CardTitle>Model Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.map((result) => {
              const upside = currentPrice 
                ? ((result.intrinsicValue - currentPrice) / currentPrice) * 100
                : 0;
              
              return (
                <div key={result.model} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {getModelName(result.model)}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        {result.confidence && (
                          <span className={`text-xs ${getConfidenceColor(result.confidence)}`}>
                            {result.confidence} confidence
                          </span>
                        )}
                        {result.timestamp && (
                          <div className="flex items-center space-x-1">
                            {result.fromCache ? (
                              <Archive className="h-3 w-3 text-gray-400" />
                            ) : (
                              <Clock className="h-3 w-3 text-gray-400" />
                            )}
                            <span className={`text-xs ${getTimestampColor(result.timestamp)}`}>
                              {formatRelativeTime(result.timestamp)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-semibold text-gray-900">
                        ${result.intrinsicValue.toFixed(2)}
                      </div>
                      {currentPrice && (
                        <div className={`text-sm font-medium ${getUpsideColor(upside)}`}>
                          {upside > 0 ? '+' : ''}{upside.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Visual Bar */}
                  {currentPrice && (
                    <div className="mt-3">
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`absolute left-0 top-0 h-full rounded-full ${
                            upside > 0 ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          style={{ 
                            width: `${Math.min(Math.abs(upside), 100)}%`,
                            opacity: Math.min(Math.abs(upside) / 50, 1)
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      {averageUpside !== 0 && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <TrendingUp className={`h-6 w-6 mt-1 ${
                averageUpside > 20 ? 'text-green-600' :
                averageUpside > 0 ? 'text-yellow-600' :
                'text-red-600'
              }`} />
              <div>
                <h3 className="font-medium text-gray-900 mb-2">
                  Investment Recommendation
                </h3>
                <p className="text-sm text-gray-600">
                  {averageUpside > 20 
                    ? `Strong Buy: The stock appears significantly undervalued with an average upside of ${averageUpside.toFixed(1)}%. Consider this as a potential investment opportunity.`
                    : averageUpside > 10
                    ? `Buy: The stock shows moderate undervaluation with ${averageUpside.toFixed(1)}% potential upside. This could be a good entry point.`
                    : averageUpside > 0
                    ? `Hold/Watch: The stock is slightly undervalued at ${averageUpside.toFixed(1)}% upside. Monitor for a better entry point.`
                    : averageUpside > -10
                    ? `Hold: The stock appears fairly valued to slightly overvalued. Current holders may continue to hold.`
                    : `Sell/Avoid: The stock appears overvalued by ${Math.abs(averageUpside).toFixed(1)}%. Consider taking profits or avoiding new positions.`
                  }
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Note: This is based on {results.length} valuation model{results.length > 1 ? 's' : ''}. 
                  Complete more models for higher confidence.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};