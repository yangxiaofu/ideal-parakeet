/**
 * Data compression utilities for financial cache storage optimization
 * Reduces storage footprint while maintaining data integrity
 */

import type { CompanyFinancials } from '../types';

/**
 * Configuration for data compression settings
 */
export interface CompressionConfig {
  /** Maximum years of historical data to keep */
  maxYears: number;
  /** Remove null/undefined optional fields */
  removeEmptyFields: boolean;
  /** Round financial numbers to reduce precision */
  roundNumbers: boolean;
  /** Number of decimal places for rounding */
  decimalPlaces: number;
  /** Remove calculated/derived fields that can be recomputed */
  removeDerivedFields: boolean;
}

/**
 * Default compression configuration
 */
export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  maxYears: 5,
  removeEmptyFields: true,
  roundNumbers: true,
  decimalPlaces: 2,
  removeDerivedFields: true,
};

/**
 * Fields that can be derived/calculated and don't need to be stored
 */
const DERIVED_FIELDS = new Set([
  'grossMargin',
  'operatingMargin',
  'netMargin',
  'roeRatio',
  'roaRatio',
  'debtToEquityRatio',
  'currentRatio',
  'quickRatio',
  'priceToBookRatio',
  'priceToEarningsRatio',
  'enterpriseValue',
  'evToEbitda',
  'evToSales',
  'marketCap',
]);

/**
 * Essential fields that should never be removed
 */
const ESSENTIAL_FIELDS = new Set([
  'date',
  'revenue',
  'netIncome',
  'totalAssets',
  'totalLiabilities',
  'totalEquity',
  'operatingCashFlow',
  'freeCashFlow',
  'eps',
  'sharesOutstanding',
]);

/**
 * Compress financial data to reduce storage footprint
 */
export function compressFinancialData(
  data: CompanyFinancials,
  config: CompressionConfig = DEFAULT_COMPRESSION_CONFIG
): CompanyFinancials {
  console.log(`Compressing financial data for ${data.symbol}`, {
    originalSize: JSON.stringify(data).length,
    config,
  });

  const compressed: CompanyFinancials = {
    symbol: data.symbol,
    name: data.name,
    currentPrice: data.currentPrice,
    sharesOutstanding: data.sharesOutstanding,
    incomeStatement: compressStatementArray(data.incomeStatement, config),
    balanceSheet: compressStatementArray(data.balanceSheet as unknown as Record<string, unknown>[], config) as any,
    cashFlowStatement: compressStatementArray(data.cashFlowStatement, config),
  };

  const compressionRatio = JSON.stringify(compressed).length / JSON.stringify(data).length;
  console.log(`Compression complete for ${data.symbol}`, {
    originalSize: JSON.stringify(data).length,
    compressedSize: JSON.stringify(compressed).length,
    compressionRatio: Math.round((1 - compressionRatio) * 100) + '%',
  });

  return compressed;
}

/**
 * Compress an array of financial statements
 */
function compressStatementArray<T extends Record<string, unknown>>(
  statements: T[],
  config: CompressionConfig
): T[] {
  if (!statements || statements.length === 0) return [];

  // Limit to specified number of years
  const limited = statements.slice(0, config.maxYears);

  // Process each statement
  return limited.map(statement => compressStatement(statement, config));
}

/**
 * Compress a single financial statement
 */
function compressStatement<T extends Record<string, unknown>>(
  statement: T,
  config: CompressionConfig
): T {
  const compressed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(statement)) {
    // Always keep essential fields
    if (ESSENTIAL_FIELDS.has(key)) {
      compressed[key] = processValue(value, config);
      continue;
    }

    // Remove derived fields if configured
    if (config.removeDerivedFields && DERIVED_FIELDS.has(key)) {
      continue;
    }

    // Remove empty fields if configured
    if (config.removeEmptyFields && (value === null || value === undefined || value === '')) {
      continue;
    }

    compressed[key] = processValue(value, config);
  }

  return compressed as T;
}

/**
 * Process individual values based on compression config
 */
function processValue(value: unknown, config: CompressionConfig): unknown {
  if (typeof value === 'number' && config.roundNumbers && !isNaN(value)) {
    // Round numbers to specified decimal places
    return Math.round(value * Math.pow(10, config.decimalPlaces)) / Math.pow(10, config.decimalPlaces);
  }

  return value;
}

/**
 * Calculate storage size reduction percentage
 */
export function calculateCompressionRatio(
  original: CompanyFinancials,
  compressed: CompanyFinancials
): number {
  const originalSize = JSON.stringify(original).length;
  const compressedSize = JSON.stringify(compressed).length;
  
  return Math.round((1 - compressedSize / originalSize) * 100);
}

/**
 * Estimate storage size in bytes
 */
export function estimateStorageSize(data: CompanyFinancials): number {
  // JSON.stringify gives us character count, multiply by average bytes per character
  // UTF-8 encoding averages ~1.5 bytes per character for financial data
  return JSON.stringify(data).length * 1.5;
}

