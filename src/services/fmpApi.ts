import type { CompanyFinancials, IncomeStatement, BalanceSheet, CashFlowStatement } from '../types';

// Basic company info for minimal initial load
export interface CompanyBasicInfo {
  symbol: string;
  name: string;
  currentPrice: number;
  sharesOutstanding: number;
}

// FMP API response types
interface FMPSearchResult {
  symbol: string;
  name: string;
}

interface FMPCompanyProfile {
  symbol: string;
  companyName: string;
  price: number;
  mktCap: number;
  sharesOutstanding: number;
}

interface FMPIncomeStatement {
  date: string;
  revenue: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  weightedAverageShsOut: number;
  
  // Enhanced fields from FMP API
  grossProfit?: number;
  grossProfitRatio?: number;
  sellingGeneralAndAdministrativeExpenses?: number;
  researchAndDevelopmentExpenses?: number;
  operatingExpenses?: number;
  ebitda?: number;
  ebitdaratio?: number;
  interestExpense?: number;
  incomeTaxExpense?: number;
  incomeBeforeTax?: number;
}

interface FMPBalanceSheet {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  totalStockholdersEquity: number;
  commonStock: number;
  
  // Enhanced asset fields from FMP API for NAV analysis
  totalCurrentAssets?: number;
  cashAndCashEquivalents?: number;
  shortTermInvestments?: number;
  cashAndShortTermInvestments?: number;
  netReceivables?: number;
  inventory?: number;
  otherCurrentAssets?: number;
  
  totalNonCurrentAssets?: number;
  propertyPlantEquipmentNet?: number;
  goodwill?: number;
  intangibleAssets?: number;
  goodwillAndIntangibleAssets?: number;
  longTermInvestments?: number;
  otherNonCurrentAssets?: number;
  
  // Enhanced liability fields from FMP API
  totalCurrentLiabilities?: number;
  accountPayables?: number;
  shortTermDebt?: number;
  taxPayables?: number;
  deferredRevenue?: number;
  otherCurrentLiabilities?: number;
  
  totalNonCurrentLiabilities?: number;
  longTermDebt?: number;
  deferredRevenueNonCurrent?: number;
  deferredTaxLiabilitiesNonCurrent?: number;
  otherNonCurrentLiabilities?: number;
  
  // Additional computed fields
  totalDebt?: number;
  netDebt?: number;
  retainedEarnings?: number;
}

interface FMPCashFlow {
  date: string;
  netCashProvidedByOperatingActivities: number;
  capitalExpenditure: number;
  freeCashFlow: number;
  dividendsPaid: number;
}

interface FMPDividendHistory {
  historical: Array<{
    date: string;
    dividend: number;
  }>;
}

const API_KEY = import.meta.env.VITE_FMP_API_KEY;
const API_URL = import.meta.env.VITE_FMP_API_URL;

// Log API configuration status
if (!API_KEY) {
  console.error('FMP API key is not configured. Please add VITE_FMP_API_KEY to your .env file');
}

if (!API_URL) {
  console.error('FMP API URL is not configured. Please add VITE_FMP_API_URL to your .env file');
}

class FMPApiError extends Error {
  public status?: number;
  
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'FMPApiError';
    this.status = status;
  }
}

