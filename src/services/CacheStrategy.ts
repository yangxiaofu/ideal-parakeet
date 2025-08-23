/**
 * Cache Strategy Implementation - Strategy Pattern for Financial Data Caching
 * 
 * Implements three concrete caching strategies:
 * 1. LocalStorageCacheStrategy - Browser localStorage with compression
 * 2. FirestoreCacheStrategy - Cloud Firestore with user-scoped storage
 * 3. HybridCacheStrategy - Intelligent multi-tier caching system
 */

import type { 
  ICacheStrategy, 
  FinancialCacheEntry, 
  CacheOperationResult, 
  CacheStatistics, 
  CacheMetadata
} from '../types/financialCache';
import {
  CACHE_KEYS,
  CACHE_VERSION,
  DEFAULT_CACHE_CONFIG
} from '../types/financialCache';
import type { CompanyFinancials } from '../types/index';
import { db } from './firebase';
import { errorHandler } from './ErrorHandler';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  writeBatch
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';

/**
 * Utility functions for cache operations
 */
class CacheUtils {
  /**
   * Generate unique cache entry ID
   */
  static generateCacheId(userId: string, symbol: string): string {
    return `${userId}_${symbol}_${Date.now()}`;
  }

  /**
   * Create cache metadata with defaults
   */
  static createMetadata(partial?: Partial<CacheMetadata>): CacheMetadata {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEFAULT_CACHE_CONFIG.defaultTtl);

    return {
      cachedAt: now,
      expiresAt,
      dataSource: 'api',
      version: CACHE_VERSION,
      ...partial
    };
  }

  /**
   * Calculate cache entry size in bytes
   */
  static calculateSize(entry: FinancialCacheEntry): number {
    try {
      return new Blob([JSON.stringify(entry)]).size;
    } catch {
      // Fallback estimation
      return JSON.stringify(entry).length * 2;
    }
  }

  /**
   * Compress JSON string using basic compression
   */
  static compressData(data: string): string {
    try {
      // Simple compression using JSON.stringify optimization
      const compressed = JSON.stringify(JSON.parse(data));
      return compressed;
    } catch (error) {
      errorHandler.logWarning('Data compression failed, using original', { 
        operation: 'compress',
        metadata: { error: String(error) }
      });
      return data;
    }
  }

  /**
   * Decompress JSON string
   */
  static decompressData(compressed: string): string {
    return compressed; // For now, just return as-is since we're using simple compression
  }

  /**
   * Check if cache entry is fresh
   */
  static isFresh(entry: FinancialCacheEntry): boolean {
    return new Date() < new Date(entry.metadata.expiresAt);
  }

  /**
   * Get localStorage key for symbol
   */
  static getLocalStorageKey(userId: string, symbol: string): string {
    return `${CACHE_KEYS.FINANCIAL_DATA}${userId}_${symbol}`;
  }
}

/**
 * LocalStorage Cache Strategy Implementation
 * Provides fast, local caching with size management and compression support
 */
export class LocalStorageCacheStrategy implements ICacheStrategy {
  private readonly maxSize: number;
  private readonly enableCompression: boolean;

  constructor(maxSize = DEFAULT_CACHE_CONFIG.maxCacheSize, enableCompression = false) {
    this.maxSize = maxSize;
    this.enableCompression = enableCompression;
  }

