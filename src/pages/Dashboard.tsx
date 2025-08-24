import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { DCFCalculator } from '../components/calculator/DCFCalculator';
import { DDMCalculator } from '../components/calculator/DDMCalculator';
import { RelativeValuationCalculator } from '../components/calculator/RelativeValuationCalculator';
import { NAVCalculator } from '../components/calculator/NAVCalculator';
import { EPVCalculator } from '../components/calculator/EPVCalculator';
import { CalculatorTabs, type CalculatorModel } from '../components/calculator/CalculatorTabs';
import { CalculatorSummary } from '../components/calculator/CalculatorSummary';
import type { DCFResult } from '../types';
import type { DDMResult } from '../types/ddm';
import type { EPVResult } from '../types/epv';
import type { NAVResult } from '../types/nav';
import type { RelativeValuationResult } from '../types/relativeValuation';
import { FinancialHistoryTable } from '../components/dashboard/FinancialHistoryTable';
import { RecommendationBanner } from '../components/dashboard/RecommendationBanner';
import { MoatAnalysis } from '../components/analysis/MoatAnalysis';
import { CompanySearchForm } from '../components/dashboard/CompanySearchForm';
import { CalculationHistoryPanel } from '../components/dashboard/CalculationHistoryPanel';
import { formatCurrency, formatShares, formatEPS, formatYear } from '../utils/formatters';
import { useFinancialData } from '../hooks/useFinancialData';
import { useMetricHighlighting } from '../hooks/useMetricHighlighting';
import { useCompanySearch } from '../hooks/useCompanySearch';
import { useSmartMultiCalculator } from '../services/CalculatorHookFactory';
import { usePrice } from '../contexts/PriceContext';
import { calculateMoatFromFinancials } from '../utils/moatAnalysis';
import type { SavedCalculation } from '../types/savedCalculation';

// Import debug helpers in development
if (import.meta.env.DEV) {
  import('../utils/debugHelper');
  import('../utils/testMockData');
}

