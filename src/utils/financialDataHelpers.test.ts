/**
 * Tests for financial data helper functions
 * Focusing on the new calculateRevenueGrowthRate function
 */

import { describe, it, expect } from 'vitest';
import { 
  calculateRevenueGrowthRate, 
  calculateGrowthRate
} from './financialDataHelpers';

describe('Financial Data Helpers', () => {
  describe('calculateRevenueGrowthRate', () => {
    it('should calculate positive growth rate correctly (newest first)', () => {
      const incomeStatements = [
        { date: '2023-12-31', revenue: 120000 }, // Latest year - higher revenue
        { date: '2022-12-31', revenue: 100000 }  // Previous year - lower revenue
      ];

      const growthRate = calculateRevenueGrowthRate(incomeStatements);
      expect(growthRate).toBeCloseTo(0.2); // 20% growth
    });

    it('should calculate positive growth rate correctly (oldest first - needs sorting)', () => {
      const incomeStatements = [
        { date: '2022-12-31', revenue: 100000 }, // Older year first
        { date: '2023-12-31', revenue: 120000 }  // Newer year second
      ];

      const growthRate = calculateRevenueGrowthRate(incomeStatements);
      expect(growthRate).toBeCloseTo(0.2); // 20% growth (should still be positive)
    });

    it('should calculate negative growth rate correctly', () => {
      const incomeStatements = [
        { date: '2023-12-31', revenue: 80000 },  // Latest year - lower revenue
        { date: '2022-12-31', revenue: 100000 }  // Previous year - higher revenue
      ];

      const growthRate = calculateRevenueGrowthRate(incomeStatements);
      expect(growthRate).toBeCloseTo(-0.2); // -20% growth
    });

    it('should handle Apple-like revenue growth (simulating real data)', () => {
      // Simulating Apple's revenue growth pattern
      const incomeStatements = [
        { date: '2023-09-30', revenue: 383285000000 }, // 2023 revenue (higher)
        { date: '2022-09-30', revenue: 365817000000 }  // 2022 revenue (lower)
      ];

      const growthRate = calculateRevenueGrowthRate(incomeStatements);
      // Apple should show positive growth, not negative
      expect(growthRate).toBeGreaterThan(0); 
      expect(growthRate).toBeCloseTo(0.0477, 3); // ~4.77% growth
    });

    it('should return default 10% for insufficient data', () => {
      const incomeStatements = [
        { date: '2023-12-31', revenue: 100000 }
      ];

      const growthRate = calculateRevenueGrowthRate(incomeStatements);
      expect(growthRate).toBe(0.10); // 10% default
    });

    it('should return default 10% for empty array', () => {
      const incomeStatements: Record<string, unknown>[] = [];
      const growthRate = calculateRevenueGrowthRate(incomeStatements);
      expect(growthRate).toBe(0.10); // 10% default
    });

    it('should return default 10% for invalid revenue data', () => {
      const incomeStatements = [
        { date: '2023-12-31', revenue: 0 },
        { date: '2022-12-31', revenue: 100000 }
      ];

      const growthRate = calculateRevenueGrowthRate(incomeStatements);
      expect(growthRate).toBe(0.10); // 10% default
    });

    it('should cap extreme growth rates', () => {
      const incomeStatements = [
        { date: '2023-12-31', revenue: 300000 }, // 200% growth
        { date: '2022-12-31', revenue: 100000 }
      ];

      const growthRate = calculateRevenueGrowthRate(incomeStatements);
      expect(growthRate).toBeLessThanOrEqual(1.0); // Capped at 100%
    });

    it('should cap extreme negative growth rates', () => {
      const incomeStatements = [
        { date: '2023-12-31', revenue: 10000 }, // -90% decline
        { date: '2022-12-31', revenue: 100000 }
      ];

      const growthRate = calculateRevenueGrowthRate(incomeStatements);
      expect(growthRate).toBeGreaterThanOrEqual(-0.5); // Capped at -50%
    });

    it('should round to 4 decimal places', () => {
      const incomeStatements = [
        { date: '2023-12-31', revenue: 100001 }, // Very small growth
        { date: '2022-12-31', revenue: 100000 }
      ];

      const growthRate = calculateRevenueGrowthRate(incomeStatements);
      // Should be rounded, not have floating point precision issues
      expect(growthRate.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);
    });
  });

  describe('Legacy calculateGrowthRate', () => {
    it('should calculate growth rate as percentage', () => {
      const growthRate = calculateGrowthRate(120, 100);
      expect(growthRate).toBe(20); // 20%
    });
  });
});