  async get(userId: string, symbol: string): Promise<FinancialCacheEntry | null> {
    try {
      const key = CacheUtils.getLocalStorageKey(userId, symbol);
      const stored = localStorage.getItem(key);
      
      if (!stored) return null;

      const data = this.enableCompression ? 
        CacheUtils.decompressData(stored) : stored;
      
      const entry: FinancialCacheEntry = JSON.parse(data);
      
      // Version check
      if (entry.metadata.version !== CACHE_VERSION) {
        await this.remove(userId, symbol);
        return null;
      }

      return entry;
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'localStorage_get',
        userId,
        symbol
      });
      return null;
    }
  }

  async set(
    userId: string, 
    symbol: string, 
    data: CompanyFinancials, 
    metadata?: Partial<CacheMetadata>
  ): Promise<CacheOperationResult> {
    try {
      const entry: FinancialCacheEntry = {
        id: CacheUtils.generateCacheId(userId, symbol),
        userId,
        data,
        metadata: CacheUtils.createMetadata(metadata)
      };

      const serialized = JSON.stringify(entry);
      const compressed = this.enableCompression ? 
        CacheUtils.compressData(serialized) : serialized;

      // Check size constraints
      const entrySize = compressed.length * 2; // Rough byte estimation
      if (entrySize > this.maxSize) {
        return {
          success: false,
          error: 'Entry too large for localStorage'
        };
      }

      // Check total cache size and cleanup if needed
      await this.cleanupIfNeeded(entrySize, userId);

      const key = CacheUtils.getLocalStorageKey(userId, symbol);
      localStorage.setItem(key, compressed);

      errorHandler.logSuccess(`Cached ${symbol} in localStorage`, {
        operation: 'localStorage_set',
        userId,
        symbol
      });

      return {
        success: true,
        entryId: entry.id,
        fromCache: false
      };
    } catch (error) {
      return {
        success: false,
        error: errorHandler.handleRepositoryError(error, {
          operation: 'localStorage_set',
          userId,
          symbol
        }).message
      };
    }
  }

  async remove(userId: string, symbol: string): Promise<boolean> {
    try {
      const key = CacheUtils.getLocalStorageKey(userId, symbol);
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'localStorage_remove',
        userId,
        symbol
      });
      return false;
    }
  }

  async clear(userId: string): Promise<number> {
    let removedCount = 0;
    try {
      const prefix = `${CACHE_KEYS.FINANCIAL_DATA}${userId}_`;
      const keysToRemove: string[] = [];

      // Find all keys for this user
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      // Remove all found keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        removedCount++;
      });

      errorHandler.logSuccess(`Cleared ${removedCount} entries from localStorage`, {
        operation: 'localStorage_clear',
        userId
      });
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'localStorage_clear',
        userId
      });
    }
    return removedCount;
  }

  async getStatistics(userId: string): Promise<CacheStatistics> {
    let totalEntries = 0;
    let freshEntries = 0;
    let staleEntries = 0;
    let totalSize = 0;
    let oldestEntry: string | undefined;
    let newestEntry: string | undefined;
    let oldestDate = new Date();
    let newestDate = new Date(0);

    try {
      const prefix = `${CACHE_KEYS.FINANCIAL_DATA}${userId}_`;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(prefix)) continue;

        try {
          const stored = localStorage.getItem(key);
          if (!stored) continue;

          totalEntries++;
          totalSize += stored.length * 2;

          const entry: FinancialCacheEntry = JSON.parse(
            this.enableCompression ? CacheUtils.decompressData(stored) : stored
          );

          const cachedAt = new Date(entry.metadata.cachedAt);
          if (cachedAt > newestDate) {
            newestDate = cachedAt;
            newestEntry = entry.data.symbol;
          }
          if (cachedAt < oldestDate) {
            oldestDate = cachedAt;
            oldestEntry = entry.data.symbol;
          }

          if (CacheUtils.isFresh(entry)) {
            freshEntries++;
          } else {
            staleEntries++;
          }
        } catch {
          // Skip invalid entries
          continue;
        }
      }
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'localStorage_statistics',
        userId
      });
    }

    const averageAge = totalEntries > 0 ? 
      (Date.now() - newestDate.getTime()) / (1000 * 60 * 60) : 0;

    return {
      totalEntries,
      freshEntries,
      staleEntries,
      totalSize,
      hitRatio: 0, // Would need to track hits/misses for this
      averageAge,
      newestEntry,
      oldestEntry
    };
  }

  async isFresh(userId: string, symbol: string): Promise<boolean> {
    const entry = await this.get(userId, symbol);
    return entry ? CacheUtils.isFresh(entry) : false;
  }

  async getCachedSymbols(userId: string): Promise<string[]> {
    const symbols: string[] = [];
    try {
      const prefix = `${CACHE_KEYS.FINANCIAL_DATA}${userId}_`;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(prefix)) continue;

        try {
          const stored = localStorage.getItem(key);
          if (!stored) continue;

          const entry: FinancialCacheEntry = JSON.parse(
            this.enableCompression ? CacheUtils.decompressData(stored) : stored
          );
          symbols.push(entry.data.symbol);
        } catch {
          // Skip invalid entries
          continue;
        }
      }
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'localStorage_getCachedSymbols',
        userId
      });
    }
    return symbols;
  }

  /**
   * Cleanup localStorage if approaching size limits
   */
  private async cleanupIfNeeded(newEntrySize: number, userId: string): Promise<void> {
    try {
      const stats = await this.getStatistics(userId);
      const projectedSize = stats.totalSize + newEntrySize;

      if (projectedSize > this.maxSize) {
        // Remove stale entries first
        const symbols = await this.getCachedSymbols(userId);
        let removedSize = 0;

        for (const symbol of symbols) {
          const entry = await this.get(userId, symbol);
          if (entry && !CacheUtils.isFresh(entry)) {
            await this.remove(userId, symbol);
            removedSize += CacheUtils.calculateSize(entry);
            
            // Stop if we've freed enough space
            if (projectedSize - removedSize < this.maxSize * 0.8) {
              break;
            }
          }
        }

        errorHandler.logSuccess(`Cleaned up ${removedSize} bytes from localStorage`, {
          operation: 'localStorage_cleanup',
          userId
        });
      }
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'localStorage_cleanup',
        userId
      });
    }
  }
}

