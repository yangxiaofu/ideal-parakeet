import { vi } from 'vitest';
import { fmpApi, FMPApiError } from './fmpApi';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test will use actual environment variables from .env file

describe('FMP API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchCompany', () => {
    it('should return search results', async () => {
      const mockResponse = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'MSFT', name: 'Microsoft Corporation' }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await fmpApi.searchCompany('apple');

      expect(result).toEqual([
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'MSFT', name: 'Microsoft Corporation' }
      ]);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('search?query=apple&limit=10&apikey=')
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(fmpApi.searchCompany('test')).rejects.toThrow(
        new FMPApiError('API request failed: Unauthorized', 401)
      );
    });
  });

  describe('getCompanyProfile', () => {
    it('should return company profile', async () => {
      const mockResponse = [{
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        price: 202.38
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await fmpApi.getCompanyProfile('AAPL');

      expect(result).toEqual({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 202.38
      });
    });

    it('should throw error when company not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      await expect(fmpApi.getCompanyProfile('INVALID')).rejects.toThrow(
        new FMPApiError('Company not found')
      );
    });
  });

  describe('getIncomeStatement', () => {
    it('should return formatted income statement data', async () => {
      const mockResponse = [{
        date: '2023-09-30',
        revenue: 383285000000,
        operatingIncome: 114301000000,
        netIncome: 96995000000,
        eps: 6.16,
        weightedAverageShsOut: 15744231000
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await fmpApi.getIncomeStatement('AAPL');

      expect(result).toEqual([{
        date: '2023-09-30',
        revenue: 383285000000,
        operatingIncome: 114301000000,
        netIncome: 96995000000,
        eps: 6.16,
        sharesOutstanding: 15744231000
      }]);
    });
  });

  describe('getCompanyFinancials', () => {
    it('should return complete financial data', async () => {
      // Mock multiple API calls
      const profileResponse = [{
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        price: 202.38
      }];

      const incomeResponse = [{
        date: '2023-09-30',
        revenue: 383285000000,
        operatingIncome: 114301000000,
        netIncome: 96995000000,
        eps: 6.16,
        weightedAverageShsOut: 15744231000
      }];

      const balanceResponse = [{
        date: '2023-09-30',
        totalAssets: 352755000000,
        totalLiabilities: 290437000000,
        totalStockholdersEquity: 62318000000,
        commonStock: 1000000000
      }];

      const cashFlowResponse = [{
        date: '2023-09-30',
        netCashProvidedByOperatingActivities: 110543000000,
        capitalExpenditure: 10959000000,
        freeCashFlow: 99584000000,
        dividendsPaid: 15025000000
      }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(profileResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(incomeResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(balanceResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(cashFlowResponse)
        });

      const result = await fmpApi.getCompanyFinancials('AAPL');

      expect(result.symbol).toBe('AAPL');
      expect(result.name).toBe('Apple Inc.');
      expect(result.incomeStatement).toHaveLength(1);
      expect(result.balanceSheet).toHaveLength(1);
      expect(result.cashFlowStatement).toHaveLength(1);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fmpApi.searchCompany('test')).rejects.toThrow(
        new FMPApiError('Network error or invalid response')
      );
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ error: 'Invalid API key' })
      });

      await expect(fmpApi.searchCompany('test')).rejects.toThrow(
        new FMPApiError('Invalid API key')
      );
    });
  });
});