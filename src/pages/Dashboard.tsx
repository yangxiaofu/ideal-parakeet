import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { DCFCalculator } from '../components/calculator/DCFCalculator';
import { fmpApi } from '../services/fmpApi';
import { formatCurrency, formatShares, formatEPS, formatYear } from '../utils/formatters';
import type { CompanyFinancials } from '../types';

export const Dashboard: React.FC = () => {
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState<CompanyFinancials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;

    setLoading(true);
    setError(null);
    setCompanyData(null);
    setSelectedModel(null);
    
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

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
  };

  const getCurrentPrice = (): number | undefined => {
    return companyData?.currentPrice;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto py-12" style={{ paddingLeft: '4rem', paddingRight: '4rem' }}>
        <div className="space-y-12">
          {/* Hero Section */}
          <div className="text-center py-12 px-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <h1 className="text-4xl font-bold text-slate-800 mb-4 tracking-tight">
              Professional Equity Valuation
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Analyze any publicly traded company with comprehensive intrinsic value models
            </p>
          </div>

          {/* Search Section */}
          <div className="max-w-lg mx-auto">
            <Card className="card-shadow-lg border-slate-200/60 hover-lift">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl text-slate-800">Get Started</CardTitle>
                <CardDescription className="text-slate-600 text-base">
                  Enter a stock ticker symbol to begin your analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <form onSubmit={handleSearch} className="space-y-6">
                  <div className="space-y-3">
                    <label htmlFor="ticker" className="text-sm font-medium text-slate-700 block">
                      Stock Ticker Symbol
                    </label>
                    <Input
                      id="ticker"
                      type="text"
                      placeholder="e.g., AAPL, MSFT, GOOGL"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value.toUpperCase())}
                      disabled={loading}
                      className="h-12 text-lg bg-slate-50/50 border-slate-300/60 focus:border-indigo-400 focus:ring-indigo-400/20"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200 shadow-sm" 
                    disabled={loading || !ticker.trim()}
                  >
                    {loading ? 'Searching...' : 'Analyze Company'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Error Display */}
          {error && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-red-50/50 border border-red-200/60 rounded-xl p-6 card-shadow">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-red-800 mb-1">
                      Error fetching company data
                    </h3>
                    <p className="text-sm text-red-700 leading-relaxed">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Company Data Display */}
          {companyData && (
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Company Header */}
              <Card className="card-shadow-lg border-slate-200/60">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-xl tracking-tight">
                          {companyData.symbol.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-3xl text-slate-800 mb-1 tracking-tight">
                          {companyData.name}
                        </CardTitle>
                        <p className="text-lg text-slate-500 font-medium">
                          {companyData.symbol}
                        </p>
                      </div>
                    </div>
                    {companyData.currentPrice && (
                      <div className="text-right">
                        <div className="text-3xl font-bold text-slate-800">
                          ${companyData.currentPrice.toFixed(2)}
                        </div>
                        <div className="text-sm text-slate-500">Current Price</div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Financial Statements Summary */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-slate-200/60 hover-lift">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg text-slate-700 flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                          Income Statement
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {companyData.incomeStatement[0] && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Revenue</span>
                              <span className="font-semibold text-slate-800">{formatCurrency(companyData.incomeStatement[0].revenue)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Net Income</span>
                              <span className="font-semibold text-slate-800">{formatCurrency(companyData.incomeStatement[0].netIncome)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">EPS</span>
                              <span className="font-semibold text-slate-800">{formatEPS(companyData.incomeStatement[0].eps)}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-xs text-slate-500">{formatYear(companyData.incomeStatement[0].date)}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200/60 hover-lift">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg text-slate-700 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                          Balance Sheet
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {companyData.balanceSheet[0] && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Total Assets</span>
                              <span className="font-semibold text-slate-800">{formatCurrency(companyData.balanceSheet[0].totalAssets)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Total Equity</span>
                              <span className="font-semibold text-slate-800">{formatCurrency(companyData.balanceSheet[0].totalEquity)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Book Value/Share</span>
                              <span className="font-semibold text-slate-800">{formatEPS(companyData.balanceSheet[0].bookValuePerShare)}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-xs text-slate-500">{formatYear(companyData.balanceSheet[0].date)}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200/60 hover-lift">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg text-slate-700 flex items-center">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                          Cash Flow
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {companyData.cashFlowStatement[0] && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Operating CF</span>
                              <span className="font-semibold text-slate-800">{formatCurrency(companyData.cashFlowStatement[0].operatingCashFlow)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Free CF</span>
                              <span className="font-semibold text-slate-800">{formatCurrency(companyData.cashFlowStatement[0].freeCashFlow)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">CapEx</span>
                              <span className="font-semibold text-slate-800">{formatCurrency(companyData.cashFlowStatement[0].capitalExpenditure)}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-xs text-slate-500">{formatYear(companyData.cashFlowStatement[0].date)}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200/60 hover-lift">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg text-slate-700 flex items-center">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                          Shares Outstanding
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-slate-800 mb-1">
                              {companyData.sharesOutstanding ? formatShares(companyData.sharesOutstanding) : 'N/A'}
                            </div>
                            <div className="text-sm text-slate-500">Current Outstanding</div>
                          </div>
                          {companyData.incomeStatement[0] && (
                            <div className="pt-3 border-t border-slate-100 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Latest Filing</span>
                                <span className="font-semibold text-slate-800">{formatShares(companyData.incomeStatement[0].sharesOutstanding)}</span>
                              </div>
                              <div className="text-xs text-slate-500 text-right">
                                ({formatYear(companyData.incomeStatement[0].date)})
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Historical Data Preview */}
                  <Card className="border-slate-200/60 card-shadow">
                    <CardHeader className="pb-6">
                      <CardTitle className="text-2xl text-slate-800 flex items-center">
                        <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mr-3"></div>
                        Financial History (Last 5 Years)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600 uppercase tracking-wide">Year</th>
                              <th className="text-right py-4 px-6 text-sm font-semibold text-slate-600 uppercase tracking-wide">Revenue</th>
                              <th className="text-right py-4 px-6 text-sm font-semibold text-slate-600 uppercase tracking-wide">Net Income</th>
                              <th className="text-right py-4 px-6 text-sm font-semibold text-slate-600 uppercase tracking-wide">EPS</th>
                              <th className="text-right py-4 px-6 text-sm font-semibold text-slate-600 uppercase tracking-wide">Shares Outstanding</th>
                              <th className="text-right py-4 px-6 text-sm font-semibold text-slate-600 uppercase tracking-wide">Free Cash Flow</th>
                            </tr>
                          </thead>
                          <tbody>
                            {companyData.incomeStatement.slice(0, 5).map((stmt, index) => (
                              <tr key={stmt.date} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-6 font-medium text-slate-800">{formatYear(stmt.date)}</td>
                                <td className="text-right py-4 px-6 font-semibold text-slate-800">{formatCurrency(stmt.revenue)}</td>
                                <td className="text-right py-4 px-6 font-semibold text-slate-800">{formatCurrency(stmt.netIncome)}</td>
                                <td className="text-right py-4 px-6 font-semibold text-slate-800">{formatEPS(stmt.eps)}</td>
                                <td className="text-right py-4 px-6 font-semibold text-slate-800">{formatShares(stmt.sharesOutstanding)}</td>
                                <td className="text-right py-4 px-6 font-semibold text-slate-800">
                                  {companyData.cashFlowStatement[index] 
                                    ? formatCurrency(companyData.cashFlowStatement[index].freeCashFlow)
                                    : <span className="text-slate-400">N/A</span>
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Valuation Models */}
          {companyData && !selectedModel && (
            <div className="max-w-6xl mx-auto">
              <Card className="border-slate-200/60 card-shadow-lg">
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-3xl text-slate-800 mb-2">Choose Valuation Model</CardTitle>
                  <CardDescription className="text-lg text-slate-600">
                    Select a valuation methodology to analyze <span className="font-semibold text-slate-700">{companyData.symbol}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div
                      onClick={() => handleModelSelect('DCF')}
                      className="group relative bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 cursor-pointer hover-lift"
                    >
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                          <span className="text-white font-bold text-sm">DCF</span>
                        </div>
                        <div className="ml-3">
                          <h3 className="font-semibold text-lg text-slate-800">DCF Model</h3>
                          <div className="w-8 h-0.5 bg-blue-500 rounded-full mt-1"></div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Discounted Cash Flow analysis with scenario-based projections
                      </p>
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      </div>
                    </div>

                    <div className="relative bg-slate-50/50 border-2 border-slate-200/60 rounded-xl p-6 opacity-60">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-slate-300 rounded-lg flex items-center justify-center">
                          <span className="text-slate-500 font-bold text-sm">DDM</span>
                        </div>
                        <div className="ml-3">
                          <h3 className="font-semibold text-lg text-slate-600">DDM Model</h3>
                          <div className="w-8 h-0.5 bg-slate-300 rounded-full mt-1"></div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed mb-3">
                        Dividend Discount Model for income-focused investments
                      </p>
                      <div className="absolute top-4 right-4">
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">Coming Soon</span>
                      </div>
                    </div>

                    <div className="relative bg-slate-50/50 border-2 border-slate-200/60 rounded-xl p-6 opacity-60">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-slate-300 rounded-lg flex items-center justify-center">
                          <span className="text-slate-500 font-bold text-sm">NAV</span>
                        </div>
                        <div className="ml-3">
                          <h3 className="font-semibold text-lg text-slate-600">NAV Model</h3>
                          <div className="w-8 h-0.5 bg-slate-300 rounded-full mt-1"></div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed mb-3">
                        Net Asset Value calculation with balance sheet analysis
                      </p>
                      <div className="absolute top-4 right-4">
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">Coming Soon</span>
                      </div>
                    </div>

                    <div className="relative bg-slate-50/50 border-2 border-slate-200/60 rounded-xl p-6 opacity-60">
                      <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-slate-300 rounded-lg flex items-center justify-center">
                          <span className="text-slate-500 font-bold text-sm">EPV</span>
                        </div>
                        <div className="ml-3">
                          <h3 className="font-semibold text-lg text-slate-600">EPV Model</h3>
                          <div className="w-8 h-0.5 bg-slate-300 rounded-full mt-1"></div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed mb-3">
                        Earnings Power Value for conservative valuations
                      </p>
                      <div className="absolute top-4 right-4">
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">Coming Soon</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* DCF Calculator */}
          {companyData && selectedModel === 'DCF' && (
            <div className="max-w-6xl mx-auto">
              <DCFCalculator 
                symbol={companyData.symbol}
                currentPrice={getCurrentPrice()}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};