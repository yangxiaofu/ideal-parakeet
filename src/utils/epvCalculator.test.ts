import { describe, it, expect } from 'vitest';
import { calculateEPVIntrinsicValue, calculateEPVSensitivity, validateEPVInputs } from './epvCalculator';
import type { EPVInputs } from '../types/epv';

describe('EPV Calculator', () => {
  // Mock historical earnings data
  const mockHistoricalEarnings = [
    { year: 2023, netIncome: 100000000, operatingIncome: 120000000, revenue: 500000000, date: '2023-12-31' },
    { year: 2022, netIncome: 95000000, operatingIncome: 115000000, revenue: 480000000, date: '2022-12-31' },
    { year: 2021, netIncome: 90000000, operatingIncome: 110000000, revenue: 460000000, date: '2021-12-31' },
    { year: 2020, netIncome: 85000000, operatingIncome: 105000000, revenue: 440000000, date: '2020-12-31' },
    { year: 2019, netIncome: 80000000, operatingIncome: 100000000, revenue: 420000000, date: '2019-12-31' }
  ];

  const createBasicEPVInputs = (overrides?: Partial<EPVInputs>): EPVInputs => ({
    symbol: 'TEST',
    historicalEarnings: mockHistoricalEarnings,
    normalizationMethod: 'average',
    normalizationPeriod: 5,
    earningsAdjustments: [],
    maintenanceCapex: {
      historicalCapex: [],
      historicalDepreciation: [],
      averageCapex: 15000000,
      averageDepreciation: 15000000,
      maintenanceCapex: 15000000,
      growthCapex: 0,
      capexAsPercentOfSales: 0.03,
      method: 'manual'
    },
    costOfCapitalMethod: 'wacc',
    costOfCapitalComponents: {
      riskFreeRate: 0.04,
      marketRiskPremium: 0.06,
      beta: 1.2,
      costOfEquity: 0,
      costOfDebt: 0.05,
      weightOfEquity: 0.8,
      weightOfDebt: 0.2,
      taxRate: 0.21,
      wacc: 0
    },
    sharesOutstanding: 10000000,
    includeMaintenanceCapex: true,
    taxAdjustments: true,
    earningsQuality: 'good',
    businessStability: 'stable',
    competitivePosition: 'average',
    ...overrides
  });

  describe('calculateEPVIntrinsicValue', () => {
    it('should calculate basic EPV correctly', () => {
      const inputs = createBasicEPVInputs();
      const result = calculateEPVIntrinsicValue(inputs);

      // Expected normalized earnings: (100M + 95M + 90M + 85M + 80M) / 5 = 90M
      expect(result.normalizedEarnings).toBe(90000000);
      
      // Expected adjusted earnings: 90M - 15M = 75M
      expect(result.adjustedEarnings).toBe(75000000);
      
      // Expected cost of capital calculation:
      // Cost of Equity = 0.04 + (1.2 * 0.06) = 0.112
      // After-tax cost of debt = 0.05 * (1 - 0.21) = 0.0395
      // WACC = (0.112 * 0.8) + (0.0395 * 0.2) = 0.0896 + 0.0079 = 0.0975
      expect(result.costOfCapital).toBeCloseTo(0.0975, 4);
      
      // Expected EPV: 75M / 0.0975 = ~769.2M total, ~76.92 per share
      expect(result.epvTotalValue).toBeCloseTo(769230769, -3);
      expect(result.epvPerShare).toBeCloseTo(76.92, 2);
      
      // Check that earnings yield is calculated correctly
      expect(result.earningsYield).toBeCloseTo(0.0975, 4);
    });

    it('should handle median normalization method', () => {
      const inputs = createBasicEPVInputs({ normalizationMethod: 'median' });
      const result = calculateEPVIntrinsicValue(inputs);

      // Expected median earnings: 90M (middle value of 80, 85, 90, 95, 100)
      expect(result.normalizedEarnings).toBe(90000000);
    });

    it('should handle latest normalization method', () => {
      const inputs = createBasicEPVInputs({ normalizationMethod: 'latest' });
      const result = calculateEPVIntrinsicValue(inputs);

      // Expected latest earnings: 100M (first in array)
      expect(result.normalizedEarnings).toBe(100000000);
      expect(result.adjustedEarnings).toBe(85000000); // 100M - 15M maintenance capex
    });

    it('should handle manual normalization method', () => {
      const inputs = createBasicEPVInputs({
        normalizationMethod: 'manual',
        manualNormalizedEarnings: 120000000
      });
      const result = calculateEPVIntrinsicValue(inputs);

      expect(result.normalizedEarnings).toBe(120000000);
      expect(result.adjustedEarnings).toBe(105000000); // 120M - 15M maintenance capex
    });

    it('should apply earnings adjustments correctly', () => {
      const inputs = createBasicEPVInputs({
        earningsAdjustments: [
          {
            description: 'One-time charge',
            amount: -10000000, // Remove 10M one-time charge
            reason: 'Non-recurring legal settlement',
            category: 'non_recurring',
            confidence: 'high'
          }
        ]
      });
      const result = calculateEPVIntrinsicValue(inputs);

      // Expected adjusted normalized earnings: 90M + (-10M) = 80M (adjustment applied in full, not per year)
      expect(result.normalizedEarnings).toBe(80000000);
      expect(result.earningsNormalization.adjustmentsSummary.totalAdjustments).toBe(-10000000);
    });

    it('should handle manual cost of capital', () => {
      const inputs = createBasicEPVInputs({
        costOfCapitalMethod: 'manual',
        manualCostOfCapital: 0.15
      });
      const result = calculateEPVIntrinsicValue(inputs);

      expect(result.costOfCapital).toBe(0.15);
      expect(result.epvTotalValue).toBe(500000000); // 75M / 0.15 = 500M
      expect(result.epvPerShare).toBe(50); // 500M / 10M shares = 50
    });

    it('should calculate without maintenance capex when disabled', () => {
      const inputs = createBasicEPVInputs({ includeMaintenanceCapex: false });
      const result = calculateEPVIntrinsicValue(inputs);

      // Should use full normalized earnings without subtracting maintenance capex
      expect(result.adjustedEarnings).toBe(90000000);
      // EPV = 90M / 0.0975 = ~923M
      expect(result.epvTotalValue).toBeCloseTo(923076923, -3);
    });

    it('should assess moat strength correctly', () => {
      const strongMoatInputs = createBasicEPVInputs({
        competitivePosition: 'dominant',
        businessStability: 'very_stable'
      });
      const strongResult = calculateEPVIntrinsicValue(strongMoatInputs);
      
      expect(strongResult.moatAnalysis.hasEconomicMoat).toBe(true);
      expect(strongResult.moatAnalysis.moatStrength).toBe('wide');
      
      const weakMoatInputs = createBasicEPVInputs({
        competitivePosition: 'weak',
        businessStability: 'volatile'
      });
      const weakResult = calculateEPVIntrinsicValue(weakMoatInputs);
      
      expect(weakResult.moatAnalysis.hasEconomicMoat).toBe(false);
      expect(weakResult.moatAnalysis.moatStrength).toBe('none');
    });

    it('should determine confidence level appropriately', () => {
      // High confidence scenario
      const highConfidenceInputs = createBasicEPVInputs({
        historicalEarnings: [
          ...mockHistoricalEarnings,
          { year: 2018, netIncome: 78000000, operatingIncome: 98000000, revenue: 410000000, date: '2018-12-31' },
          { year: 2017, netIncome: 76000000, operatingIncome: 96000000, revenue: 400000000, date: '2017-12-31' }
        ],
        earningsQuality: 'excellent',
        competitivePosition: 'dominant',
        businessStability: 'very_stable'
      });
      const highResult = calculateEPVIntrinsicValue(highConfidenceInputs);
      
      expect(highResult.confidenceLevel).toBe('high');
      
      // Low confidence scenario
      const lowConfidenceInputs = createBasicEPVInputs({
        historicalEarnings: mockHistoricalEarnings.slice(0, 3), // Only 3 years
        earningsQuality: 'poor',
        competitivePosition: 'weak'
      });
      const lowResult = calculateEPVIntrinsicValue(lowConfidenceInputs);
      
      expect(lowResult.confidenceLevel).toBe('low');
    });

    it('should generate appropriate warnings', () => {
      const volatileInputs = createBasicEPVInputs({
        historicalEarnings: [
          { year: 2023, netIncome: 150000000, operatingIncome: 170000000, revenue: 500000000, date: '2023-12-31' },
          { year: 2022, netIncome: 30000000, operatingIncome: 50000000, revenue: 480000000, date: '2022-12-31' },
          { year: 2021, netIncome: 120000000, operatingIncome: 140000000, revenue: 460000000, date: '2021-12-31' },
          { year: 2020, netIncome: 20000000, operatingIncome: 40000000, revenue: 440000000, date: '2020-12-31' }
        ],
        normalizationPeriod: 4,
        earningsQuality: 'poor'
      });
      const result = calculateEPVIntrinsicValue(volatileInputs);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.category === 'earnings_quality')).toBe(true);
    });
  });

  describe('calculateEPVSensitivity', () => {
    it('should calculate sensitivity analysis correctly', () => {
      const inputs = createBasicEPVInputs();
      const result = calculateEPVIntrinsicValue(inputs);
      const sensitivity = calculateEPVSensitivity(result);

      expect(sensitivity.baseEPV).toBeCloseTo(76.92, 2);
      
      // Check cost of capital sensitivity
      expect(sensitivity.costOfCapitalSensitivity).toHaveLength(7);
      expect(sensitivity.costOfCapitalSensitivity[0].costOfCapital).toBeCloseTo(0.0775, 4); // Base (0.0975) - 2% = 0.0775
      expect(sensitivity.costOfCapitalSensitivity[6].costOfCapital).toBeCloseTo(0.1175, 4); // Base (0.0975) + 2% = 0.1175
      
      // Check earnings sensitivity
      expect(sensitivity.earningsSensitivity).toHaveLength(7);
      expect(sensitivity.earningsSensitivity[0].earningsChange).toBe(-30);
      expect(sensitivity.earningsSensitivity[6].earningsChange).toBe(30);
      
      // Check maintenance capex sensitivity
      expect(sensitivity.maintenanceCapexSensitivity).toHaveLength(6);
      expect(sensitivity.maintenanceCapexSensitivity[0].maintenanceCapexPercent).toBe(0);
      expect(sensitivity.maintenanceCapexSensitivity[5].maintenanceCapexPercent).toBe(20);
    });
  });

  describe('validateEPVInputs', () => {
    it('should validate required fields', () => {
      const invalidInputs = createBasicEPVInputs({
        symbol: '',
        historicalEarnings: [],
        sharesOutstanding: 0
      });
      
      const validation = validateEPVInputs(invalidInputs);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Company symbol is required');
      expect(validation.errors).toContain('Historical earnings data is required');
      expect(validation.errors).toContain('Shares outstanding must be positive');
    });

    it('should warn about insufficient data', () => {
      const inputs = createBasicEPVInputs({
        historicalEarnings: mockHistoricalEarnings.slice(0, 3),
        normalizationPeriod: 3
      });
      
      const validation = validateEPVInputs(inputs);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Less than 5 years of earnings data may reduce calculation reliability');
    });

    it('should validate manual cost of capital', () => {
      const invalidInputs = createBasicEPVInputs({
        costOfCapitalMethod: 'manual',
        manualCostOfCapital: undefined
      });
      
      const validation = validateEPVInputs(invalidInputs);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Manual cost of capital must be positive when manual method is selected');
    });

    it('should warn about unusually high cost of capital', () => {
      const inputs = createBasicEPVInputs({
        costOfCapitalMethod: 'manual',
        manualCostOfCapital: 0.60
      });
      
      const validation = validateEPVInputs(inputs);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Cost of capital >50% is unusually high');
    });

    it('should validate normalization period', () => {
      const invalidInputs = createBasicEPVInputs({
        normalizationPeriod: 10 // More than available data (5 years)
      });
      
      const validation = validateEPVInputs(invalidInputs);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Normalization period cannot exceed available historical data');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero maintenance capex', () => {
      const inputs = createBasicEPVInputs({
        maintenanceCapex: {
          ...createBasicEPVInputs().maintenanceCapex,
          maintenanceCapex: 0
        }
      });
      const result = calculateEPVIntrinsicValue(inputs);

      expect(result.adjustedEarnings).toBe(90000000); // Should equal normalized earnings
    });

    it('should handle negative earnings in historical data', () => {
      const inputs = createBasicEPVInputs({
        historicalEarnings: [
          ...mockHistoricalEarnings.slice(0, 3),
          { year: 2020, netIncome: -50000000, operatingIncome: -30000000, revenue: 440000000, date: '2020-12-31' },
          { year: 2019, netIncome: 80000000, operatingIncome: 100000000, revenue: 420000000, date: '2019-12-31' }
        ]
      });
      const result = calculateEPVIntrinsicValue(inputs);

      // Should still calculate but with warnings
      expect(result.normalizedEarnings).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle very small shares outstanding', () => {
      const inputs = createBasicEPVInputs({
        sharesOutstanding: 1000 // 1,000 shares
      });
      const result = calculateEPVIntrinsicValue(inputs);

      expect(result.epvPerShare).toBeCloseTo(769230.77, 2); // 769M / 1000 shares
    });
  });
});