/**
 * Firestore Cache Strategy Implementation
 * Provides cloud-based persistent caching with user-scoped document storage
 */
export class FirestoreCacheStrategy implements ICacheStrategy {
  private readonly collectionName = 'financialCache';

  private getDocPath(userId: string, symbol: string): string {
    return `users/${userId}/${this.collectionName}/${symbol}`;
  }

  async get(userId: string, symbol: string): Promise<FinancialCacheEntry | null> {
    try {
      const docRef = doc(db, this.getDocPath(userId, symbol));
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;

      const data = docSnap.data() as DocumentData;
      
      // Version check
      if (data.metadata?.version !== CACHE_VERSION) {
        await this.remove(userId, symbol);
        return null;
      }

      const entry: FinancialCacheEntry = {
        id: data.id,
        userId: data.userId,
        data: data.data,
        metadata: {
          ...data.metadata,
          cachedAt: data.metadata.cachedAt.toDate(),
          expiresAt: data.metadata.expiresAt.toDate(),
          nextEarningsEstimate: data.metadata.nextEarningsEstimate?.toDate(),
          lastEarningsDate: data.metadata.lastEarningsDate?.toDate(),
        }
      };

      return entry;
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'firestore_get',
        userId,
        symbol
      });
      return null;
    }
  }

  async set(
    userId: string, 
    symbol: string, 
    data: CompanyFinancials, 
    metadata?: Partial<CacheMetadata>
  ): Promise<CacheOperationResult> {
    try {
      const entry: FinancialCacheEntry = {
        id: CacheUtils.generateCacheId(userId, symbol),
        userId,
        data,
        metadata: CacheUtils.createMetadata(metadata)
      };

      const docRef = doc(db, this.getDocPath(userId, symbol));
      await setDoc(docRef, entry);

      errorHandler.logSuccess(`Cached ${symbol} in Firestore`, {
        operation: 'firestore_set',
        userId,
        symbol
      });

      return {
        success: true,
        entryId: entry.id,
        fromCache: false
      };
    } catch (error) {
      return {
        success: false,
        error: errorHandler.handleRepositoryError(error, {
          operation: 'firestore_set',
          userId,
          symbol
        }).message
      };
    }
  }

  async remove(userId: string, symbol: string): Promise<boolean> {
    try {
      const docRef = doc(db, this.getDocPath(userId, symbol));
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'firestore_remove',
        userId,
        symbol
      });
      return false;
    }
  }

  async clear(userId: string): Promise<number> {
    let removedCount = 0;
    try {
      const collectionRef = collection(db, `users/${userId}/${this.collectionName}`);
      const querySnapshot = await getDocs(collectionRef);
      
      if (querySnapshot.empty) return 0;

      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        removedCount++;
      });

      await batch.commit();

      errorHandler.logSuccess(`Cleared ${removedCount} entries from Firestore`, {
        operation: 'firestore_clear',
        userId
      });
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'firestore_clear',
        userId
      });
    }
    return removedCount;
  }

  async getStatistics(userId: string): Promise<CacheStatistics> {
    let totalEntries = 0;
    let freshEntries = 0;
    let staleEntries = 0;
    let totalSize = 0;
    let oldestEntry: string | undefined;
    let newestEntry: string | undefined;
    let oldestDate = new Date();
    let newestDate = new Date(0);

    try {
      const collectionRef = collection(db, `users/${userId}/${this.collectionName}`);
      const querySnapshot = await getDocs(collectionRef);

      querySnapshot.forEach(doc => {
        try {
          const data = doc.data() as DocumentData;
          totalEntries++;
          totalSize += JSON.stringify(data).length * 2;

          const cachedAt = data.metadata.cachedAt.toDate();
          if (cachedAt > newestDate) {
            newestDate = cachedAt;
            newestEntry = data.data.symbol;
          }
          if (cachedAt < oldestDate) {
            oldestDate = cachedAt;
            oldestEntry = data.data.symbol;
          }

          const entry: FinancialCacheEntry = {
            id: data.id,
            userId: data.userId,
            data: data.data,
            metadata: {
              ...data.metadata,
              cachedAt: data.metadata.cachedAt.toDate(),
              expiresAt: data.metadata.expiresAt.toDate(),
              nextEarningsEstimate: data.metadata.nextEarningsEstimate?.toDate(),
              lastEarningsDate: data.metadata.lastEarningsDate?.toDate(),
            }
          };

          if (CacheUtils.isFresh(entry)) {
            freshEntries++;
          } else {
            staleEntries++;
          }
        } catch {
          // Skip invalid entries
        }
      });
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'firestore_statistics',
        userId
      });
    }

    const averageAge = totalEntries > 0 ? 
      (Date.now() - newestDate.getTime()) / (1000 * 60 * 60) : 0;

    return {
      totalEntries,
      freshEntries,
      staleEntries,
      totalSize,
      hitRatio: 0, // Would need to track hits/misses for this
      averageAge,
      newestEntry,
      oldestEntry
    };
  }

  async isFresh(userId: string, symbol: string): Promise<boolean> {
    const entry = await this.get(userId, symbol);
    return entry ? CacheUtils.isFresh(entry) : false;
  }

  async getCachedSymbols(userId: string): Promise<string[]> {
    const symbols: string[] = [];
    try {
      const collectionRef = collection(db, `users/${userId}/${this.collectionName}`);
      const querySnapshot = await getDocs(collectionRef);

      querySnapshot.forEach(doc => {
        try {
          const data = doc.data() as DocumentData;
          symbols.push(data.data.symbol);
        } catch {
          // Skip invalid entries
        }
      });
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'firestore_getCachedSymbols',
        userId
      });
    }
    return symbols;
  }
}

