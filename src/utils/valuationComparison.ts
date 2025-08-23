/**
 * Valuation comparison utilities
 * Separated from PriceContext to maintain React Fast Refresh compatibility
 */

/**
 * Utility function to calculate valuation vs current price
 */
export const calculateValuationDelta = (
  intrinsicValue: number,
  currentPrice: number
): {
  delta: number;
  percentage: number;
  status: 'undervalued' | 'overvalued' | 'fair';
} => {
  const delta = intrinsicValue - currentPrice;
  const percentage = currentPrice > 0 ? (delta / currentPrice) * 100 : 0;
  
  let status: 'undervalued' | 'overvalued' | 'fair' = 'fair';
  if (Math.abs(percentage) > 10) {
    status = percentage > 0 ? 'undervalued' : 'overvalued';
  }
  
  return {
    delta,
    percentage,
    status,
  };
};