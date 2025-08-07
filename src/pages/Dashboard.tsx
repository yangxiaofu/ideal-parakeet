import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { DCFCalculator } from '../components/calculator/DCFCalculator';
import { CalculatorTabs, type CalculatorModel } from '../components/calculator/CalculatorTabs';
import { CalculatorSummary } from '../components/calculator/CalculatorSummary';
import { fmpApi } from '../services/fmpApi';
import { formatCurrency, formatShares, formatEPS, formatYear } from '../utils/formatters';
import { getRecommendedCalculators } from '../constants/calculatorInfo';
import type { CompanyFinancials } from '../types';

export const Dashboard: React.FC = () => {
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyFinancials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CalculatorModel>('DCF');
  const [completedCalculators, setCompletedCalculators] = useState<Set<CalculatorModel>>(new Set());
  const [calculatorResults, setCalculatorResults] = useState<Partial<Record<CalculatorModel, number>>>({});
  const [highlightMetrics, setHighlightMetrics] = useState<string[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;

    setLoading(true);
    setError(null);
    setCompanyData(null);
    setActiveTab('DCF');
    setCompletedCalculators(new Set());
    setCalculatorResults({});
    
    try {
      console.log('Fetching data for:', ticker);
      const data = await fmpApi.getCompanyFinancials(ticker.trim());
      setCompanyData(data);
    } catch (error: unknown) {
      console.error('Search failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch company data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: CalculatorModel) => {
    setActiveTab(tab);
    
    // Update highlighted metrics based on active calculator
    switch(tab) {
      case 'DCF':
        setHighlightMetrics(['Free Cash Flow', 'Operating Cash Flow', 'Revenue']);
        break;
      case 'DDM':
        setHighlightMetrics(['Dividends Paid', 'Dividend per Share', 'Payout Ratio']);
        break;
      case 'NAV':
        setHighlightMetrics(['Total Assets', 'Total Liabilities', 'Total Equity', 'Book Value/Share']);
        break;
      case 'EPV':
        setHighlightMetrics(['Net Income', 'Operating Income', 'EPS', 'Operating Margin']);
        break;
      default:
        setHighlightMetrics([]);
    }
  };

  const handleCalculatorComplete = (model: CalculatorModel, result: number) => {
    setCompletedCalculators(prev => new Set([...prev, model]));
    setCalculatorResults(prev => ({ ...prev, [model]: result }));
  };

  const getCurrentPrice = (): number | undefined => {
    return companyData?.currentPrice;
  };

  return (
    <div className="min-h-screen bg-gradient-minimal">
      <Header />
      
      <main className="max-w-5xl mx-auto px-8 py-16">
        <div className="space-y-12">
          {/* Hero Section - Minimal */}
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-gray-800 mb-3">
              Calculate Intrinsic Value
            </h1>
            <p className="text-gray-500 max-w-xl mx-auto">
              Professional valuation models for informed investment decisions
            </p>
          </div>

          {/* Search Card - Minimal Design */}
          <div className="minimal-card max-w-md mx-auto">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-medium text-gray-700 mb-1">
                  Start Your Analysis
                </h2>
                <p className="text-sm text-gray-400">
                  Enter a ticker symbol to calculate intrinsic value
                </p>
              </div>

              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    id="ticker"
                    type="text"
                    placeholder="AAPL, MSFT, GOOGL..."
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className="w-full text-center text-lg px-6 py-4 bg-gray-50 border-gray-200 rounded-2xl focus:bg-white focus:border-blue-300 transition-all"
                    disabled={loading}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !ticker.trim()}
                  className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-2xl transition-all duration-200 disabled:bg-gray-200"
                >
                  {loading ? 'Analyzing...' : 'Analyze Company'}
                </Button>
              </form>
            </div>
          </div>

          {/* Error Display - Minimal */}
          {error && (
            <div className="max-w-md mx-auto">
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-red-700">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Company Data Display - Minimal */}
          {companyData && (
            <div className="space-y-8">
              {/* Company Header - Minimal */}
              <div className="minimal-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {companyData.symbol.substring(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-800">
                        {companyData.name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {companyData.symbol}
                      </p>
                    </div>
                  </div>
                  {companyData.currentPrice && (
                    <div className="text-right">
                      <div className="text-2xl font-semibold text-gray-800">
                        ${companyData.currentPrice.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">Current Price</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Metrics - Minimal Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                {/* Income Statement Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center mb-4">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    <h3 className="text-sm font-medium text-gray-600">Income</h3>
                  </div>
                  {companyData.incomeStatement[0] && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Revenue</p>
                        <p className="font-semibold text-gray-800">{formatCurrency(companyData.incomeStatement[0].revenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">EPS</p>
                        <p className="font-semibold text-gray-800">{formatEPS(companyData.incomeStatement[0].eps)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Balance Sheet Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center mb-4">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <h3 className="text-sm font-medium text-gray-600">Balance</h3>
                  </div>
                  {companyData.balanceSheet[0] && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Total Assets</p>
                        <p className="font-semibold text-gray-800">{formatCurrency(companyData.balanceSheet[0].totalAssets)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Book/Share</p>
                        <p className="font-semibold text-gray-800">{formatEPS(companyData.balanceSheet[0].bookValuePerShare)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cash Flow Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center mb-4">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                    <h3 className="text-sm font-medium text-gray-600">Cash Flow</h3>
                  </div>
                  {companyData.cashFlowStatement[0] && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Operating CF</p>
                        <p className="font-semibold text-gray-800">{formatCurrency(companyData.cashFlowStatement[0].operatingCashFlow)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Free CF</p>
                        <p className="font-semibold text-gray-800">{formatCurrency(companyData.cashFlowStatement[0].freeCashFlow)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Shares Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center mb-4">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                    <h3 className="text-sm font-medium text-gray-600">Shares</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Outstanding</p>
                      <p className="font-semibold text-gray-800">
                        {companyData.sharesOutstanding ? formatShares(companyData.sharesOutstanding) : 'N/A'}
                      </p>
                    </div>
                    {companyData.incomeStatement[0] && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">{formatYear(companyData.incomeStatement[0].date)}</p>
                        <p className="font-semibold text-gray-800">{formatShares(companyData.incomeStatement[0].sharesOutstanding)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Historical Data - Transposed Table */}
              <div className="minimal-card overflow-hidden">
                <h3 className="text-lg font-medium text-gray-700 mb-6">Financial History</h3>
                <div className="overflow-x-auto -mx-8 px-8">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 pr-4 text-xs font-medium text-gray-500 uppercase sticky left-0 bg-white">Metric</th>
                        {companyData.incomeStatement.slice(0, 5).map((stmt) => (
                          <th key={stmt.date} className="text-right py-3 px-3 text-xs font-medium text-gray-500 uppercase min-w-[100px]">
                            {formatYear(stmt.date)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Revenue Row */}
                      <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        highlightMetrics.includes('Revenue') ? 'bg-green-50 border-l-4 border-l-green-400' : ''
                      }`}>
                        <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                          Revenue
                          {highlightMetrics.includes('Revenue') && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Key for DCF</span>
                          )}
                        </td>
                        {companyData.incomeStatement.slice(0, 5).map((stmt) => (
                          <td key={stmt.date} className="text-right py-3 px-3 text-sm text-gray-800">
                            {formatCurrency(stmt.revenue)}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Operating Income Row */}
                      <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        highlightMetrics.includes('Operating Income') ? 'bg-purple-50 border-l-4 border-l-purple-400' : ''
                      }`}>
                        <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                          Operating Income
                          {highlightMetrics.includes('Operating Income') && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Key for EPV</span>
                          )}
                        </td>
                        {companyData.incomeStatement.slice(0, 5).map((stmt) => (
                          <td key={stmt.date} className="text-right py-3 px-3 text-sm text-gray-800">
                            {formatCurrency(stmt.operatingIncome)}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Net Income Row */}
                      <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        highlightMetrics.includes('Net Income') ? 'bg-purple-50 border-l-4 border-l-purple-400' : ''
                      }`}>
                        <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                          Net Income
                          {highlightMetrics.includes('Net Income') && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Key for EPV</span>
                          )}
                        </td>
                        {companyData.incomeStatement.slice(0, 5).map((stmt) => (
                          <td key={stmt.date} className="text-right py-3 px-3 text-sm text-gray-800">
                            {formatCurrency(stmt.netIncome)}
                          </td>
                        ))}
                      </tr>
                      
                      {/* EPS Row */}
                      <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        highlightMetrics.includes('EPS') ? 'bg-purple-50 border-l-4 border-l-purple-400' : ''
                      }`}>
                        <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                          EPS
                          {highlightMetrics.includes('EPS') && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Key for EPV</span>
                          )}
                        </td>
                        {companyData.incomeStatement.slice(0, 5).map((stmt) => (
                          <td key={stmt.date} className="text-right py-3 px-3 text-sm text-gray-800">
                            {formatEPS(stmt.eps)}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Operating Cash Flow Row */}
                      <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        highlightMetrics.includes('Operating Cash Flow') ? 'bg-green-50 border-l-4 border-l-green-400' : ''
                      }`}>
                        <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                          Operating Cash Flow
                          {highlightMetrics.includes('Operating Cash Flow') && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Key for DCF</span>
                          )}
                        </td>
                        {companyData.cashFlowStatement.slice(0, 5).map((cf) => (
                          <td key={cf.date} className="text-right py-3 px-3 text-sm text-gray-800">
                            {formatCurrency(cf.operatingCashFlow)}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Free Cash Flow Row */}
                      <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        highlightMetrics.includes('Free Cash Flow') ? 'bg-green-50 border-l-4 border-l-green-400' : ''
                      }`}>
                        <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                          Free Cash Flow
                          {highlightMetrics.includes('Free Cash Flow') && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Key for DCF</span>
                          )}
                        </td>
                        {companyData.cashFlowStatement.slice(0, 5).map((cf) => (
                          <td key={cf.date} className="text-right py-3 px-3 text-sm text-gray-800">
                            {formatCurrency(cf.freeCashFlow)}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Total Assets Row */}
                      <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        highlightMetrics.includes('Total Assets') ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''
                      }`}>
                        <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                          Total Assets
                          {highlightMetrics.includes('Total Assets') && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Key for NAV</span>
                          )}
                        </td>
                        {companyData.balanceSheet.slice(0, 5).map((bs) => (
                          <td key={bs.date} className="text-right py-3 px-3 text-sm text-gray-800">
                            {formatCurrency(bs.totalAssets)}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Total Equity Row */}
                      <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        highlightMetrics.includes('Total Equity') ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''
                      }`}>
                        <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                          Total Equity
                          {highlightMetrics.includes('Total Equity') && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Key for NAV</span>
                          )}
                        </td>
                        {companyData.balanceSheet.slice(0, 5).map((bs) => (
                          <td key={bs.date} className="text-right py-3 px-3 text-sm text-gray-800">
                            {formatCurrency(bs.totalEquity)}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Book Value Per Share Row */}
                      <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                        highlightMetrics.includes('Book Value/Share') ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''
                      }`}>
                        <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                          Book Value/Share
                          {highlightMetrics.includes('Book Value/Share') && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Key for NAV</span>
                          )}
                        </td>
                        {companyData.balanceSheet.slice(0, 5).map((bs) => (
                          <td key={bs.date} className="text-right py-3 px-3 text-sm text-gray-800">
                            {formatEPS(bs.bookValuePerShare)}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Shares Outstanding Row */}
                      <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white">Shares Outstanding</td>
                        {companyData.incomeStatement.slice(0, 5).map((stmt) => (
                          <td key={stmt.date} className="text-right py-3 px-3 text-sm text-gray-800">
                            {formatShares(stmt.sharesOutstanding)}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Dividend Rows - Only show if company pays dividends */}
                      {companyData.cashFlowStatement.some((cf: any) => cf.dividendsPaid && cf.dividendsPaid !== 0) && (
                        <>
                          {/* Dividends Paid Row */}
                          <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                            highlightMetrics.includes('Dividends Paid') ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : ''
                          }`}>
                            <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                              Dividends Paid
                              {highlightMetrics.includes('Dividends Paid') && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Key for DDM</span>
                              )}
                            </td>
                            {companyData.cashFlowStatement.slice(0, 5).map((cf) => (
                              <td key={cf.date} className="text-right py-3 px-3 text-sm text-gray-800">
                                {cf.dividendsPaid ? formatCurrency(Math.abs(cf.dividendsPaid)) : 'N/A'}
                              </td>
                            ))}
                          </tr>
                          
                          {/* Dividend per Share Row */}
                          <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                            highlightMetrics.includes('Dividend per Share') ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : ''
                          }`}>
                            <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                              Dividend per Share
                              {highlightMetrics.includes('Dividend per Share') && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Key for DDM</span>
                              )}
                            </td>
                            {companyData.cashFlowStatement.slice(0, 5).map((cf, index) => {
                              const shares = companyData.incomeStatement[index]?.sharesOutstanding;
                              const dps = cf.dividendsPaid && shares ? Math.abs(cf.dividendsPaid) / shares : 0;
                              return (
                                <td key={cf.date} className="text-right py-3 px-3 text-sm text-gray-800">
                                  {dps > 0 ? `$${dps.toFixed(2)}` : 'N/A'}
                                </td>
                              );
                            })}
                          </tr>
                          
                          {/* Payout Ratio Row */}
                          <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                            highlightMetrics.includes('Payout Ratio') ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : ''
                          }`}>
                            <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                              Payout Ratio
                              {highlightMetrics.includes('Payout Ratio') && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Key for DDM</span>
                              )}
                            </td>
                            {companyData.cashFlowStatement.slice(0, 5).map((cf, index) => {
                              const netIncome = companyData.incomeStatement[index]?.netIncome;
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
                      
                      {/* Additional Balance Sheet Metrics for NAV */}
                      {companyData.balanceSheet[0] && (
                        <>
                          {/* Total Liabilities Row */}
                          <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                            highlightMetrics.includes('Total Liabilities') ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''
                          }`}>
                            <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                              Total Liabilities
                              {highlightMetrics.includes('Total Liabilities') && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Key for NAV</span>
                              )}
                            </td>
                            {companyData.balanceSheet.slice(0, 5).map((bs) => (
                              <td key={bs.date} className="text-right py-3 px-3 text-sm text-gray-800">
                                {formatCurrency(bs.totalLiabilities)}
                              </td>
                            ))}
                          </tr>
                        </>
                      )}
                      
                      {/* Operating Margin for EPV */}
                      {companyData.incomeStatement[0] && (
                        <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                          highlightMetrics.includes('Operating Margin') ? 'bg-purple-50 border-l-4 border-l-purple-400' : ''
                        }`}>
                          <td className="py-3 pr-4 text-sm font-medium text-gray-700 sticky left-0 bg-white flex items-center gap-2">
                            Operating Margin
                            {highlightMetrics.includes('Operating Margin') && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Key for EPV</span>
                            )}
                          </td>
                          {companyData.incomeStatement.slice(0, 5).map((stmt) => {
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
            </div>
          )}

          {/* Calculator Section with Tabs */}
          {companyData && (
            <div className="space-y-6">
              {/* Recommendation Banner with Detailed Metrics */}
              {(() => {
                const recommendations = getRecommendedCalculators(companyData);
                const hasDividends = companyData.cashFlowStatement.some((cf: any) => cf.dividendsPaid && cf.dividendsPaid !== 0);
                
                return recommendations.recommended.length > 0 ? (
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
                        const reason = recommendations.reasons[calc];
                        let metricDetails = null;
                        
                        // Add specific metric details for each calculator
                        if (calc === 'DCF' && companyData.cashFlowStatement[0]) {
                          const fcf = companyData.cashFlowStatement[0].freeCashFlow;
                          const prevFcf = companyData.cashFlowStatement[1]?.freeCashFlow;
                          const growth = prevFcf ? ((fcf - prevFcf) / Math.abs(prevFcf) * 100) : 0;
                          metricDetails = (
                            <div className="text-xs text-gray-600 mt-1">
                              Latest FCF: {formatCurrency(fcf)}
                              {growth !== 0 && <span className={growth > 0 ? 'text-green-600' : 'text-red-600'}> ({growth > 0 ? '+' : ''}{growth.toFixed(1)}%)</span>}
                            </div>
                          );
                        } else if (calc === 'DDM' && hasDividends) {
                          const dividend = Math.abs(companyData.cashFlowStatement[0].dividendsPaid || 0);
                          const shares = companyData.incomeStatement[0]?.sharesOutstanding;
                          const dps = shares ? dividend / shares : 0;
                          metricDetails = (
                            <div className="text-xs text-gray-600 mt-1">
                              Annual Dividend: {formatCurrency(dividend)} | DPS: ${dps.toFixed(2)}
                            </div>
                          );
                        } else if (calc === 'NAV' && companyData.balanceSheet[0]) {
                          const nav = companyData.balanceSheet[0].totalAssets - companyData.balanceSheet[0].totalLiabilities;
                          const bookValue = companyData.balanceSheet[0].bookValuePerShare;
                          metricDetails = (
                            <div className="text-xs text-gray-600 mt-1">
                              Net Assets: {formatCurrency(nav)} | Book/Share: ${bookValue?.toFixed(2)}
                            </div>
                          );
                        } else if (calc === 'EPV' && companyData.incomeStatement[0]) {
                          const netIncome = companyData.incomeStatement[0].netIncome;
                          const margin = companyData.incomeStatement[0].revenue ? 
                            (companyData.incomeStatement[0].operatingIncome / companyData.incomeStatement[0].revenue * 100) : 0;
                          metricDetails = (
                            <div className="text-xs text-gray-600 mt-1">
                              Net Income: {formatCurrency(netIncome)} | Op Margin: {margin.toFixed(1)}%
                            </div>
                          );
                        }
                        
                        return (
                          <div key={calc} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900">{calc}</span>
                                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Recommended</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">{reason}</p>
                                {metricDetails}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}
              
              {/* Calculator Tabs */}
              <CalculatorTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                completedCalculators={completedCalculators}
                results={calculatorResults}
                companyData={companyData}
              />

              {/* Calculator Content */}
              <div className="minimal-card">
                {activeTab === 'DCF' && (
                  <DCFCalculator 
                    symbol={companyData.symbol}
                    currentPrice={getCurrentPrice()}
                    defaultBaseFCF={companyData.cashFlowStatement[0]?.freeCashFlow}
                    defaultSharesOutstanding={companyData.incomeStatement[0]?.sharesOutstanding}
                    historicalFCF={companyData.cashFlowStatement
                      .slice(0, 5)
                      .map(cf => ({
                        year: formatYear(cf.date),
                        value: cf.freeCashFlow
                      }))} // Keep API order - should be newest first
                    historicalShares={companyData.incomeStatement
                      .slice(0, 5)
                      .map(stmt => ({
                        year: formatYear(stmt.date),
                        value: stmt.sharesOutstanding
                      }))} // Keep API order - should be newest first
                    onCalculationComplete={(result) => handleCalculatorComplete('DCF', result)}
                  />
                )}

                {activeTab === 'DDM' && (
                  <div className="py-12 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Dividend Discount Model</h3>
                    <p className="text-sm text-gray-600">Coming soon...</p>
                  </div>
                )}

                {activeTab === 'NAV' && (
                  <div className="py-12 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Net Asset Value</h3>
                    <p className="text-sm text-gray-600">Coming soon...</p>
                  </div>
                )}

                {activeTab === 'EPV' && (
                  <div className="py-12 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Earnings Power Value</h3>
                    <p className="text-sm text-gray-600">Coming soon...</p>
                  </div>
                )}

                {activeTab === 'SUMMARY' && (
                  <CalculatorSummary
                    symbol={companyData.symbol}
                    companyName={companyData.name}
                    currentPrice={getCurrentPrice()}
                    results={Object.entries(calculatorResults).map(([model, value]) => ({
                      model: model as CalculatorModel,
                      intrinsicValue: value,
                      currentPrice: getCurrentPrice(),
                      confidence: 'medium' // This should come from the calculator
                    }))}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};