/**
 * Financial Data Cache Service - Main Cache Orchestrator
 * 
 * This service provides intelligent caching for financial data with:
 * - Smart cache invalidation based on earnings detection
 * - Multi-tier storage strategy (localStorage + Firestore)
 * - Automatic background refresh capabilities
 * - Comprehensive error handling and statistics
 */

import type { 
  CompanyFinancials,
} from '../types/index';
import type {
  ICacheStrategy,
  FinancialCacheEntry,
  CacheOperationResult,
  CacheStatistics,
  CacheRefreshOptions,
  CacheConfig,
  EarningsDetectionResult
} from '../types/financialCache';
import {
  DEFAULT_CACHE_CONFIG
} from '../types/financialCache';
import { fmpApi } from './fmpApi';
import { createCacheStrategy } from './CacheStrategy';
import { errorHandler } from './ErrorHandler';
import { 
  analyzeFilingDates, 
  isCacheStaleBasedOnEarnings,
  isEarningsSeason
} from '../utils/earningsDetection';

/**
 * Main Financial Data Cache Service
 * Orchestrates caching strategy with smart invalidation and background refresh
 */
class FinancialDataCacheService {
  private static instance: FinancialDataCacheService;
  private cacheStrategy: ICacheStrategy;
  private config: CacheConfig;
  private backgroundRefreshes: Set<string> = new Set();

  private constructor() {
    this.config = { ...DEFAULT_CACHE_CONFIG };
    this.cacheStrategy = createCacheStrategy('hybrid');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): FinancialDataCacheService {
    if (!FinancialDataCacheService.instance) {
      FinancialDataCacheService.instance = new FinancialDataCacheService();
    }
    return FinancialDataCacheService.instance;
  }

  /**
   * Get current cache configuration
   */
  public getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  public updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Reinitialize strategy if storage preferences changed
    const hasStorageChange = 
      config.useLocalStorage !== undefined || 
      config.useFirestore !== undefined;
    
    if (hasStorageChange) {
      if (this.config.useLocalStorage && this.config.useFirestore) {
        this.cacheStrategy = createCacheStrategy('hybrid');
      } else if (this.config.useLocalStorage) {
        this.cacheStrategy = createCacheStrategy('localStorage');
      } else if (this.config.useFirestore) {
        this.cacheStrategy = createCacheStrategy('firestore');
      }
    }

