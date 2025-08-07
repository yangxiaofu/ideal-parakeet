import { describe, it, expect } from 'vitest';
import {
  calculateGordonGrowthModel,
  calculateZeroGrowthDDM,
  calculateTwoStageDDM,
  calculateMultiStageDDM,
  calculateDDM,
  validateDDMInputs,
  calculateImpliedGrowthRate,
  calculateHistoricalDividendGrowth
} from './ddmCalculator';
import type { DDMInputs } from '../types/ddm';

describe('DDM Calculator', () => {
  describe('Gordon Growth Model', () => {
    it('should calculate correct value for constant growth', () => {
      const inputs: DDMInputs = {
        currentDividend: 2.00,  // $2 current dividend
        sharesOutstanding: 1000000,
        requiredReturn: 0.10,   // 10% required return
        modelType: 'gordon',
        gordonGrowthRate: 0.05  // 5% growth
      };
      
      const result = calculateGordonGrowthModel(inputs);
      
      // D1 = 2 * 1.05 = 2.10
      // P = 2.10 / (0.10 - 0.05) = 2.10 / 0.05 = 42
      expect(result.intrinsicValuePerShare).toBeCloseTo(42, 2);
      expect(result.intrinsicValue).toBeCloseTo(42000000, 0);
    });
    
    it('should handle zero growth rate', () => {
      const inputs: DDMInputs = {
        currentDividend: 3.00,
        sharesOutstanding: 1000000,
        requiredReturn: 0.08,
        modelType: 'gordon',
        gordonGrowthRate: 0
      };
      
      const result = calculateGordonGrowthModel(inputs);
      
      // D1 = 3 * 1 = 3
      // P = 3 / 0.08 = 37.50
      expect(result.intrinsicValuePerShare).toBeCloseTo(37.50, 2);
    });
    
    it('should handle negative growth rate', () => {
      const inputs: DDMInputs = {
        currentDividend: 5.00,
        sharesOutstanding: 1000000,
        requiredReturn: 0.10,
        modelType: 'gordon',
        gordonGrowthRate: -0.02  // -2% growth (declining dividends)
      };
      
      const result = calculateGordonGrowthModel(inputs);
      
      // D1 = 5 * 0.98 = 4.90
      // P = 4.90 / (0.10 - (-0.02)) = 4.90 / 0.12 = 40.83
      expect(result.intrinsicValuePerShare).toBeCloseTo(40.83, 2);
    });
    
    it('should generate correct dividend projections', () => {
      const inputs: DDMInputs = {
        currentDividend: 1.00,
        sharesOutstanding: 1000000,
        requiredReturn: 0.10,
        modelType: 'gordon',
        gordonGrowthRate: 0.05
      };
      
      const result = calculateGordonGrowthModel(inputs);
      
      expect(result.dividendProjections).toHaveLength(10);
      expect(result.dividendProjections[0].dividend).toBeCloseTo(1.05, 2); // Year 1
      expect(result.dividendProjections[1].dividend).toBeCloseTo(1.1025, 2); // Year 2
      expect(result.dividendProjections[0].presentValue).toBeCloseTo(0.9545, 2); // 1.05 / 1.10
    });
  });
  
  describe('Zero Growth DDM', () => {
    it('should calculate correct value for zero growth', () => {
      const inputs: DDMInputs = {
        currentDividend: 4.00,
        sharesOutstanding: 1000000,
        requiredReturn: 0.08,
        modelType: 'zero'
      };
      
      const result = calculateZeroGrowthDDM(inputs);
      
      // P = D / r = 4 / 0.08 = 50
      expect(result.intrinsicValuePerShare).toBeCloseTo(50, 2);
      expect(result.currentDividendYield).toBeCloseTo(0.08, 4);
    });
    
    it('should have constant dividends in projections', () => {
      const inputs: DDMInputs = {
        currentDividend: 2.50,
        sharesOutstanding: 1000000,
        requiredReturn: 0.10,
        modelType: 'zero'
      };
      
      const result = calculateZeroGrowthDDM(inputs);
      
      result.dividendProjections.forEach(projection => {
        expect(projection.dividend).toBe(2.50);
        expect(projection.growthRate).toBe(0);
      });
    });
  });
  
  describe('Two-Stage DDM', () => {
    it('should calculate correct value for two-stage growth', () => {
      const inputs: DDMInputs = {
        currentDividend: 1.00,
        sharesOutstanding: 1000000,
        requiredReturn: 0.10,
        modelType: 'two-stage',
        highGrowthRate: 0.15,    // 15% for first stage
        highGrowthYears: 5,       // 5 years of high growth
        stableGrowthRate: 0.04    // 4% terminal growth
      };
      
      const result = calculateTwoStageDDM(inputs);
      
      // Manual calculation:
      // Stage 1 PV: Sum of dividends years 1-5 with 15% growth
      // Year 1: 1.15 / 1.10 = 1.045
      // Year 2: 1.3225 / 1.21 = 1.093
      // Year 3: 1.5209 / 1.331 = 1.143
      // Year 4: 1.7490 / 1.4641 = 1.195
      // Year 5: 2.0114 / 1.6105 = 1.249
      // Total Stage 1 ≈ 5.725
      
      // Terminal value: D6 / (r - g) = 2.0114 * 1.04 / (0.10 - 0.04) = 34.86
      // PV of terminal: 34.86 / 1.6105 = 21.65
      // Total value ≈ 5.725 + 21.65 = 27.375
      
      expect(result.intrinsicValuePerShare).toBeGreaterThan(25);
      expect(result.intrinsicValuePerShare).toBeLessThan(30);
      expect(result.terminalValue).toBeDefined();
      expect(result.terminalValuePV).toBeDefined();
    });
    
    it('should handle zero high growth', () => {
      const inputs: DDMInputs = {
        currentDividend: 2.00,
        sharesOutstanding: 1000000,
        requiredReturn: 0.10,
        modelType: 'two-stage',
        highGrowthRate: 0,        // No growth in first stage
        highGrowthYears: 3,
        stableGrowthRate: 0.03
      };
      
      const result = calculateTwoStageDDM(inputs);
      
      expect(result.intrinsicValuePerShare).toBeGreaterThan(0);
      expect(result.dividendProjections[0].dividend).toBe(2.00);
      expect(result.dividendProjections[2].dividend).toBe(2.00);
    });
  });
  
  describe('Multi-Stage DDM', () => {
    it('should calculate correct value for three-stage growth', () => {
      const inputs: DDMInputs = {
        currentDividend: 1.00,
        sharesOutstanding: 1000000,
        requiredReturn: 0.10,
        modelType: 'multi-stage',
        growthPhases: [
          { growthRate: 0.20, years: 3, description: 'High Growth' },
          { growthRate: 0.10, years: 3, description: 'Transition' },
          { growthRate: 0.03, years: 0, description: 'Terminal' } // Terminal phase
        ]
      };
      
      const result = calculateMultiStageDDM(inputs);
      
      expect(result.intrinsicValuePerShare).toBeGreaterThan(0);
      expect(result.dividendProjections.length).toBeGreaterThan(6);
      expect(result.terminalValue).toBeDefined();
      
      // Check that growth rates change at phase boundaries
      expect(result.dividendProjections[0].growthRate).toBe(0.20);
      expect(result.dividendProjections[3].growthRate).toBe(0.10);
    });
    
    it('should throw error for insufficient phases', () => {
      const inputs: DDMInputs = {
        currentDividend: 1.00,
        sharesOutstanding: 1000000,
        requiredReturn: 0.10,
        modelType: 'multi-stage',
        growthPhases: [
          { growthRate: 0.10, years: 5 }
        ]
      };
      
      expect(() => calculateMultiStageDDM(inputs)).toThrow('at least 2 growth phases');
    });
  });
  
  describe('Input Validation', () => {
    it('should reject negative dividends', () => {
      const inputs: DDMInputs = {
        currentDividend: -1.00,
        sharesOutstanding: 1000000,
        requiredReturn: 0.10,
        modelType: 'gordon',
        gordonGrowthRate: 0.05
      };
      
      const validation = validateDDMInputs(inputs);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Current dividend cannot be negative');
    });
    
    it('should reject growth rate >= required return for Gordon model', () => {
      const inputs: DDMInputs = {
        currentDividend: 2.00,
        sharesOutstanding: 1000000,
        requiredReturn: 0.10,
        modelType: 'gordon',
        gordonGrowthRate: 0.12  // Greater than required return
      };
      
      const validation = validateDDMInputs(inputs);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Growth rate must be less than required return for Gordon model');
    });
    
    it('should warn about zero dividend', () => {
      const inputs: DDMInputs = {
        currentDividend: 0,
        sharesOutstanding: 1000000,
        requiredReturn: 0.10,
        modelType: 'gordon',
        gordonGrowthRate: 0.05
      };
      
      const validation = validateDDMInputs(inputs);
      expect(validation.warnings).toContain('Current dividend is zero - company may not be suitable for DDM');
    });
    
    it('should warn about very high growth rates', () => {
      const inputs: DDMInputs = {
        currentDividend: 1.00,
        sharesOutstanding: 1000000,
        requiredReturn: 0.20,
        modelType: 'gordon',
        gordonGrowthRate: 0.18  // 18% growth
      };
      
      const validation = validateDDMInputs(inputs);
      expect(validation.warnings).toContain('Growth rate >15% may not be sustainable long-term');
    });
  });
  
  describe('Main DDM Function', () => {
    it('should route to correct model', () => {
      const gordonInputs: DDMInputs = {
        currentDividend: 2.00,
        sharesOutstanding: 1000000,
        requiredReturn: 0.10,
        modelType: 'gordon',
        gordonGrowthRate: 0.05
      };
      
      const result = calculateDDM(gordonInputs);
      expect(result.modelType).toBe('gordon');
      expect(result.intrinsicValuePerShare).toBeCloseTo(42, 2);
    });
    
    it('should throw error for invalid inputs', () => {
      const invalidInputs: DDMInputs = {
        currentDividend: 2.00,
        sharesOutstanding: 1000000,
        requiredReturn: 0.10,
        modelType: 'gordon',
        gordonGrowthRate: 0.15  // Invalid: greater than required return
      };
      
      expect(() => calculateDDM(invalidInputs)).toThrow('Invalid DDM inputs');
    });
  });
  
  describe('Helper Functions', () => {
    it('should calculate implied growth rate correctly', () => {
      const currentPrice = 50;
      const currentDividend = 2;
      const requiredReturn = 0.10;
      
      const impliedGrowth = calculateImpliedGrowthRate(currentPrice, currentDividend, requiredReturn);
      
      // Dividend yield = 2/50 = 0.04
      // Implied growth = 0.10 - 0.04 = 0.06
      expect(impliedGrowth).toBeCloseTo(0.06, 4);
    });
    
    it('should calculate historical dividend growth (CAGR)', () => {
      const dividends = [
        { year: '2020', value: 1.00 },
        { year: '2021', value: 1.10 },
        { year: '2022', value: 1.21 },
        { year: '2023', value: 1.33 }
      ];
      
      const growth = calculateHistoricalDividendGrowth(dividends);
      
      // CAGR = (1.33/1.00)^(1/3) - 1 ≈ 0.10 (10%)
      expect(growth).toBeCloseTo(0.10, 2);
    });
    
    it('should handle unsorted dividend history', () => {
      const dividends = [
        { year: '2023', value: 1.33 },
        { year: '2021', value: 1.10 },
        { year: '2020', value: 1.00 },
        { year: '2022', value: 1.21 }
      ];
      
      const growth = calculateHistoricalDividendGrowth(dividends);
      expect(growth).toBeCloseTo(0.10, 2);
    });
    
    it('should return 0 for insufficient dividend history', () => {
      const dividends = [{ year: '2023', value: 1.00 }];
      const growth = calculateHistoricalDividendGrowth(dividends);
      expect(growth).toBe(0);
    });
  });
});