/**
 * Repository interface and Firestore implementation for financial data caching
 * Provides clean abstraction over data access with user isolation and efficient caching
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  Timestamp,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { errorHandler } from '../services/ErrorHandler';
import { sanitizeForFirestore } from '../utils/firestoreHelpers';
import { safeTimestampToDate } from '../utils/timestampHelpers';
import type { CompanyFinancials } from '../types/index';
import type {
  FinancialCacheEntry,
  CacheMetadata,
  CacheStatistics,
  CacheQueryOptions,
} from '../types/financialCache';
import { CACHE_VERSION } from '../types/financialCache';

/**
 * Repository interface for financial data cache operations
 */
export interface IFinancialDataRepository {
  /**
   * Save financial data to cache
   */
  save(
    userId: string,
    symbol: string,
    data: CompanyFinancials,
    metadata?: Partial<CacheMetadata>
  ): Promise<string>;

  /**
   * Load cached financial data by symbol
   */
  load(
    userId: string,
    symbol: string
  ): Promise<FinancialCacheEntry | null>;

  /**
   * List cached financial data with filtering and sorting
   */
  list(
    userId: string,
    options?: CacheQueryOptions
  ): Promise<FinancialCacheEntry[]>;

  /**
   * Delete cached financial data by symbol
   */
  delete(userId: string, symbol: string): Promise<void>;

  /**
   * Delete all cached entries for a symbol
   */
  deleteBySymbol(userId: string, symbol: string): Promise<number>;

  /**
   * Get cache statistics for monitoring
   */
  getStatistics(userId: string): Promise<CacheStatistics>;

  /**
   * Check if cached data is fresh
   */
  isFresh(userId: string, symbol: string): Promise<boolean>;

  /**
   * Get all cached symbols for a user
   */
  getCachedSymbols(userId: string): Promise<string[]>;

  /**
   * Batch save multiple financial data entries
   */
  batchSave(
    userId: string,
    entries: Array<{
      symbol: string;
      data: CompanyFinancials;
      metadata?: Partial<CacheMetadata>;
    }>
  ): Promise<string[]>;

  /**
   * Clean up expired entries
   */
  cleanupExpired(userId: string): Promise<number>;
}

/**
 * Firestore implementation of financial data repository
 */
export class FirestoreFinancialDataRepository implements IFinancialDataRepository {
  private getCollectionRef(userId: string) {
    return collection(db, `users/${userId}/financialCache`);
  }

  private getDocRef(userId: string, symbol: string) {
    return doc(db, `users/${userId}/financialCache/${symbol.toUpperCase()}`);
  }

  private convertFromFirestore(
    doc: DocumentSnapshot,
    symbol?: string
  ): FinancialCacheEntry | null {
    if (!doc.exists()) return null;

    const firestoreData = doc.data();
    if (!firestoreData) return null;

    try {
      // Reconstruct the cache entry from Firestore data
      return {
        id: symbol || doc.id,
        userId: firestoreData.userId || '',
        data: firestoreData.data || {},
        metadata: {
          cachedAt: safeTimestampToDate(firestoreData.metadata?.cachedAt),
          expiresAt: safeTimestampToDate(firestoreData.metadata?.expiresAt),
          nextEarningsEstimate: firestoreData.metadata?.nextEarningsEstimate
            ? safeTimestampToDate(firestoreData.metadata.nextEarningsEstimate)
            : undefined,
          lastEarningsDate: firestoreData.metadata?.lastEarningsDate
            ? safeTimestampToDate(firestoreData.metadata.lastEarningsDate)
            : undefined,
          dataSource: firestoreData.metadata?.dataSource || 'api',
          version: firestoreData.metadata?.version || '1.0.0',
        },
      };
    } catch (error) {
      errorHandler.logWarning('Failed to convert Firestore document to cache entry', {
        operation: 'convertFromFirestore',
        symbol: symbol || doc.id,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      return null;
    }
  }

  private convertToFirestore(
    userId: string,
    _symbol: string,
    data: CompanyFinancials,
    metadata?: Partial<CacheMetadata>
  ): Record<string, unknown> {
    const now = Timestamp.now();
    const defaultTtl = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + defaultTtl));

    // Create the cache entry structure
    const firestoreData: Record<string, unknown> = {
      userId,
      data,
      metadata: {
        cachedAt: now,
        expiresAt: metadata?.expiresAt ? Timestamp.fromDate(metadata.expiresAt) : expiresAt,
        nextEarningsEstimate: metadata?.nextEarningsEstimate
          ? Timestamp.fromDate(metadata.nextEarningsEstimate)
          : undefined,
        lastEarningsDate: metadata?.lastEarningsDate
          ? Timestamp.fromDate(metadata.lastEarningsDate)
          : undefined,
        dataSource: metadata?.dataSource || 'api',
        version: metadata?.version || CACHE_VERSION,
      },
    };

    // Sanitize data to prevent Firestore undefined field errors
    return sanitizeForFirestore(firestoreData);
  }

