/**
 * Service layer for peer company data operations
 * Handles fetching, validation, and transformation of peer data
 * Follows single responsibility principle and separation of concerns
 */

import { fmpApi } from './fmpApi';
import { PeerDataCache } from '../utils/peerDataCache';
import { getPeerSuggestions, getIndustryInfo } from '../constants/industryPeers';
import { calculateRevenueGrowthRate } from '../utils/financialDataHelpers';
import type { PeerCompany } from '../types/relativeValuation';
import type { CompanyFinancials } from '../types';

export interface PeerDataResult {
  symbol: string;
  success: boolean;
  data?: PeerCompany;
  error?: string;
}

export interface BatchFetchResult {
  successful: PeerCompany[];
  failed: Array<{ symbol: string; error: string }>;
  totalRequested: number;
  successRate: number;
}

class PeerDataService {
  /**
   * Fetch financial data for multiple peer companies
   * Returns detailed results including successes and failures
   */
  async fetchPeerDataBatch(symbols: string[]): Promise<BatchFetchResult> {
    if (!symbols || symbols.length === 0) {
      return {
        successful: [],
        failed: [],
        totalRequested: 0,
        successRate: 0
      };
    }

    // Normalize and deduplicate symbols
    const normalizedSymbols = [...new Set(
      symbols.map(s => s.trim().toUpperCase()).filter(Boolean)
    )];

    console.log(`[PeerDataService] Fetching data for ${normalizedSymbols.length} symbols:`, normalizedSymbols);

    const results = await Promise.allSettled(
      normalizedSymbols.map(symbol => this.fetchSinglePeerData(symbol))
    );

    const successful: PeerCompany[] = [];
    const failed: Array<{ symbol: string; error: string }> = [];

    results.forEach((result, index) => {
      const symbol = normalizedSymbols[index];
      if (result.status === 'fulfilled' && result.value) {
        successful.push(result.value);
      } else {
        const error = result.status === 'rejected' 
          ? (result.reason?.message || 'Unknown error')
          : 'Failed to fetch data';
        failed.push({ symbol, error });
        console.warn(`[PeerDataService] Failed to fetch ${symbol}:`, error);
      }
    });

    const successRate = normalizedSymbols.length > 0 
      ? (successful.length / normalizedSymbols.length) * 100 
      : 0;

    console.log(`[PeerDataService] Batch fetch complete: ${successful.length}/${normalizedSymbols.length} successful (${successRate.toFixed(1)}%)`);

    return {
      successful,
      failed,
      totalRequested: normalizedSymbols.length,
      successRate
    };
  }

  /**
   * Fetch financial data for a single peer company
   * Uses caching to minimize API calls
   */
  async fetchSinglePeerData(symbol: string): Promise<PeerCompany | null> {
    const normalizedSymbol = symbol.trim().toUpperCase();
    
    if (!normalizedSymbol) {
      throw new Error('Symbol is required');
    }

    // Check cache first
    const cachedData = PeerDataCache.getCachedPeerData(normalizedSymbol);
    if (cachedData) {
      console.log(`[PeerDataService] Using cached data for ${normalizedSymbol}`);
      return cachedData;
    }

    // Fetch from API
    try {
      console.log(`[PeerDataService] Fetching fresh data for ${normalizedSymbol}`);
      const companyData = await fmpApi.getCompanyFinancials(normalizedSymbol);
      
      // Convert to peer format
      const peerData = this.convertToPeerCompany(companyData);
      
      // Cache the result
      PeerDataCache.setCachedPeerData(normalizedSymbol, peerData);
      
      return peerData;
    } catch (error) {
      console.error(`[PeerDataService] Failed to fetch ${normalizedSymbol}:`, error);
      throw error;
    }
  }

  /**
   * Get suggested peer companies for a given symbol
   */
  getSuggestedPeers(targetSymbol: string): string[] {
    return getPeerSuggestions(targetSymbol);
  }

  /**
   * Get industry information for a symbol
   */
  getIndustryInfo(symbol: string) {
    return getIndustryInfo(symbol);
  }