/**
 * Hybrid Cache Strategy Implementation
 * Intelligently combines localStorage (fast) and Firestore (persistent) caching
 * with automatic promotion/demotion between tiers based on access patterns
 */
export class HybridCacheStrategy implements ICacheStrategy {
  private readonly localStorage: LocalStorageCacheStrategy;
  private readonly firestore: FirestoreCacheStrategy;
  private readonly recentAccessThreshold = 30 * 24 * 60 * 60 * 1000; // 30 days

  constructor() {
    this.localStorage = new LocalStorageCacheStrategy();
    this.firestore = new FirestoreCacheStrategy();
  }

  async get(userId: string, symbol: string): Promise<FinancialCacheEntry | null> {
    try {
      // Try localStorage first (faster)
      let entry = await this.localStorage.get(userId, symbol);
      
      if (entry) {
        errorHandler.logSuccess(`Cache hit: ${symbol} from localStorage`, {
          operation: 'hybrid_get_localStorage',
          userId,
          symbol
        });
        return entry;
      }

      // Fallback to Firestore
      entry = await this.firestore.get(userId, symbol);
      
      if (entry) {
        errorHandler.logSuccess(`Cache hit: ${symbol} from Firestore`, {
          operation: 'hybrid_get_firestore',
          userId,
          symbol
        });

        // Promote to localStorage if recently accessed
        if (this.shouldPromoteToLocalStorage(entry)) {
          await this.localStorage.set(userId, symbol, entry.data, entry.metadata);
          errorHandler.logSuccess(`Promoted ${symbol} to localStorage`, {
            operation: 'hybrid_promote',
            userId,
            symbol
          });
        }

        return entry;
      }

      return null;
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'hybrid_get',
        userId,
        symbol
      });
      return null;
    }
  }

  async set(
    userId: string, 
    symbol: string, 
    data: CompanyFinancials, 
    metadata?: Partial<CacheMetadata>
  ): Promise<CacheOperationResult> {
    try {
      // Always store in both initially for redundancy
      const [localResult, firestoreResult] = await Promise.allSettled([
        this.localStorage.set(userId, symbol, data, metadata),
        this.firestore.set(userId, symbol, data, metadata)
      ]);

      // Return success if at least one succeeded
      const localSuccess = localResult.status === 'fulfilled' && localResult.value.success;
      const firestoreSuccess = firestoreResult.status === 'fulfilled' && firestoreResult.value.success;

      if (localSuccess || firestoreSuccess) {
        const sources = [
          localSuccess ? 'localStorage' : '',
          firestoreSuccess ? 'Firestore' : ''
        ].filter(Boolean).join(' + ');

        errorHandler.logSuccess(`Cached ${symbol} in ${sources}`, {
          operation: 'hybrid_set',
          userId,
          symbol
        });

        return {
          success: true,
          entryId: localSuccess ? 
            (localResult.status === 'fulfilled' ? localResult.value.entryId : symbol) : 
            (firestoreResult.status === 'fulfilled' ? firestoreResult.value.entryId : symbol),
          fromCache: false
        };
      }

      // Both failed
      const errors = [
        localResult.status === 'rejected' ? localResult.reason : 
          (localResult.status === 'fulfilled' && !localResult.value.success ? localResult.value.error : null),
        firestoreResult.status === 'rejected' ? firestoreResult.reason :
          (firestoreResult.status === 'fulfilled' && !firestoreResult.value.success ? firestoreResult.value.error : null)
      ].filter(Boolean);

      return {
        success: false,
        error: `All cache strategies failed: ${errors.join('; ')}`
      };
    } catch (error) {
      return {
        success: false,
        error: errorHandler.handleRepositoryError(error, {
          operation: 'hybrid_set',
          userId,
          symbol
        }).message
      };
    }
  }

  async remove(userId: string, symbol: string): Promise<boolean> {
    try {
      const [localResult, firestoreResult] = await Promise.allSettled([
        this.localStorage.remove(userId, symbol),
        this.firestore.remove(userId, symbol)
      ]);

      // Return true if at least one succeeded
      const localSuccess = localResult.status === 'fulfilled' && localResult.value;
      const firestoreSuccess = firestoreResult.status === 'fulfilled' && firestoreResult.value;

      return localSuccess || firestoreSuccess;
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'hybrid_remove',
        userId,
        symbol
      });
      return false;
    }
  }

  async clear(userId: string): Promise<number> {
    try {
      const [localCount, firestoreCount] = await Promise.allSettled([
        this.localStorage.clear(userId),
        this.firestore.clear(userId)
      ]);

      const localCleared = localCount.status === 'fulfilled' ? localCount.value : 0;
      const firestoreCleared = firestoreCount.status === 'fulfilled' ? firestoreCount.value : 0;

      // Return total unique entries cleared (avoiding double counting)
      return Math.max(localCleared, firestoreCleared);
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'hybrid_clear',
        userId
      });
      return 0;
    }
  }

  async getStatistics(userId: string): Promise<CacheStatistics> {
    try {
      const [localStats, firestoreStats] = await Promise.allSettled([
        this.localStorage.getStatistics(userId),
        this.firestore.getStatistics(userId)
      ]);

      const local = localStats.status === 'fulfilled' ? localStats.value : {
        totalEntries: 0, freshEntries: 0, staleEntries: 0, totalSize: 0,
        hitRatio: 0, averageAge: 0
      };

      const firestore = firestoreStats.status === 'fulfilled' ? firestoreStats.value : {
        totalEntries: 0, freshEntries: 0, staleEntries: 0, totalSize: 0,
        hitRatio: 0, averageAge: 0
      };

      return {
        totalEntries: local.totalEntries + firestore.totalEntries,
        freshEntries: local.freshEntries + firestore.freshEntries,
        staleEntries: local.staleEntries + firestore.staleEntries,
        totalSize: local.totalSize + firestore.totalSize,
        hitRatio: (local.hitRatio + firestore.hitRatio) / 2,
        averageAge: (local.averageAge + firestore.averageAge) / 2,
        newestEntry: local.newestEntry || firestore.newestEntry,
        oldestEntry: local.oldestEntry || firestore.oldestEntry
      };
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'hybrid_statistics',
        userId
      });
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

  async isFresh(userId: string, symbol: string): Promise<boolean> {
    // Check localStorage first, then Firestore
    const localFresh = await this.localStorage.isFresh(userId, symbol);
    if (localFresh) return true;

    return await this.firestore.isFresh(userId, symbol);
  }

  async getCachedSymbols(userId: string): Promise<string[]> {
    try {
      const [localSymbols, firestoreSymbols] = await Promise.allSettled([
        this.localStorage.getCachedSymbols(userId),
        this.firestore.getCachedSymbols(userId)
      ]);

      const local = localSymbols.status === 'fulfilled' ? localSymbols.value : [];
      const firestore = firestoreSymbols.status === 'fulfilled' ? firestoreSymbols.value : [];

      // Return unique symbols from both sources
      return Array.from(new Set([...local, ...firestore]));
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'hybrid_getCachedSymbols',
        userId
      });
      return [];
    }
  }

  /**
   * Determine if an entry should be promoted to localStorage
   */
  private shouldPromoteToLocalStorage(entry: FinancialCacheEntry): boolean {
    const age = Date.now() - new Date(entry.metadata.cachedAt).getTime();
    return age < this.recentAccessThreshold && CacheUtils.isFresh(entry);
  }

  /**
   * Perform intelligent cache management
   * Move old localStorage entries to Firestore only
   */
  async optimizeCacheDistribution(userId: string): Promise<void> {
    try {
      const localSymbols = await this.localStorage.getCachedSymbols(userId);
      
      for (const symbol of localSymbols) {
        const entry = await this.localStorage.get(userId, symbol);
        if (!entry) continue;

        // Demote old entries from localStorage to Firestore only
        if (!this.shouldPromoteToLocalStorage(entry)) {
          // Ensure it's in Firestore
          await this.firestore.set(userId, symbol, entry.data, entry.metadata);
          // Remove from localStorage
          await this.localStorage.remove(userId, symbol);
          
          errorHandler.logSuccess(`Demoted ${symbol} from localStorage to Firestore`, {
            operation: 'hybrid_demote',
            userId,
            symbol
          });
        }
      }
    } catch (error) {
      errorHandler.handleCacheError(error, {
        operation: 'hybrid_optimize',
        userId
      });
    }
  }
}

// Export default strategy factory
export function createCacheStrategy(type: 'localStorage' | 'firestore' | 'hybrid' = 'hybrid'): ICacheStrategy {
  switch (type) {
    case 'localStorage':
      return new LocalStorageCacheStrategy();
    case 'firestore':
      return new FirestoreCacheStrategy();
    case 'hybrid':
    default:
      return new HybridCacheStrategy();
  }
}

// Factory function is already exported above on line 930