/**
 * Financial data caching types and interfaces
 * Provides comprehensive type safety for the caching system
 */

import type { CompanyFinancials } from './index';

/**
 * Cache entry metadata for tracking freshness and validity
 */
export interface CacheMetadata {
  /** Timestamp when data was cached */
  cachedAt: Date;
  /** Timestamp when data should be considered stale */
  expiresAt: Date;
  /** Estimated next earnings date */
  nextEarningsEstimate?: Date;
  /** Last known earnings date */
  lastEarningsDate?: Date;
  /** Source of the data (api, manual, estimated) */
  dataSource: 'api' | 'manual' | 'estimated';
  /** Cache version for schema migrations */
  version: string;
}

/**
 * Complete cache entry with data and metadata
 */
export interface FinancialCacheEntry {
  /** Company financial data */
  data: CompanyFinancials;
  /** Cache metadata for invalidation logic */
  metadata: CacheMetadata;
  /** Unique identifier for the cache entry */
  id: string;
  /** User ID who owns this cache */
  userId: string;
}

/**
 * Cache operation result with success/failure information
 */
export interface CacheOperationResult {
  /** Whether operation was successful */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
  /** Cache entry ID if successful */
  entryId?: string;
  /** Whether data came from cache vs API */
  fromCache?: boolean;
}

/**
 * Cache statistics for monitoring and debugging
 */
export interface CacheStatistics {
  /** Total number of cached entries */
  totalEntries: number;
  /** Number of fresh (valid) entries */
  freshEntries: number;
  /** Number of stale entries */
  staleEntries: number;
  /** Total cache size in bytes */
  totalSize: number;
  /** Cache hit ratio (0-1) */
  hitRatio: number;
  /** Average age of cache entries in hours */
  averageAge: number;
  /** Most recently cached symbol */
  newestEntry?: string;
  /** Oldest cached symbol */
  oldestEntry?: string;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Default TTL in milliseconds (default: 90 days for quarterly earnings) */
  defaultTtl: number;
  /** Maximum cache size in bytes */
  maxCacheSize: number;
  /** Whether to use localStorage caching */
  useLocalStorage: boolean;
  /** Whether to use Firestore caching */
  useFirestore: boolean;
  /** Whether to compress data before storage */
  enableCompression: boolean;
  /** Maximum age before forced refresh (in ms) */
  maxAge: number;
  /** Enable background refresh */
  enableBackgroundRefresh: boolean;
}

/**
 * Earnings detection result
 */
export interface EarningsDetectionResult {
  /** Estimated next earnings date */
  nextEarningsDate?: Date;
  /** Confidence level (0-1) */
  confidence: number;
  /** Method used for detection */
  method: 'pattern' | 'api' | 'manual' | 'unknown';
  /** Last known earnings date */
  lastEarningsDate?: Date;
  /** Quarterly pattern detected */
  quarterlyPattern?: boolean;
}

/**
 * Cache strategy interface for implementing different storage methods
 */
export interface ICacheStrategy {
  /** Get cached data for a symbol */
  get(userId: string, symbol: string): Promise<FinancialCacheEntry | null>;
  
  /** Store data in cache */
  set(userId: string, symbol: string, data: CompanyFinancials, metadata?: Partial<CacheMetadata>): Promise<CacheOperationResult>;
  
  /** Remove data from cache */
  remove(userId: string, symbol: string): Promise<boolean>;
  
  /** Clear all cache for a user */
  clear(userId: string): Promise<number>;
  
  /** Get cache statistics */
  getStatistics(userId: string): Promise<CacheStatistics>;
  
  /** Check if entry is fresh */
  isFresh(userId: string, symbol: string): Promise<boolean>;
  
  /** Get all cached symbols for a user */
  getCachedSymbols(userId: string): Promise<string[]>;
}

/**
 * Cache refresh options
 */
export interface CacheRefreshOptions {
  /** Force refresh even if cache is fresh */
  forceRefresh?: boolean;
  /** Update only metadata without fetching new data */
  metadataOnly?: boolean;
  /** Background refresh (don't block UI) */
  background?: boolean;
  /** Custom TTL for this refresh */
  customTtl?: number;
}

/**
 * Cache query options for filtering and sorting
 */
export interface CacheQueryOptions {
  /** Filter by freshness */
  onlyFresh?: boolean;
  /** Filter by symbols */
  symbols?: string[];
  /** Sort order */
  sortBy?: 'cachedAt' | 'expiresAt' | 'symbol';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Limit results */
  limit?: number;
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTtl: 90 * 24 * 60 * 60 * 1000, // 90 days
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  useLocalStorage: true,
  useFirestore: true,
  enableCompression: false,
  maxAge: 180 * 24 * 60 * 60 * 1000, // 180 days maximum
  enableBackgroundRefresh: true,
};

/**
 * Cache version for schema migrations
 */
export const CACHE_VERSION = '1.0.0';

/**
 * Cache key prefixes for different storage types
 */
export const CACHE_KEYS = {
  FINANCIAL_DATA: 'financial_cache_',
  METADATA: 'cache_metadata_',
  STATISTICS: 'cache_stats_',
  VERSION: 'cache_version',
} as const;