  /**
   * Validate if symbols are valid ticker symbols
   * Returns validation results for each symbol
   */
  async validateSymbols(symbols: string[]): Promise<Map<string, boolean>> {
    const validationResults = new Map<string, boolean>();
    
    // Basic validation regex for ticker symbols
    const tickerRegex = /^[A-Z]{1,5}(\.[A-Z])?$/;
    
    for (const symbol of symbols) {
      const normalized = symbol.trim().toUpperCase();
      
      // Basic format validation
      if (!normalized || !tickerRegex.test(normalized)) {
        validationResults.set(symbol, false);
        continue;
      }
      
      // Could add API validation here if needed
      validationResults.set(symbol, true);
    }
    
    return validationResults;
  }

  /**
   * Convert CompanyFinancials to PeerCompany format
   * Extracted from PeerDataCache for better organization
   */
  private convertToPeerCompany(companyData: CompanyFinancials): PeerCompany {
    const latestIncome = companyData.incomeStatement[0];
    const latestBalance = companyData.balanceSheet[0];
    const latestCashFlow = companyData.cashFlowStatement[0];

    // Calculate market cap
    const marketCap = (companyData.currentPrice || 0) * (companyData.sharesOutstanding || 0);

    // Calculate enterprise value (simplified)
    const debt = latestBalance?.totalLiabilities || 0;
    const cash = latestCashFlow?.operatingCashFlow || 0; // Simplified
    const enterpriseValue = marketCap + debt - cash;

    // Calculate EBITDA (approximation)
    const estimatedEbitda = latestIncome?.operatingIncome ? 
      latestIncome.operatingIncome * 1.2 : // Rough approximation
      (latestIncome?.revenue || 0) * 0.15; // 15% EBITDA margin estimate

    // Calculate growth rate using the specialized utility that handles data ordering
    const estimatedGrowthRate = calculateRevenueGrowthRate(companyData.incomeStatement);

    // Get industry from mapping or default
    const industryInfo = this.getIndustryInfo(companyData.symbol);

    return {
      symbol: companyData.symbol,
      name: companyData.name,
      industry: industryInfo?.industry || 'Technology',
      marketCap: marketCap,
      enterpriseValue: enterpriseValue,
      revenue: latestIncome?.revenue || 0,
      ebitda: estimatedEbitda,
      netIncome: latestIncome?.netIncome || 0,
      bookValue: latestBalance?.totalEquity || 0,
      sharesOutstanding: companyData.sharesOutstanding || 0,
      growthRate: estimatedGrowthRate,
      debt: debt,
      cash: cash
    };
  }

  /**
   * Clear all cached peer data
   */
  clearCache(): void {
    PeerDataCache.clearAllCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return PeerDataCache.getCacheStats();
  }

  /**
   * Fetch and prepare peer data with enriched information
   * Includes industry matching and size similarity scoring
   */
  async fetchEnrichedPeerData(
    targetSymbol: string,
    peerSymbols: string[]
  ): Promise<Array<PeerCompany & { similarityScore?: number }>> {
    // Fetch target company data
    const targetData = await this.fetchSinglePeerData(targetSymbol);
    if (!targetData) {
      throw new Error(`Failed to fetch target company data for ${targetSymbol}`);
    }

    // Fetch peer data
    const { successful: peers } = await this.fetchPeerDataBatch(peerSymbols);

    // Calculate similarity scores
    return peers.map(peer => ({
      ...peer,
      similarityScore: this.calculateSimilarityScore(targetData, peer)
    }));
  }

  /**
   * Calculate similarity score between target and peer company
   * Score based on market cap, industry, and growth rate
   */
  private calculateSimilarityScore(target: PeerCompany, peer: PeerCompany): number {
    let score = 0;
    const maxScore = 100;

    // Industry match (40 points)
    if (target.industry === peer.industry) {
      score += 40;
    }

    // Market cap similarity (30 points)
    const marketCapRatio = Math.min(target.marketCap, peer.marketCap) / 
                          Math.max(target.marketCap, peer.marketCap);
    score += marketCapRatio * 30;

    // Growth rate similarity (30 points)
    const growthDiff = Math.abs(target.growthRate - peer.growthRate);
    const growthScore = Math.max(0, 30 - (growthDiff * 100)); // Penalize 1 point per 1% difference
    score += growthScore;

    return Math.round((score / maxScore) * 100);
  }
}

// Export singleton instance
export const peerDataService = new PeerDataService();

// Export types for use in components
export type { PeerDataResult, BatchFetchResult };