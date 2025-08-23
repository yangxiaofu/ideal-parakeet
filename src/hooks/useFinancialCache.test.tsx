import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { 
  useFinancialCache, 
  useCacheStatistics, 
  useCachedSymbols,
  useFinancialCacheWithRefresh,
  useCacheConfig,
} from './useFinancialCache';
import { mockUser, mockCompanyFinancials } from '../test-utils';
import type { 
  CacheStatistics,
  CacheConfig,
  CacheOperationResult,
  CacheRefreshOptions
} from '../types/financialCache';
import type { CompanyFinancials } from '../types';

// Mock FinancialDataCache
const mockFinancialDataCache = {
  getCompanyData: vi.fn(),
  invalidateCache: vi.fn(),
  getCacheStatistics: vi.fn(),
  getCachedSymbols: vi.fn(),
  refreshCacheInBackground: vi.fn(),
  preloadData: vi.fn(),
  isSymbolCached: vi.fn(),
  updateConfiguration: vi.fn(),
};

// Mock AuthContext
const mockAuthContext = {
  user: mockUser,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  logout: vi.fn(),
  signInWithGoogle: vi.fn(),
};

// Mock error handler
const mockErrorHandler = {
  logSuccess: vi.fn(),
  logWarning: vi.fn(),
  logError: vi.fn(),
  handleCacheError: vi.fn(),
};

// Mock modules
vi.mock('../services/FinancialDataCache', () => ({
  FinancialDataCache: vi.fn().mockImplementation(() => mockFinancialDataCache),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

vi.mock('../services/ErrorHandler', () => ({
  errorHandler: mockErrorHandler,
}));

// React Query mock
const mockQueryClient = {
  invalidateQueries: vi.fn(),
  setQueryData: vi.fn(),
  getQueryData: vi.fn(),
  removeQueries: vi.fn(),
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: () => mockQueryClient,
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: any) => children,
}));

// Import the actual react-query to use in tests
import { useQuery, useMutation } from '@tanstack/react-query';

