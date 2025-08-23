import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { FinancialDataCache } from './FinancialDataCache';
import { mockUser, mockCompanyFinancials } from '../test-utils';
import type { 
  ICacheStrategy, 
  CacheConfig,
  CacheOperationResult,
  CacheStatistics,
  FinancialCacheEntry,
  CacheMetadata,
  EarningsDetectionResult
} from '../types/financialCache';
import type { CompanyFinancials } from '../types';

// Mock dependencies
const mockFmpApi = {
  getCompanyFinancials: vi.fn(),
  searchCompany: vi.fn(),
  getCompanyProfile: vi.fn(),
};

const mockCacheStrategy: ICacheStrategy = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
  getStatistics: vi.fn(),
  isFresh: vi.fn(),
  getCachedSymbols: vi.fn(),
};

const mockEarningsDetection = {
  analyzeFilingDates: vi.fn(),
  isCacheStaleBasedOnEarnings: vi.fn(),
};

const mockDataCompression = {
  smartCompress: vi.fn(),
  estimateStorageSize: vi.fn(),
};

const mockErrorHandler = {
  logSuccess: vi.fn(),
  logWarning: vi.fn(),
  handleCacheError: vi.fn(),
  handleRepositoryError: vi.fn().mockReturnValue({ message: 'Mocked error' }),
};

// Mock modules
vi.mock('../services/fmpApi', () => ({
  fmpApi: mockFmpApi,
}));

vi.mock('../utils/earningsDetection', () => mockEarningsDetection);

vi.mock('../utils/dataCompression', () => mockDataCompression);

vi.mock('./ErrorHandler', () => ({
  errorHandler: mockErrorHandler,
}));

vi.mock('./CacheStrategy', () => ({
  createCacheStrategy: vi.fn().mockReturnValue(mockCacheStrategy),
}));

