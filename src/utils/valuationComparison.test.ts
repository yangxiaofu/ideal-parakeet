import { describe, it, expect } from 'vitest';
import { calculateValuationDelta } from './valuationComparison';

describe('valuationComparison', () => {
  describe('calculateValuationDelta', () => {
    it('should identify undervalued stocks', () => {
      // Intrinsic value $120, current price $100 = 20% undervalued
      const result = calculateValuationDelta(120, 100);
      
      expect(result.delta).toBe(20);
      expect(result.percentage).toBe(20);
      expect(result.status).toBe('undervalued');
    });

    it('should identify overvalued stocks', () => {
      // Intrinsic value $80, current price $100 = 20% overvalued  
      const result = calculateValuationDelta(80, 100);
      
      expect(result.delta).toBe(-20);
      expect(result.percentage).toBe(-20);
      expect(result.status).toBe('overvalued');
    });

    it('should identify fairly valued stocks', () => {
      // Intrinsic value $105, current price $100 = 5% difference (within fair range)
      const result = calculateValuationDelta(105, 100);
      
      expect(result.delta).toBe(5);
      expect(result.percentage).toBe(5);
      expect(result.status).toBe('fair');
    });

    it('should handle zero current price', () => {
      const result = calculateValuationDelta(100, 0);
      
      expect(result.delta).toBe(100);
      expect(result.percentage).toBe(0);
      expect(result.status).toBe('fair'); // Falls back to fair when percentage is 0
    });

    it('should handle edge case at 10% threshold', () => {
      // Exactly 10% should be fair (threshold is > 10%)
      const result = calculateValuationDelta(110, 100);
      
      expect(result.percentage).toBe(10);
      expect(result.status).toBe('fair');
    });

    it('should handle negative intrinsic values', () => {
      const result = calculateValuationDelta(-50, 100);
      
      expect(result.delta).toBe(-150);
      expect(result.percentage).toBe(-150);
      expect(result.status).toBe('overvalued');
    });
  });
});