export const Dashboard: React.FC = () => {
  const [historyPanelCollapsed, setHistoryPanelCollapsed] = useState(false);
  const [selectedCalculationId, setSelectedCalculationId] = useState<string>();
  const [activeTab, setActiveTab] = useState<CalculatorModel>('DCF');
  
  // Use extracted hooks following SoC principles
  const companySearch = useCompanySearch();
  const { setPrice } = usePrice();
  
  // Get smart calculator states for summary and tabs
  const smartCalculators = useSmartMultiCalculator(
    companySearch.companyData?.symbol || companySearch.basicInfo?.symbol || '',
    {
      DCF: () => {},
      DDM: () => {},
      NAV: () => {},
      EPV: () => {},
      RELATIVE: () => {}
    }
  );
  
  // Log when component mounts
  React.useEffect(() => {
    console.log('Dashboard component mounted');
    console.log('Environment:', import.meta.env.MODE);
    console.log('API configured:', !!import.meta.env.VITE_FMP_API_KEY);
  }, []);
  
  // Log when companyData changes
  React.useEffect(() => {
    console.log('Company data changed:', {
      hasData: !!companySearch.companyData,
      symbol: companySearch.companyData?.symbol,
      name: companySearch.companyData?.name,
      isLoading: companySearch.loading,
      hasError: !!companySearch.error
    });
  }, [companySearch.companyData, companySearch.loading, companySearch.error]);

  // Cache current price when company data is loaded
  React.useEffect(() => {
    const symbol = companySearch.companyData?.symbol || companySearch.basicInfo?.symbol;
    const price = companySearch.companyData?.currentPrice || companySearch.basicInfo?.currentPrice;
    
    if (symbol && price && price > 0) {
      console.log(`Caching price for ${symbol}: ${price}`);
      setPrice(symbol, price, 'USD');
    }
  }, [companySearch.companyData, companySearch.basicInfo, setPrice]);
  
  // Use custom hooks for data processing and highlighting
  const financialData = useFinancialData(companySearch.companyData);
  const highlightedMetrics = useMetricHighlighting(activeTab);

  // Handle calculation selection from history
  const handleCalculationSelect = async (calculation: SavedCalculation) => {
    setSelectedCalculationId(calculation.id);
    
    // Load full company data from cache (KISS principle - cache first, API fallback)
    await companySearch.loadFromCache(calculation.symbol);
    
    // Switch to the appropriate calculator tab
    setActiveTab(calculation.type as CalculatorModel);
    
    console.log('Selected calculation:', calculation);
  };

  // Handle new search - clear selection when searching new company  
  const handleNewSearch = async (e: React.FormEvent) => {
    setSelectedCalculationId(undefined);
    await companySearch.handleSearch(e);
  };

  // Handle clearing search results
  const handleClearSearch = () => {
    companySearch.clearSearch();
    setSelectedCalculationId(undefined);
  };

  const getCurrentPrice = (): number | undefined => {
    return companySearch.companyData?.currentPrice || companySearch.basicInfo?.currentPrice;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="h-[calc(100vh-64px)]">
        {/* Initial Search State - Show when no company data */}
        {!companySearch.companyData && !companySearch.basicInfo && (
          <div className="h-full flex flex-col items-center justify-center p-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-semibold text-gray-800 mb-3">
                Calculate Intrinsic Value
              </h1>
              <p className="text-gray-500 max-w-xl">
                Professional valuation models for informed investment decisions
              </p>
            </div>
            
            <CompanySearchForm
              ticker={companySearch.ticker}
              onTickerChange={companySearch.setTicker}
              onSubmit={handleNewSearch}
              onClear={handleClearSearch}
              loading={companySearch.loading}
              error={companySearch.error}
            />
          </div>
        )}

        {/* Main Dashboard Grid - Show when company data exists */}
        {(companySearch.companyData || companySearch.basicInfo) && (
          <div className="h-full grid" style={{
            gridTemplateColumns: historyPanelCollapsed ? '48px 1fr' : '40% 60%',
            transition: 'grid-template-columns 0.3s ease'
          }}>
            {/* Left Panel - Calculation History (40% width or collapsed) */}
            <CalculationHistoryPanel
              onCalculationSelect={handleCalculationSelect}
              selectedCalculationId={selectedCalculationId}
              collapsed={historyPanelCollapsed}
              onToggleCollapse={() => setHistoryPanelCollapsed(!historyPanelCollapsed)}
            />
            
            {/* Right Panel - Company Analysis & Calculator Workspace (60% width) */}
            <div className="bg-white overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Search Form - Always visible for new searches */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <CompanySearchForm
                    ticker={companySearch.ticker}
                    onTickerChange={companySearch.setTicker}
                    onSubmit={handleNewSearch}
                    onClear={handleClearSearch}
                    loading={companySearch.loading}
                    error={companySearch.error}
                    compact
                  />
                </div>

                {/* Company Header */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {((companySearch.companyData?.symbol || companySearch.basicInfo?.symbol) || '').substring(0, 2)}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold text-gray-800">
                          {companySearch.companyData?.name || companySearch.basicInfo?.name}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {companySearch.companyData?.symbol || companySearch.basicInfo?.symbol}
                        </p>
                      </div>
                    </div>
                    {getCurrentPrice() && (
                      <div className="text-right">
                        <div className="text-2xl font-semibold text-gray-800">
                          ${getCurrentPrice()!.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400">Current Price</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Metrics Grid - Only show when full financial data is loaded */}
                {companySearch.companyData && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Income Statement Card */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                        <h3 className="text-sm font-medium text-gray-600">Income</h3>
                      </div>
                      {financialData.latestIncomeStatement && (
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Revenue</p>
                            <p className="font-semibold text-gray-800">{formatCurrency(financialData.latestIncomeStatement.revenue)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">EPS</p>
                            <p className="font-semibold text-gray-800">{formatEPS(financialData.latestIncomeStatement.eps)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Balance Sheet Card */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                        <h3 className="text-sm font-medium text-gray-600">Balance</h3>
                      </div>
                      {financialData.latestBalanceSheet && (
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Total Assets</p>
                            <p className="font-semibold text-gray-800">{formatCurrency(financialData.latestTotalAssets)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Book/Share</p>
                            <p className="font-semibold text-gray-800">{formatEPS(financialData.latestBalanceSheet.bookValuePerShare)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cash Flow Card */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                        <h3 className="text-sm font-medium text-gray-600">Cash Flow</h3>
                      </div>
                      {financialData.latestCashFlowStatement && (
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Operating CF</p>
                            <p className="font-semibold text-gray-800">{formatCurrency(financialData.latestCashFlowStatement.operatingCashFlow)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Free CF</p>
                            <p className="font-semibold text-gray-800">{formatCurrency(financialData.latestFCF)}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Shares Card */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center mb-3">
                        <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                        <h3 className="text-sm font-medium text-gray-600">Shares</h3>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Outstanding</p>
                          <p className="font-semibold text-gray-800">
                            {companySearch.companyData?.sharesOutstanding ? formatShares(companySearch.companyData.sharesOutstanding) : 'N/A'}
                          </p>
                        </div>
                        {financialData.latestIncomeStatement && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">{formatYear(financialData.latestIncomeStatement.date)}</p>
                            <p className="font-semibold text-gray-800">{formatShares(financialData.latestShares)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* MOAT Analysis - Only show when full financial data is loaded */}
                {companySearch.companyData && (
                  <MoatAnalysis 
                    analysis={calculateMoatFromFinancials(companySearch.companyData)}
                    companySymbol={companySearch.companyData.symbol}
                  />
                )}

                {/* Financial History Table - Only show when full financial data is loaded */}
                {companySearch.companyData && (
                  <FinancialHistoryTable
                    incomeStatements={financialData.sortedIncomeStatements}
                    balanceSheets={financialData.sortedBalanceSheets}
                    cashFlowStatements={financialData.sortedCashFlowStatements}
                    highlightedMetrics={highlightedMetrics}
                    hasDividends={financialData.hasDividends}
                  />
                )}

                {/* Recommendation Banner - Only show when full financial data is loaded */}
                {companySearch.companyData && (
                  <RecommendationBanner
                    companyData={companySearch.companyData}
                    latestFCF={financialData.latestFCF}
                    latestDividend={financialData.latestDividend}
                    latestNetIncome={financialData.latestNetIncome}
                    latestTotalAssets={financialData.latestTotalAssets}
                    latestTotalEquity={financialData.latestTotalEquity}
                    latestIncomeStatement={(financialData.latestIncomeStatement as unknown as Record<string, unknown>) || {}}
                    latestBalanceSheet={(financialData.latestBalanceSheet as unknown as Record<string, unknown>) || {}}
                    latestCashFlowStatement={(financialData.latestCashFlowStatement as unknown as Record<string, unknown>) || {}}
                  />
                )}
                
                {/* Calculator Section with Tabs */}
                <div className="space-y-6">
                  {/* Calculator Tabs */}
                  <CalculatorTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    symbol={companySearch.companyData?.symbol || companySearch.basicInfo?.symbol || ''}
                    companyData={companySearch.companyData ? {
                      balanceSheet: companySearch.companyData.balanceSheet,
                      incomeStatement: companySearch.companyData.incomeStatement,
                      cashFlowStatement: companySearch.companyData.cashFlowStatement
                    } : undefined}
                  />

                  {/* Calculator Content */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    {activeTab === 'DCF' && (
                      (companySearch.companyData && financialData.latestCashFlowStatement && financialData.latestIncomeStatement) ? (
                        <DCFCalculator 
                          symbol={companySearch.companyData.symbol}
                          currentPrice={getCurrentPrice()}
                          defaultBaseFCF={financialData.latestFCF}
                          defaultSharesOutstanding={financialData.latestShares}
                          historicalFCF={financialData.historicalFCF}
                          historicalShares={financialData.historicalShares}
                        />
                      ) : (
                        <div className="text-center py-12">
                          <h3 className="text-lg font-semibold mb-2">Financial Data Required</h3>
                          <p className="text-sm text-gray-600 mb-4">Please search for a company first to load financial data for DCF analysis</p>
                        </div>
                      )
                    )}

                    {activeTab === 'DDM' && (
                      (companySearch.companyData && financialData.latestCashFlowStatement && financialData.latestIncomeStatement) ? (
                        <DDMCalculator
                          symbol={companySearch.companyData.symbol}
                          currentPrice={getCurrentPrice()}
                          defaultDividend={financialData.latestDividend}
                          defaultSharesOutstanding={financialData.latestShares}
                          historicalDividends={companySearch.companyData.cashFlowStatement
                            .slice(0, 5)
                            .map(cf => ({
                              year: formatYear(cf.date),
                              value: Math.abs(cf.dividendsPaid || 0) / (companySearch.companyData!.incomeStatement.find(
                                is => is.date === cf.date
                              )?.sharesOutstanding || 1)
                            }))
                            .filter(d => d.value > 0)
                            .sort((a, b) => parseInt(b.year) - parseInt(a.year))}
                          historicalShares={financialData.historicalShares}
                        />
                      ) : (
                        <div className="text-center py-12">
                          <h3 className="text-lg font-semibold mb-2">Financial Data Required</h3>
                          <p className="text-sm text-gray-600 mb-4">Please search for a company first to load financial data for DDM analysis</p>
                        </div>
                      )
                    )}

                    {activeTab === 'RELATIVE' && companySearch.companyData && (
                      <RelativeValuationCalculator
                        symbol={companySearch.companyData.symbol}
                        currentPrice={getCurrentPrice()}
                        defaultCompanyData={{
                          symbol: companySearch.companyData.symbol,
                          name: companySearch.companyData.name,
                          marketCap: (getCurrentPrice() || 0) * financialData.latestShares,
                          enterpriseValue: (getCurrentPrice() || 0) * financialData.latestShares,
                          revenue: financialData.latestIncomeStatement?.revenue || 0,
                          ebitda: (financialData.latestIncomeStatement?.revenue || 0) * 0.2,
                          netIncome: financialData.latestNetIncome,
                          bookValue: financialData.latestTotalEquity,
                          sharesOutstanding: financialData.latestShares,
                          debt: 0,
                          cash: 0
                        }}
                      />
                    )}

                    {activeTab === 'NAV' && (
                      (companySearch.companyData && financialData.latestBalanceSheet) ? (
                        <NAVCalculator
                          symbol={companySearch.companyData.symbol}
                          currentPrice={getCurrentPrice()}
                          balanceSheet={financialData.latestBalanceSheet}
                          sharesOutstanding={companySearch.companyData.sharesOutstanding}
                        />
                      ) : (
                        <div className="text-center py-12">
                          <h3 className="text-lg font-semibold mb-2">Financial Data Required</h3>
                          <p className="text-sm text-gray-600 mb-4">Please search for a company first to load financial data for NAV analysis</p>
                        </div>
                      )
                    )}

                    {activeTab === 'EPV' && (
                      (companySearch.companyData && financialData.latestIncomeStatement) ? (
                        <EPVCalculator
                          symbol={companySearch.companyData.symbol}
                          currentPrice={getCurrentPrice()}
                          defaultNormalizedEarnings={financialData.latestNetIncome}
                          defaultSharesOutstanding={financialData.latestShares}
                          historicalEarnings={companySearch.companyData.incomeStatement
                            .slice(0, 10)
                            .map(is => ({
                              year: parseInt(is.date.split('-')[0]),
                              netIncome: is.netIncome,
                              operatingIncome: is.operatingIncome,
                              revenue: is.revenue,
                              date: is.date
                            }))
                            .sort((a, b) => b.year - a.year)}
                        />
                      ) : (
                        <div className="text-center py-12">
                          <h3 className="text-lg font-semibold mb-2">Financial Data Required</h3>
                          <p className="text-sm text-gray-600 mb-4">Please search for a company first to load financial data for EPV analysis</p>
                        </div>
                      )
                    )}

                    {activeTab === 'SUMMARY' && (
                      <CalculatorSummary
                        symbol={(companySearch.companyData?.symbol || companySearch.basicInfo?.symbol || '')}
                        companyName={(companySearch.companyData?.name || companySearch.basicInfo?.name || '')}
                        currentPrice={getCurrentPrice()}
                        results={[
                          smartCalculators.DCF.cachedResult && {
                            model: 'DCF' as CalculatorModel,
                            intrinsicValue: (smartCalculators.DCF.cachedResult as DCFResult)?.intrinsicValue ?? 0,
                            currentPrice: getCurrentPrice(),
                            confidence: 'medium' as const,
                            timestamp: smartCalculators.DCF.cachedCalculation?.createdAt || new Date(),
                            fromCache: true,
                            cacheAge: smartCalculators.DCF.cacheAge ?? undefined
                          },
                          smartCalculators.DDM.cachedResult && {
                            model: 'DDM' as CalculatorModel,
                            intrinsicValue: (smartCalculators.DDM.cachedResult as DDMResult)?.intrinsicValuePerShare ?? 0,
                            currentPrice: getCurrentPrice(),
                            confidence: 'medium' as const,
                            timestamp: smartCalculators.DDM.cachedCalculation?.createdAt || new Date(),
                            fromCache: true,
                            cacheAge: smartCalculators.DDM.cacheAge ?? undefined
                          },
                          smartCalculators.NAV.cachedResult && {
                            model: 'NAV' as CalculatorModel,
                            intrinsicValue: (smartCalculators.NAV.cachedResult as NAVResult)?.navPerShare ?? 0,
                            currentPrice: getCurrentPrice(),
                            confidence: 'medium' as const,
                            timestamp: smartCalculators.NAV.cachedCalculation?.createdAt || new Date(),
                            fromCache: true,
                            cacheAge: smartCalculators.NAV.cacheAge ?? undefined
                          },
                          smartCalculators.EPV.cachedResult && {
                            model: 'EPV' as CalculatorModel,
                            intrinsicValue: (smartCalculators.EPV.cachedResult as EPVResult)?.epvPerShare ?? 0,
                            currentPrice: getCurrentPrice(),
                            confidence: 'medium' as const,
                            timestamp: smartCalculators.EPV.cachedCalculation?.createdAt || new Date(),
                            fromCache: true,
                            cacheAge: smartCalculators.EPV.cacheAge ?? undefined
                          },
                          smartCalculators.RELATIVE.cachedResult && {
                            model: 'RELATIVE' as CalculatorModel,
                            intrinsicValue: (() => {
                              const result = smartCalculators.RELATIVE.cachedResult as RelativeValuationResult;
                              const moderate = result?.valuationRanges?.moderate?.pricePerShare;
                              return moderate ? (moderate.min + moderate.max) / 2 : 0;
                            })(),
                            currentPrice: getCurrentPrice(),
                            confidence: 'medium' as const,
                            timestamp: smartCalculators.RELATIVE.cachedCalculation?.createdAt || new Date(),
                            fromCache: true,
                            cacheAge: smartCalculators.RELATIVE.cacheAge ?? undefined
                          }
                        ].filter(Boolean).map(result => ({
                          ...result,
                          cacheAge: result.cacheAge ?? undefined
                        }))}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};