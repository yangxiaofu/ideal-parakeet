import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { DCFCalculator } from '../components/calculator/DCFCalculator';
import { DDMCalculator } from '../components/calculator/DDMCalculator';
import { RelativeValuationCalculator } from '../components/calculator/RelativeValuationCalculator';
import { NAVCalculator } from '../components/calculator/NAVCalculator';
import { EPVCalculator } from '../components/calculator/EPVCalculator';
import { CalculatorTabs, type CalculatorModel } from '../components/calculator/CalculatorTabs';
import { CalculatorSummary } from '../components/calculator/CalculatorSummary';
import { FinancialHistoryTable } from '../components/dashboard/FinancialHistoryTable';
import { RecommendationBanner } from '../components/dashboard/RecommendationBanner';
import { MoatAnalysis } from '../components/analysis/MoatAnalysis';
import { fmpApi, type CompanyBasicInfo } from '../services/fmpApi';
import { formatCurrency, formatShares, formatEPS, formatYear } from '../utils/formatters';
import { useFinancialData } from '../hooks/useFinancialData';
import { useMetricHighlighting } from '../hooks/useMetricHighlighting';
import { calculateMoatFromFinancials } from '../utils/moatAnalysis';
import { getMockCompanyData, isDemo } from '../utils/mockData';
import type { CompanyFinancials, IncomeStatement, BalanceSheet, CashFlowStatement } from '../types';

// Import debug helpers in development
if (import.meta.env.DEV) {
  import('../utils/debugHelper');
  import('../utils/testMockData');
}

// Enhanced calculator result with metadata
interface CalculatorResultMetadata {
  value: number;
  timestamp: Date;
  confidence?: 'high' | 'medium' | 'low';
  fromCache?: boolean;
  cacheAge?: string;
}

