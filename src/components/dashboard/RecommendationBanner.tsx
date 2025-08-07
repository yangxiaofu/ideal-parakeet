import React from 'react';
import { formatCurrency } from '../../utils/formatters';
import { getRecommendedCalculators } from '../../constants/calculatorInfo';
import type { CompanyFinancials } from '../../types';

interface RecommendationBannerProps {
  companyData: CompanyFinancials;
  latestFCF: number;
  latestDividend: number;
  latestNetIncome: number;
  latestTotalAssets: number;
  latestTotalEquity: number;
  latestIncomeStatement: any;
  latestBalanceSheet: any;
  latestCashFlowStatement: any;
}

export const RecommendationBanner: React.FC<RecommendationBannerProps> = ({
  companyData,
  latestFCF,
  latestDividend,
  latestNetIncome,
  latestTotalAssets,
  latestTotalEquity,
  latestIncomeStatement,
  latestBalanceSheet,
  latestCashFlowStatement
}) => {
  const recommendations = getRecommendedCalculators(companyData);
  
  if (recommendations.recommended.length === 0) {
    return null;
  }

  const getMetricDetails = (calc: string) => {
    const reason = recommendations.reasons[calc];
    
    if (calc === 'DCF' && latestCashFlowStatement) {
      const prevIndex = companyData.cashFlowStatement.findIndex(
        cf => new Date(cf.date) < new Date(latestCashFlowStatement.date)
      );
      const prevFcf = prevIndex >= 0 ? companyData.cashFlowStatement[prevIndex]?.freeCashFlow : null;
      const growth = prevFcf ? ((latestFCF - prevFcf) / Math.abs(prevFcf) * 100) : 0;
      
      return {
        reason,
        details: (
          <div className="text-xs text-gray-600 mt-1">
            Latest FCF: {formatCurrency(latestFCF)}
            {growth !== 0 && (
              <span className={growth > 0 ? 'text-green-600' : 'text-red-600'}>
                {' '}({growth > 0 ? '+' : ''}{growth.toFixed(1)}%)
              </span>
            )}
          </div>
        )
      };
    }
    
    if (calc === 'DDM' && latestDividend > 0) {
      const shares = latestIncomeStatement?.sharesOutstanding || 0;
      const dps = shares ? latestDividend / shares : 0;
      
      return {
        reason,
        details: (
          <div className="text-xs text-gray-600 mt-1">
            Annual Dividend: {formatCurrency(latestDividend)} | DPS: ${dps.toFixed(2)}
          </div>
        )
      };
    }
    
    if (calc === 'NAV' && latestBalanceSheet) {
      const nav = latestTotalAssets - (latestBalanceSheet.totalLiabilities || 0);
      const bookValue = latestBalanceSheet.bookValuePerShare;
      
      return {
        reason,
        details: (
          <div className="text-xs text-gray-600 mt-1">
            Net Assets: {formatCurrency(nav)} | Book/Share: ${bookValue?.toFixed(2) || 'N/A'}
          </div>
        )
      };
    }
    
    if (calc === 'EPV' && latestIncomeStatement) {
      const margin = latestIncomeStatement.revenue 
        ? (latestIncomeStatement.operatingIncome / latestIncomeStatement.revenue * 100) 
        : 0;
      
      return {
        reason,
        details: (
          <div className="text-xs text-gray-600 mt-1">
            Net Income: {formatCurrency(latestNetIncome)} | Op Margin: {margin.toFixed(1)}%
          </div>
        )
      };
    }
    
    return { reason, details: null };
  };

  return (
    <div className="space-y-3">
      {/* Main Recommendation */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-green-600">✓</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-900 mb-1">
              Recommended Calculators for {companyData.name}
            </h3>
            <p className="text-sm text-green-700">
              Based on the financial characteristics, we recommend using{' '}
              <strong>{recommendations.recommended.join(', ')}</strong> for valuation.
            </p>
            {recommendations.caution.length > 0 && (
              <p className="text-sm text-yellow-700 mt-1">
                Use with caution: {recommendations.caution.join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Detailed Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {recommendations.recommended.map((calc) => {
          const { reason, details } = getMetricDetails(calc);
          
          return (
            <div key={calc} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{calc}</span>
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{reason}</p>
                  {details}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};