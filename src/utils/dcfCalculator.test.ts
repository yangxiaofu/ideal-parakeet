import { 
  calculatePresentValue, 
  calculateTerminalValue, 
  projectFreeCashFlows, 
  calculateDCFIntrinsicValue,
  validateDCFInputs
} from './dcfCalculator';
import type { DCFInputs } from '../types';

describe('DCF Calculator', () => {
  describe('calculatePresentValue', () => {
    it('should calculate present value correctly', () => {
      const futureValue = 1000;
      const discountRate = 0.10; // 10%
      const year = 1;
      
      const result = calculatePresentValue(futureValue, discountRate, year);
      
      expect(result).toBeCloseTo(909.09, 2); // 1000 / (1.10)^1
    });

    it('should handle multi-year discounting', () => {
      const futureValue = 1000;
      const discountRate = 0.10;
      const year = 5;
      
      const result = calculatePresentValue(futureValue, discountRate, year);
      
      expect(result).toBeCloseTo(620.92, 2); // 1000 / (1.10)^5
    });

    it('should handle zero discount rate', () => {
      const futureValue = 1000;
      const discountRate = 0;
      const year = 5;
      
      const result = calculatePresentValue(futureValue, discountRate, year);
      
      expect(result).toBe(1000); // No discounting
    });
  });

  describe('calculateTerminalValue', () => {
    it('should calculate terminal value with perpetual growth', () => {
      const finalYearFCF = 1000;
      const terminalGrowthRate = 0.03; // 3%
      const discountRate = 0.10; // 10%
      
      const result = calculateTerminalValue(finalYearFCF, terminalGrowthRate, discountRate);
      
      // TV = FCF * (1 + g) / (r - g) = 1000 * 1.03 / (0.10 - 0.03)
      expect(result).toBeCloseTo(14714.29, 2);
    });

    it('should handle zero terminal growth', () => {
      const finalYearFCF = 1000;
      const terminalGrowthRate = 0;
      const discountRate = 0.10;
      
      const result = calculateTerminalValue(finalYearFCF, terminalGrowthRate, discountRate);
      
      expect(result).toBeCloseTo(10000, 2); // 1000 / 0.10
    });

    it('should throw error when growth rate equals discount rate', () => {
      const finalYearFCF = 1000;
      const terminalGrowthRate = 0.10;
      const discountRate = 0.10;
      
      expect(() => {
        calculateTerminalValue(finalYearFCF, terminalGrowthRate, discountRate);
      }).toThrow('Terminal growth rate must be less than discount rate');
    });

    it('should throw error when growth rate exceeds discount rate', () => {
      const finalYearFCF = 1000;
      const terminalGrowthRate = 0.15;
      const discountRate = 0.10;
      
      expect(() => {
        calculateTerminalValue(finalYearFCF, terminalGrowthRate, discountRate);
      }).toThrow('Terminal growth rate must be less than discount rate');
    });
  });

  describe('projectFreeCashFlows', () => {
    it('should project cash flows with single growth rate', () => {
      const baseFCF = 1000;
      const growthRates = [0.10, 0.08, 0.06, 0.05, 0.04];
      
      const result = projectFreeCashFlows(baseFCF, growthRates);
      
      expect(result).toHaveLength(5);
      expect(result[0].year).toBe(1);
      expect(result[0].freeCashFlow).toBeCloseTo(1100, 2); // 1000 * 1.10
      expect(result[0].growthRate).toBe(0.10);
      
      expect(result[1].freeCashFlow).toBeCloseTo(1188, 2); // 1100 * 1.08
      expect(result[4].freeCashFlow).toBeCloseTo(1375.13, 2); // 1000 * 1.1 * 1.08 * 1.06 * 1.05 * 1.04
    });

    it('should handle zero growth rates', () => {
      const baseFCF = 1000;
      const growthRates = [0, 0, 0];
      
      const result = projectFreeCashFlows(baseFCF, growthRates);
      
      result.forEach(projection => {
        expect(projection.freeCashFlow).toBe(1000);
        expect(projection.growthRate).toBe(0);
      });
    });

    it('should handle negative growth rates', () => {
      const baseFCF = 1000;
      const growthRates = [-0.05]; // 5% decline
      
      const result = projectFreeCashFlows(baseFCF, growthRates);
      
      expect(result[0].freeCashFlow).toBeCloseTo(950, 2); // 1000 * 0.95
    });
  });

  describe('calculateDCFIntrinsicValue', () => {
    it('should calculate complete DCF valuation', () => {
      const inputs: DCFInputs = {
        baseFCF: 1000,
        fcfGrowthRates: [0.10, 0.08, 0.06, 0.05, 0.04],
        discountRate: 0.10,
        terminalGrowthRate: 0.03,
        sharesOutstanding: 100,
        projectionYears: 5,
        scenario: 'base'
      };
      
      const result = calculateDCFIntrinsicValue(inputs);
      
      expect(result.method).toBe('DCF');
      expect(result.scenario).toBe('base');
      expect(result.projections).toHaveLength(5);
      expect(result.intrinsicValuePerShare).toBeGreaterThan(0);
      expect(result.terminalValue).toBeGreaterThan(0);
      expect(result.totalPresentValue).toBeGreaterThan(0);
      expect(result.sharesOutstanding).toBe(100);
    });

    it('should calculate present values for all projections', () => {
      const inputs: DCFInputs = {
        baseFCF: 1000,
        fcfGrowthRates: [0.10, 0.10],
        discountRate: 0.10,
        terminalGrowthRate: 0.03,
        sharesOutstanding: 100,
        projectionYears: 2,
        scenario: 'base'
      };
      
      const result = calculateDCFIntrinsicValue(inputs);
      
      expect(result.projections[0].presentValue).toBeCloseTo(1000, 2); // 1100 / 1.10
      expect(result.projections[1].presentValue).toBeCloseTo(1000, 2); // 1210 / (1.10)^2
    });

    it('should include terminal value in total present value', () => {
      const inputs: DCFInputs = {
        baseFCF: 1000,
        fcfGrowthRates: [0.05],
        discountRate: 0.10,
        terminalGrowthRate: 0.03,
        sharesOutstanding: 100,
        projectionYears: 1,
        scenario: 'base'
      };
      
      const result = calculateDCFIntrinsicValue(inputs);
      
      const projectionsPV = result.projections.reduce((sum, p) => sum + p.presentValue, 0);
      const terminalPV = calculatePresentValue(result.terminalValue, inputs.discountRate, inputs.projectionYears);
      
      expect(result.totalPresentValue).toBeCloseTo(projectionsPV + terminalPV, 2);
    });
  });

  describe('validateDCFInputs', () => {
    const validInputs: DCFInputs = {
      baseFCF: 1000,
      fcfGrowthRates: [0.10, 0.08, 0.06],
      discountRate: 0.10,
      terminalGrowthRate: 0.03,
      sharesOutstanding: 100,
      projectionYears: 3,
      scenario: 'base'
    };

    it('should pass validation for valid inputs', () => {
      expect(() => validateDCFInputs(validInputs)).not.toThrow();
    });

    it('should throw error for negative base FCF', () => {
      const inputs = { ...validInputs, baseFCF: -1000 };
      expect(() => validateDCFInputs(inputs)).toThrow('Base FCF must be positive');
    });

    it('should throw error for negative discount rate', () => {
      const inputs = { ...validInputs, discountRate: -0.05 };
      expect(() => validateDCFInputs(inputs)).toThrow('Discount rate must be positive');
    });

    it('should throw error for zero shares outstanding', () => {
      const inputs = { ...validInputs, sharesOutstanding: 0 };
      expect(() => validateDCFInputs(inputs)).toThrow('Shares outstanding must be positive');
    });

    it('should throw error for mismatched growth rates array length', () => {
      const inputs = { ...validInputs, fcfGrowthRates: [0.10, 0.08], projectionYears: 3 };
      expect(() => validateDCFInputs(inputs)).toThrow('Growth rates array length must match projection years');
    });

    it('should throw error when terminal growth >= discount rate', () => {
      const inputs = { ...validInputs, terminalGrowthRate: 0.10 };
      expect(() => validateDCFInputs(inputs)).toThrow('Terminal growth rate must be less than discount rate');
    });
  });
});