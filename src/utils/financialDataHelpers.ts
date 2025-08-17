/**
 * Utility functions for processing and sorting financial data
 */

import { formatYear } from './formatters';

export interface HistoricalValue {
  year: string;
  value: number;
}

/**
 * Get the latest (most recent) entry from a financial statement array
 * @param entries Array of financial statement entries with date field
 * @returns The entry with the most recent date, or null if array is empty
 */
export function getLatestFinancialEntry<T extends { date: string }>(
  entries: T[]
): T | null {
  if (!entries || entries.length === 0) return null;
  
  // Sort by date descending and return the first (most recent)
  return [...entries].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA; // Descending order (newest first)
  })[0];
}

/**
 * Sort financial entries by date in descending order (newest first)
 * @param entries Array of financial statement entries with date field
 * @returns Sorted array with newest entries first
 */
export function sortFinancialDataByDate<T extends { date: string }>(
  entries: T[]
): T[] {
  if (!entries || entries.length === 0) return [];
  
  return [...entries].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA; // Descending order (newest first)
  });
}

/**
 * Prepare historical data for SelectableInput component
 * Ensures data is sorted newest first for correct "Latest" labeling
 * @param statements Array of financial statements
 * @param valueExtractor Function to extract the value from each statement
 * @returns Array of historical values sorted newest first
 */
export function prepareHistoricalData<T extends { date: string }>(
  statements: T[],
  valueExtractor: (stmt: T) => number
): HistoricalValue[] {
  if (!statements || statements.length === 0) return [];
  
  // Sort statements newest first
  const sorted = sortFinancialDataByDate(statements);
  
  // Extract and format the data
  return sorted.map(stmt => ({
    year: formatYear(stmt.date),
    value: valueExtractor(stmt)
  }));
}

/**
 * Get the index of the latest year in a financial statement array
 * @param entries Array of financial statement entries with date field
 * @returns Index of the latest entry, or 0 if not found
 */
export function getLatestIndex<T extends { date: string }>(
  entries: T[]
): number {
  if (!entries || entries.length === 0) return 0;
  
  let latestIndex = 0;
  let latestDate = new Date(entries[0].date).getTime();
  
  for (let i = 1; i < entries.length; i++) {
    const currentDate = new Date(entries[i].date).getTime();
    if (currentDate > latestDate) {
      latestDate = currentDate;
      latestIndex = i;
    }
  }
  
  return latestIndex;
}

/**
 * Extract a specific value from the latest financial statement
 * @param statements Array of financial statements
 * @param valueExtractor Function to extract the desired value
 * @param defaultValue Default value if no statements or extraction fails
 * @returns The extracted value from the latest statement
 */
export function getLatestValue<T extends { date: string }>(
  statements: T[],
  valueExtractor: (stmt: T) => number,
  defaultValue: number = 0
): number {
  const latest = getLatestFinancialEntry(statements);
  return latest ? valueExtractor(latest) : defaultValue;
}

/**
 * Calculate growth rate between two values
 * @param currentValue The current/newer value
 * @param previousValue The previous/older value
 * @returns Growth rate as a percentage
 */
export function calculateGrowthRate(
  currentValue: number,
  previousValue: number
): number {
  if (previousValue === 0) return 0;
  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
}

/**
 * Calculate revenue growth rate from income statements
 * Properly handles data ordering and edge cases
 * @param incomeStatements Array of income statements
 * @returns Growth rate as decimal (0.15 = 15%), defaults to 10% if invalid data
 */
export function calculateRevenueGrowthRate(incomeStatements: { date: string; revenue: number }[]): number {
  if (!incomeStatements || incomeStatements.length < 2) {
    return 0.10; // Default 10% growth
  }
  
  // Sort statements by date (newest first) to ensure correct ordering
  const sortedStatements = sortFinancialDataByDate(incomeStatements);
  
  if (sortedStatements.length < 2) {
    return 0.10; // Default if sorting fails
  }
  
  const currentRevenue = sortedStatements[0]?.revenue || 0;
  const previousRevenue = sortedStatements[1]?.revenue || 0;
  
  // Validate data quality
  if (previousRevenue <= 0 || currentRevenue <= 0) {
    return 0.10; // Default for invalid revenue data
  }
  
  // Ensure dates are actually in correct order
  const currentDate = new Date(sortedStatements[0]?.date);
  const previousDate = new Date(sortedStatements[1]?.date);
  if (currentDate <= previousDate) {
    return 0.10; // Default if dates are wrong
  }
  
  // Calculate growth rate
  const growthRate = (currentRevenue - previousRevenue) / previousRevenue;
  
  // Round to 4 decimal places to avoid floating point precision issues
  const roundedRate = Math.round(growthRate * 10000) / 10000;
  
  // Cap growth rate between -50% and 100% for realistic bounds
  return Math.max(-0.5, Math.min(1.0, roundedRate));
}

/**
 * Check if a company pays dividends based on cash flow statements
 * @param cashFlowStatements Array of cash flow statements
 * @returns True if the company has paid dividends
 */
export function hasDividends(cashFlowStatements: { dividendsPaid: number }[]): boolean {
  if (!cashFlowStatements || cashFlowStatements.length === 0) return false;
  
  return cashFlowStatements.some(
    cf => cf.dividendsPaid && cf.dividendsPaid !== 0
  );
}