/**
 * Intelligent caching layer for peer company financial data
 * Minimizes API calls by caching peer data with TTL (Time To Live)
 */

import { fmpApi } from '../services/fmpApi';
import { calculateRevenueGrowthRate } from './financialDataHelpers';
import type { CompanyFinancials } from '../types';
import type { PeerCompany } from '../types/relativeValuation';

interface CacheEntry {
  data: CompanyFinancials;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface PeerCacheEntry {
  data: PeerCompany;
  timestamp: number;
  ttl: number;
}

class PeerDataCache {
  private static readonly CACHE_KEY_PREFIX = 'peer_data_';
  private static readonly COMPANY_CACHE_KEY_PREFIX = 'company_data_';
  private static readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private static readonly STORAGE_KEY_VERSION = 'v2'; // Incremented to invalidate old cache with broken growth rates

  /**
   * Get cached company financial data
   * @param symbol - Company ticker symbol
   * @returns Cached data or null if not found/expired
   */
  static getCachedCompanyData(symbol: string): CompanyFinancials | null {
    try {
      const cacheKey = `${this.COMPANY_CACHE_KEY_PREFIX}${this.STORAGE_KEY_VERSION}_${symbol.toUpperCase()}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (!cachedData) return null;
      
      const entry: CacheEntry = JSON.parse(cachedData);
      const now = Date.now();
      
      // Check if cache entry has expired
      if (now - entry.timestamp > entry.ttl) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      console.log(`Cache HIT for company data: ${symbol}`);
      return entry.data;
    } catch (error) {
      console.warn(`Failed to retrieve cached data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Cache company financial data
   * @param symbol - Company ticker symbol
   * @param data - Company financial data
   * @param ttl - Time to live (optional, defaults to 24 hours)
   */
  static setCachedCompanyData(symbol: string, data: CompanyFinancials, ttl: number = this.DEFAULT_TTL): void {
    try {
      const cacheKey = `${this.COMPANY_CACHE_KEY_PREFIX}${this.STORAGE_KEY_VERSION}_${symbol.toUpperCase()}`;
      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
        ttl
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(entry));
      console.log(`Cached company data: ${symbol} (TTL: ${ttl / 1000 / 60} minutes)`);
    } catch (error) {
      console.warn(`Failed to cache data for ${symbol}:`, error);
      // Continue execution even if caching fails
    }
  }

  /**
   * Get cached peer company data (simplified format for relative valuation)
   * @param symbol - Company ticker symbol
   * @returns Cached peer data or null if not found/expired
   */
  static getCachedPeerData(symbol: string): PeerCompany | null {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${this.STORAGE_KEY_VERSION}_${symbol.toUpperCase()}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (!cachedData) return null;
      
      const entry: PeerCacheEntry = JSON.parse(cachedData);
      const now = Date.now();
      
      // Check if cache entry has expired
      if (now - entry.timestamp > entry.ttl) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      console.log(`Cache HIT for peer data: ${symbol}`);
      return entry.data;
    } catch (error) {
      console.warn(`Failed to retrieve cached peer data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Cache peer company data
   * @param symbol - Company ticker symbol
   * @param data - Peer company data
   * @param ttl - Time to live (optional, defaults to 24 hours)
   */
  static setCachedPeerData(symbol: string, data: PeerCompany, ttl: number = this.DEFAULT_TTL): void {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${this.STORAGE_KEY_VERSION}_${symbol.toUpperCase()}`;
      const entry: PeerCacheEntry = {
        data,
        timestamp: Date.now(),
        ttl
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(entry));
      console.log(`Cached peer data: ${symbol} (TTL: ${ttl / 1000 / 60} minutes)`);
    } catch (error) {
      console.warn(`Failed to cache peer data for ${symbol}:`, error);
      // Continue execution even if caching fails
    }
  }

  /**
   * Get multiple cached peer companies
   * @param symbols - Array of ticker symbols
   * @returns Object mapping symbols to cached data (null for missing/expired)
   */
  static getBatchCachedPeerData(symbols: string[]): Record<string, PeerCompany | null> {
    const result: Record<string, PeerCompany | null> = {};
    
    for (const symbol of symbols) {
      result[symbol.toUpperCase()] = this.getCachedPeerData(symbol);
    }
    
    return result;
  }

  /**
   * Convert CompanyFinancials to PeerCompany format
   * @param companyData - Full company financial data
   * @param estimatedIndustry - Industry classification (optional)
   * @returns PeerCompany object suitable for relative valuation
   */
  static convertToPeerCompany(companyData: CompanyFinancials, estimatedIndustry: string = 'Technology'): PeerCompany {
    const latestIncome = companyData.incomeStatement[0];
    const latestBalance = companyData.balanceSheet[0];

    // Calculate estimated EBITDA (approximation: Operating Income + Depreciation proxy)
    const estimatedEbitda = latestIncome?.operatingIncome ? 
      latestIncome.operatingIncome * 1.2 : // Rough approximation
      (latestIncome?.revenue || 0) * 0.15; // 15% EBITDA margin estimate

    // Calculate enterprise value (Market Cap + Net Debt)
    const marketCap = (companyData.currentPrice || 0) * (companyData.sharesOutstanding || 0);
    const enterpriseValue = marketCap; // Simplified - actual would include debt

    // Calculate growth rate using the standardized helper function
    const estimatedGrowthRate = calculateRevenueGrowthRate(companyData.incomeStatement);

    return {
      symbol: companyData.symbol,
      name: companyData.name,
      industry: estimatedIndustry,
      marketCap: marketCap,
      enterpriseValue: enterpriseValue,
      revenue: latestIncome?.revenue || 0,
      ebitda: estimatedEbitda,
      netIncome: latestIncome?.netIncome || 0,
      bookValue: latestBalance?.totalEquity || 0,
      sharesOutstanding: companyData.sharesOutstanding || 0,
      growthRate: estimatedGrowthRate,
      debt: 0, // Simplified - would need additional data
      cash: 0  // Simplified - would need additional data
    };
  }

  /**
   * Fetch peer data with caching
   * @param symbols - Array of peer ticker symbols
   * @param forceRefresh - Force refresh cache (optional)
   * @returns Promise resolving to array of PeerCompany objects
   */
  static async fetchPeerData(symbols: string[], forceRefresh: boolean = false): Promise<PeerCompany[]> {
    console.log(`Fetching peer data for: ${symbols.join(', ')}`);
    
    const results: PeerCompany[] = [];
    const symbolsToFetch: string[] = [];
    
    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
      const cachedData = this.getBatchCachedPeerData(symbols);
      
      for (const symbol of symbols) {
        const cached = cachedData[symbol.toUpperCase()];
        if (cached) {
          results.push(cached);
        } else {
          symbolsToFetch.push(symbol);
        }
      }
    } else {
      symbolsToFetch.push(...symbols);
    }
    
    // Fetch missing data from API
    if (symbolsToFetch.length > 0) {
      console.log(`Cache MISS - fetching from API: ${symbolsToFetch.join(', ')}`);
      
      const fetchPromises = symbolsToFetch.map(async (symbol): Promise<PeerCompany | null> => {
        try {
          const companyData = await fmpApi.getCompanyFinancials(symbol);
          
          // Convert to peer format and cache
          const peerData = this.convertToPeerCompany(companyData);
          this.setCachedPeerData(symbol, peerData);
          
          return peerData;
        } catch (error) {
          console.warn(`Failed to fetch data for peer ${symbol}:`, error);
          return null;
        }
      });
      
      const fetchedResults = await Promise.all(fetchPromises);
      
      // Add successful fetches to results
      fetchedResults.forEach(result => {
        if (result) {
          results.push(result);
        }
      });
    }
    
    console.log(`Successfully loaded ${results.length} peer companies`);
    return results;
  }