export const Dashboard: React.FC = () => {
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [basicInfo, setBasicInfo] = useState<CompanyBasicInfo | null>(null);
  const [companyData, setCompanyData] = useState<CompanyFinancials | null>(null);
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CalculatorModel>('DCF');
  const [completedCalculators, setCompletedCalculators] = useState<Set<CalculatorModel>>(new Set());
  const [calculatorResults, setCalculatorResults] = useState<Partial<Record<CalculatorModel, CalculatorResultMetadata>>>({});
  
  // Track which financial statements have been loaded
  const [loadedStatements, setLoadedStatements] = useState<{
    income: boolean;
    balance: boolean;
    cashFlow: boolean;
  }>({ income: false, balance: false, cashFlow: false });
  
  // Log when component mounts
  React.useEffect(() => {
    console.log('Dashboard component mounted');
    console.log('Environment:', import.meta.env.MODE);
    console.log('API configured:', !!import.meta.env.VITE_FMP_API_KEY);
  }, []);
  
  // Log when companyData changes
  React.useEffect(() => {
    console.log('Company data changed:', {
      hasData: !!companyData,
      symbol: companyData?.symbol,
      name: companyData?.name,
      isLoading: loading,
      hasError: !!error
    });
  }, [companyData, loading, error]);
  
  // Use custom hooks for data processing and highlighting
  const financialData = useFinancialData(companyData);
  const highlightedMetrics = useMetricHighlighting(activeTab);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== handleSearch called ===');
    console.log('Event:', e);
    console.log('Ticker value:', ticker);
    
    if (!ticker.trim()) {
      console.log('No ticker entered - returning');
      return;
    }

    console.log('Starting search for ticker:', ticker);
    setLoading(true);
    setError(null);
    setBasicInfo(null);
    setCompanyData(null);
    setActiveTab('DCF');
    setCompletedCalculators(new Set());
    setCalculatorResults({});
    setLoadedStatements({ income: false, balance: false, cashFlow: false });
    
    try {
      // Check if using demo mode
      console.log('Checking isDemo for ticker:', ticker);
      const isDemoMode = isDemo(ticker);
      console.log('isDemo result:', isDemoMode);
      
      if (isDemoMode) {
        console.log('Demo mode activated - loading mock data');
        try {
          const mockData = getMockCompanyData(ticker);
          console.log('Mock data structure:', {
            hasData: !!mockData,
            symbol: mockData?.symbol,
            name: mockData?.name,
            price: mockData?.currentPrice,
            incomeStmtCount: mockData?.incomeStatement?.length,
            balanceSheetCount: mockData?.balanceSheet?.length,
            cashFlowCount: mockData?.cashFlowStatement?.length
          });
          
          if (!mockData) {
            throw new Error('Mock data returned null');
          }
          
          // For demo mode, convert to basic info format first, then set full data
          const demoBasicInfo: CompanyBasicInfo = {
            symbol: mockData.symbol,
            name: mockData.name,
            currentPrice: mockData.currentPrice || 0,
            sharesOutstanding: mockData.sharesOutstanding || 0
          };
          setBasicInfo(demoBasicInfo);
          setCompanyData(mockData);
          setLoadedStatements({ income: true, balance: true, cashFlow: true });
          console.log('Demo data set - resetting loading state');
          setLoading(false);  // Reset loading state for demo mode
          console.log('Demo mode complete - returning');
          return;
        } catch (demoError) {
          console.error('Error in demo mode:', demoError);
          setError('Failed to load demo data. Please check console for details.');
          setLoading(false);
          return;
        }
      }
      
      console.log('Calling FMP API for basic info:', ticker.trim());
      const data = await fmpApi.getCompanyBasicInfo(ticker.trim());
      console.log('Successfully fetched basic info:', data);
      setBasicInfo(data);
    } catch (error: unknown) {
      console.error('Search failed with error:', error);
      
      // More detailed error handling
      let errorMessage = 'Failed to fetch company data';
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = 'API key is missing or invalid. Please check your configuration.';
        } else if (error.message.includes('404')) {
          errorMessage = `Ticker "${ticker}" not found. Please check the symbol and try again.`;
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          errorMessage = 'Daily API limit reached (250 calls/day for free tier). The limit resets at midnight EST. Consider upgrading to a paid plan for more requests.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      console.error('Error details:', errorMessage);
    } finally {
      setLoading(false);
      console.log('Search completed, loading state:', false);
    }
  };


  // Load specific financial statements for individual calculators
  const loadSpecificStatements = async (calculator: CalculatorModel) => {
    if (!basicInfo || loadingFinancials) {
      return;
    }

    // Determine what statements are needed for each calculator
    const getRequiredStatements = (calc: CalculatorModel): ('income' | 'balance' | 'cashFlow')[] => {
      switch (calc) {
        case 'DCF':
          return ['cashFlow', 'income']; // DCF needs cash flow for FCF, income for shares
        case 'DDM':
          return ['cashFlow', 'income']; // DDM needs cash flow for dividends, income for shares  
        case 'NAV':
          return ['balance']; // NAV only needs balance sheet
        case 'EPV':
          return ['income']; // EPV only needs income statement
        default:
          return [];
      }
    };

    const requiredStatements = getRequiredStatements(calculator);
    const statementsToLoad = requiredStatements.filter(statement => !loadedStatements[statement]);
    
    if (statementsToLoad.length === 0) {
      return; // All required statements already loaded
    }

    setLoadingFinancials(true);
    try {
      console.log(`Loading ${statementsToLoad.join(', ')} statements for ${calculator} calculator`);
      
      const loadPromises: Promise<unknown>[] = [];
      const statementTypes: ('income' | 'balance' | 'cashFlow')[] = [];

      statementsToLoad.forEach(statementType => {
        if (statementType === 'income') {
          loadPromises.push(fmpApi.getIncomeStatementProcessed(basicInfo.symbol));
          statementTypes.push('income');
        } else if (statementType === 'balance') {
          loadPromises.push(fmpApi.getBalanceSheetProcessed(basicInfo.symbol));
          statementTypes.push('balance');
        } else if (statementType === 'cashFlow') {
          loadPromises.push(fmpApi.getCashFlowStatementProcessed(basicInfo.symbol));
          statementTypes.push('cashFlow');
        }
      });

      const loadedData = await Promise.all(loadPromises);
      
      // Create or update company data with the new statements
      const currentData = companyData || {
        symbol: basicInfo.symbol,
        name: basicInfo.name,
        currentPrice: basicInfo.currentPrice,
        sharesOutstanding: basicInfo.sharesOutstanding,
        incomeStatement: [],
        balanceSheet: [],
        cashFlowStatement: []
      };

      const updatedData: CompanyFinancials = { ...currentData };
      const updatedLoadedStatements = { ...loadedStatements };

      loadedData.forEach((data, index) => {
        const statementType = statementTypes[index];
        if (statementType === 'income') {
          updatedData.incomeStatement = data as IncomeStatement[];
          updatedLoadedStatements.income = true;
        } else if (statementType === 'balance') {
          updatedData.balanceSheet = data as BalanceSheet[];
          updatedLoadedStatements.balance = true;
        } else if (statementType === 'cashFlow') {
          updatedData.cashFlowStatement = data as CashFlowStatement[];
          updatedLoadedStatements.cashFlow = true;
        }
      });

      setCompanyData(updatedData);
      setLoadedStatements(updatedLoadedStatements);
      console.log(`Loaded ${statementsToLoad.length} statements for ${calculator} - API calls: ${statementsToLoad.length}`);
    } catch (error) {
      console.error('Failed to load specific financial statements:', error);
      setError(error instanceof Error ? error.message : 'Failed to load financial data');
    } finally {
      setLoadingFinancials(false);
    }
  };

  const handleTabChange = async (tab: CalculatorModel) => {
    setActiveTab(tab);
    
    // Load specific financial data for the calculator if needed
    const needsFinancialData = ['DCF', 'DDM', 'NAV', 'EPV'].includes(tab);
    if (needsFinancialData && basicInfo) {
      await loadSpecificStatements(tab);
    }
  };

  const handleCalculatorComplete = (
    model: CalculatorModel, 
    result: number, 
    metadata?: {
      confidence?: 'high' | 'medium' | 'low';
      fromCache?: boolean;
      cacheAge?: string;
    }
  ) => {
    setCompletedCalculators(prev => new Set([...prev, model]));
    setCalculatorResults(prev => ({ 
      ...prev, 
      [model]: {
        value: result,
        timestamp: new Date(),
        confidence: metadata?.confidence || 'medium',
        fromCache: metadata?.fromCache || false,
        cacheAge: metadata?.cacheAge
      }
    }));
  };

  const getCurrentPrice = (): number | undefined => {
    return companyData?.currentPrice || basicInfo?.currentPrice;
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
                <p className="text-xs text-gray-400 mt-1">
                  💡 Tip: Enter "DEMO" to test with sample data (no API calls)
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
                  className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-2xl transition-all duration-200 disabled:bg-gray-200 disabled:text-gray-500"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Fetching Financial Data...</span>
                    </div>
                  ) : (
                    'Analyze Company'
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Error Display - Enhanced */}
          {error && (
            <div className="max-w-md mx-auto animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-red-800 mb-1">Unable to fetch data</h3>
                    <p className="text-sm text-red-700">
                      {error}
                    </p>
                    {error.includes('API key') && (
                      <p className="text-xs text-red-600 mt-2">
                        Please ensure your .env file contains a valid VITE_FMP_API_KEY
                      </p>
                    )}
                    {error.includes('rate limit') && (
                      <div className="text-xs text-red-600 mt-3 space-y-2 border-t border-red-200 pt-3">
                        <p className="font-semibold">Solutions:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Wait until midnight EST for the limit to reset</li>
                          <li>Upgrade to a paid FMP plan ($14.99/month for 750 calls/day)</li>
                          <li>Use manual input mode in the calculators (no API needed)</li>
                        </ul>
                        <p className="mt-2">
                          <a href="https://financialmodelingprep.com/developer/docs/pricing" 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-blue-600 hover:text-blue-700 underline">
                            View FMP pricing plans →
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Company Data Display - Minimal */}
          {(companyData || basicInfo) && (
            <div className="space-y-8">
              {/* Company Header - Minimal */}
              <div className="minimal-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {(companyData?.symbol || basicInfo?.symbol || '').substring(0, 2)}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-gray-800">
                        {companyData?.name || basicInfo?.name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {companyData?.symbol || basicInfo?.symbol}
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

              {/* Loading indicator for financial data */}
              {loadingFinancials && (
                <div className="minimal-card">
                  <div className="text-center py-6">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-sm text-gray-600">Loading detailed financial data...</p>
                  </div>
                </div>
              )}

              {/* Financial Metrics - Minimal Grid - Only show when full financial data is loaded */}
              {companyData && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                {/* Income Statement Card */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center mb-4">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    <h3 className="text-sm font-medium text-gray-600">Income</h3>
                  </div>
                  {financialData.latestIncomeStatement && (
                    <div className="space-y-3">
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
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center mb-4">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <h3 className="text-sm font-medium text-gray-600">Balance</h3>
                  </div>
                  {financialData.latestBalanceSheet && (
                    <div className="space-y-3">
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
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center mb-4">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                    <h3 className="text-sm font-medium text-gray-600">Cash Flow</h3>
                  </div>
                  {financialData.latestCashFlowStatement && (
                    <div className="space-y-3">
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

              {/* Competitive MOAT Analysis - Only show when full financial data is loaded */}
              {companyData && (
                <MoatAnalysis 
                  analysis={calculateMoatFromFinancials(companyData)}
                  companySymbol={companyData.symbol}
                  className="mt-8"
                />
              )}

              {/* Financial History Table - Only show when full financial data is loaded */}
              {companyData && (
                <FinancialHistoryTable
                  incomeStatements={financialData.sortedIncomeStatements}
                  balanceSheets={financialData.sortedBalanceSheets}
                  cashFlowStatements={financialData.sortedCashFlowStatements}
                  highlightedMetrics={highlightedMetrics}
                  hasDividends={financialData.hasDividends}
                />
              )}
            </div>
          )}

          {/* Calculator Section with Tabs - Show when we have basic info or full data */}
          {(companyData || basicInfo) && (
            <div className="space-y-6">
              {/* Recommendation Banner - Only show when full financial data is loaded */}
              {companyData && (
                <RecommendationBanner
                  companyData={companyData}
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
              
              {/* Calculator Tabs */}
              <CalculatorTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                completedCalculators={completedCalculators}
                results={calculatorResults}
                companyData={companyData ? {
                  balanceSheet: companyData.balanceSheet,
                  incomeStatement: companyData.incomeStatement,
                  cashFlowStatement: companyData.cashFlowStatement
                } : undefined}
              />

              {/* Calculator Content */}
              <div className="minimal-card">
                {activeTab === 'DCF' && (
                  (companyData && loadedStatements.cashFlow && loadedStatements.income) ? (
                    <DCFCalculator 
                      symbol={companyData.symbol}
                      currentPrice={getCurrentPrice()}
                      defaultBaseFCF={financialData.latestFCF}
                      defaultSharesOutstanding={financialData.latestShares}
                      historicalFCF={financialData.historicalFCF}
                      historicalShares={financialData.historicalShares}
                      onCalculationComplete={(result) => handleCalculatorComplete('DCF', result)}
                    />
                  ) : (
                    <div className="text-center py-12">
                      {loadingFinancials ? (
                        <div>
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                          <h3 className="text-lg font-semibold mb-2">Loading Financial Data</h3>
                          <p className="text-sm text-gray-600">Fetching detailed financial data for DCF analysis...</p>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Click to Load DCF Calculator</h3>
                          <p className="text-sm text-gray-600 mb-4">DCF needs cash flow and income statements</p>
                          <button
                            onClick={() => loadSpecificStatements('DCF')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Load DCF Data (2 API calls)
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}

                {activeTab === 'DDM' && (
                  (companyData && loadedStatements.cashFlow && loadedStatements.income) ? (
                    <DDMCalculator
                      symbol={companyData.symbol}
                      currentPrice={getCurrentPrice()}
                      defaultDividend={financialData.latestDividend}
                      defaultSharesOutstanding={financialData.latestShares}
                      historicalDividends={companyData.cashFlowStatement
                        .slice(0, 5)
                        .map(cf => ({
                          year: formatYear(cf.date),
                          value: Math.abs(cf.dividendsPaid || 0) / (companyData.incomeStatement.find(
                            is => is.date === cf.date
                          )?.sharesOutstanding || 1)
                        }))
                        .filter(d => d.value > 0)
                        .sort((a, b) => parseInt(b.year) - parseInt(a.year))}
                      historicalShares={financialData.historicalShares}
                      onCalculationComplete={(result) => handleCalculatorComplete('DDM', result)}
                    />
                  ) : (
                    <div className="text-center py-12">
                      {loadingFinancials ? (
                        <div>
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                          <h3 className="text-lg font-semibold mb-2">Loading Financial Data</h3>
                          <p className="text-sm text-gray-600">Fetching detailed financial data for DDM analysis...</p>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Click to Load DDM Calculator</h3>
                          <p className="text-sm text-gray-600 mb-4">DDM needs cash flow and income statements</p>
                          <button
                            onClick={() => loadSpecificStatements('DDM')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Load DDM Data (2 API calls)
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}

                {activeTab === 'RELATIVE' && companyData && (
                  <RelativeValuationCalculator
                    symbol={companyData.symbol}
                    currentPrice={getCurrentPrice()}
                    defaultCompanyData={{
                      symbol: companyData.symbol,
                      name: companyData.name,
                      marketCap: (getCurrentPrice() || 0) * financialData.latestShares,
                      enterpriseValue: (getCurrentPrice() || 0) * financialData.latestShares, // Simplified: assuming no net debt
                      revenue: financialData.latestIncomeStatement?.revenue || 0,
                      ebitda: (financialData.latestIncomeStatement?.revenue || 0) * 0.2, // Estimate EBITDA as 20% of revenue
                      netIncome: financialData.latestNetIncome,
                      bookValue: financialData.latestTotalEquity,
                      sharesOutstanding: financialData.latestShares,
                      debt: 0, // totalDebt not available in current schema
                      cash: 0 // cash not available in current schema
                    }}
                    onCalculationComplete={(result) => handleCalculatorComplete('RELATIVE', result)}
                  />
                )}

                {activeTab === 'NAV' && (
                  (companyData && loadedStatements.balance) ? (
                    <NAVCalculator
                      symbol={companyData.symbol}
                      currentPrice={getCurrentPrice()}
                      balanceSheet={financialData.latestBalanceSheet || undefined}
                      sharesOutstanding={companyData.sharesOutstanding}
                      onCalculationComplete={(result) => handleCalculatorComplete('NAV', result)}
                    />
                  ) : (
                    <div className="text-center py-12">
                      {loadingFinancials ? (
                        <div>
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                          <h3 className="text-lg font-semibold mb-2">Loading Financial Data</h3>
                          <p className="text-sm text-gray-600">Fetching detailed financial data for NAV analysis...</p>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Click to Load NAV Calculator</h3>
                          <p className="text-sm text-gray-600 mb-4">NAV only needs balance sheet data</p>
                          <button
                            onClick={() => loadSpecificStatements('NAV')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Load NAV Data (1 API call)
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}

                {activeTab === 'EPV' && (
                  (companyData && loadedStatements.income) ? (
                    <EPVCalculator
                      symbol={companyData.symbol}
                      currentPrice={getCurrentPrice()}
                      defaultNormalizedEarnings={financialData.latestNetIncome}
                      defaultSharesOutstanding={financialData.latestShares}
                      historicalEarnings={companyData.incomeStatement
                        .slice(0, 10)
                        .map(is => ({
                          year: parseInt(is.date.split('-')[0]),
                          netIncome: is.netIncome,
                          operatingIncome: is.operatingIncome,
                          revenue: is.revenue,
                          date: is.date
                        }))
                        .sort((a, b) => b.year - a.year)}
                      onCalculationComplete={(result) => handleCalculatorComplete('EPV', result)}
                    />
                  ) : (
                    <div className="text-center py-12">
                      {loadingFinancials ? (
                        <div>
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                          <h3 className="text-lg font-semibold mb-2">Loading Financial Data</h3>
                          <p className="text-sm text-gray-600">Fetching detailed financial data for EPV analysis...</p>
                        </div>
                      ) : (
                        <div>
                          <h3 className="text-lg font-semibold mb-2">Click to Load EPV Calculator</h3>
                          <p className="text-sm text-gray-600 mb-4">EPV only needs income statement data</p>
                          <button
                            onClick={() => loadSpecificStatements('EPV')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Load EPV Data (1 API call)
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}

                {activeTab === 'SUMMARY' && (
                  <CalculatorSummary
                    symbol={(companyData?.symbol || basicInfo?.symbol || '')}
                    companyName={(companyData?.name || basicInfo?.name || '')}
                    currentPrice={getCurrentPrice()}
                    results={Object.entries(calculatorResults).map(([model, metadata]) => ({
                      model: model as CalculatorModel,
                      intrinsicValue: metadata.value,
                      currentPrice: getCurrentPrice(),
                      confidence: metadata.confidence,
                      timestamp: metadata.timestamp,
                      fromCache: metadata.fromCache,
                      cacheAge: metadata.cacheAge
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