/**
 * Selective field compression - remove specific field categories
 */
export interface SelectiveCompressionOptions {
  /** Remove all margin/ratio calculations */
  removeRatios?: boolean;
  /** Remove detailed asset breakdown (keep only totals) */
  removeAssetBreakdown?: boolean;
  /** Remove detailed liability breakdown */
  removeLiabilityBreakdown?: boolean;
  /** Remove tax-related fields */
  removeTaxFields?: boolean;
  /** Keep only core income statement items */
  coreIncomeOnly?: boolean;
}

/**
 * Apply selective compression based on specific field categories
 */
export function selectiveCompress(
  data: CompanyFinancials,
  options: SelectiveCompressionOptions
): CompanyFinancials {
  const { 
    removeRatios = false,
    removeAssetBreakdown = false,
    removeLiabilityBreakdown = false,
    removeTaxFields = false,
    coreIncomeOnly = false,
  } = options;

  const compressed = { ...data };

  // Process income statements
  compressed.incomeStatement = data.incomeStatement.map(stmt => {
    const result = { ...stmt };

    if (removeRatios) {
      delete result.grossMargin;
      delete result.operatingMargin;
      delete result.netMargin;
    }

    if (removeTaxFields) {
      delete result.incomeTaxExpense;
      delete result.effectiveTaxRate;
    }

    if (coreIncomeOnly) {
      // Keep only essential income statement fields
      const core = {
        date: result.date,
        revenue: result.revenue,
        operatingIncome: result.operatingIncome,
        netIncome: result.netIncome,
        eps: result.eps,
        sharesOutstanding: result.sharesOutstanding,
      };
      return core as typeof stmt;
    }

    return result;
  });

  // Process balance sheets
  compressed.balanceSheet = data.balanceSheet.map(stmt => {
    const result = { ...stmt };

    if (removeAssetBreakdown) {
      delete result.currentAssets;
      delete result.cash;
      delete result.cashAndEquivalents;
      delete result.marketableSecurities;
      delete result.accountsReceivable;
      delete result.inventory;
      delete result.propertyPlantEquipment;
      delete result.goodwill;
      delete result.intangibleAssets;
    }

    if (removeLiabilityBreakdown) {
      delete result.currentLiabilities;
      delete result.accountsPayable;
      delete result.shortTermDebt;
      delete result.longTermDebt;
      delete result.deferredRevenue;
    }

    return result;
  });

  return compressed;
}

/**
 * Smart compression that adapts based on data size
 */
export function smartCompress(data: CompanyFinancials): CompanyFinancials {
  const originalSize = estimateStorageSize(data);
  
  // Light compression for small datasets (< 50KB)
  if (originalSize < 50000) {
    return compressFinancialData(data, {
      ...DEFAULT_COMPRESSION_CONFIG,
      maxYears: 10,
      removeEmptyFields: true,
      roundNumbers: false,
      removeDerivedFields: false,
    });
  }
  
  // Medium compression for medium datasets (50KB - 200KB)
  if (originalSize < 200000) {
    return compressFinancialData(data, DEFAULT_COMPRESSION_CONFIG);
  }
  
  // Aggressive compression for large datasets (> 200KB)
  const aggressivelyCompressed = compressFinancialData(data, {
    ...DEFAULT_COMPRESSION_CONFIG,
    maxYears: 3,
    roundNumbers: true,
    decimalPlaces: 0,
    removeDerivedFields: true,
  });

  return selectiveCompress(aggressivelyCompressed, {
    removeRatios: true,
    removeAssetBreakdown: true,
    removeLiabilityBreakdown: true,
    removeTaxFields: true,
  });
}

/**
 * Decompress data by restoring derived fields (if needed)
 */
export function decompressFinancialData(data: CompanyFinancials): CompanyFinancials {
  // Note: This is a placeholder for potential decompression logic
  // Currently, our compression is lossy (removes derived fields)
  // In the future, we could implement field recalculation here
  return data;
}

/**
 * Validate compressed data integrity
 */
export function validateCompression(
  original: CompanyFinancials,
  compressed: CompanyFinancials
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check that essential data is preserved
  if (compressed.symbol !== original.symbol) {
    issues.push('Symbol mismatch after compression');
  }
  
  if (compressed.incomeStatement.length === 0 && original.incomeStatement.length > 0) {
    issues.push('Income statement completely removed');
  }
  
  if (compressed.balanceSheet.length === 0 && original.balanceSheet.length > 0) {
    issues.push('Balance sheet completely removed');
  }
  
  if (compressed.cashFlowStatement.length === 0 && original.cashFlowStatement.length > 0) {
    issues.push('Cash flow statement completely removed');
  }

  // Check that recent data is preserved
  if (compressed.incomeStatement.length > 0 && original.incomeStatement.length > 0) {
    const compressedLatest = compressed.incomeStatement[0];
    const originalLatest = original.incomeStatement[0];
    
    if (compressedLatest.date !== originalLatest.date) {
      issues.push('Latest income statement date changed');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}