  /**
   * Clear all cached data
   */
  static clearAllCache(): void {
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith(this.CACHE_KEY_PREFIX) || 
          key.startsWith(this.COMPANY_CACHE_KEY_PREFIX)
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${keysToRemove.length} cached entries`);
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns Object with cache usage statistics
   */
  static getCacheStats(): { totalEntries: number; cacheSize: string; oldestEntry: Date | null } {
    let totalEntries = 0;
    let totalSize = 0;
    let oldestTimestamp: number | null = null;
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith(this.CACHE_KEY_PREFIX) || 
          key.startsWith(this.COMPANY_CACHE_KEY_PREFIX)
        )) {
          totalEntries++;
          const value = localStorage.getItem(key) || '';
          totalSize += key.length + value.length;
          
          try {
            const entry = JSON.parse(value);
            if (entry.timestamp) {
              if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
              }
            }
          } catch {
            // Skip invalid entries
          }
        }
      }
    } catch (error) {
      console.warn('Failed to calculate cache stats:', error);
    }
    
    return {
      totalEntries,
      cacheSize: `${(totalSize / 1024).toFixed(2)} KB`,
      oldestEntry: oldestTimestamp ? new Date(oldestTimestamp) : null
    };
  }

  /**
   * Clean expired cache entries
   */
  static cleanExpiredCache(): number {
    let cleaned = 0;
    const now = Date.now();
    
    try {
      const keysToCheck: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith(this.CACHE_KEY_PREFIX) || 
          key.startsWith(this.COMPANY_CACHE_KEY_PREFIX)
        )) {
          keysToCheck.push(key);
        }
      }
      
      keysToCheck.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const entry = JSON.parse(data);
            if (now - entry.timestamp > entry.ttl) {
              localStorage.removeItem(key);
              cleaned++;
            }
          }
        } catch {
          // Remove invalid entries
          localStorage.removeItem(key);
          cleaned++;
        }
      });
      
      if (cleaned > 0) {
        console.log(`Cleaned ${cleaned} expired cache entries`);
      }
    } catch (error) {
      console.warn('Failed to clean expired cache:', error);
    }
    
    return cleaned;
  }
}

// Auto-cleanup expired cache on module load
PeerDataCache.cleanExpiredCache();

export { PeerDataCache };