  async save(
    userId: string,
    symbol: string,
    data: CompanyFinancials,
    metadata?: Partial<CacheMetadata>
  ): Promise<string> {
    if (!userId) {
      throw new Error('User ID is required for saving financial cache');
    }

    if (!symbol) {
      throw new Error('Symbol is required for saving financial cache');
    }

    // Use symbol as document ID for easy retrieval and prevent duplicates
    const docRef = this.getDocRef(userId, symbol);
    const firestoreData = this.convertToFirestore(userId, symbol, data, metadata);

    try {
      await setDoc(docRef, firestoreData);
      const entryId = symbol.toUpperCase();
      
      errorHandler.logSuccess(`Cached financial data for ${entryId}`, {
        operation: 'save',
        userId,
        symbol: entryId,
      });
      
      return entryId;
    } catch (error) {
      throw errorHandler.handleRepositoryError(error, {
        operation: 'save financial cache',
        userId,
        symbol,
      });
    }
  }

  async load(userId: string, symbol: string): Promise<FinancialCacheEntry | null> {
    if (!userId || !symbol) {
      throw new Error('User ID and symbol are required');
    }

    try {
      const docRef = this.getDocRef(userId, symbol);
      const docSnap = await getDoc(docRef);
      return this.convertFromFirestore(docSnap, symbol.toUpperCase());
    } catch (error) {
      throw errorHandler.handleRepositoryError(error, {
        operation: 'load financial cache',
        userId,
        symbol,
      });
    }
  }

