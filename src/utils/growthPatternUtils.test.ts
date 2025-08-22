import {
  generateDecayPattern,
  generateGrowthPattern,
  generateCustomPattern,
  validateGrowthPattern,
  formatPatternDescription,
  getScenarioInfo
} from './growthPatternUtils';

describe('growthPatternUtils', () => {
  describe('generateDecayPattern', () => {
    it('generates balanced decay pattern correctly', () => {
      const result = generateDecayPattern(0.10, 0.02, 5, 'balanced');
      
      expect(result).toHaveLength(5);
      expect(result[0]).toBeCloseTo(0.10, 3);
      expect(result[4]).toBeCloseTo(0.02, 3);
      // Should be roughly linear decline
      expect(result[1]).toBeCloseTo(0.08, 3);
      expect(result[2]).toBeCloseTo(0.06, 3);
      expect(result[3]).toBeCloseTo(0.04, 3);
    });

    it('generates front-loaded pattern with higher early values', () => {
      const balanced = generateDecayPattern(0.10, 0.02, 5, 'balanced');
      const frontLoaded = generateDecayPattern(0.10, 0.02, 5, 'front-loaded', 'medium');
      
      // Front-loaded should have higher values in early years
      expect(frontLoaded[0]).toBeCloseTo(balanced[0], 3); // Same start
      expect(frontLoaded[1]).toBeGreaterThan(balanced[1]); // Higher in year 2
      expect(frontLoaded[4]).toBeCloseTo(balanced[4], 3); // Same end
    });

    it('handles edge case of single year', () => {
      const result = generateDecayPattern(0.10, 0.02, 1, 'balanced');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toBeCloseTo(0.10, 3);
    });

    it('rounds values to 3 decimal places', () => {
      const result = generateDecayPattern(0.123456, 0.098765, 3, 'balanced');
      
      result.forEach(rate => {
        const decimalPlaces = (rate.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('generateGrowthPattern', () => {
    it('generates bull case pattern correctly', () => {
      const result = generateGrowthPattern('bull', 5);
      
      expect(result).toHaveLength(5);
      expect(result[0]).toBeCloseTo(0.20, 3);
      expect(result[4]).toBeCloseTo(0.05, 3);
    });

    it('generates base case pattern with new defaults', () => {
      const result = generateGrowthPattern('base', 5);
      
      expect(result).toHaveLength(5);
      expect(result[0]).toBeCloseTo(0.075, 3); // Updated default
      expect(result[4]).toBeCloseTo(0.05, 3);  // Updated default
    });

    it('generates bear case pattern correctly', () => {
      const result = generateGrowthPattern('bear', 5);
      
      expect(result).toHaveLength(5);
      expect(result[0]).toBeCloseTo(0.05, 3);
      expect(result[4]).toBeCloseTo(0.02, 3);
    });

    it('defaults to base case for unknown scenario', () => {
      const baseResult = generateGrowthPattern('base', 5);
      const unknownResult = generateGrowthPattern('unknown' as 'base', 5);
      
      expect(unknownResult).toEqual(baseResult);
    });
  });

  describe('generateCustomPattern', () => {
    it('uses pattern config correctly', () => {
      const config = {
        startRate: 0.12,
        endRate: 0.03,
        distribution: 'balanced' as const,
        intensity: 'medium' as const
      };
      
      const result = generateCustomPattern(config, 4);
      
      expect(result).toHaveLength(4);
      expect(result[0]).toBeCloseTo(0.12, 3);
      expect(result[3]).toBeCloseTo(0.03, 3);
    });

    it('applies front-loading when specified', () => {
      const balancedConfig = {
        startRate: 0.12,
        endRate: 0.03,
        distribution: 'balanced' as const,
        intensity: 'medium' as const
      };
      
      const frontLoadedConfig = {
        ...balancedConfig,
        distribution: 'front-loaded' as const
      };
      
      const balanced = generateCustomPattern(balancedConfig, 5);
      const frontLoaded = generateCustomPattern(frontLoadedConfig, 5);
      
      // Front-loaded should have higher early values
      expect(frontLoaded[1]).toBeGreaterThan(balanced[1]);
    });
  });

  describe('validateGrowthPattern', () => {
    it('validates normal growth rates as valid', () => {
      const rates = [0.08, 0.07, 0.06, 0.05];
      const result = validateGrowthPattern(rates, 0.03);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('warns about high growth rates', () => {
      const rates = [0.35, 0.25, 0.15, 0.05]; // 35% is very high
      const result = validateGrowthPattern(rates, 0.03);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('35.0% is very high');
    });

    it('errors on unrealistic growth rates', () => {
      const rates = [0.55, 0.25, 0.15, 0.05]; // 55% is unrealistic
      const result = validateGrowthPattern(rates, 0.03);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('55.0% is unrealistic');
    });

    it('warns when final rate differs significantly from terminal rate', () => {
      const rates = [0.08, 0.07, 0.06, 0.10]; // Final 10% vs terminal 3%
      const result = validateGrowthPattern(rates, 0.03);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('differs significantly'))).toBe(true);
    });
  });

  describe('formatPatternDescription', () => {
    it('describes decay pattern correctly', () => {
      const rates = [0.08, 0.06, 0.04];
      const result = formatPatternDescription(rates);
      
      expect(result).toBe('Decaying from 8.0% to 4.0%');
    });

    it('describes constant pattern correctly', () => {
      const rates = [0.05, 0.05, 0.05];
      const result = formatPatternDescription(rates);
      
      expect(result).toBe('Constant 5.0%');
    });

    it('handles empty array', () => {
      const result = formatPatternDescription([]);
      
      expect(result).toBe('No pattern');
    });
  });

  describe('getScenarioInfo', () => {
    it('returns correct info for base scenario', () => {
      const info = getScenarioInfo('base');
      
      expect(info.name).toBe('Base Case (Realistic)');
      expect(info.description).toContain('Balanced growth assumptions');
      expect(info.defaultPattern).toBe('7.5% → 5%'); // Updated default
    });

    it('returns correct info for bull scenario', () => {
      const info = getScenarioInfo('bull');
      
      expect(info.name).toBe('Bull Case (Optimistic)');
      expect(info.description).toContain('High growth expectations');
      expect(info.defaultPattern).toBe('20% → 5%');
    });

    it('returns correct info for bear scenario', () => {
      const info = getScenarioInfo('bear');
      
      expect(info.name).toBe('Bear Case (Conservative)');
      expect(info.description).toContain('Conservative growth');
      expect(info.defaultPattern).toBe('5% → 2%');
    });
  });
});