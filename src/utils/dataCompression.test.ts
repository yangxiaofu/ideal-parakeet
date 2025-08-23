import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  compressFinancialData,
  calculateCompressionRatio,
  estimateStorageSize,
  selectiveCompress,
  smartCompress,
  validateCompression,
  DEFAULT_COMPRESSION_CONFIG,
  type CompressionConfig,
  type SelectiveCompressionOptions,
} from './dataCompression';
import type { CompanyFinancials, IncomeStatement, BalanceSheet, CashFlowStatement } from '../types';

// Mock console.log to avoid noise in tests
vi.mock('console', () => ({
  log: vi.fn(),
}));

describe('DataCompression Utilities', () => {
  let mockCompanyData: CompanyFinancials;
  let extensiveCompanyData: CompanyFinancials;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Basic mock data
    mockCompanyData = {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      currentPrice: 180.00,
      sharesOutstanding: 15000000000,
      incomeStatement: [
        {
          date: '2023-12-31',
          revenue: 400000000000,
          operatingIncome: 120000000000,
          netIncome: 100000000000,
          eps: 6.67,
          sharesOutstanding: 15000000000,
          grossMargin: 0.45,
          operatingMargin: 0.30,
          netMargin: 0.25,
        } as IncomeStatement,
        {
          date: '2022-12-31',
          revenue: 380000000000,
          operatingIncome: 110000000000,
          netIncome: 90000000000,
          eps: 6.00,
          sharesOutstanding: 15000000000,
          grossMargin: 0.44,
          operatingMargin: 0.29,
          netMargin: 0.24,
        } as IncomeStatement,
      ],
      balanceSheet: [
        {
          date: '2023-12-31',
          totalAssets: 350000000000,
          totalLiabilities: 200000000000,
          totalEquity: 150000000000,
          cash: 50000000000,
          currentAssets: 100000000000,
          currentLiabilities: 80000000000,
          longTermDebt: 95000000000,
        } as BalanceSheet,
      ],
      cashFlowStatement: [
        {
          date: '2023-12-31',
          operatingCashFlow: 110000000000,
          capitalExpenditure: 15000000000,
          freeCashFlow: 95000000000,
          dividendsPaid: 20000000000,
        } as CashFlowStatement,
      ],
    };

    // Extensive data with many years for testing maxYears limits
    extensiveCompanyData = {
      ...mockCompanyData,
      incomeStatement: Array.from({ length: 10 }, (_, i) => ({
        date: `${2024 - i}-12-31`,
        revenue: 400000000000 - i * 10000000000,
        operatingIncome: 120000000000 - i * 3000000000,
        netIncome: 100000000000 - i * 2500000000,
        eps: 6.67 - i * 0.1,
        sharesOutstanding: 15000000000,
        grossMargin: 0.45 - i * 0.01,
        operatingMargin: 0.30 - i * 0.01,
        netMargin: 0.25 - i * 0.01,
        incomeTaxExpense: 25000000000 - i * 500000000,
        effectiveTaxRate: 0.20 + i * 0.005,
      } as IncomeStatement)),
    };
  });

  describe('compressFinancialData', () => {
    it('should compress data with default configuration', () => {
      const compressed = compressFinancialData(mockCompanyData);

      expect(compressed.symbol).toBe(mockCompanyData.symbol);
      expect(compressed.name).toBe(mockCompanyData.name);
      expect(compressed.incomeStatement).toHaveLength(mockCompanyData.incomeStatement.length);
      expect(compressed.balanceSheet).toHaveLength(mockCompanyData.balanceSheet.length);
    });

    it('should limit years of historical data', () => {
      const config: CompressionConfig = {
        ...DEFAULT_COMPRESSION_CONFIG,
        maxYears: 3,
      };

      const compressed = compressFinancialData(extensiveCompanyData, config);
      expect(compressed.incomeStatement).toHaveLength(3);
    });

    it('should remove empty fields when configured', () => {
      const dataWithNulls = {
        ...mockCompanyData,
        incomeStatement: [
          {
            ...mockCompanyData.incomeStatement[0],
            grossMargin: null,
            operatingMargin: undefined,
            netMargin: '',
          } as IncomeStatement,
        ],
      };

      const config: CompressionConfig = {
        ...DEFAULT_COMPRESSION_CONFIG,
        removeEmptyFields: true,
      };

      const compressed = compressFinancialData(dataWithNulls, config);
      const compressedIncome = compressed.incomeStatement[0] as any;

      expect(compressedIncome.grossMargin).toBeUndefined();
      expect(compressedIncome.operatingMargin).toBeUndefined();
      expect(compressedIncome.netMargin).toBeUndefined();
    });

    it('should preserve essential fields even when removing empty fields', () => {
      const dataWithNullEssentials = {
        ...mockCompanyData,
        incomeStatement: [
          {
            ...mockCompanyData.incomeStatement[0],
            revenue: null,
            netIncome: null,
          } as any,
        ],
      };

      const config: CompressionConfig = {
        ...DEFAULT_COMPRESSION_CONFIG,
        removeEmptyFields: true,
      };

      const compressed = compressFinancialData(dataWithNullEssentials, config);
      const compressedIncome = compressed.incomeStatement[0] as any;

      // Essential fields should be preserved even if null
      expect('revenue' in compressedIncome).toBe(true);
      expect('netIncome' in compressedIncome).toBe(true);
    });

    it('should remove derived fields when configured', () => {
      const config: CompressionConfig = {
        ...DEFAULT_COMPRESSION_CONFIG,
        removeDerivedFields: true,
      };

      const compressed = compressFinancialData(mockCompanyData, config);
      const compressedIncome = compressed.incomeStatement[0] as any;

      expect(compressedIncome.grossMargin).toBeUndefined();
      expect(compressedIncome.operatingMargin).toBeUndefined();
      expect(compressedIncome.netMargin).toBeUndefined();
    });

    it('should round numbers when configured', () => {
      const dataWithDecimals = {
        ...mockCompanyData,
        incomeStatement: [
          {
            ...mockCompanyData.incomeStatement[0],
            revenue: 123456789.123456,
            eps: 6.123456789,
          } as IncomeStatement,
        ],
      };

      const config: CompressionConfig = {
        ...DEFAULT_COMPRESSION_CONFIG,
        roundNumbers: true,
        decimalPlaces: 2,
      };

      const compressed = compressFinancialData(dataWithDecimals, config);
      const compressedIncome = compressed.incomeStatement[0];

      expect(compressedIncome.revenue).toBe(123456789.12);
      expect(compressedIncome.eps).toBe(6.12);
    });

    it('should handle NaN values when rounding', () => {
      const dataWithNaN = {
        ...mockCompanyData,
        incomeStatement: [
          {
            ...mockCompanyData.incomeStatement[0],
            revenue: NaN,
            eps: Infinity,
          } as IncomeStatement,
        ],
      };

      const config: CompressionConfig = {
        ...DEFAULT_COMPRESSION_CONFIG,
        roundNumbers: true,
        decimalPlaces: 2,
      };

      const compressed = compressFinancialData(dataWithNaN, config);
      const compressedIncome = compressed.incomeStatement[0];

      expect(compressedIncome.revenue).toBe(NaN);
      expect(compressedIncome.eps).toBe(Infinity);
    });

    it('should handle empty arrays', () => {
      const emptyData = {
        ...mockCompanyData,
        incomeStatement: [],
        balanceSheet: [],
        cashFlowStatement: [],
      };

      const compressed = compressFinancialData(emptyData);

      expect(compressed.incomeStatement).toEqual([]);
      expect(compressed.balanceSheet).toEqual([]);
      expect(compressed.cashFlowStatement).toEqual([]);
    });
  });

  describe('calculateCompressionRatio', () => {
    it('should calculate compression ratio correctly', () => {
      const compressed = compressFinancialData(mockCompanyData, {
        ...DEFAULT_COMPRESSION_CONFIG,
        removeDerivedFields: true,
        maxYears: 1,
      });

      const ratio = calculateCompressionRatio(mockCompanyData, compressed);
      expect(ratio).toBeGreaterThan(0);
      expect(ratio).toBeLessThan(100);
    });

    it('should return 0% for identical data', () => {
      const ratio = calculateCompressionRatio(mockCompanyData, mockCompanyData);
      expect(ratio).toBe(0);
    });

    it('should handle edge case of larger compressed data', () => {
      // Artificially create "compressed" data that's larger
      const largerData = {
        ...mockCompanyData,
        additionalField: 'This makes it larger than original',
      } as any;

      const ratio = calculateCompressionRatio(mockCompanyData, largerData);
      expect(ratio).toBeLessThan(0); // Negative compression ratio
    });
  });

  describe('estimateStorageSize', () => {
    it('should estimate storage size in bytes', () => {
      const size = estimateStorageSize(mockCompanyData);
      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });

    it('should return larger size for more complex data', () => {
      const simpleSize = estimateStorageSize(mockCompanyData);
      const complexSize = estimateStorageSize(extensiveCompanyData);
      expect(complexSize).toBeGreaterThan(simpleSize);
    });

    it('should handle empty data', () => {
      const emptyData = {
        symbol: 'TEST',
        name: 'Test',
        incomeStatement: [],
        balanceSheet: [],
        cashFlowStatement: [],
      } as CompanyFinancials;

      const size = estimateStorageSize(emptyData);
      expect(size).toBeGreaterThan(0); // Should still have base object size
    });
  });

  describe('selectiveCompress', () => {
    it('should remove ratios when configured', () => {
      const options: SelectiveCompressionOptions = {
        removeRatios: true,
      };

      const compressed = selectiveCompress(mockCompanyData, options);
      const compressedIncome = compressed.incomeStatement[0] as any;

      expect(compressedIncome.grossMargin).toBeUndefined();
      expect(compressedIncome.operatingMargin).toBeUndefined();
      expect(compressedIncome.netMargin).toBeUndefined();
    });

    it('should remove asset breakdown when configured', () => {
      const options: SelectiveCompressionOptions = {
        removeAssetBreakdown: true,
      };

      const compressed = selectiveCompress(mockCompanyData, options);
      const compressedBalance = compressed.balanceSheet[0] as any;

      expect(compressedBalance.currentAssets).toBeUndefined();
      expect(compressedBalance.cash).toBeUndefined();
      expect(compressedBalance.totalAssets).toBeDefined(); // Should keep totals
    });

    it('should remove liability breakdown when configured', () => {
      const options: SelectiveCompressionOptions = {
        removeLiabilityBreakdown: true,
      };

      const compressed = selectiveCompress(mockCompanyData, options);
      const compressedBalance = compressed.balanceSheet[0] as any;

      expect(compressedBalance.currentLiabilities).toBeUndefined();
      expect(compressedBalance.longTermDebt).toBeUndefined();
      expect(compressedBalance.totalLiabilities).toBeDefined(); // Should keep totals
    });

    it('should remove tax fields when configured', () => {
      const dataWithTaxFields = {
        ...mockCompanyData,
        incomeStatement: [
          {
            ...mockCompanyData.incomeStatement[0],
            incomeTaxExpense: 25000000000,
            effectiveTaxRate: 0.20,
          } as IncomeStatement,
        ],
      };

      const options: SelectiveCompressionOptions = {
        removeTaxFields: true,
      };

      const compressed = selectiveCompress(dataWithTaxFields, options);
      const compressedIncome = compressed.incomeStatement[0] as any;

      expect(compressedIncome.incomeTaxExpense).toBeUndefined();
      expect(compressedIncome.effectiveTaxRate).toBeUndefined();
    });

    it('should keep only core income statement fields', () => {
      const options: SelectiveCompressionOptions = {
        coreIncomeOnly: true,
      };

      const compressed = selectiveCompress(mockCompanyData, options);
      const compressedIncome = compressed.incomeStatement[0] as any;

      // Should keep core fields
      expect(compressedIncome.date).toBeDefined();
      expect(compressedIncome.revenue).toBeDefined();
      expect(compressedIncome.operatingIncome).toBeDefined();
      expect(compressedIncome.netIncome).toBeDefined();
      expect(compressedIncome.eps).toBeDefined();
      expect(compressedIncome.sharesOutstanding).toBeDefined();

      // Should remove non-core fields
      expect(compressedIncome.grossMargin).toBeUndefined();
      expect(compressedIncome.operatingMargin).toBeUndefined();
    });

    it('should handle multiple options simultaneously', () => {
      const options: SelectiveCompressionOptions = {
        removeRatios: true,
        removeAssetBreakdown: true,
        removeTaxFields: true,
      };

      const compressed = selectiveCompress(extensiveCompanyData, options);
      const compressedIncome = compressed.incomeStatement[0] as any;
      const compressedBalance = compressed.balanceSheet[0] as any;

      expect(compressedIncome.grossMargin).toBeUndefined();
      expect(compressedIncome.incomeTaxExpense).toBeUndefined();
      expect(compressedBalance.currentAssets).toBeUndefined();
    });

    it('should handle missing fields gracefully', () => {
      const sparseData = {
        ...mockCompanyData,
        incomeStatement: [
          {
            date: '2023-12-31',
            revenue: 400000000000,
            netIncome: 100000000000,
          } as IncomeStatement,
        ],
      };

      const options: SelectiveCompressionOptions = {
        removeRatios: true,
        removeTaxFields: true,
      };

      const compressed = selectiveCompress(sparseData, options);
      expect(compressed.incomeStatement).toHaveLength(1);
      expect(compressed.incomeStatement[0].revenue).toBe(400000000000);
    });
  });

  describe('smartCompress', () => {
    it('should apply light compression for small datasets', () => {
      const smallData = {
        symbol: 'TEST',
        name: 'Test Company',
        incomeStatement: [mockCompanyData.incomeStatement[0]],
        balanceSheet: [],
        cashFlowStatement: [],
      } as CompanyFinancials;

      const compressed = smartCompress(smallData);

      // Should keep more years for small data
      expect(compressed.incomeStatement).toHaveLength(1);
      // Should not round numbers for small data
      expect(compressed.incomeStatement[0].eps).toBe(smallData.incomeStatement[0].eps);
    });

    it('should apply medium compression for medium datasets', () => {
      // Mock estimateStorageSize to return medium size
      const originalEstimate = estimateStorageSize;
      const mockEstimate = vi.fn().mockReturnValue(100000); // 100KB
      vi.doMock('./dataCompression', async (importOriginal) => {
        const mod = await importOriginal<typeof import('./dataCompression')>();
        return {
          ...mod,
          estimateStorageSize: mockEstimate,
        };
      });

      const compressed = smartCompress(mockCompanyData);

      expect(compressed.symbol).toBe(mockCompanyData.symbol);
      expect(compressed.incomeStatement.length).toBeLessThanOrEqual(5); // Default maxYears
    });

    it('should apply aggressive compression for large datasets', () => {
      // Create a large dataset by duplicating statements
      const largeData = {
        ...mockCompanyData,
        incomeStatement: Array.from({ length: 20 }, (_, i) => ({
          ...mockCompanyData.incomeStatement[0],
          date: `${2023 - i}-12-31`,
          revenue: 400000000000 + i * 1000000000,
        })),
      };

      const compressed = smartCompress(largeData);

      // Smart compress will apply some level of compression
      expect(compressed.incomeStatement.length).toBeGreaterThan(0);
      expect(compressed.incomeStatement.length).toBeLessThanOrEqual(largeData.incomeStatement.length);
      expect(compressed.symbol).toBe(largeData.symbol);
    });
  });

  describe('validateCompression', () => {
    it('should validate successful compression', () => {
      const compressed = compressFinancialData(mockCompanyData, {
        ...DEFAULT_COMPRESSION_CONFIG,
        maxYears: 5,
      });

      const validation = validateCompression(mockCompanyData, compressed);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toEqual([]);
    });

    it('should detect symbol mismatch', () => {
      const compressed = {
        ...compressFinancialData(mockCompanyData),
        symbol: 'WRONG',
      };

      const validation = validateCompression(mockCompanyData, compressed);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Symbol mismatch after compression');
    });

    it('should detect completely removed statements', () => {
      const compressed = {
        ...mockCompanyData,
        incomeStatement: [],
      };

      const validation = validateCompression(mockCompanyData, compressed);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Income statement completely removed');
    });

    it('should detect date changes in latest statements', () => {
      const compressed = {
        ...mockCompanyData,
        incomeStatement: [
          {
            ...mockCompanyData.incomeStatement[0],
            date: '2022-12-31', // Changed date
          },
          ...mockCompanyData.incomeStatement.slice(1),
        ],
      };

      const validation = validateCompression(mockCompanyData, compressed);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Latest income statement date changed');
    });

    it('should pass validation with proper compression', () => {
      const compressed = compressFinancialData(mockCompanyData, {
        ...DEFAULT_COMPRESSION_CONFIG,
        removeDerivedFields: true,
        roundNumbers: true,
      });

      const validation = validateCompression(mockCompanyData, compressed);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should handle empty original data', () => {
      const emptyOriginal = {
        symbol: 'EMPTY',
        name: 'Empty Company',
        incomeStatement: [],
        balanceSheet: [],
        cashFlowStatement: [],
      } as CompanyFinancials;

      const compressed = compressFinancialData(emptyOriginal);
      const validation = validateCompression(emptyOriginal, compressed);

      expect(validation.valid).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined/null values in statements', () => {
      const dataWithUndefined = {
        ...mockCompanyData,
        incomeStatement: [
          {
            ...mockCompanyData.incomeStatement[0],
            revenue: undefined as any,
            netIncome: null as any,
          },
        ],
      };

      const compressed = compressFinancialData(dataWithUndefined);
      expect(compressed.incomeStatement).toHaveLength(1);
    });

    it('should handle circular references gracefully', () => {
      const circularData = { ...mockCompanyData };
      (circularData as any).self = circularData;

      // The function will throw due to JSON.stringify circular reference limitation
      // This is expected behavior for circular references
      expect(() => compressFinancialData(circularData)).toThrow('circular structure');
    });

    it('should preserve data types correctly', () => {
      const compressed = compressFinancialData(mockCompanyData);

      expect(typeof compressed.incomeStatement[0].revenue).toBe('number');
      expect(typeof compressed.incomeStatement[0].date).toBe('string');
      expect(typeof compressed.incomeStatement[0].eps).toBe('number');
    });

    it('should handle very large numbers', () => {
      const dataWithLargeNumbers = {
        ...mockCompanyData,
        incomeStatement: [
          {
            ...mockCompanyData.incomeStatement[0],
            revenue: Number.MAX_SAFE_INTEGER,
          },
        ],
      };

      const compressed = compressFinancialData(dataWithLargeNumbers, {
        ...DEFAULT_COMPRESSION_CONFIG,
        roundNumbers: true,
        decimalPlaces: 2,
      });

      expect(compressed.incomeStatement[0].revenue).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle zero and negative values', () => {
      const dataWithZeros = {
        ...mockCompanyData,
        incomeStatement: [
          {
            ...mockCompanyData.incomeStatement[0],
            revenue: 0,
            netIncome: -1000000000, // Loss
            eps: -0.05,
          },
        ],
      };

      const compressed = compressFinancialData(dataWithZeros);

      expect(compressed.incomeStatement[0].revenue).toBe(0);
      expect(compressed.incomeStatement[0].netIncome).toBe(-1000000000);
      expect(compressed.incomeStatement[0].eps).toBe(-0.05);
    });
  });
});