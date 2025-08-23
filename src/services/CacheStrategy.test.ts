import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import {
  LocalStorageCacheStrategy,
  FirestoreCacheStrategy,
  HybridCacheStrategy,
  createCacheStrategy,
} from './CacheStrategy';
import { mockUser, mockCompanyFinancials } from '../test-utils';
import type { 
  CacheMetadata, 
  FinancialCacheEntry, 
  CacheStatistics,
  ICacheStrategy 
} from '../types/financialCache';
import type { CompanyFinancials } from '../types';

// Mock Firebase Firestore
const mockFirestore = {
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  writeBatch: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
};

const mockDocSnap = {
  exists: vi.fn(),
  data: vi.fn(),
};

const mockQuerySnapshot = {
  empty: false,
  docs: [] as any[],
  forEach: vi.fn(),
};

const mockBatch = {
  delete: vi.fn(),
  commit: vi.fn(),
};

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  doc: mockFirestore.doc,
  getDoc: mockFirestore.getDoc,
  setDoc: mockFirestore.setDoc,
  deleteDoc: mockFirestore.deleteDoc,
  collection: mockFirestore.collection,
  getDocs: mockFirestore.getDocs,
  writeBatch: () => mockBatch,
  query: mockFirestore.query,
  where: mockFirestore.where,
  orderBy: mockFirestore.orderBy,
}));

// Mock error handler
const mockErrorHandler = {
  logSuccess: vi.fn(),
  logWarning: vi.fn(),
  handleCacheError: vi.fn(),
  handleRepositoryError: vi.fn().mockReturnValue({ message: 'Mocked error' }),
};

vi.mock('./ErrorHandler', () => ({
  errorHandler: mockErrorHandler,
}));

// Mock Firebase service
vi.mock('./firebase', () => ({
  db: mockFirestore,
}));

