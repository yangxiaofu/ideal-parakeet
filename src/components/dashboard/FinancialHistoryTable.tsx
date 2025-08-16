import React from 'react';
import { formatCurrency, formatShares, formatEPS, formatYear } from '../../utils/formatters';
import { getCalculatorColorScheme, getMetricBadgeLabel } from '../../hooks/useMetricHighlighting';
import type { IncomeStatement, BalanceSheet, CashFlowStatement } from '../../types';

interface FinancialHistoryTableProps {
  incomeStatements: IncomeStatement[];
  balanceSheets: BalanceSheet[];
  cashFlowStatements: CashFlowStatement[];
  highlightedMetrics: string[];
  hasDividends: boolean;
}

export const FinancialHistoryTable: React.FC<FinancialHistoryTableProps> = ({
  incomeStatements,
  balanceSheets,
  cashFlowStatements,
  highlightedMetrics,
  hasDividends
}) => {
  const getRowClasses = (metricName: string) => {
    const isHighlighted = highlightedMetrics.includes(metricName);
    if (!isHighlighted) return 'border-b border-gray-50 hover:bg-gray-50 transition-colors';
    
    // Determine which calculator this metric belongs to
    const colorScheme = metricName.includes('Cash Flow') || metricName === 'Revenue' 
      ? getCalculatorColorScheme('DCF')
      : metricName.includes('Dividend') || metricName.includes('Payout')
      ? getCalculatorColorScheme('DDM')
      : metricName.includes('Asset') || metricName.includes('Liabilit') || metricName.includes('Equity') || metricName.includes('Book')
      ? getCalculatorColorScheme('NAV')
      : getCalculatorColorScheme('EPV');
    
    return `border-b border-gray-50 hover:bg-gray-50 transition-colors ${colorScheme.bgColor} border-l-4 ${colorScheme.borderColor}`;
  };

  const renderMetricBadge = (metricName: string) => {
    if (!highlightedMetrics.includes(metricName)) return null;
    
    const label = getMetricBadgeLabel(metricName);
    const colorScheme = metricName.includes('Cash Flow') || metricName === 'Revenue' 
      ? getCalculatorColorScheme('DCF')
      : metricName.includes('Dividend') || metricName.includes('Payout')
      ? getCalculatorColorScheme('DDM')
      : metricName.includes('Asset') || metricName.includes('Liabilit') || metricName.includes('Equity') || metricName.includes('Book')
      ? getCalculatorColorScheme('NAV')
      : getCalculatorColorScheme('EPV');
    
    return (
      <span className={`text-xs ${colorScheme.badgeBg} ${colorScheme.badgeText} px-1.5 py-0.5 rounded`}>
        {label}
      </span>
    );
  };

  // Only show first 5 years
  const displayIncome = incomeStatements.slice(0, 5);
  const displayBalance = balanceSheets.slice(0, 5);
  const displayCashFlow = cashFlowStatements.slice(0, 5);

  return (
    <div className="minimal-card overflow-hidden">
      <h3 className="text-lg font-medium text-gray-700 mb-6">Financial History</h3>
      <div className="overflow-x-auto -mx-8 px-8">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 pr-4 text-xs font-medium text-gray-500 uppercase sticky left-0 bg-white">
                Metric
              </th>
              {displayIncome.map((stmt) => (
                <th key={stmt.date} className="text-right py-3 px-3 text-xs font-medium text-gray-500 uppercase min-w-[100px]">
                  {formatYear(stmt.date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Revenue Row */}
            <tr className={getRowClasses('Revenue')}>
              <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                Revenue
                {renderMetricBadge('Revenue')}
              </td>
              {displayIncome.map((stmt) => (
                <td key={stmt.date} className="text-right py-3 px-3 text-sm text-gray-800">
                  {formatCurrency(stmt.revenue)}
                </td>
              ))}
            </tr>

            {/* Operating Income Row */}
            <tr className={getRowClasses('Operating Income')}>
              <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                Operating Income
                {renderMetricBadge('Operating Income')}
              </td>
              {displayIncome.map((stmt) => (
                <td key={stmt.date} className="text-right py-3 px-3 text-sm text-gray-800">
                  {formatCurrency(stmt.operatingIncome)}
                </td>
              ))}
            </tr>

            {/* Net Income Row */}
            <tr className={getRowClasses('Net Income')}>
              <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                Net Income
                {renderMetricBadge('Net Income')}
              </td>
              {displayIncome.map((stmt) => (
                <td key={stmt.date} className="text-right py-3 px-3 text-sm text-gray-800">
                  {formatCurrency(stmt.netIncome)}
                </td>
              ))}
            </tr>

            {/* EPS Row */}
            <tr className={getRowClasses('EPS')}>
              <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                EPS
                {renderMetricBadge('EPS')}
              </td>
              {displayIncome.map((stmt) => (
                <td key={stmt.date} className="text-right py-3 px-3 text-sm text-gray-800">
                  {formatEPS(stmt.eps)}
                </td>
              ))}
            </tr>

            {/* Operating Cash Flow Row */}
            <tr className={getRowClasses('Operating Cash Flow')}>
              <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                Operating Cash Flow
                {renderMetricBadge('Operating Cash Flow')}
              </td>
              {displayCashFlow.map((cf) => (
                <td key={cf.date} className="text-right py-3 px-3 text-sm text-gray-800">
                  {formatCurrency(cf.operatingCashFlow)}
                </td>
              ))}
            </tr>

            {/* Free Cash Flow Row */}
            <tr className={getRowClasses('Free Cash Flow')}>
              <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                Free Cash Flow
                {renderMetricBadge('Free Cash Flow')}
              </td>
              {displayCashFlow.map((cf) => (
                <td key={cf.date} className="text-right py-3 px-3 text-sm text-gray-800">
                  {formatCurrency(cf.freeCashFlow)}
                </td>
              ))}
            </tr>

            {/* Total Assets Row */}
            <tr className={getRowClasses('Total Assets')}>
              <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                Total Assets
                {renderMetricBadge('Total Assets')}
              </td>
              {displayBalance.map((bs) => (
                <td key={bs.date} className="text-right py-3 px-3 text-sm text-gray-800">
                  {formatCurrency(bs.totalAssets)}
                </td>
              ))}
            </tr>

            {/* Total Equity Row */}
            <tr className={getRowClasses('Total Equity')}>
              <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                Total Equity
                {renderMetricBadge('Total Equity')}
              </td>
              {displayBalance.map((bs) => (
                <td key={bs.date} className="text-right py-3 px-3 text-sm text-gray-800">
                  {formatCurrency(bs.totalEquity)}
                </td>
              ))}
            </tr>

            {/* Book Value Per Share Row */}
            <tr className={getRowClasses('Book Value/Share')}>
              <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                Book Value/Share
                {renderMetricBadge('Book Value/Share')}
              </td>
              {displayBalance.map((bs) => (
                <td key={bs.date} className="text-right py-3 px-3 text-sm text-gray-800">
                  {formatEPS(bs.bookValuePerShare)}
                </td>
              ))}
            </tr>

            {/* Shares Outstanding Row */}
            <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
              <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white">
                Shares Outstanding
              </td>
              {displayIncome.map((stmt) => (
                <td key={stmt.date} className="text-right py-3 px-3 text-sm text-gray-800">
                  {formatShares(stmt.sharesOutstanding)}
                </td>
              ))}
            </tr>

            {/* Dividend Rows - Only show if company pays dividends */}
            {hasDividends && (
              <>
                {/* Dividends Paid Row */}
                <tr className={getRowClasses('Dividends Paid')}>
                  <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                    Dividends Paid
                    {renderMetricBadge('Dividends Paid')}
                  </td>
                  {displayCashFlow.map((cf) => (
                    <td key={cf.date} className="text-right py-3 px-3 text-sm text-gray-800">
                      {cf.dividendsPaid ? formatCurrency(Math.abs(cf.dividendsPaid)) : 'N/A'}
                    </td>
                  ))}
                </tr>

                {/* Dividend per Share Row */}
                <tr className={getRowClasses('Dividend per Share')}>
                  <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                    Dividend per Share
                    {renderMetricBadge('Dividend per Share')}
                  </td>
                  {displayCashFlow.map((cf, index) => {
                    const shares = displayIncome[index]?.sharesOutstanding;
                    const dps = cf.dividendsPaid && shares ? Math.abs(cf.dividendsPaid) / shares : 0;
                    return (
                      <td key={cf.date} className="text-right py-3 px-3 text-sm text-gray-800">
                        {dps > 0 ? `$${dps.toFixed(2)}` : 'N/A'}
                      </td>
                    );
                  })}
                </tr>

                {/* Payout Ratio Row */}
                <tr className={getRowClasses('Payout Ratio')}>
                  <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                    Payout Ratio
                    {renderMetricBadge('Payout Ratio')}
                  </td>
                  {displayCashFlow.map((cf, index) => {
                    const netIncome = displayIncome[index]?.netIncome;
                    const payoutRatio = cf.dividendsPaid && netIncome ? Math.abs(cf.dividendsPaid) / netIncome * 100 : 0;
                    return (
                      <td key={cf.date} className="text-right py-3 px-3 text-sm text-gray-800">
                        {payoutRatio > 0 ? `${payoutRatio.toFixed(1)}%` : 'N/A'}
                      </td>
                    );
                  })}
                </tr>
              </>
            )}

            {/* Total Liabilities Row for NAV */}
            {balanceSheets.length > 0 && (
              <tr className={getRowClasses('Total Liabilities')}>
                <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                  Total Liabilities
                  {renderMetricBadge('Total Liabilities')}
                </td>
                {displayBalance.map((bs) => (
                  <td key={bs.date} className="text-right py-3 px-3 text-sm text-gray-800">
                    {formatCurrency(bs.totalLiabilities)}
                  </td>
                ))}
              </tr>
            )}

            {/* Operating Margin for EPV */}
            {incomeStatements.length > 0 && (
              <tr className={getRowClasses('Operating Margin')}>
                <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                  Operating Margin
                  {renderMetricBadge('Operating Margin')}
                </td>
                {displayIncome.map((stmt) => {
                  const margin = stmt.revenue ? (stmt.operatingIncome / stmt.revenue * 100) : 0;
                  return (
                    <td key={stmt.date} className="text-right py-3 px-3 text-sm text-gray-800">
                      {margin ? `${margin.toFixed(1)}%` : 'N/A'}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};