class FMPApiService {
  private async fetchWithErrorHandling(url: string): Promise<unknown> {
    // Check for API key before making request
    if (!API_KEY) {
      throw new FMPApiError('API key is missing. Please configure VITE_FMP_API_KEY in your .env file');
    }
    
    if (!API_URL) {
      throw new FMPApiError('API URL is missing. Please configure VITE_FMP_API_URL in your .env file');
    }
    
    try {
      console.log('FMP API Request:', url.replace(API_KEY, '[API_KEY]'));
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('FMP API Error Response:', response.status, errorText);
        
        // Provide more specific error messages based on status code
        if (response.status === 401) {
          throw new FMPApiError('Invalid API key. Please check your FMP API key configuration.', response.status);
        } else if (response.status === 404) {
          throw new FMPApiError('Symbol not found. Please check the ticker symbol and try again.', response.status);
        } else if (response.status === 429) {
          throw new FMPApiError('API rate limit exceeded. Please try again later.', response.status);
        } else {
          throw new FMPApiError(
            `API request failed: ${response.statusText} (${response.status})`,
            response.status
          );
        }
      }
      
      const data = await response.json();
      console.log('FMP API Response received successfully');
      
      // Check for empty array response (symbol not found)
      if (Array.isArray(data) && data.length === 0) {
        throw new FMPApiError('No data found for this symbol. Please check the ticker and try again.');
      }
      
      if (data.error) {
        throw new FMPApiError(data.error);
      }
      
      // Check if API returned an error message in different format
      if (typeof data === 'object' && data['Error Message']) {
        throw new FMPApiError(data['Error Message']);
      }
      
      return data;
    } catch (error) {
      if (error instanceof FMPApiError) {
        throw error;
      }
      console.error('FMP API Network Error:', error);
      throw new FMPApiError('Network error. Please check your internet connection and try again.');
    }
  }

  async searchCompany(query: string): Promise<Array<{ symbol: string; name: string }>> {
    const url = `${API_URL}/search?query=${encodeURIComponent(query)}&limit=10&apikey=${API_KEY}`;
    const data = await this.fetchWithErrorHandling(url) as FMPSearchResult[];
    
    return data.map((item) => ({
      symbol: item.symbol,
      name: item.name
    }));
  }

  async getCompanyProfile(symbol: string): Promise<{ symbol: string; name: string; price: number; sharesOutstanding: number }> {
    const url = `${API_URL}/profile/${symbol}?apikey=${API_KEY}`;
    const data = await this.fetchWithErrorHandling(url) as FMPCompanyProfile[];
    
    if (!data || data.length === 0) {
      throw new FMPApiError(`Company profile not found for symbol: ${symbol}. Please check the ticker symbol and try again.`);
    }
    
    const profile = data[0];
    
    // Validate that we have the required data
    if (!profile.symbol || !profile.companyName) {
      throw new FMPApiError(`Invalid company data received for symbol: ${symbol}`);
    }
    
    return {
      symbol: profile.symbol,
      name: profile.companyName,
      price: profile.price || 0,
      sharesOutstanding: profile.sharesOutstanding || (profile.mktCap && profile.price ? profile.mktCap / profile.price : 0)
    };
  }

  async getIncomeStatement(symbol: string, years: number = 10): Promise<IncomeStatement[]> {
    const url = `${API_URL}/income-statement/${symbol}?limit=${years}&apikey=${API_KEY}`;
    const data = await this.fetchWithErrorHandling(url) as FMPIncomeStatement[];
    
    return data.map((item) => ({
      date: item.date,
      revenue: item.revenue || 0,
      operatingIncome: item.operatingIncome || 0,
      netIncome: item.netIncome || 0,
      eps: item.eps || 0,
      sharesOutstanding: item.weightedAverageShsOut || 0,
      
      // Enhanced fields for MOAT analysis
      grossProfit: item.grossProfit,
      grossMargin: item.grossProfitRatio,
      sellingGeneralAndAdministrative: item.sellingGeneralAndAdministrativeExpenses,
      researchAndDevelopment: item.researchAndDevelopmentExpenses,
      operatingExpenses: item.operatingExpenses,
      ebitda: item.ebitda,
      ebit: item.operatingIncome, // EBIT is typically operating income
      interestExpense: item.interestExpense,
      incomeTaxExpense: item.incomeTaxExpense,
      effectiveTaxRate: item.incomeBeforeTax && item.incomeTaxExpense 
        ? item.incomeTaxExpense / item.incomeBeforeTax 
        : undefined
    }));
  }

  async getBalanceSheet(symbol: string, years: number = 10): Promise<BalanceSheet[]> {
    const url = `${API_URL}/balance-sheet-statement/${symbol}?limit=${years}&apikey=${API_KEY}`;
    const data = await this.fetchWithErrorHandling(url) as FMPBalanceSheet[];
    
    return data.map((item) => {
      // Calculate derived values
      const totalEquity = item.totalStockholdersEquity || 0;
      const totalAssets = item.totalAssets || 0;
      const totalLiabilities = item.totalLiabilities || 0;
      // Note: Shares outstanding not available in balance sheet API, will be provided from company profile
      const sharesOutstanding = item.commonStock || 1; // This is just for bookValuePerShare calculation
      
      // Enhanced asset calculations
      const cash = item.cashAndCashEquivalents || 0;
      const cashAndEquivalents = item.cashAndShortTermInvestments || cash;
      const goodwill = item.goodwill || 0;
      const intangibleAssets = item.intangibleAssets || 0;
      const tangibleBookValue = totalEquity - goodwill - intangibleAssets;
      const workingCapital = (item.totalCurrentAssets || 0) - (item.totalCurrentLiabilities || 0);
      const netTangibleAssets = totalAssets - goodwill - intangibleAssets - totalLiabilities;
      
      return {
        date: item.date,
        totalAssets,
        totalLiabilities,
        totalEquity,
        bookValuePerShare: totalEquity / sharesOutstanding,
        
        // Enhanced asset breakdown for NAV analysis
        currentAssets: item.totalCurrentAssets,
        cash: item.cashAndCashEquivalents,
        cashAndEquivalents,
        marketableSecurities: item.shortTermInvestments,
        accountsReceivable: item.netReceivables,
        inventory: item.inventory,
        prepaidExpenses: undefined, // Not available in FMP standard fields
        otherCurrentAssets: item.otherCurrentAssets,
        
        // Non-current assets
        propertyPlantEquipment: item.propertyPlantEquipmentNet,
        intangibleAssets,
        goodwill,
        investments: item.longTermInvestments,
        otherNonCurrentAssets: item.otherNonCurrentAssets,
        
        // Enhanced liability breakdown for NAV analysis
        currentLiabilities: item.totalCurrentLiabilities,
        accountsPayable: item.accountPayables,
        accruedExpenses: undefined, // Not directly available in FMP
        shortTermDebt: item.shortTermDebt,
        otherCurrentLiabilities: item.otherCurrentLiabilities,
        deferredRevenue: item.deferredRevenue,
        
        // Non-current liabilities
        longTermDebt: item.longTermDebt,
        pensionObligations: undefined, // Would need to be parsed from other fields
        deferredTaxLiabilities: item.deferredTaxLiabilitiesNonCurrent,
        otherNonCurrentLiabilities: item.otherNonCurrentLiabilities,
        deferredRevenueNonCurrent: item.deferredRevenueNonCurrent,
        
        // Additional computed fields for comprehensive analysis
        tangibleBookValue,
        workingCapital,
        netTangibleAssets,
        sharesOutstanding,
        
        // ROIC calculation fields
        investedCapital: totalAssets - cash - (item.totalCurrentLiabilities || 0) + (item.shortTermDebt || 0),
        returnOnAssets: item.netIncome ? item.netIncome / totalAssets : undefined,
        returnOnEquity: item.netIncome ? item.netIncome / totalEquity : undefined
      };
    });
  }

  async getCashFlowStatement(symbol: string, years: number = 10): Promise<CashFlowStatement[]> {
    const url = `${API_URL}/cash-flow-statement/${symbol}?limit=${years}&apikey=${API_KEY}`;
    const data = await this.fetchWithErrorHandling(url) as FMPCashFlow[];
    
    return data.map((item) => ({
      date: item.date,
      operatingCashFlow: item.netCashProvidedByOperatingActivities || 0,
      capitalExpenditure: Math.abs(item.capitalExpenditure || 0),
      freeCashFlow: item.freeCashFlow || 0,
      dividendsPaid: Math.abs(item.dividendsPaid || 0)
    }));
  }

  async getCompanyFinancials(symbol: string): Promise<CompanyFinancials> {
    try {
      const [profile, incomeStatement, balanceSheet, cashFlowStatement] = await Promise.all([
        this.getCompanyProfile(symbol),
        this.getIncomeStatement(symbol),
        this.getBalanceSheet(symbol),
        this.getCashFlowStatement(symbol)
      ]);

      return {
        symbol: profile.symbol,
        name: profile.name,
        currentPrice: profile.price,
        sharesOutstanding: profile.sharesOutstanding,
        incomeStatement: incomeStatement.reverse(), // Most recent first
        balanceSheet: balanceSheet.reverse(),
        cashFlowStatement: cashFlowStatement.reverse()
      };
    } catch (error) {
      if (error instanceof FMPApiError) {
        throw error;
      }
      throw new FMPApiError('Failed to fetch company financials');
    }
  }

  async getCompanyBasicInfo(symbol: string): Promise<CompanyBasicInfo> {
    try {
      const profile = await this.getCompanyProfile(symbol);
      
      return {
        symbol: profile.symbol,
        name: profile.name,
        currentPrice: profile.price,
        sharesOutstanding: profile.sharesOutstanding
      };
    } catch (error) {
      if (error instanceof FMPApiError) {
        throw error;
      }
      throw new FMPApiError('Failed to fetch company basic info');
    }
  }

  async getFinancialStatementsOnly(symbol: string): Promise<{
    incomeStatement: IncomeStatement[];
    balanceSheet: BalanceSheet[];
    cashFlowStatement: CashFlowStatement[];
  }> {
    try {
      const [incomeStatement, balanceSheet, cashFlowStatement] = await Promise.all([
        this.getIncomeStatement(symbol),
        this.getBalanceSheet(symbol),
        this.getCashFlowStatement(symbol)
      ]);

      return {
        incomeStatement: incomeStatement.reverse(), // Most recent first
        balanceSheet: balanceSheet.reverse(),
        cashFlowStatement: cashFlowStatement.reverse()
      };
    } catch (error) {
      if (error instanceof FMPApiError) {
        throw error;
      }
      throw new FMPApiError('Failed to fetch financial statements');
    }
  }

  // Methods for loading individual financial statements
  async getIncomeStatementProcessed(symbol: string): Promise<IncomeStatement[]> {
    try {
      const incomeStatement = await this.getIncomeStatement(symbol);
      return incomeStatement.reverse(); // Most recent first
    } catch (error) {
      if (error instanceof FMPApiError) {
        throw error;
      }
      throw new FMPApiError('Failed to fetch income statement');
    }
  }

  async getBalanceSheetProcessed(symbol: string): Promise<BalanceSheet[]> {
    try {
      const balanceSheet = await this.getBalanceSheet(symbol);
      return balanceSheet.reverse(); // Most recent first
    } catch (error) {
      if (error instanceof FMPApiError) {
        throw error;
      }
      throw new FMPApiError('Failed to fetch balance sheet');
    }
  }

  async getCashFlowStatementProcessed(symbol: string): Promise<CashFlowStatement[]> {
    try {
      const cashFlowStatement = await this.getCashFlowStatement(symbol);
      return cashFlowStatement.reverse(); // Most recent first
    } catch (error) {
      if (error instanceof FMPApiError) {
        throw error;
      }
      throw new FMPApiError('Failed to fetch cash flow statement');
    }
  }

  async getDividendHistory(symbol: string): Promise<Array<{ date: string; dividend: number }>> {
    const url = `${API_URL}/historical-price-full/stock_dividend/${symbol}?apikey=${API_KEY}`;
    const data = await this.fetchWithErrorHandling(url) as FMPDividendHistory;
    
    if (!data.historical) {
      return [];
    }
    
    return data.historical.map((item) => ({
      date: item.date,
      dividend: item.dividend || 0
    }));
  }
}

export const fmpApi = new FMPApiService();
export { FMPApiError };