describe('CacheStrategy Implementations', () => {
  let testFinancialData: CompanyFinancials;
  let testMetadata: Partial<CacheMetadata>;
  const userId = mockUser.uid;
  const symbol = 'AAPL';

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Clear localStorage
    localStorage.clear();

    // Reset mock implementations
    mockFirestore.doc.mockReturnValue({});
    mockFirestore.getDoc.mockResolvedValue(mockDocSnap);
    mockFirestore.setDoc.mockResolvedValue(undefined);
    mockFirestore.deleteDoc.mockResolvedValue(undefined);
    mockFirestore.collection.mockReturnValue({});
    mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);
    
    mockDocSnap.exists.mockReturnValue(false);
    mockDocSnap.data.mockReturnValue({});
    
    mockQuerySnapshot.forEach.mockImplementation((callback) => {
      mockQuerySnapshot.docs.forEach(callback);
    });
    
    mockBatch.commit.mockResolvedValue(undefined);

    testFinancialData = {
      ...mockCompanyFinancials,
      currentPrice: 180.50,
      sharesOutstanding: 15000000000,
    };

    testMetadata = {
      dataSource: 'api' as const,
      nextEarningsEstimate: new Date('2024-07-25'),
    };
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('LocalStorageCacheStrategy', () => {
    let strategy: LocalStorageCacheStrategy;

    beforeEach(() => {
      strategy = new LocalStorageCacheStrategy(1024 * 1024, false); // 1MB, no compression
    });

    describe('get', () => {
      it('should return null for non-existent entries', async () => {
        const result = await strategy.get(userId, symbol);
        expect(result).toBeNull();
      });

      it('should retrieve stored entries', async () => {
        // First store an entry
        await strategy.set(userId, symbol, testFinancialData, testMetadata);
        
        const result = await strategy.get(userId, symbol);
        expect(result).not.toBeNull();
        expect(result?.data.symbol).toBe(symbol);
        expect(result?.userId).toBe(userId);
      });

      it('should return null for entries with wrong version', async () => {
        // Manually store entry with wrong version
        const wrongVersionEntry = {
          id: 'test-id',
          userId,
          data: testFinancialData,
          metadata: {
            cachedAt: new Date(),
            expiresAt: new Date(Date.now() + 86400000),
            dataSource: 'api',
            version: '0.9.0', // Wrong version
          },
        };

        const key = `financial_cache_${userId}_${symbol}`;
        localStorage.setItem(key, JSON.stringify(wrongVersionEntry));

        const result = await strategy.get(userId, symbol);
        expect(result).toBeNull();
        expect(localStorage.getItem(key)).toBeNull(); // Should be removed
      });

      it('should handle localStorage errors gracefully', async () => {
        // Mock localStorage to throw error
        const originalGetItem = localStorage.getItem;
        localStorage.getItem = vi.fn().mockImplementation(() => {
          throw new Error('localStorage error');
        });

        const result = await strategy.get(userId, symbol);
        expect(result).toBeNull();
        expect(mockErrorHandler.handleCacheError).toHaveBeenCalled();

        // Restore original implementation
        localStorage.getItem = originalGetItem;
      });

      it('should handle invalid JSON gracefully', async () => {
        const key = `financial_cache_${userId}_${symbol}`;
        localStorage.setItem(key, 'invalid-json{');

        const result = await strategy.get(userId, symbol);
        expect(result).toBeNull();
        expect(mockErrorHandler.handleCacheError).toHaveBeenCalled();
      });
    });

    describe('set', () => {
      it('should store entries successfully', async () => {
        const result = await strategy.set(userId, symbol, testFinancialData, testMetadata);
        
        expect(result.success).toBe(true);
        expect(result.entryId).toBeDefined();
        expect(result.fromCache).toBe(false);
        
        // Verify it was stored
        const stored = await strategy.get(userId, symbol);
        expect(stored).not.toBeNull();
        expect(stored?.data.symbol).toBe(symbol);
      });

      it('should reject entries that are too large', async () => {
        const smallStrategy = new LocalStorageCacheStrategy(100); // Very small limit
        
        const result = await smallStrategy.set(userId, symbol, testFinancialData, testMetadata);
        expect(result.success).toBe(false);
        expect(result.error).toContain('too large');
      });

      it('should trigger cleanup when approaching size limits', async () => {
        const smallStrategy = new LocalStorageCacheStrategy(2048); // Small limit
        
        // Store multiple entries to trigger cleanup
        await smallStrategy.set(userId, 'STOCK1', testFinancialData, testMetadata);
        await smallStrategy.set(userId, 'STOCK2', testFinancialData, testMetadata);
        
        // Make first entry stale
        const staleMetadata = {
          ...testMetadata,
          expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
        };
        await smallStrategy.set(userId, 'STOCK3', testFinancialData, staleMetadata);
        
        // This should trigger cleanup
        const result = await smallStrategy.set(userId, 'STOCK4', testFinancialData, testMetadata);
        expect(result.success).toBe(true);
      });

      it('should handle localStorage errors', async () => {
        // Mock localStorage to throw error
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = vi.fn().mockImplementation(() => {
          throw new Error('localStorage full');
        });

        const result = await strategy.set(userId, symbol, testFinancialData, testMetadata);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();

        // Restore original implementation
        localStorage.setItem = originalSetItem;
      });
    });

    describe('remove', () => {
      it('should remove existing entries', async () => {
        // First store an entry
        await strategy.set(userId, symbol, testFinancialData, testMetadata);
        expect(await strategy.get(userId, symbol)).not.toBeNull();

        // Then remove it
        const result = await strategy.remove(userId, symbol);
        expect(result).toBe(true);
        expect(await strategy.get(userId, symbol)).toBeNull();
      });

      it('should return true even for non-existent entries', async () => {
        const result = await strategy.remove(userId, 'NONEXISTENT');
        expect(result).toBe(true);
      });

      it('should handle localStorage errors', async () => {
        const originalRemoveItem = localStorage.removeItem;
        localStorage.removeItem = vi.fn().mockImplementation(() => {
          throw new Error('localStorage error');
        });

        const result = await strategy.remove(userId, symbol);
        expect(result).toBe(false);
        expect(mockErrorHandler.handleCacheError).toHaveBeenCalled();

        localStorage.removeItem = originalRemoveItem;
      });
    });

    describe('clear', () => {
      it('should clear all entries for a user', async () => {
        // Store multiple entries
        await strategy.set(userId, 'AAPL', testFinancialData, testMetadata);
        await strategy.set(userId, 'MSFT', testFinancialData, testMetadata);
        await strategy.set('other-user', 'GOOGL', testFinancialData, testMetadata);

        const clearedCount = await strategy.clear(userId);
        expect(clearedCount).toBe(2);

        // Verify user entries are gone but other user's remain
        expect(await strategy.get(userId, 'AAPL')).toBeNull();
        expect(await strategy.get(userId, 'MSFT')).toBeNull();
        expect(await strategy.get('other-user', 'GOOGL')).not.toBeNull();
      });

      it('should return 0 for user with no entries', async () => {
        const clearedCount = await strategy.clear('empty-user');
        expect(clearedCount).toBe(0);
      });
    });

    describe('getStatistics', () => {
      it('should return empty statistics for no entries', async () => {
        const stats = await strategy.getStatistics(userId);
        
        expect(stats.totalEntries).toBe(0);
        expect(stats.freshEntries).toBe(0);
        expect(stats.staleEntries).toBe(0);
        expect(stats.totalSize).toBe(0);
      });

      it('should calculate statistics correctly', async () => {
        // Store fresh entry
        await strategy.set(userId, 'FRESH', testFinancialData, {
          ...testMetadata,
          expiresAt: new Date(Date.now() + 86400000), // Expires tomorrow
        });

        // Store stale entry
        await strategy.set(userId, 'STALE', testFinancialData, {
          ...testMetadata,
          expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
        });

        const stats = await strategy.getStatistics(userId);
        
        expect(stats.totalEntries).toBe(2);
        expect(stats.freshEntries).toBe(1);
        expect(stats.staleEntries).toBe(1);
        expect(stats.totalSize).toBeGreaterThan(0);
        expect(stats.newestEntry).toBeDefined();
        expect(stats.oldestEntry).toBeDefined();
      });
    });

    describe('isFresh', () => {
      it('should return false for non-existent entries', async () => {
        const result = await strategy.isFresh(userId, 'NONEXISTENT');
        expect(result).toBe(false);
      });

      it('should return true for fresh entries', async () => {
        await strategy.set(userId, symbol, testFinancialData, {
          ...testMetadata,
          expiresAt: new Date(Date.now() + 86400000),
        });

        const result = await strategy.isFresh(userId, symbol);
        expect(result).toBe(true);
      });

      it('should return false for stale entries', async () => {
        await strategy.set(userId, symbol, testFinancialData, {
          ...testMetadata,
          expiresAt: new Date(Date.now() - 86400000),
        });

        const result = await strategy.isFresh(userId, symbol);
        expect(result).toBe(false);
      });
    });

    describe('getCachedSymbols', () => {
      it('should return empty array for no entries', async () => {
        const symbols = await strategy.getCachedSymbols(userId);
        expect(symbols).toEqual([]);
      });

      it('should return cached symbols for user', async () => {
        await strategy.set(userId, 'AAPL', testFinancialData, testMetadata);
        await strategy.set(userId, 'MSFT', testFinancialData, testMetadata);
        await strategy.set('other-user', 'GOOGL', testFinancialData, testMetadata);

        const symbols = await strategy.getCachedSymbols(userId);
        expect(symbols).toHaveLength(2);
        expect(symbols).toContain('AAPL');
        expect(symbols).toContain('MSFT');
        expect(symbols).not.toContain('GOOGL');
      });
    });

    describe('compression support', () => {
      it('should handle compression when enabled', async () => {
        const compressedStrategy = new LocalStorageCacheStrategy(1024 * 1024, true);
        
        const result = await compressedStrategy.set(userId, symbol, testFinancialData, testMetadata);
        expect(result.success).toBe(true);

        const retrieved = await compressedStrategy.get(userId, symbol);
        expect(retrieved?.data.symbol).toBe(symbol);
      });
    });
  });

  describe('FirestoreCacheStrategy', () => {
    let strategy: FirestoreCacheStrategy;

    beforeEach(() => {
      strategy = new FirestoreCacheStrategy();
    });

    describe('get', () => {
      it('should return null for non-existent documents', async () => {
        mockDocSnap.exists.mockReturnValue(false);
        
        const result = await strategy.get(userId, symbol);
        expect(result).toBeNull();
      });

      it('should retrieve stored documents', async () => {
        const mockData = {
          id: 'test-id',
          userId,
          data: testFinancialData,
          metadata: {
            cachedAt: { toDate: () => new Date() },
            expiresAt: { toDate: () => new Date(Date.now() + 86400000) },
            dataSource: 'api',
            version: '1.0.0',
          },
        };

        mockDocSnap.exists.mockReturnValue(true);
        mockDocSnap.data.mockReturnValue(mockData);

        const result = await strategy.get(userId, symbol);
        expect(result).not.toBeNull();
        expect(result?.data.symbol).toBe(testFinancialData.symbol);
      });

      it('should handle wrong version documents', async () => {
        const mockData = {
          id: 'test-id',
          userId,
          data: testFinancialData,
          metadata: {
            version: '0.9.0', // Wrong version
            cachedAt: { toDate: () => new Date() },
            expiresAt: { toDate: () => new Date() },
            dataSource: 'api',
          },
        };

        mockDocSnap.exists.mockReturnValue(true);
        mockDocSnap.data.mockReturnValue(mockData);
        mockFirestore.deleteDoc.mockResolvedValue(undefined);

        const result = await strategy.get(userId, symbol);
        expect(result).toBeNull();
        expect(mockFirestore.deleteDoc).toHaveBeenCalled();
      });

      it('should handle Firestore errors gracefully', async () => {
        mockFirestore.getDoc.mockRejectedValue(new Error('Firestore error'));

        const result = await strategy.get(userId, symbol);
        expect(result).toBeNull();
        expect(mockErrorHandler.handleCacheError).toHaveBeenCalled();
      });

      it('should convert Firestore timestamps to Date objects', async () => {
        const mockTimestamp = { toDate: vi.fn().mockReturnValue(new Date('2024-06-01')) };
        const mockData = {
          id: 'test-id',
          userId,
          data: testFinancialData,
          metadata: {
            cachedAt: mockTimestamp,
            expiresAt: mockTimestamp,
            nextEarningsEstimate: mockTimestamp,
            lastEarningsDate: mockTimestamp,
            dataSource: 'api',
            version: '1.0.0',
          },
        };

        mockDocSnap.exists.mockReturnValue(true);
        mockDocSnap.data.mockReturnValue(mockData);

        const result = await strategy.get(userId, symbol);
        expect(result?.metadata.cachedAt).toBeInstanceOf(Date);
        expect(result?.metadata.nextEarningsEstimate).toBeInstanceOf(Date);
        expect(mockTimestamp.toDate).toHaveBeenCalled();
      });
    });

    describe('set', () => {
      it('should store documents successfully', async () => {
        mockFirestore.setDoc.mockResolvedValue(undefined);

        const result = await strategy.set(userId, symbol, testFinancialData, testMetadata);
        expect(result.success).toBe(true);
        expect(result.entryId).toBeDefined();
        expect(mockFirestore.setDoc).toHaveBeenCalled();
      });

      it('should handle Firestore errors', async () => {
        mockFirestore.setDoc.mockRejectedValue(new Error('Firestore error'));

        const result = await strategy.set(userId, symbol, testFinancialData, testMetadata);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('remove', () => {
      it('should remove documents successfully', async () => {
        mockFirestore.deleteDoc.mockResolvedValue(undefined);

        const result = await strategy.remove(userId, symbol);
        expect(result).toBe(true);
        expect(mockFirestore.deleteDoc).toHaveBeenCalled();
      });

      it('should handle Firestore errors', async () => {
        mockFirestore.deleteDoc.mockRejectedValue(new Error('Firestore error'));

        const result = await strategy.remove(userId, symbol);
        expect(result).toBe(false);
        expect(mockErrorHandler.handleCacheError).toHaveBeenCalled();
      });
    });

    describe('clear', () => {
      it('should clear all documents for a user', async () => {
        const mockDocs = [
          { ref: 'doc1' },
          { ref: 'doc2' },
        ];

        mockQuerySnapshot.empty = false;
        mockQuerySnapshot.docs = mockDocs;
        mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);
        mockBatch.commit.mockResolvedValue(undefined);

        const result = await strategy.clear(userId);
        expect(result).toBe(2);
        expect(mockBatch.delete).toHaveBeenCalledTimes(2);
        expect(mockBatch.commit).toHaveBeenCalled();
      });

      it('should return 0 for empty collection', async () => {
        mockQuerySnapshot.empty = true;
        mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);

        const result = await strategy.clear(userId);
        expect(result).toBe(0);
      });
    });

    describe('getStatistics', () => {
      it('should calculate statistics from Firestore documents', async () => {
        const mockDocs = [
          {
            data: () => ({
              id: 'id1',
              userId,
              data: { symbol: 'AAPL' },
              metadata: {
                cachedAt: { toDate: () => new Date() },
                expiresAt: { toDate: () => new Date(Date.now() + 86400000) },
              },
            }),
          },
          {
            data: () => ({
              id: 'id2',
              userId,
              data: { symbol: 'MSFT' },
              metadata: {
                cachedAt: { toDate: () => new Date() },
                expiresAt: { toDate: () => new Date(Date.now() - 86400000) },
              },
            }),
          },
        ];

        mockQuerySnapshot.docs = mockDocs;
        mockQuerySnapshot.forEach.mockImplementation((callback) => {
          mockDocs.forEach(callback);
        });
        mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);

        const stats = await strategy.getStatistics(userId);
        expect(stats.totalEntries).toBe(2);
        expect(stats.freshEntries).toBe(1);
        expect(stats.staleEntries).toBe(1);
      });
    });

    describe('getCachedSymbols', () => {
      it('should return symbols from Firestore documents', async () => {
        const mockDocs = [
          { data: () => ({ data: { symbol: 'AAPL' } }) },
          { data: () => ({ data: { symbol: 'MSFT' } }) },
        ];

        mockQuerySnapshot.forEach.mockImplementation((callback) => {
          mockDocs.forEach(callback);
        });
        mockFirestore.getDocs.mockResolvedValue(mockQuerySnapshot);

        const symbols = await strategy.getCachedSymbols(userId);
        expect(symbols).toEqual(['AAPL', 'MSFT']);
      });
    });
  });

  describe('HybridCacheStrategy', () => {
    let strategy: HybridCacheStrategy;
    let mockLocalStorage: LocalStorageCacheStrategy;
    let mockFirestore: FirestoreCacheStrategy;

    beforeEach(() => {
      strategy = new HybridCacheStrategy();
      // Access private properties for testing
      mockLocalStorage = (strategy as any).localStorage;
      mockFirestore = (strategy as any).firestore;
    });

    describe('get', () => {
      it('should try localStorage first', async () => {
        const mockEntry: FinancialCacheEntry = {
          id: 'test-id',
          userId,
          data: testFinancialData,
          metadata: {
            cachedAt: new Date(),
            expiresAt: new Date(Date.now() + 86400000),
            dataSource: 'api',
            version: '1.0.0',
          },
        };

        // Mock localStorage to return entry
        vi.spyOn(mockLocalStorage, 'get').mockResolvedValue(mockEntry);
        vi.spyOn(mockFirestore, 'get').mockResolvedValue(null);

        const result = await strategy.get(userId, symbol);
        expect(result).toEqual(mockEntry);
        expect(mockLocalStorage.get).toHaveBeenCalled();
        expect(mockFirestore.get).not.toHaveBeenCalled();
      });

      it('should fallback to Firestore if localStorage miss', async () => {
        const mockEntry: FinancialCacheEntry = {
          id: 'test-id',
          userId,
          data: testFinancialData,
          metadata: {
            cachedAt: new Date(Date.now() - 86400000), // Old but fresh
            expiresAt: new Date(Date.now() + 86400000),
            dataSource: 'api',
            version: '1.0.0',
          },
        };

        vi.spyOn(mockLocalStorage, 'get').mockResolvedValue(null);
        vi.spyOn(mockFirestore, 'get').mockResolvedValue(mockEntry);
        vi.spyOn(mockLocalStorage, 'set').mockResolvedValue({ success: true });

        const result = await strategy.get(userId, symbol);
        expect(result).toEqual(mockEntry);
        expect(mockFirestore.get).toHaveBeenCalled();
        expect(mockLocalStorage.set).toHaveBeenCalled(); // Should promote to localStorage
      });

      it('should not promote old entries to localStorage', async () => {
        const oldEntry: FinancialCacheEntry = {
          id: 'test-id',
          userId,
          data: testFinancialData,
          metadata: {
            cachedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days old
            expiresAt: new Date(Date.now() + 86400000),
            dataSource: 'api',
            version: '1.0.0',
          },
        };

        vi.spyOn(mockLocalStorage, 'get').mockResolvedValue(null);
        vi.spyOn(mockFirestore, 'get').mockResolvedValue(oldEntry);
        vi.spyOn(mockLocalStorage, 'set').mockResolvedValue({ success: true });

        const result = await strategy.get(userId, symbol);
        expect(result).toEqual(oldEntry);
        expect(mockLocalStorage.set).not.toHaveBeenCalled(); // Should not promote old data
      });

      it('should return null if both strategies fail', async () => {
        vi.spyOn(mockLocalStorage, 'get').mockResolvedValue(null);
        vi.spyOn(mockFirestore, 'get').mockResolvedValue(null);

        const result = await strategy.get(userId, symbol);
        expect(result).toBeNull();
      });
    });

    describe('set', () => {
      it('should store in both localStorage and Firestore', async () => {
        vi.spyOn(mockLocalStorage, 'set').mockResolvedValue({ 
          success: true, 
          entryId: 'local-id' 
        });
        vi.spyOn(mockFirestore, 'set').mockResolvedValue({ 
          success: true, 
          entryId: 'firestore-id' 
        });

        const result = await strategy.set(userId, symbol, testFinancialData, testMetadata);
        expect(result.success).toBe(true);
        expect(mockLocalStorage.set).toHaveBeenCalled();
        expect(mockFirestore.set).toHaveBeenCalled();
      });

      it('should succeed if at least one strategy succeeds', async () => {
        vi.spyOn(mockLocalStorage, 'set').mockResolvedValue({ 
          success: false, 
          error: 'localStorage full' 
        });
        vi.spyOn(mockFirestore, 'set').mockResolvedValue({ 
          success: true, 
          entryId: 'firestore-id' 
        });

        const result = await strategy.set(userId, symbol, testFinancialData, testMetadata);
        expect(result.success).toBe(true);
        expect(result.entryId).toBe('firestore-id');
      });

      it('should fail if both strategies fail', async () => {
        vi.spyOn(mockLocalStorage, 'set').mockResolvedValue({ 
          success: false, 
          error: 'localStorage error' 
        });
        vi.spyOn(mockFirestore, 'set').mockResolvedValue({ 
          success: false, 
          error: 'Firestore error' 
        });

        const result = await strategy.set(userId, symbol, testFinancialData, testMetadata);
        expect(result.success).toBe(false);
        expect(result.error).toContain('All cache strategies failed');
      });
    });

    describe('remove', () => {
      it('should remove from both strategies', async () => {
        vi.spyOn(mockLocalStorage, 'remove').mockResolvedValue(true);
        vi.spyOn(mockFirestore, 'remove').mockResolvedValue(true);

        const result = await strategy.remove(userId, symbol);
        expect(result).toBe(true);
        expect(mockLocalStorage.remove).toHaveBeenCalled();
        expect(mockFirestore.remove).toHaveBeenCalled();
      });

      it('should succeed if at least one strategy succeeds', async () => {
        vi.spyOn(mockLocalStorage, 'remove').mockResolvedValue(false);
        vi.spyOn(mockFirestore, 'remove').mockResolvedValue(true);

        const result = await strategy.remove(userId, symbol);
        expect(result).toBe(true);
      });
    });

    describe('clear', () => {
      it('should clear from both strategies', async () => {
        vi.spyOn(mockLocalStorage, 'clear').mockResolvedValue(5);
        vi.spyOn(mockFirestore, 'clear').mockResolvedValue(3);

        const result = await strategy.clear(userId);
        expect(result).toBe(5); // Should return max to avoid double counting
        expect(mockLocalStorage.clear).toHaveBeenCalled();
        expect(mockFirestore.clear).toHaveBeenCalled();
      });
    });

    describe('getStatistics', () => {
      it('should combine statistics from both strategies', async () => {
        const localStats: CacheStatistics = {
          totalEntries: 3,
          freshEntries: 2,
          staleEntries: 1,
          totalSize: 1000,
          hitRatio: 0.8,
          averageAge: 24,
          newestEntry: 'AAPL',
        };

        const firestoreStats: CacheStatistics = {
          totalEntries: 2,
          freshEntries: 1,
          staleEntries: 1,
          totalSize: 500,
          hitRatio: 0.6,
          averageAge: 48,
          oldestEntry: 'MSFT',
        };

        vi.spyOn(mockLocalStorage, 'getStatistics').mockResolvedValue(localStats);
        vi.spyOn(mockFirestore, 'getStatistics').mockResolvedValue(firestoreStats);

        const result = await strategy.getStatistics(userId);
        expect(result.totalEntries).toBe(5);
        expect(result.freshEntries).toBe(3);
        expect(result.staleEntries).toBe(2);
        expect(result.totalSize).toBe(1500);
        expect(result.hitRatio).toBe(0.7); // Average
        expect(result.newestEntry).toBe('AAPL');
        expect(result.oldestEntry).toBe('MSFT');
      });
    });

    describe('getCachedSymbols', () => {
      it('should return unique symbols from both strategies', async () => {
        vi.spyOn(mockLocalStorage, 'getCachedSymbols').mockResolvedValue(['AAPL', 'MSFT']);
        vi.spyOn(mockFirestore, 'getCachedSymbols').mockResolvedValue(['MSFT', 'GOOGL']);

        const result = await strategy.getCachedSymbols(userId);
        expect(result).toEqual(expect.arrayContaining(['AAPL', 'MSFT', 'GOOGL']));
        expect(result).toHaveLength(3); // No duplicates
      });
    });

    describe('optimizeCacheDistribution', () => {
      it('should demote old entries from localStorage', async () => {
        const oldEntry: FinancialCacheEntry = {
          id: 'old-id',
          userId,
          data: testFinancialData,
          metadata: {
            cachedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days old
            expiresAt: new Date(Date.now() + 86400000),
            dataSource: 'api',
            version: '1.0.0',
          },
        };

        vi.spyOn(mockLocalStorage, 'getCachedSymbols').mockResolvedValue(['AAPL']);
        vi.spyOn(mockLocalStorage, 'get').mockResolvedValue(oldEntry);
        vi.spyOn(mockFirestore, 'set').mockResolvedValue({ success: true });
        vi.spyOn(mockLocalStorage, 'remove').mockResolvedValue(true);

        await strategy.optimizeCacheDistribution(userId);

        expect(mockFirestore.set).toHaveBeenCalled();
        expect(mockLocalStorage.remove).toHaveBeenCalled();
      });
    });
  });

  describe('createCacheStrategy', () => {
    it('should create localStorage strategy', () => {
      const strategy = createCacheStrategy('localStorage');
      expect(strategy).toBeInstanceOf(LocalStorageCacheStrategy);
    });

    it('should create firestore strategy', () => {
      const strategy = createCacheStrategy('firestore');
      expect(strategy).toBeInstanceOf(FirestoreCacheStrategy);
    });

    it('should create hybrid strategy by default', () => {
      const strategy = createCacheStrategy();
      expect(strategy).toBeInstanceOf(HybridCacheStrategy);
    });

    it('should create hybrid strategy for unknown type', () => {
      const strategy = createCacheStrategy('unknown' as any);
      expect(strategy).toBeInstanceOf(HybridCacheStrategy);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    let strategy: ICacheStrategy;

    beforeEach(() => {
      strategy = new LocalStorageCacheStrategy();
    });

    it('should handle undefined userId gracefully', async () => {
      const result = await strategy.get(undefined as any, symbol);
      expect(result).toBeNull();
    });

    it('should handle empty symbol gracefully', async () => {
      const result = await strategy.get(userId, '');
      expect(result).toBeNull();
    });

    it('should handle very large data objects', async () => {
      const largeData = {
        ...testFinancialData,
        incomeStatement: Array.from({ length: 100 }, () => mockCompanyFinancials.incomeStatement[0]),
      };

      const result = await strategy.set(userId, symbol, largeData, testMetadata);
      // Should either succeed or fail gracefully with appropriate error
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle malformed metadata gracefully', async () => {
      const malformedMetadata = {
        cachedAt: 'not-a-date' as any,
        dataSource: 'unknown' as any,
      };

      const result = await strategy.set(userId, symbol, testFinancialData, malformedMetadata);
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle concurrent operations gracefully', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        strategy.set(userId, `SYMBOL${i}`, testFinancialData, testMetadata)
      );

      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(typeof result.value.success).toBe('boolean');
        }
      });
    });
  });
});