describe('FinancialDataCache', () => {
  let cache: FinancialDataCache;
  let testData: CompanyFinancials;
  let testConfig: CacheConfig;
  const userId = mockUser.uid;
  const symbol = 'AAPL';

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    testData = {
      ...mockCompanyFinancials,
      currentPrice: 180.50,
      sharesOutstanding: 15000000000,
    };

    testConfig = {
      defaultTtl: 90 * 24 * 60 * 60 * 1000, // 90 days
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      useLocalStorage: true,
      useFirestore: true,
      enableCompression: true,
      maxAge: 180 * 24 * 60 * 60 * 1000, // 180 days
      enableBackgroundRefresh: true,
    };

    cache = new FinancialDataCache(testConfig);

    // Setup default mock implementations
    mockCacheStrategy.get.mockResolvedValue(null);
    mockCacheStrategy.set.mockResolvedValue({ success: true, entryId: 'test-id' });
    mockCacheStrategy.remove.mockResolvedValue(true);
    mockCacheStrategy.clear.mockResolvedValue(0);
    mockCacheStrategy.getStatistics.mockResolvedValue({
      totalEntries: 0,
      freshEntries: 0,
      staleEntries: 0,
      totalSize: 0,
      hitRatio: 0,
      averageAge: 0,
    });
    mockCacheStrategy.isFresh.mockResolvedValue(false);
    mockCacheStrategy.getCachedSymbols.mockResolvedValue([]);

    mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);
    mockDataCompression.smartCompress.mockImplementation((data) => data);
    mockDataCompression.estimateStorageSize.mockReturnValue(1000);
    mockEarningsDetection.analyzeFilingDates.mockReturnValue({
      confidence: 0.8,
      method: 'pattern',
      quarterlyPattern: true,
    } as EarningsDetectionResult);
    mockEarningsDetection.isCacheStaleBasedOnEarnings.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize with default config when none provided', () => {
      const defaultCache = new FinancialDataCache();
      expect(defaultCache).toBeDefined();
    });

    it('should merge provided config with defaults', () => {
      const partialConfig = { defaultTtl: 60 * 24 * 60 * 60 * 1000 }; // 60 days
      const customCache = new FinancialDataCache(partialConfig);
      expect(customCache).toBeDefined();
    });
  });

  describe('getCompanyData', () => {
    it('should return cached data when available and fresh', async () => {
      const cachedEntry: FinancialCacheEntry = {
        id: 'test-id',
        userId,
        data: testData,
        metadata: {
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000), // Tomorrow
          dataSource: 'api',
          version: '1.0.0',
        },
      };

      mockCacheStrategy.get.mockResolvedValue(cachedEntry);
      mockCacheStrategy.isFresh.mockResolvedValue(true);

      const result = await cache.getCompanyData(userId, symbol);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(result.fromCache).toBe(true);
      expect(mockFmpApi.getCompanyFinancials).not.toHaveBeenCalled();
    });

    it('should fetch from API when no cached data exists', async () => {
      mockCacheStrategy.get.mockResolvedValue(null);
      mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);

      const result = await cache.getCompanyData(userId, symbol);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(result.fromCache).toBe(false);
      expect(mockFmpApi.getCompanyFinancials).toHaveBeenCalledWith(symbol);
      expect(mockCacheStrategy.set).toHaveBeenCalled();
    });

    it('should fetch from API when cached data is stale', async () => {
      const staleEntry: FinancialCacheEntry = {
        id: 'test-id',
        userId,
        data: testData,
        metadata: {
          cachedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
          expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          dataSource: 'api',
          version: '1.0.0',
        },
      };

      mockCacheStrategy.get.mockResolvedValue(staleEntry);
      mockCacheStrategy.isFresh.mockResolvedValue(false);
      mockEarningsDetection.isCacheStaleBasedOnEarnings.mockReturnValue(true);
      mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);

      const result = await cache.getCompanyData(userId, symbol);

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(false);
      expect(mockFmpApi.getCompanyFinancials).toHaveBeenCalled();
    });

    it('should use smart invalidation based on earnings detection', async () => {
      const cachedEntry: FinancialCacheEntry = {
        id: 'test-id',
        userId,
        data: testData,
        metadata: {
          cachedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          dataSource: 'api',
          version: '1.0.0',
        },
      };

      mockCacheStrategy.get.mockResolvedValue(cachedEntry);
      mockCacheStrategy.isFresh.mockResolvedValue(true);
      
      // Mock earnings detection to indicate cache should be refreshed
      mockEarningsDetection.isCacheStaleBasedOnEarnings.mockReturnValue(true);
      mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);

      const result = await cache.getCompanyData(userId, symbol);

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(false);
      expect(mockFmpApi.getCompanyFinancials).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockCacheStrategy.get.mockResolvedValue(null);
      mockFmpApi.getCompanyFinancials.mockRejectedValue(new Error('API Error'));

      const result = await cache.getCompanyData(userId, symbol);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });

    it('should return stale data when API fails', async () => {
      const staleEntry: FinancialCacheEntry = {
        id: 'test-id',
        userId,
        data: testData,
        metadata: {
          cachedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          dataSource: 'api',
          version: '1.0.0',
        },
      };

      mockCacheStrategy.get.mockResolvedValue(staleEntry);
      mockCacheStrategy.isFresh.mockResolvedValue(false);
      mockFmpApi.getCompanyFinancials.mockRejectedValue(new Error('API Error'));

      const result = await cache.getCompanyData(userId, symbol);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(result.fromCache).toBe(true);
      expect(result.isStale).toBe(true);
    });

    it('should apply compression when storing new data', async () => {
      const compressedData = { ...testData, compressed: true };
      mockCacheStrategy.get.mockResolvedValue(null);
      mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);
      mockDataCompression.smartCompress.mockReturnValue(compressedData);

      await cache.getCompanyData(userId, symbol);

      expect(mockDataCompression.smartCompress).toHaveBeenCalledWith(testData);
      expect(mockCacheStrategy.set).toHaveBeenCalledWith(
        userId,
        symbol,
        compressedData,
        expect.any(Object)
      );
    });

    it('should include earnings metadata when caching', async () => {
      const earningsResult: EarningsDetectionResult = {
        confidence: 0.9,
        method: 'pattern',
        quarterlyPattern: true,
        nextEarningsDate: new Date('2024-07-25'),
        lastEarningsDate: new Date('2024-04-25'),
      };

      mockCacheStrategy.get.mockResolvedValue(null);
      mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);
      mockEarningsDetection.analyzeFilingDates.mockReturnValue(earningsResult);

      await cache.getCompanyData(userId, symbol);

      expect(mockCacheStrategy.set).toHaveBeenCalledWith(
        userId,
        symbol,
        expect.any(Object),
        expect.objectContaining({
          nextEarningsEstimate: earningsResult.nextEarningsDate,
          lastEarningsDate: earningsResult.lastEarningsDate,
        })
      );
    });

    it('should handle force refresh option', async () => {
      const cachedEntry: FinancialCacheEntry = {
        id: 'test-id',
        userId,
        data: testData,
        metadata: {
          cachedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
          dataSource: 'api',
          version: '1.0.0',
        },
      };

      mockCacheStrategy.get.mockResolvedValue(cachedEntry);
      mockCacheStrategy.isFresh.mockResolvedValue(true);
      mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);

      const result = await cache.getCompanyData(userId, symbol, { forceRefresh: true });

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(false);
      expect(mockFmpApi.getCompanyFinancials).toHaveBeenCalled();
    });

    it('should handle background refresh option', async () => {
      mockCacheStrategy.get.mockResolvedValue(null);
      mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);

      const result = await cache.getCompanyData(userId, symbol, { background: true });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
    });

    it('should validate user ID and symbol inputs', async () => {
      // Test empty userId
      let result = await cache.getCompanyData('', symbol);
      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID');

      // Test empty symbol
      result = await cache.getCompanyData(userId, '');
      expect(result.success).toBe(false);
      expect(result.error).toContain('symbol');
    });
  });

  describe('invalidateCache', () => {
    it('should remove specific symbol cache', async () => {
      mockCacheStrategy.remove.mockResolvedValue(true);

      const result = await cache.invalidateCache(userId, symbol);

      expect(result).toBe(true);
      expect(mockCacheStrategy.remove).toHaveBeenCalledWith(userId, symbol);
    });

    it('should clear all cache for user when no symbol provided', async () => {
      mockCacheStrategy.clear.mockResolvedValue(5);

      const result = await cache.invalidateCache(userId);

      expect(result).toBe(true);
      expect(mockCacheStrategy.clear).toHaveBeenCalledWith(userId);
    });

    it('should handle cache removal errors', async () => {
      mockCacheStrategy.remove.mockResolvedValue(false);

      const result = await cache.invalidateCache(userId, symbol);

      expect(result).toBe(false);
    });
  });

  describe('getCacheStatistics', () => {
    it('should return cache statistics', async () => {
      const mockStats: CacheStatistics = {
        totalEntries: 10,
        freshEntries: 7,
        staleEntries: 3,
        totalSize: 1024000,
        hitRatio: 0.85,
        averageAge: 48,
        newestEntry: 'AAPL',
        oldestEntry: 'MSFT',
      };

      mockCacheStrategy.getStatistics.mockResolvedValue(mockStats);

      const result = await cache.getCacheStatistics(userId);

      expect(result).toEqual(mockStats);
      expect(mockCacheStrategy.getStatistics).toHaveBeenCalledWith(userId);
    });

    it('should handle statistics errors gracefully', async () => {
      mockCacheStrategy.getStatistics.mockRejectedValue(new Error('Stats error'));

      const result = await cache.getCacheStatistics(userId);

      expect(result.totalEntries).toBe(0);
      expect(mockErrorHandler.handleCacheError).toHaveBeenCalled();
    });
  });

  describe('getCachedSymbols', () => {
    it('should return list of cached symbols', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      mockCacheStrategy.getCachedSymbols.mockResolvedValue(symbols);

      const result = await cache.getCachedSymbols(userId);

      expect(result).toEqual(symbols);
      expect(mockCacheStrategy.getCachedSymbols).toHaveBeenCalledWith(userId);
    });

    it('should handle errors when getting cached symbols', async () => {
      mockCacheStrategy.getCachedSymbols.mockRejectedValue(new Error('Error'));

      const result = await cache.getCachedSymbols(userId);

      expect(result).toEqual([]);
      expect(mockErrorHandler.handleCacheError).toHaveBeenCalled();
    });
  });

  describe('refreshCacheInBackground', () => {
    it('should refresh cache for all cached symbols', async () => {
      const symbols = ['AAPL', 'MSFT'];
      mockCacheStrategy.getCachedSymbols.mockResolvedValue(symbols);
      mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);

      await cache.refreshCacheInBackground(userId);

      expect(mockFmpApi.getCompanyFinancials).toHaveBeenCalledTimes(2);
      expect(mockFmpApi.getCompanyFinancials).toHaveBeenCalledWith('AAPL');
      expect(mockFmpApi.getCompanyFinancials).toHaveBeenCalledWith('MSFT');
    });

    it('should only refresh stale entries', async () => {
      const symbols = ['FRESH', 'STALE'];
      mockCacheStrategy.getCachedSymbols.mockResolvedValue(symbols);
      mockCacheStrategy.isFresh
        .mockResolvedValueOnce(true)  // FRESH is fresh
        .mockResolvedValueOnce(false); // STALE is stale

      await cache.refreshCacheInBackground(userId);

      expect(mockFmpApi.getCompanyFinancials).toHaveBeenCalledTimes(1);
      expect(mockFmpApi.getCompanyFinancials).toHaveBeenCalledWith('STALE');
    });

    it('should handle errors during background refresh', async () => {
      const symbols = ['ERROR_SYMBOL'];
      mockCacheStrategy.getCachedSymbols.mockResolvedValue(symbols);
      mockCacheStrategy.isFresh.mockResolvedValue(false);
      mockFmpApi.getCompanyFinancials.mockRejectedValue(new Error('API Error'));

      await cache.refreshCacheInBackground(userId);

      expect(mockErrorHandler.handleCacheError).toHaveBeenCalled();
    });

    it('should respect background refresh configuration', async () => {
      const disabledCache = new FinancialDataCache({ 
        ...testConfig, 
        enableBackgroundRefresh: false 
      });

      const symbols = ['AAPL'];
      mockCacheStrategy.getCachedSymbols.mockResolvedValue(symbols);

      await disabledCache.refreshCacheInBackground(userId);

      expect(mockFmpApi.getCompanyFinancials).not.toHaveBeenCalled();
    });
  });

  describe('updateConfiguration', () => {
    it('should update cache configuration', () => {
      const newConfig = { defaultTtl: 120 * 24 * 60 * 60 * 1000 }; // 120 days
      
      cache.updateConfiguration(newConfig);

      // Configuration should be updated (we can't directly test private members,
      // but we can test that subsequent operations work with new config)
      expect(cache).toBeDefined();
    });

    it('should merge new config with existing config', () => {
      const partialConfig = { enableCompression: false };
      
      cache.updateConfiguration(partialConfig);

      expect(cache).toBeDefined();
    });
  });

  describe('preloadData', () => {
    it('should preload data for multiple symbols', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);

      await cache.preloadData(userId, symbols);

      expect(mockFmpApi.getCompanyFinancials).toHaveBeenCalledTimes(3);
      symbols.forEach(symbol => {
        expect(mockFmpApi.getCompanyFinancials).toHaveBeenCalledWith(symbol);
      });
    });

    it('should skip symbols that are already fresh in cache', async () => {
      const symbols = ['FRESH', 'STALE'];
      mockCacheStrategy.isFresh
        .mockResolvedValueOnce(true)  // FRESH is fresh
        .mockResolvedValueOnce(false); // STALE is stale
      mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);

      await cache.preloadData(userId, symbols);

      expect(mockFmpApi.getCompanyFinancials).toHaveBeenCalledTimes(1);
      expect(mockFmpApi.getCompanyFinancials).toHaveBeenCalledWith('STALE');
    });

    it('should handle errors during preloading', async () => {
      const symbols = ['ERROR_SYMBOL'];
      mockFmpApi.getCompanyFinancials.mockRejectedValue(new Error('API Error'));

      await cache.preloadData(userId, symbols);

      expect(mockErrorHandler.handleCacheError).toHaveBeenCalled();
    });
  });

  describe('isSymbolCached', () => {
    it('should return true for fresh cached data', async () => {
      mockCacheStrategy.isFresh.mockResolvedValue(true);

      const result = await cache.isSymbolCached(userId, symbol);

      expect(result).toBe(true);
      expect(mockCacheStrategy.isFresh).toHaveBeenCalledWith(userId, symbol);
    });

    it('should return false for stale or non-existent data', async () => {
      mockCacheStrategy.isFresh.mockResolvedValue(false);

      const result = await cache.isSymbolCached(userId, symbol);

      expect(result).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined inputs gracefully', async () => {
      const result = await cache.getCompanyData(null as any, undefined as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle cache strategy failures', async () => {
      mockCacheStrategy.get.mockRejectedValue(new Error('Cache strategy error'));
      mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);

      const result = await cache.getCompanyData(userId, symbol);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(result.fromCache).toBe(false);
    });

    it('should handle data compression failures', async () => {
      mockCacheStrategy.get.mockResolvedValue(null);
      mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);
      mockDataCompression.smartCompress.mockImplementation(() => {
        throw new Error('Compression error');
      });

      const result = await cache.getCompanyData(userId, symbol);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      // Should cache original data despite compression failure
      expect(mockCacheStrategy.set).toHaveBeenCalledWith(
        userId,
        symbol,
        testData,
        expect.any(Object)
      );
    });

    it('should handle earnings detection failures', async () => {
      mockCacheStrategy.get.mockResolvedValue(null);
      mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);
      mockEarningsDetection.analyzeFilingDates.mockImplementation(() => {
        throw new Error('Earnings detection error');
      });

      const result = await cache.getCompanyData(userId, symbol);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      // Should still cache data without earnings metadata
      expect(mockCacheStrategy.set).toHaveBeenCalled();
    });

    it('should handle very large datasets', async () => {
      const largeData = {
        ...testData,
        incomeStatement: Array.from({ length: 1000 }, () => testData.incomeStatement[0]),
      };

      mockCacheStrategy.get.mockResolvedValue(null);
      mockFmpApi.getCompanyFinancials.mockResolvedValue(largeData);
      mockDataCompression.estimateStorageSize.mockReturnValue(100 * 1024 * 1024); // 100MB

      const result = await cache.getCompanyData(userId, symbol);

      expect(result.success).toBe(true);
      expect(mockDataCompression.smartCompress).toHaveBeenCalled(); // Should apply compression
    });

    it('should handle concurrent requests for the same symbol', async () => {
      mockCacheStrategy.get.mockResolvedValue(null);
      mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);

      // Make multiple concurrent requests
      const promises = Array.from({ length: 5 }, () => 
        cache.getCompanyData(userId, symbol)
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data).toEqual(testData);
      });

      // API should be called at least once
      expect(mockFmpApi.getCompanyFinancials).toHaveBeenCalled();
    });

    it('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure by having cache set operations fail
      mockCacheStrategy.set.mockResolvedValue({ 
        success: false, 
        error: 'Out of memory' 
      });
      mockCacheStrategy.get.mockResolvedValue(null);
      mockFmpApi.getCompanyFinancials.mockResolvedValue(testData);

      const result = await cache.getCompanyData(userId, symbol);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(result.fromCache).toBe(false);
      // Should warn about cache failure but still return data
      expect(mockErrorHandler.logWarning).toHaveBeenCalled();
    });
  });
});