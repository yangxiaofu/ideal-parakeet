/**
 * Custom hook for company search functionality
 * Extracts search logic from Dashboard following SoC principles
 */

import { useState } from 'react';
import { type CompanyBasicInfo } from '../services/fmpApi';
import { getMockCompanyData, isDemo } from '../utils/mockData';
import { PeerDataCache } from '../utils/peerDataCache';
import { FinancialDataCacheService } from '../services/FinancialDataCache';
import { useAuth } from '../contexts/AuthContext';
import type { CompanyFinancials } from '../types';

interface UseCompanySearchResult {
  ticker: string;
  setTicker: (ticker: string) => void;
  loading: boolean;
  error: string | null;
  basicInfo: CompanyBasicInfo | null;
  companyData: CompanyFinancials | null;
  loadedStatements: {
    income: boolean;
    balance: boolean;
    cashFlow: boolean;
  };
  handleSearch: (e: React.FormEvent) => Promise<void>;
  clearSearch: () => void;
  /** Whether the data came from cache */
  fromCache: boolean;
  /** Force refresh cached data */
  refreshData: () => Promise<void>;
}

export function useCompanySearch(): UseCompanySearchResult {
  const { user } = useAuth();
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [basicInfo, setBasicInfo] = useState<CompanyBasicInfo | null>(null);
  const [companyData, setCompanyData] = useState<CompanyFinancials | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loadedStatements, setLoadedStatements] = useState<{
    income: boolean;
    balance: boolean;
    cashFlow: boolean;
  }>({ income: false, balance: false, cashFlow: false });

  const cacheService = FinancialDataCacheService.getInstance();

  const clearSearch = () => {
    setTicker('');
    setError(null);
    setBasicInfo(null);
    setCompanyData(null);
    setFromCache(false);
    setLoadedStatements({ income: false, balance: false, cashFlow: false });
  };

  const refreshData = async () => {
    if (!user?.uid || !ticker.trim()) return;
    
    try {
      setLoading(true);
      const refreshedData = await cacheService.getCompanyData(user.uid, ticker.trim().toUpperCase(), {
        forceRefresh: true,
      });
      setCompanyData(refreshedData);
      setFromCache(false);
      setLoadedStatements({ income: true, balance: true, cashFlow: true });
    } catch (err) {
      console.error('Failed to refresh company data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== useCompanySearch: handleSearch called ===');
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
          setLoading(false);
          console.log('Demo mode complete - returning');
          return;
        } catch (demoError) {
          console.error('Error in demo mode:', demoError);
          setError('Failed to load demo data. Please check console for details.');
          setLoading(false);
          return;
        }
      }
      
      // Use smart financial data caching
      const tickerUpper = ticker.trim().toUpperCase();
      console.log(`Loading financial data with smart caching for: ${tickerUpper}`);
      
      if (!user?.uid) {
        throw new Error('User authentication required for financial data');
      }

      try {
        // Get company data using smart cache (automatically handles cache/API logic)
        const financialData = await cacheService.getCompanyData(user.uid, tickerUpper);
        const wasCached = await cacheService.isCached(user.uid, tickerUpper);

        // Set basic info from financial data
        const companyBasicInfo: CompanyBasicInfo = {
          symbol: financialData.symbol,
          name: financialData.name,
          currentPrice: financialData.currentPrice || 0,
          sharesOutstanding: financialData.sharesOutstanding || 0
        };

        setBasicInfo(companyBasicInfo);
        setCompanyData(financialData);
        setFromCache(wasCached);
        setLoadedStatements({ income: true, balance: true, cashFlow: true });
        
        // Also cache in PeerDataCache for backwards compatibility
        PeerDataCache.setCachedCompanyData(tickerUpper, financialData);
        
        console.log('Financial data loaded successfully:', {
          symbol: tickerUpper,
          fromCache: wasCached,
          hasIncomeData: financialData.incomeStatement.length > 0,
          hasBalanceData: financialData.balanceSheet.length > 0,
          hasCashFlowData: financialData.cashFlowStatement.length > 0,
        });
      } catch (financialError) {
        console.error('Failed to load financial data:', financialError);
        setError(`Found company but failed to load financial data: ${financialError instanceof Error ? financialError.message : 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('Search failed:', error);
      setError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    ticker,
    setTicker,
    loading,
    error,
    basicInfo,
    companyData,
    loadedStatements,
    handleSearch,
    clearSearch,
    fromCache,
    refreshData,
  };
}