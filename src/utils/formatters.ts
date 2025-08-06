/**
 * Utility functions for formatting financial numbers and data
 */

/**
 * Format large numbers with appropriate suffixes (B, M, K)
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "1.5B", "250.0M", "50.0K")
 */
export function formatLargeNumber(value: number, decimals: number = 1): string {
  if (value === 0) return '0';
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(decimals)}B`;
  } else if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(decimals)}M`;
  } else if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(decimals)}K`;
  } else {
    return `${sign}${absValue.toFixed(decimals)}`;
  }
}

/**
 * Format currency values with appropriate suffixes
 * @param value - The currency value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string (e.g., "$1.5B", "$250.0M")
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return `$${formatLargeNumber(value, decimals)}`;
}

/**
 * Format shares outstanding specifically
 * @param shares - Number of shares
 * @returns Formatted string (e.g., "2.5B shares", "150.0M shares")
 */
export function formatShares(shares: number): string {
  if (shares === 0) return '0 shares';
  return `${formatLargeNumber(shares, 1)} shares`;
}

/**
 * Format percentage values
 * @param value - Decimal value (e.g., 0.15 for 15%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "15.0%")
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format dates consistently across the application
 * @param dateString - Date string from API (YYYY-MM-DD format)
 * @returns Formatted date string (e.g., "2023")
 */
export function formatYear(dateString: string): string {
  return dateString.split('-')[0];
}

/**
 * Format EPS (Earnings Per Share) values
 * @param eps - EPS value
 * @returns Formatted EPS string (e.g., "$5.25")
 */
export function formatEPS(eps: number): string {
  return `$${eps.toFixed(2)}`;
}