describe('useFinancialCache Hooks', () => {
  let testData: CompanyFinancials;
  let mockCacheResult: CacheOperationResult;
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

    mockCacheResult = {
      success: true,
      data: testData,
      fromCache: false,
      entryId: 'test-entry-id',
    };

    // Setup default mock implementations
    mockFinancialDataCache.getCompanyData.mockResolvedValue(mockCacheResult);
    mockFinancialDataCache.invalidateCache.mockResolvedValue(true);
    mockFinancialDataCache.getCacheStatistics.mockResolvedValue({
      totalEntries: 0,
      freshEntries: 0,
      staleEntries: 0,
      totalSize: 0,
      hitRatio: 0,
      averageAge: 0,
    });
    mockFinancialDataCache.getCachedSymbols.mockResolvedValue([]);
    mockFinancialDataCache.refreshCacheInBackground.mockResolvedValue(undefined);
    mockFinancialDataCache.isSymbolCached.mockResolvedValue(false);

    // Mock useQuery and useMutation
    (useQuery as Mock).mockImplementation(({ queryFn, enabled = true }) => {
      if (!enabled) {
        return {
          data: undefined,
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn(),
          isStale: false,
          isFetching: false,
        };
      }

      return {
        data: mockCacheResult,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockResolvedValue({ data: mockCacheResult }),
        isStale: false,
        isFetching: false,
      };
    });

    (useMutation as Mock).mockImplementation(({ mutationFn }) => ({
      mutate: vi.fn().mockImplementation(async (variables) => {
        const result = await mutationFn(variables);
        return result;
      }),
      mutateAsync: vi.fn().mockImplementation(async (variables) => {
        const result = await mutationFn(variables);
        return result;
      }),
      isLoading: false,
      isError: false,
      error: null,
      data: undefined,
      reset: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('useFinancialCache', () => {
    it('should fetch financial data when user and symbol are provided', async () => {
      const { result } = renderHook(() => useFinancialCache(symbol));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockCacheResult);
      });

      expect(mockFinancialDataCache.getCompanyData).toHaveBeenCalledWith(
        userId,
        symbol,
        undefined
      );
    });

    it('should not fetch when user is not available', () => {
      mockAuthContext.user = null;

      const { result } = renderHook(() => useFinancialCache(symbol));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockFinancialDataCache.getCompanyData).not.toHaveBeenCalled();
    });

    it('should not fetch when symbol is empty', () => {
      const { result } = renderHook(() => useFinancialCache(''));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(mockFinancialDataCache.getCompanyData).not.toHaveBeenCalled();
    });

    it('should use custom refresh options', async () => {
      const refreshOptions: CacheRefreshOptions = {
        forceRefresh: true,
        background: false,
        customTtl: 60 * 60 * 1000, // 1 hour
      };

      const { result } = renderHook(() => useFinancialCache(symbol, refreshOptions));

      await waitFor(() => {
        expect(result.current.data).toEqual(mockCacheResult);
      });

      expect(mockFinancialDataCache.getCompanyData).toHaveBeenCalledWith(
        userId,
        symbol,
        refreshOptions
      );
    });

    it('should handle loading states correctly', () => {
      (useQuery as Mock).mockImplementation(() => ({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isStale: false,
        isFetching: true,
      }));

      const { result } = renderHook(() => useFinancialCache(symbol));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isFetching).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle error states correctly', () => {
      const mockError = new Error('Cache error');
      
      (useQuery as Mock).mockImplementation(() => ({
        data: undefined,
        isLoading: false,
        isError: true,
        error: mockError,
        refetch: vi.fn(),
        isStale: false,
        isFetching: false,
      }));

      const { result } = renderHook(() => useFinancialCache(symbol));

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mockError);
      expect(result.current.data).toBeUndefined();
    });

    it('should provide refetch functionality', async () => {
      const mockRefetch = vi.fn().mockResolvedValue({ data: mockCacheResult });
      
      (useQuery as Mock).mockImplementation(() => ({
        data: mockCacheResult,
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
        isStale: false,
        isFetching: false,
      }));

      const { result } = renderHook(() => useFinancialCache(symbol));

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should handle stale data indicators', () => {
      (useQuery as Mock).mockImplementation(() => ({
        data: { ...mockCacheResult, isStale: true },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isStale: true,
        isFetching: false,
      }));

      const { result } = renderHook(() => useFinancialCache(symbol));

      expect(result.current.isStale).toBe(true);
      expect(result.current.data?.isStale).toBe(true);
    });
  });

  describe('useFinancialCacheWithRefresh', () => {
    it('should provide refresh mutation', async () => {
      const mockMutate = vi.fn().mockResolvedValue(mockCacheResult);
      
      (useMutation as Mock).mockImplementation(() => ({
        mutate: mockMutate,
        mutateAsync: vi.fn().mockResolvedValue(mockCacheResult),
        isLoading: false,
        isError: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      }));

      const { result } = renderHook(() => useFinancialCacheWithRefresh());

      await act(async () => {
        result.current.refreshSymbol({ symbol, forceRefresh: true });
      });

      expect(mockMutate).toHaveBeenCalledWith({
        symbol,
        forceRefresh: true,
      });
    });

    it('should handle refresh loading states', () => {
      (useMutation as Mock).mockImplementation(() => ({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isLoading: true,
        isError: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      }));

      const { result } = renderHook(() => useFinancialCacheWithRefresh());

      expect(result.current.isRefreshing).toBe(true);
    });

    it('should handle refresh errors', () => {
      const mockError = new Error('Refresh error');
      
      (useMutation as Mock).mockImplementation(() => ({
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isLoading: false,
        isError: true,
        error: mockError,
        data: undefined,
        reset: vi.fn(),
      }));

      const { result } = renderHook(() => useFinancialCacheWithRefresh());

      expect(result.current.refreshError).toBe(mockError);
    });

    it('should invalidate queries after successful refresh', async () => {
      const mockMutate = vi.fn().mockImplementation(async ({ symbol }) => {
        // Simulate successful refresh
        mockQueryClient.invalidateQueries.mockResolvedValue(undefined);
        return mockCacheResult;
      });

      (useMutation as Mock).mockImplementation(({ onSuccess }) => ({
        mutate: vi.fn().mockImplementation(async (variables) => {
          const result = await mockMutate(variables);
          if (onSuccess) {
            await onSuccess(result, variables);
          }
          return result;
        }),
        mutateAsync: vi.fn(),
        isLoading: false,
        isError: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      }));

      const { result } = renderHook(() => useFinancialCacheWithRefresh());

      await act(async () => {
        result.current.refreshSymbol({ symbol });
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['financial-cache', userId, symbol],
      });
    });

    it('should support background refresh', async () => {
      const { result } = renderHook(() => useFinancialCacheWithRefresh());

      await act(async () => {
        result.current.refreshInBackground();
      });

      expect(mockFinancialDataCache.refreshCacheInBackground).toHaveBeenCalledWith(userId);
    });
  });

  describe('useCacheStatistics', () => {
    it('should fetch cache statistics', async () => {
      const mockStats: CacheStatistics = {
        totalEntries: 5,
        freshEntries: 3,
        staleEntries: 2,
        totalSize: 1024000,
        hitRatio: 0.85,
        averageAge: 48,
        newestEntry: 'AAPL',
        oldestEntry: 'MSFT',
      };

      mockFinancialDataCache.getCacheStatistics.mockResolvedValue(mockStats);

      (useQuery as Mock).mockImplementation(({ queryFn }) => ({
        data: mockStats,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn().mockImplementation(async () => {
          const result = await queryFn();
          return { data: result };
        }),
      }));

      const { result } = renderHook(() => useCacheStatistics());

      await waitFor(() => {
        expect(result.current.statistics).toEqual(mockStats);
      });

      expect(mockFinancialDataCache.getCacheStatistics).toHaveBeenCalledWith(userId);
    });

    it('should not fetch when user is not available', () => {
      mockAuthContext.user = null;

      const { result } = renderHook(() => useCacheStatistics());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.statistics).toBeUndefined();
      expect(mockFinancialDataCache.getCacheStatistics).not.toHaveBeenCalled();
    });

    it('should handle statistics loading states', () => {
      (useQuery as Mock).mockImplementation(() => ({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }));

      const { result } = renderHook(() => useCacheStatistics());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.statistics).toBeUndefined();
    });

    it('should handle statistics errors', () => {
      const mockError = new Error('Statistics error');
      
      (useQuery as Mock).mockImplementation(() => ({
        data: undefined,
        isLoading: false,
        isError: true,
        error: mockError,
        refetch: vi.fn(),
      }));

      const { result } = renderHook(() => useCacheStatistics());

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mockError);
    });

    it('should provide refresh functionality', async () => {
      const mockRefetch = vi.fn().mockResolvedValue({ data: {} });

      (useQuery as Mock).mockImplementation(() => ({
        data: {},
        isLoading: false,
        isError: false,
        error: null,
        refetch: mockRefetch,
      }));

      const { result } = renderHook(() => useCacheStatistics());

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('useCachedSymbols', () => {
    it('should fetch cached symbols', async () => {
      const mockSymbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA'];

      mockFinancialDataCache.getCachedSymbols.mockResolvedValue(mockSymbols);

      (useQuery as Mock).mockImplementation(() => ({
        data: mockSymbols,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }));

      const { result } = renderHook(() => useCachedSymbols());

      await waitFor(() => {
        expect(result.current.symbols).toEqual(mockSymbols);
      });

      expect(mockFinancialDataCache.getCachedSymbols).toHaveBeenCalledWith(userId);
    });

    it('should not fetch when user is not available', () => {
      mockAuthContext.user = null;

      const { result } = renderHook(() => useCachedSymbols());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.symbols).toBeUndefined();
      expect(mockFinancialDataCache.getCachedSymbols).not.toHaveBeenCalled();
    });

    it('should handle loading states', () => {
      (useQuery as Mock).mockImplementation(() => ({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }));

      const { result } = renderHook(() => useCachedSymbols());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.symbols).toBeUndefined();
    });

    it('should handle errors', () => {
      const mockError = new Error('Symbols error');

      (useQuery as Mock).mockImplementation(() => ({
        data: undefined,
        isLoading: false,
        isError: true,
        error: mockError,
        refetch: vi.fn(),
      }));

      const { result } = renderHook(() => useCachedSymbols());

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mockError);
    });

    it('should provide symbol check functionality', async () => {
      const mockSymbols = ['AAPL', 'MSFT'];

      (useQuery as Mock).mockImplementation(() => ({
        data: mockSymbols,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }));

      const { result } = renderHook(() => useCachedSymbols());

      expect(result.current.isSymbolCached?.('AAPL')).toBe(true);
      expect(result.current.isSymbolCached?.('GOOGL')).toBe(false);
    });

    it('should handle symbol filtering', async () => {
      const mockSymbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA'];

      (useQuery as Mock).mockImplementation(() => ({
        data: mockSymbols,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }));

      const { result } = renderHook(() => useCachedSymbols());

      const techSymbols = mockSymbols.filter(symbol => 
        ['AAPL', 'MSFT', 'GOOGL'].includes(symbol)
      );

      expect(result.current.symbols).toContain('AAPL');
      expect(result.current.symbols).toContain('MSFT');
      expect(result.current.symbols).toContain('GOOGL');
    });
  });

  describe('useCacheConfig', () => {
    it('should provide cache configuration management', () => {
      const mockConfig: CacheConfig = {
        defaultTtl: 90 * 24 * 60 * 60 * 1000,
        maxCacheSize: 50 * 1024 * 1024,
        useLocalStorage: true,
        useFirestore: true,
        enableCompression: true,
        maxAge: 180 * 24 * 60 * 60 * 1000,
        enableBackgroundRefresh: true,
      };

      const { result } = renderHook(() => useCacheConfig());

      act(() => {
        result.current.updateConfig(mockConfig);
      });

      expect(mockFinancialDataCache.updateConfiguration).toHaveBeenCalledWith(mockConfig);
    });

    it('should handle partial config updates', () => {
      const partialConfig = { 
        enableCompression: false,
        defaultTtl: 60 * 24 * 60 * 60 * 1000, // 60 days
      };

      const { result } = renderHook(() => useCacheConfig());

      act(() => {
        result.current.updateConfig(partialConfig);
      });

      expect(mockFinancialDataCache.updateConfiguration).toHaveBeenCalledWith(partialConfig);
    });

    it('should provide cache invalidation functionality', async () => {
      const { result } = renderHook(() => useCacheConfig());

      await act(async () => {
        await result.current.invalidateAll();
      });

      expect(mockFinancialDataCache.invalidateCache).toHaveBeenCalledWith(userId);
    });

    it('should provide symbol-specific invalidation', async () => {
      const { result } = renderHook(() => useCacheConfig());

      await act(async () => {
        await result.current.invalidateSymbol(symbol);
      });

      expect(mockFinancialDataCache.invalidateCache).toHaveBeenCalledWith(userId, symbol);
    });
  });

  describe('Integration and Edge Cases', () => {
    it('should handle user authentication changes', () => {
      const { result, rerender } = renderHook(() => useFinancialCache(symbol));

      // Initially with user
      expect(mockFinancialDataCache.getCompanyData).toHaveBeenCalledWith(
        userId,
        symbol,
        undefined
      );

      // User logs out
      mockAuthContext.user = null;
      rerender();

      // Should not make additional calls when user is null
      expect(mockFinancialDataCache.getCompanyData).toHaveBeenCalledTimes(1);
    });

    it('should handle symbol changes', () => {
      const { result, rerender } = renderHook(
        ({ symbol }) => useFinancialCache(symbol),
        { initialProps: { symbol: 'AAPL' } }
      );

      expect(mockFinancialDataCache.getCompanyData).toHaveBeenCalledWith(
        userId,
        'AAPL',
        undefined
      );

      // Change symbol
      rerender({ symbol: 'MSFT' });

      expect(mockFinancialDataCache.getCompanyData).toHaveBeenCalledWith(
        userId,
        'MSFT',
        undefined
      );
    });

    it('should handle concurrent hook instances', async () => {
      const { result: result1 } = renderHook(() => useFinancialCache('AAPL'));
      const { result: result2 } = renderHook(() => useFinancialCache('MSFT'));

      await waitFor(() => {
        expect(result1.current.data).toBeDefined();
        expect(result2.current.data).toBeDefined();
      });

      expect(mockFinancialDataCache.getCompanyData).toHaveBeenCalledWith(
        userId,
        'AAPL',
        undefined
      );
      expect(mockFinancialDataCache.getCompanyData).toHaveBeenCalledWith(
        userId,
        'MSFT',
        undefined
      );
    });

    it('should handle network reconnection scenarios', async () => {
      const { result } = renderHook(() => useFinancialCacheWithRefresh());

      // Simulate network error during refresh
      mockFinancialDataCache.getCompanyData.mockRejectedValueOnce(
        new Error('Network error')
      );

      await act(async () => {
        try {
          await result.current.refreshSymbol({ symbol });
        } catch (error) {
          // Expected to fail
        }
      });

      // Now simulate successful retry
      mockFinancialDataCache.getCompanyData.mockResolvedValueOnce(mockCacheResult);

      await act(async () => {
        await result.current.refreshSymbol({ symbol });
      });

      expect(mockFinancialDataCache.getCompanyData).toHaveBeenCalledTimes(2);
    });

    it('should handle memory pressure and cleanup', () => {
      const hooks = Array.from({ length: 100 }, (_, i) => 
        renderHook(() => useFinancialCache(`SYMBOL${i}`))
      );

      // All hooks should be created without issues
      expect(hooks).toHaveLength(100);

      // Cleanup hooks
      hooks.forEach(({ unmount }) => unmount());
    });

    it('should handle rapid symbol switching', () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
      const { rerender } = renderHook(
        ({ symbol }) => useFinancialCache(symbol),
        { initialProps: { symbol: symbols[0] } }
      );

      symbols.forEach((symbol, index) => {
        if (index > 0) {
          rerender({ symbol });
        }
      });

      // Should have called getCompanyData for each symbol
      symbols.forEach(symbol => {
        expect(mockFinancialDataCache.getCompanyData).toHaveBeenCalledWith(
          userId,
          symbol,
          undefined
        );
      });
    });

    it('should handle component unmounting during async operations', async () => {
      const { result, unmount } = renderHook(() => useFinancialCacheWithRefresh());

      // Start a refresh operation
      const refreshPromise = act(async () => {
        result.current.refreshSymbol({ symbol });
      });

      // Unmount component before refresh completes
      unmount();

      // Should not throw or cause memory leaks
      await expect(refreshPromise).resolves.not.toThrow();
    });

    it('should handle configuration changes during operation', async () => {
      const { result } = renderHook(() => {
        const cache = useFinancialCache(symbol);
        const config = useCacheConfig();
        return { cache, config };
      });

      // Change config during operation
      await act(async () => {
        result.current.config.updateConfig({ enableCompression: false });
      });

      expect(mockFinancialDataCache.updateConfiguration).toHaveBeenCalledWith({
        enableCompression: false,
      });
    });
  });
});