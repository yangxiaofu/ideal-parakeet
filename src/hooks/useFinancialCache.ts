/**
 * React hook for financial data caching
 * Provides easy integration with React components for cached financial data
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FinancialDataCacheService } from '../services/FinancialDataCache';
import type { CompanyFinancials } from '../types';
import type { 
  CacheRefreshOptions, 
  CacheStatistics, 
  CacheOperationResult 
} from '../types/financialCache';

interface UseFinancialCacheResult {
  /** Cached company data */
  data: CompanyFinancials | null;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Whether data came from cache vs API */
  fromCache: boolean;
  /** Whether cache is fresh for this symbol */
  isFresh: boolean;
  /** Manually refresh cache */
  refresh: (options?: CacheRefreshOptions) => Promise<void>;
  /** Clear cache for this symbol */
  clearCache: () => Promise<void>;
  /** Last refresh timestamp */
  lastRefresh: Date | null;
}

interface UseFinancialCacheOptions {
  /** Enable automatic data fetching on mount */
  enabled?: boolean;
  /** Background refresh on stale data */
  backgroundRefresh?: boolean;
  /** Custom refresh options */
  refreshOptions?: CacheRefreshOptions;
  /** Callback on data load */
  onSuccess?: (data: CompanyFinancials, fromCache: boolean) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

/**
 * Hook for accessing cached financial data for a specific symbol
 */
export function useFinancialCache(
  symbol: string,
  options: UseFinancialCacheOptions = {}
): UseFinancialCacheResult {
  const { user } = useAuth();
  const {
    enabled = true,
    backgroundRefresh = true,
    refreshOptions = {},
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<CompanyFinancials | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [isFresh, setIsFresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const cacheService = useMemo(() => FinancialDataCacheService.getInstance(), []);

  const loadData = useCallback(async (refreshOpts: CacheRefreshOptions = {}) => {
    if (!user?.uid || !symbol || loading) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`Loading financial data for ${symbol}...`);
      
      // Check if data is cached and fresh
      const cached = await cacheService.isCached(user.uid, symbol);
      setIsFresh(cached);

      // Get company data (will use cache if available and fresh)
      const companyData = await cacheService.getCompanyData(user.uid, symbol, {
        background: backgroundRefresh,
        ...refreshOpts,
      });

      setData(companyData);
      setFromCache(cached && !refreshOpts.forceRefresh);
      setLastRefresh(new Date());

      console.log(`Financial data loaded for ${symbol}:`, {
        fromCache: cached && !refreshOpts.forceRefresh,
        dataSize: JSON.stringify(companyData).length,
      });

      onSuccess?.(companyData, cached && !refreshOpts.forceRefresh);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load financial data';
      console.error(`Failed to load financial data for ${symbol}:`, err);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, symbol, loading, cacheService, backgroundRefresh, onSuccess, onError]);

  const refresh = useCallback(async (refreshOpts: CacheRefreshOptions = {}) => {
    await loadData({ forceRefresh: true, ...refreshOpts });
  }, [loadData]);

  const clearCache = useCallback(async () => {
    if (!user?.uid || !symbol) return;

    try {
      await cacheService.clearCache(user.uid, symbol);
      setData(null);
      setFromCache(false);
      setIsFresh(false);
      setLastRefresh(null);
      console.log(`Cache cleared for ${symbol}`);
    } catch (err) {
      console.error(`Failed to clear cache for ${symbol}:`, err);
    }
  }, [user?.uid, symbol, cacheService]);

  // Auto-load on mount and symbol changes
  useEffect(() => {
    if (enabled && user?.uid && symbol) {
      loadData(refreshOptions);
    }
  }, [enabled, user?.uid, symbol, loadData, refreshOptions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setData(null);
      setError(null);
      setLoading(false);
      setFromCache(false);
      setIsFresh(false);
      setLastRefresh(null);
    };
  }, [symbol]);

  return {
    data,
    loading,
    error,
    fromCache,
    isFresh,
    refresh,
    clearCache,
    lastRefresh,
  };
}

interface UseCacheStatisticsResult {
  /** Cache statistics */
  statistics: CacheStatistics | null;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh statistics */
  refresh: () => Promise<void>;
}

/**
 * Hook for accessing cache statistics
 */
export function useCacheStatistics(): UseCacheStatisticsResult {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState<CacheStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheService = useMemo(() => FinancialDataCacheService.getInstance(), []);

  const loadStatistics = useCallback(async () => {
    if (!user?.uid || loading) return;

    setLoading(true);
    setError(null);

    try {
      const stats = await cacheService.getCacheStatistics(user.uid);
      setStatistics(stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cache statistics';
      console.error('Failed to load cache statistics:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, loading, cacheService]);

  const refresh = useCallback(async () => {
    await loadStatistics();
  }, [loadStatistics]);

  // Auto-load on mount
  useEffect(() => {
    if (user?.uid) {
      loadStatistics();
    }
  }, [user?.uid, loadStatistics]);

  return {
    statistics,
    loading,
    error,
    refresh,
  };
}

interface UseCachedSymbolsResult {
  /** List of cached symbols */
  symbols: string[];
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh symbol list */
  refresh: () => Promise<void>;
  /** Clear cache for all symbols */
  clearAll: () => Promise<void>;
}

/**
 * Hook for managing all cached symbols for the current user
 */
export function useCachedSymbols(): UseCachedSymbolsResult {
  const { user } = useAuth();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheService = useMemo(() => FinancialDataCacheService.getInstance(), []);

  const loadSymbols = useCallback(async () => {
    if (!user?.uid || loading) return;

    setLoading(true);
    setError(null);

    try {
      const cachedSymbols = await cacheService.getCachedSymbols(user.uid);
      setSymbols(cachedSymbols);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cached symbols';
      console.error('Failed to load cached symbols:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, loading, cacheService]);

  const refresh = useCallback(async () => {
    await loadSymbols();
  }, [loadSymbols]);

  const clearAll = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const clearedCount = await cacheService.clearCache(user.uid);
      setSymbols([]);
      console.log(`Cleared cache for ${clearedCount} symbols`);
    } catch (err) {
      console.error('Failed to clear all cache:', err);
    }
  }, [user?.uid, cacheService]);

  // Auto-load on mount
  useEffect(() => {
    if (user?.uid) {
      loadSymbols();
    }
  }, [user?.uid, loadSymbols]);

  return {
    symbols,
    loading,
    error,
    refresh,
    clearAll,
  };
}

/**
 * Hook for bulk operations on multiple symbols
 */
export function useBulkFinancialCache() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, CacheOperationResult>>({});

  const cacheService = useMemo(() => FinancialDataCacheService.getInstance(), []);

  const refreshMultiple = useCallback(async (
    symbols: string[], 
    options: CacheRefreshOptions = {}
  ) => {
    if (!user?.uid || symbols.length === 0) return;

    setLoading(true);
    setResults({});

    const operationResults: Record<string, CacheOperationResult> = {};

    // Process symbols concurrently with limit to avoid overwhelming the API
    const BATCH_SIZE = 3;
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      
      await Promise.allSettled(
        batch.map(async (symbol) => {
          try {
            await cacheService.refreshCache(user.uid, symbol, options);
            operationResults[symbol] = { success: true, entryId: symbol };
          } catch (error) {
            operationResults[symbol] = { 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );
    }

    setResults(operationResults);
    setLoading(false);
  }, [user?.uid, cacheService]);

  const clearMultiple = useCallback(async (symbols: string[]) => {
    if (!user?.uid || symbols.length === 0) return;

    setLoading(true);

    const operationResults: Record<string, CacheOperationResult> = {};

    await Promise.allSettled(
      symbols.map(async (symbol) => {
        try {
          await cacheService.clearCache(user.uid, symbol);
          operationResults[symbol] = { success: true, entryId: symbol };
        } catch (error) {
          operationResults[symbol] = { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    setResults(operationResults);
    setLoading(false);
  }, [user?.uid, cacheService]);

  return {
    loading,
    results,
    refreshMultiple,
    clearMultiple,
  };
}