    errorHandler.logSuccess('Cache configuration updated', {
      operation: 'updateConfig',
      metadata: { newConfig: config }
    });
  }

  /**
   * Get comprehensive company financial data with intelligent caching
   */
  public async getCompanyData(
    userId: string, 
    symbol: string, 
    options: CacheRefreshOptions = {}
  ): Promise<CompanyFinancials> {
    try {
      if (!userId) {
        throw new Error('User ID is required for cache operations');
      }

      const cacheKey = symbol.toUpperCase();
      
      errorHandler.logSuccess(`Fetching data for ${cacheKey}`, {
        operation: 'getCompanyData',
        userId,
        symbol: cacheKey
      });

      // Check if force refresh is requested
      if (options.forceRefresh) {
        return await this.fetchFromApiAndCache(userId, cacheKey, options);
      }

      // Try to get from cache first
      const cachedEntry = await this.cacheStrategy.get(userId, cacheKey);
      
      if (cachedEntry) {
        const isCacheFresh = await this.isCacheFresh(cachedEntry);
        
        if (isCacheFresh) {
          errorHandler.logSuccess(`Cache hit for ${cacheKey}`, {
            operation: 'getCompanyData_cache_hit',
            userId,
            symbol: cacheKey
          });

          // Start background refresh if enabled and approaching expiry
          if (this.config.enableBackgroundRefresh && options.background !== false) {
            this.scheduleBackgroundRefresh(userId, cacheKey, options);
          }

          return cachedEntry.data;
        } else {
          errorHandler.logSuccess(`Cache stale for ${cacheKey}, fetching fresh data`, {
            operation: 'getCompanyData_cache_stale',
            userId,
            symbol: cacheKey
          });
        }
      }

      // Cache miss or stale - fetch from API
      return await this.fetchFromApiAndCache(userId, cacheKey, options);

    } catch (error) {
      throw errorHandler.handleRepositoryError(error, {
        operation: 'getCompanyData',
        userId,
        symbol
      });
    }
  }

  /**
   * Manually refresh cache for a specific company
   */
  public async refreshCache(
    userId: string, 
    symbol: string, 
    options: CacheRefreshOptions = {}
  ): Promise<CacheOperationResult> {
    try {
      if (!userId) {
        throw new Error('User ID is required for cache operations');
      }

      const cacheKey = symbol.toUpperCase();
      
      errorHandler.logSuccess(`Refreshing cache for ${cacheKey}`, {
        operation: 'refreshCache',
        userId,
        symbol: cacheKey
      });

      if (options.metadataOnly) {
        // Only update metadata without fetching new data
        const cachedEntry = await this.cacheStrategy.get(userId, cacheKey);
        if (cachedEntry) {
          const earningsResult = this.analyzeEarningsFromFinancials(cachedEntry.data);
          const updatedMetadata = {
            ...cachedEntry.metadata,
            nextEarningsEstimate: earningsResult.nextEarningsDate,
            lastEarningsDate: earningsResult.lastEarningsDate,
            expiresAt: options.customTtl ? 
              new Date(Date.now() + options.customTtl) : 
              cachedEntry.metadata.expiresAt
          };
          
          return await this.cacheStrategy.set(userId, cacheKey, cachedEntry.data, updatedMetadata);
        }
        
        return { success: false, error: 'No cached data found to update metadata' };
      }

      // Full refresh - fetch from API
      await this.fetchFromApiAndCache(userId, cacheKey, options);
      
      return { success: true, fromCache: false };

    } catch (error) {
      return {
        success: false,
        error: errorHandler.handleRepositoryError(error, {
          operation: 'refreshCache',
          userId,
          symbol
        }).message
      };
    }
  }

  /**
   * Get cache statistics for monitoring and debugging
   */
  public async getCacheStatistics(userId: string): Promise<CacheStatistics> {
    try {
      if (!userId) {
        throw new Error('User ID is required for cache statistics');
      }

      const stats = await this.cacheStrategy.getStatistics(userId);
      
      errorHandler.logSuccess(`Retrieved cache statistics for user`, {
        operation: 'getCacheStatistics',
        userId,
        metadata: { 
          totalEntries: stats.totalEntries,
          freshEntries: stats.freshEntries 
        }
      });

      return stats;

    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'getCacheStatistics',
        userId
      });
      
      // Return empty stats on error
      return {
        totalEntries: 0,
        freshEntries: 0,
        staleEntries: 0,
        totalSize: 0,
        hitRatio: 0,
        averageAge: 0
      };
    }
  }

  /**
   * Clear cache entries for a user
   */
  public async clearCache(userId: string, symbol?: string): Promise<number> {
    try {
      if (!userId) {
        throw new Error('User ID is required for cache operations');
      }

      let clearedCount = 0;

      if (symbol) {
        // Clear specific symbol
        const removed = await this.cacheStrategy.remove(userId, symbol.toUpperCase());
        clearedCount = removed ? 1 : 0;
        
        errorHandler.logSuccess(`Cleared cache for ${symbol}`, {
          operation: 'clearCache_single',
          userId,
          symbol
        });
      } else {
        // Clear all entries for user
        clearedCount = await this.cacheStrategy.clear(userId);
        
        errorHandler.logSuccess(`Cleared all cache entries (${clearedCount})`, {
          operation: 'clearCache_all',
          userId
        });
      }

      return clearedCount;

    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'clearCache',
        userId,
        symbol
      });
      return 0;
    }
  }

  /**
   * Get list of cached symbols for a user
   */
  public async getCachedSymbols(userId: string): Promise<string[]> {
    try {
      if (!userId) {
        return [];
      }

      return await this.cacheStrategy.getCachedSymbols(userId);
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'getCachedSymbols',
        userId
      });
      return [];
    }
  }

  /**
   * Check if cached data exists and is fresh for a symbol
   */
  public async isCached(userId: string, symbol: string): Promise<boolean> {
    try {
      if (!userId) {
        return false;
      }

      return await this.cacheStrategy.isFresh(userId, symbol.toUpperCase());
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'isCached',
        userId,
        symbol
      });
      return false;
    }
  }

  // Private helper methods

  /**
   * Fetch data from API and store in cache with intelligent metadata
   */
  private async fetchFromApiAndCache(
    userId: string, 
    symbol: string, 
    options: CacheRefreshOptions = {}
  ): Promise<CompanyFinancials> {
    try {
      // Fetch fresh data from API
      const freshData = await fmpApi.getCompanyFinancials(symbol);
      
      // Analyze earnings patterns for smart caching
      const earningsResult = this.analyzeEarningsFromFinancials(freshData);
      
      // Calculate intelligent TTL based on earnings patterns
      const ttl = options.customTtl || this.calculateIntelligentTtl(earningsResult);
      
      const metadata = {
        nextEarningsEstimate: earningsResult.nextEarningsDate,
        lastEarningsDate: earningsResult.lastEarningsDate,
        dataSource: 'api' as const,
        expiresAt: new Date(Date.now() + ttl)
      };

      // Store in cache (don't throw if cache fails)
      try {
        await this.cacheStrategy.set(userId, symbol, freshData, metadata);
        
        errorHandler.logSuccess(`Cached fresh data for ${symbol}`, {
          operation: 'fetchFromApiAndCache',
          userId,
          symbol,
          metadata: {
            ttl: ttl / (1000 * 60 * 60 * 24), // TTL in days
            nextEarningsEstimate: earningsResult.nextEarningsDate?.toISOString(),
            confidence: earningsResult.confidence
          }
        });
      } catch (cacheError) {
        // Log cache error but continue with fresh data
        errorHandler.handleCacheError(cacheError, {
          operation: 'fetchFromApiAndCache_cache',
          userId,
          symbol
        });
      }

      return freshData;

    } catch (apiError) {
      throw errorHandler.handleRepositoryError(apiError, {
        operation: 'fetchFromApiAndCache_api',
        userId,
        symbol
      });
    }
  }

  /**
   * Check if cache entry is fresh using earnings-aware logic
   */
  private async isCacheFresh(entry: FinancialCacheEntry): Promise<boolean> {
    try {
      // Standard expiration check
      const isExpired = new Date() > new Date(entry.metadata.expiresAt);
      if (isExpired) {
        return false;
      }

      // Earnings-aware staleness check
      const estimatedEarnings = entry.metadata.nextEarningsEstimate;
      const cachedAt = new Date(entry.metadata.cachedAt);
      
      const isStaleBasedOnEarnings = isCacheStaleBasedOnEarnings(cachedAt, estimatedEarnings);
      
      if (isStaleBasedOnEarnings) {
        errorHandler.logSuccess(`Cache is stale based on earnings schedule`, {
          operation: 'isCacheFresh',
          metadata: {
            symbol: entry.data.symbol,
            cachedAt: cachedAt.toISOString(),
            estimatedEarnings: estimatedEarnings?.toISOString(),
            earningsSeason: isEarningsSeason()
          }
        });
        return false;
      }

      return true;

    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'isCacheFresh',
        metadata: { symbol: entry.data.symbol }
      });
      // On error, be conservative and consider cache stale
      return false;
    }
  }

  /**
   * Analyze earnings patterns from financial data
   */
  private analyzeEarningsFromFinancials(data: CompanyFinancials): EarningsDetectionResult {
    try {
      // Extract dates from financial statements
      const dates = [
        ...data.incomeStatement.map(stmt => stmt.date),
        ...data.balanceSheet.map(stmt => stmt.date),
        ...data.cashFlowStatement.map(stmt => stmt.date)
      ];

      // Remove duplicates and sort
      const uniqueDates = Array.from(new Set(dates)).sort();

      return analyzeFilingDates(uniqueDates);

    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'analyzeEarningsFromFinancials',
        metadata: { symbol: data.symbol }
      });

      // Return minimal result on error
      return {
        confidence: 0,
        method: 'unknown'
      };
    }
  }

  /**
   * Calculate intelligent TTL based on earnings patterns and current date
   */
  private calculateIntelligentTtl(earningsResult: EarningsDetectionResult): number {
    try {
      const { nextEarningsDate, confidence, quarterlyPattern } = earningsResult;
      
      // Base TTL from config
      let ttl = this.config.defaultTtl;

      // If we have high confidence in next earnings date
      if (nextEarningsDate && confidence > 0.7) {
        const daysToEarnings = (nextEarningsDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        
        if (daysToEarnings > 0) {
          // Set TTL to expire a few days before expected earnings
          const daysBeforeEarnings = Math.min(7, Math.max(1, daysToEarnings * 0.1));
          ttl = Math.max(
            7 * 24 * 60 * 60 * 1000, // Minimum 1 week
            (daysToEarnings - daysBeforeEarnings) * 24 * 60 * 60 * 1000
          );
        }
      }

      // Adjust based on quarterly pattern confidence
      if (quarterlyPattern && confidence > 0.5) {
        // Extend TTL for companies with predictable quarterly patterns
        ttl = Math.min(ttl * 1.2, this.config.maxAge);
      }

      // During earnings season, use shorter TTL for more frequent updates
      if (isEarningsSeason()) {
        ttl = Math.min(ttl, 14 * 24 * 60 * 60 * 1000); // Max 2 weeks during earnings season
      }

      // Ensure TTL doesn't exceed maximum age
      ttl = Math.min(ttl, this.config.maxAge);

      errorHandler.logSuccess(`Calculated intelligent TTL`, {
        operation: 'calculateIntelligentTtl',
        metadata: {
          ttlDays: ttl / (1000 * 60 * 60 * 24),
          confidence,
          quarterlyPattern,
          nextEarningsDate: nextEarningsDate?.toISOString(),
          isEarningsSeason: isEarningsSeason()
        }
      });

      return ttl;

    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'calculateIntelligentTtl'
      });
      return this.config.defaultTtl;
    }
  }

  /**
   * Schedule background refresh for cache entry approaching expiry
   */
  private scheduleBackgroundRefresh(
    userId: string, 
    symbol: string, 
    options: CacheRefreshOptions
  ): void {
    const refreshKey = `${userId}_${symbol}`;
    
    // Avoid duplicate background refreshes
    if (this.backgroundRefreshes.has(refreshKey)) {
      return;
    }

    this.backgroundRefreshes.add(refreshKey);

    // Schedule refresh with a small delay to not block current operation
    setTimeout(async () => {
      try {
        await this.refreshCache(userId, symbol, { ...options, background: true });
        
        errorHandler.logSuccess(`Background refresh completed for ${symbol}`, {
          operation: 'backgroundRefresh',
          userId,
          symbol
        });
      } catch (error) {
        errorHandler.handleCacheError(error, {
          operation: 'backgroundRefresh',
          userId,
          symbol
        });
      } finally {
        this.backgroundRefreshes.delete(refreshKey);
      }
    }, 1000);
  }
}

// Export singleton instance
export const financialDataCache = FinancialDataCacheService.getInstance();

// Export service class for testing
export { FinancialDataCacheService };