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

              {/* Historical Data - Minimal Table */}
              <div className="minimal-card overflow-hidden">
                <h3 className="text-lg font-medium text-gray-700 mb-6">Financial History</h3>
                <div className="overflow-x-auto -mx-8 px-8">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">Year</th>
                        <th className="text-right py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        <th className="text-right py-3 text-xs font-medium text-gray-500 uppercase">EPS</th>
                        <th className="text-right py-3 text-xs font-medium text-gray-500 uppercase">FCF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyData.incomeStatement.slice(0, 5).map((stmt, index) => (
                        <tr key={stmt.date} className="border-b border-gray-50">
                          <td className="py-3 text-sm text-gray-700">{formatYear(stmt.date)}</td>
                          <td className="text-right py-3 text-sm font-medium text-gray-800">{formatCurrency(stmt.revenue)}</td>
                          <td className="text-right py-3 text-sm font-medium text-gray-800">{formatEPS(stmt.eps)}</td>
                          <td className="text-right py-3 text-sm font-medium text-gray-800">
                            {companyData.cashFlowStatement[index] 
                              ? formatCurrency(companyData.cashFlowStatement[index].freeCashFlow)
                              : <span className="text-gray-400">-</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Valuation Models - Minimal */}
          {companyData && !selectedModel && (
            <div className="minimal-card">
              <div className="text-center mb-8">
                <h3 className="text-xl font-medium text-gray-800 mb-2">Choose Valuation Model</h3>
                <p className="text-sm text-gray-500">
                  Select a model to value {companyData.symbol}
                </p>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => handleModelSelect('DCF')}
                  className="bg-gray-900 text-white rounded-2xl p-6 hover:bg-gray-800 transition-all duration-200 text-left"
                >
                  <div className="mb-3">
                    <span className="text-lg font-semibold">DCF</span>
                  </div>
                  <p className="text-xs text-gray-300">
                    Discounted Cash Flow
                  </p>
                </button>

                <div className="bg-gray-50 rounded-2xl p-6 opacity-50">
                  <div className="mb-3">
                    <span className="text-lg font-semibold text-gray-400">DDM</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Coming Soon
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 opacity-50">
                  <div className="mb-3">
                    <span className="text-lg font-semibold text-gray-400">NAV</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Coming Soon
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 opacity-50">
                  <div className="mb-3">
                    <span className="text-lg font-semibold text-gray-400">EPV</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Coming Soon
                  </p>
                </div>
              </div>
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