  async list(
    userId: string,
    options: CacheQueryOptions = {}
  ): Promise<FinancialCacheEntry[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const collectionRef = this.getCollectionRef(userId);
      let q = query(collectionRef);

      // Apply symbol filter if specified
      if (options.symbols && options.symbols.length > 0) {
        // For multiple symbols, we need to fetch all and filter client-side
        // Firestore doesn't support 'in' queries with more than 10 items
        if (options.symbols.length <= 10) {
          // Use Firestore 'in' query for small lists
          const upperSymbols = options.symbols.map(s => s.toUpperCase());
          q = query(q, where('data.symbol', 'in', upperSymbols));
        }
        // For larger lists, we'll filter client-side after fetching all
      }

      // Add ordering - use simple fields to avoid complex indexes
      try {
        if (options.sortBy === 'cachedAt') {
          q = query(q, orderBy('metadata.cachedAt', options.sortOrder || 'desc'));
        } else if (options.sortBy === 'expiresAt') {
          q = query(q, orderBy('metadata.expiresAt', options.sortOrder || 'desc'));
        } else if (options.sortBy === 'symbol') {
          q = query(q, orderBy('data.symbol', options.sortOrder || 'asc'));
        } else {
          // Default ordering
          q = query(q, orderBy('metadata.cachedAt', 'desc'));
        }
      } catch (orderError) {
        // If ordering fails due to missing index, proceed without it
        errorHandler.logWarning('Failed to apply ordering, using basic query', {
          operation: 'list-ordering',
          userId,
          metadata: { sortBy: options.sortBy, sortOrder: options.sortOrder } as Record<string, unknown>,
        });
      }

      // Apply limit if specified
      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      const querySnap = await getDocs(q);
      let entries = querySnap.docs
        .map(doc => this.convertFromFirestore(doc))
        .filter((entry): entry is FinancialCacheEntry => entry !== null);

      // Apply client-side filtering for complex queries
      if (options.symbols && options.symbols.length > 10) {
        const upperSymbols = new Set(options.symbols.map(s => s.toUpperCase()));
        entries = entries.filter(entry => upperSymbols.has(entry.data.symbol.toUpperCase()));
      }

      // Apply freshness filter
      if (options.onlyFresh) {
        const now = new Date();
        entries = entries.filter(entry => entry.metadata.expiresAt > now);
      }

      // Apply client-side sorting if we couldn't use Firestore ordering
      if (options.sortBy && !options.limit) {
        entries.sort((a, b) => {
          let aValue: any;
          let bValue: any;

          switch (options.sortBy) {
            case 'cachedAt':
              aValue = a.metadata.cachedAt.getTime();
              bValue = b.metadata.cachedAt.getTime();
              break;
            case 'expiresAt':
              aValue = a.metadata.expiresAt.getTime();
              bValue = b.metadata.expiresAt.getTime();
              break;
            case 'symbol':
              aValue = a.data.symbol.toUpperCase();
              bValue = b.data.symbol.toUpperCase();
              break;
            default:
              aValue = a.metadata.cachedAt.getTime();
              bValue = b.metadata.cachedAt.getTime();
          }

          if (options.sortOrder === 'asc') {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
          } else {
            return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
          }
        });
      }

      // Apply limit for client-side filtered results
      if (options.limit && entries.length > options.limit) {
        entries = entries.slice(0, options.limit);
      }

      return entries;
    } catch (error) {
      // Handle index errors gracefully
      if (error instanceof Error && error.message.includes('index')) {
        errorHandler.logWarning('Firestore index issue, falling back to basic query', {
          operation: 'list-fallback',
          userId,
          metadata: options as Record<string, unknown>,
        });

        try {
          // Fallback: Get all user entries and filter client-side
          const collectionRef = this.getCollectionRef(userId);
          const basicQuery = query(collectionRef);
          
          const querySnap = await getDocs(basicQuery);
          let entries = querySnap.docs
            .map(doc => this.convertFromFirestore(doc))
            .filter((entry): entry is FinancialCacheEntry => entry !== null);

          // Apply all filters client-side
          if (options.symbols && options.symbols.length > 0) {
            const upperSymbols = new Set(options.symbols.map(s => s.toUpperCase()));
            entries = entries.filter(entry => upperSymbols.has(entry.data.symbol.toUpperCase()));
          }

          if (options.onlyFresh) {
            const now = new Date();
            entries = entries.filter(entry => entry.metadata.expiresAt > now);
          }

          // Apply sorting
          if (options.sortBy) {
            entries.sort((a, b) => {
              let aValue: any;
              let bValue: any;

              switch (options.sortBy) {
                case 'cachedAt':
                  aValue = a.metadata.cachedAt.getTime();
                  bValue = b.metadata.cachedAt.getTime();
                  break;
                case 'expiresAt':
                  aValue = a.metadata.expiresAt.getTime();
                  bValue = b.metadata.expiresAt.getTime();
                  break;
                case 'symbol':
                  aValue = a.data.symbol.toUpperCase();
                  bValue = b.data.symbol.toUpperCase();
                  break;
                default:
                  aValue = a.metadata.cachedAt.getTime();
                  bValue = b.metadata.cachedAt.getTime();
              }

              if (options.sortOrder === 'asc') {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
              } else {
                return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
              }
            });
          }

          // Apply limit
          if (options.limit) {
            entries = entries.slice(0, options.limit);
          }

          return entries;
        } catch (fallbackError) {
          errorHandler.logWarning('Fallback query also failed, returning empty array', {
            operation: 'list-ultimate-fallback',
            userId,
          });
          return []; // Return empty array to allow app to continue
        }
      }

      throw errorHandler.handleRepositoryError(error, {
        operation: 'list financial cache',
        userId,
        metadata: options as Record<string, unknown>,
      });
    }
  }

  async delete(userId: string, symbol: string): Promise<void> {
    if (!userId || !symbol) {
      throw new Error('User ID and symbol are required');
    }

    try {
      const docRef = this.getDocRef(userId, symbol);
      await deleteDoc(docRef);
      
      errorHandler.logSuccess(`Deleted financial cache for ${symbol.toUpperCase()}`, {
        operation: 'delete',
        userId,
        symbol,
      });
    } catch (error) {
      throw errorHandler.handleRepositoryError(error, {
        operation: 'delete financial cache',
        userId,
        symbol,
      });
    }
  }

  async deleteBySymbol(userId: string, symbol: string): Promise<number> {
    if (!userId || !symbol) {
      throw new Error('User ID and symbol are required');
    }

    try {
      // Since we use symbol as document ID, this is the same as delete()
      await this.delete(userId, symbol);
      return 1; // One document deleted
    } catch (error) {
      // If document doesn't exist, return 0
      if (error instanceof Error && error.message.includes('not found')) {
        return 0;
      }
      throw error;
    }
  }

  async getStatistics(userId: string): Promise<CacheStatistics> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const entries = await this.list(userId);
      const now = new Date();
      
      const freshEntries = entries.filter(entry => entry.metadata.expiresAt > now);
      const staleEntries = entries.filter(entry => entry.metadata.expiresAt <= now);
      
      // Calculate total size (rough estimate)
      const totalSize = entries.reduce((sum, entry) => {
        return sum + JSON.stringify(entry).length;
      }, 0);
      
      // Calculate average age
      const totalAge = entries.reduce((sum, entry) => {
        const ageMs = now.getTime() - entry.metadata.cachedAt.getTime();
        return sum + (ageMs / (1000 * 60 * 60)); // Convert to hours
      }, 0);
      const averageAge = entries.length > 0 ? totalAge / entries.length : 0;
      
      // Find newest and oldest entries
      let newestEntry: string | undefined;
      let oldestEntry: string | undefined;
      let newestTime = 0;
      let oldestTime = Infinity;
      
      entries.forEach(entry => {
        const time = entry.metadata.cachedAt.getTime();
        if (time > newestTime) {
          newestTime = time;
          newestEntry = entry.data.symbol;
        }
        if (time < oldestTime) {
          oldestTime = time;
          oldestEntry = entry.data.symbol;
        }
      });

      return {
        totalEntries: entries.length,
        freshEntries: freshEntries.length,
        staleEntries: staleEntries.length,
        totalSize,
        hitRatio: freshEntries.length / Math.max(entries.length, 1), // Prevent division by zero
        averageAge,
        newestEntry,
        oldestEntry: oldestTime === Infinity ? undefined : oldestEntry,
      };
    } catch (error) {
      throw errorHandler.handleRepositoryError(error, {
        operation: 'get cache statistics',
        userId,
      });
    }
  }

  async isFresh(userId: string, symbol: string): Promise<boolean> {
    try {
      const entry = await this.load(userId, symbol);
      if (!entry) return false;
      
      const now = new Date();
      return entry.metadata.expiresAt > now;
    } catch (error) {
      errorHandler.logWarning('Failed to check cache freshness', {
        operation: 'isFresh',
        userId,
        symbol,
      });
      return false; // Assume stale on error
    }
  }

  async getCachedSymbols(userId: string): Promise<string[]> {
    try {
      const entries = await this.list(userId, { sortBy: 'symbol', sortOrder: 'asc' });
      return entries.map(entry => entry.data.symbol.toUpperCase());
    } catch (error) {
      throw errorHandler.handleRepositoryError(error, {
        operation: 'get cached symbols',
        userId,
      });
    }
  }

  async batchSave(
    userId: string,
    entries: Array<{
      symbol: string;
      data: CompanyFinancials;
      metadata?: Partial<CacheMetadata>;
    }>
  ): Promise<string[]> {
    if (!userId || !entries.length) {
      throw new Error('User ID and entries array are required');
    }

    try {
      const batch = writeBatch(db);
      const entryIds: string[] = [];

      for (const entry of entries) {
        const docRef = this.getDocRef(userId, entry.symbol);
        const firestoreData = this.convertToFirestore(
          userId,
          entry.symbol,
          entry.data,
          entry.metadata
        );
        
        batch.set(docRef, firestoreData);
        entryIds.push(entry.symbol.toUpperCase());
      }

      await batch.commit();
      
      errorHandler.logSuccess(`Batch saved ${entryIds.length} financial cache entries`, {
        operation: 'batchSave',
        userId,
        metadata: { count: entryIds.length },
      });
      
      return entryIds;
    } catch (error) {
      throw errorHandler.handleRepositoryError(error, {
        operation: 'batch save financial cache',
        userId,
        metadata: { count: entries.length },
      });
    }
  }

  async cleanupExpired(userId: string): Promise<number> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Get all entries and filter expired ones
      const entries = await this.list(userId);
      const now = new Date();
      const expiredEntries = entries.filter(entry => entry.metadata.expiresAt <= now);

      if (expiredEntries.length === 0) {
        return 0;
      }

      // Use batch delete for efficiency
      const batch = writeBatch(db);
      for (const entry of expiredEntries) {
        const docRef = this.getDocRef(userId, entry.data.symbol);
        batch.delete(docRef);
      }

      await batch.commit();
      
      errorHandler.logSuccess(`Cleaned up ${expiredEntries.length} expired cache entries`, {
        operation: 'cleanupExpired',
        userId,
        metadata: { count: expiredEntries.length },
      });

      return expiredEntries.length;
    } catch (error) {
      throw errorHandler.handleRepositoryError(error, {
        operation: 'cleanup expired cache',
        userId,
      });
    }
  }
}

// Export singleton instance
export const financialDataRepository = new FirestoreFinancialDataRepository();