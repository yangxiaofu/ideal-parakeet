/**
 * Custom hook for company search functionality
 * Extracts search logic from Dashboard following SoC principles
 */

import { useState } from 'react';
import { fmpApi, type CompanyBasicInfo } from '../services/fmpApi';
import { getMockCompanyData, isDemo } from '../utils/mockData';
import { PeerDataCache } from '../utils/peerDataCache';
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
}

export function useCompanySearch(): UseCompanySearchResult {
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [basicInfo, setBasicInfo] = useState<CompanyBasicInfo | null>(null);
  const [companyData, setCompanyData] = useState<CompanyFinancials | null>(null);
  const [loadedStatements, setLoadedStatements] = useState<{
    income: boolean;
    balance: boolean;
    cashFlow: boolean;
  }>({ income: false, balance: false, cashFlow: false });

  const clearSearch = () => {
    setTicker('');
    setError(null);
    setBasicInfo(null);
    setCompanyData(null);
    setLoadedStatements({ income: false, balance: false, cashFlow: false });
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
      
      // Check cache first
      const tickerUpper = ticker.trim().toUpperCase();
      console.log(`Checking cache for ticker: ${tickerUpper}`);
      const cachedData = PeerDataCache.getCachedCompanyData(tickerUpper);
      
      if (cachedData) {
        console.log('Found cached data for ticker:', tickerUpper);
        setCompanyData(cachedData);
        setLoadedStatements({ income: true, balance: true, cashFlow: true });
        setLoading(false);
        return;
      }

      // Search for company
      console.log('Searching for company with FMP API...');
      const searchResults = await fmpApi.searchCompany(tickerUpper);
      console.log('Search results:', searchResults);
      
      if (!searchResults || searchResults.length === 0) {
        throw new Error(`No company found for ticker: ${tickerUpper}`);
      }

      // Use the first result (exact match should be first)
      const company = searchResults[0];
      console.log('Selected company:', company);

      // Get company profile for current price and shares outstanding
      console.log('Getting company profile...');
      const profile = await fmpApi.getCompanyProfile(company.symbol);
      console.log('Profile data:', profile);
      
      if (!profile) {
        throw new Error(`No profile data found for ${company.symbol}`);
      }
      const companyBasicInfo: CompanyBasicInfo = {
        symbol: profile.symbol,
        name: profile.name,
        currentPrice: profile.price || 0,
        sharesOutstanding: profile.sharesOutstanding || 0
      };

      setBasicInfo(companyBasicInfo);
      console.log('Basic info set, starting financial data fetch...');
      
      // Load financial data in the background
      try {
        const [incomeStatements, balanceSheets, cashFlowStatements] = await Promise.all([
          fmpApi.getIncomeStatement(profile.symbol, 10),
          fmpApi.getBalanceSheet(profile.symbol, 10), 
          fmpApi.getCashFlowStatement(profile.symbol, 10)
        ]);

        const financialData: CompanyFinancials = {
          symbol: profile.symbol,
          name: profile.name,
          currentPrice: profile.price || 0,
          sharesOutstanding: companyBasicInfo.sharesOutstanding,
          incomeStatement: incomeStatements || [],
          balanceSheet: balanceSheets || [],
          cashFlowStatement: cashFlowStatements || []
        };

        setCompanyData(financialData);
        setLoadedStatements({ income: true, balance: true, cashFlow: true });
        
        // Cache the data
        PeerDataCache.setCachedCompanyData(profile.symbol, financialData);
        
        console.log('Financial data loaded and cached successfully');
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
  };
}