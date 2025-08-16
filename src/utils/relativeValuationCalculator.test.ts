import { describe, it, expect } from 'vitest';
import {
  calculateMultiples,
  calculateStatistics,
  removeOutliers,
  analyzePeerGroup,
  calculateValuationRanges,
  calculateRelativePositioning,
  determineCompanyTier,
  generateRecommendation,
  validateRelativeValuationInputs,
  calculateRelativeValuation
} from './relativeValuationCalculator';
import type {
  PeerCompany,
  RelativeValuationInputs,
  ValuationMultiple,
  RelativeValuationResult
} from '../types/relativeValuation';

// Test data helpers
const createMockCompany = (overrides: Partial<PeerCompany> = {}): PeerCompany => ({
  symbol: 'TEST',
  name: 'Test Company',
  industry: 'Technology',
  marketCap: 1000000000, // $1B
  enterpriseValue: 1100000000, // $1.1B
  revenue: 500000000, // $500M
  ebitda: 100000000, // $100M
  netIncome: 50000000, // $50M
  bookValue: 200000000, // $200M
  sharesOutstanding: 100000000, // 100M shares
  growthRate: 0.15, // 15%
  debt: 150000000, // $150M
  cash: 50000000, // $50M
  ...overrides
});

const createMockInputs = (overrides: Partial<RelativeValuationInputs> = {}): RelativeValuationInputs => ({
  targetCompany: {
    symbol: 'TARGET',
    name: 'Target Company',
    marketCap: 1000000000,
    enterpriseValue: 1100000000,
    revenue: 500000000,
    ebitda: 100000000,
    netIncome: 50000000,
    bookValue: 200000000,
    sharesOutstanding: 100000000,
    growthRate: 0.15,
    debt: 150000000,
    cash: 50000000
  },
  peerCompanies: [
    createMockCompany({ symbol: 'PEER1' }),
    createMockCompany({ symbol: 'PEER2', marketCap: 800000000, netIncome: 40000000 }),
    createMockCompany({ symbol: 'PEER3', marketCap: 1200000000, netIncome: 60000000 }),
    createMockCompany({ symbol: 'PEER4', marketCap: 900000000, netIncome: 45000000 }),
    createMockCompany({ symbol: 'PEER5', marketCap: 1100000000, netIncome: 55000000 })
  ],
  selectedMultiples: ['PE', 'PS', 'EV_EBITDA'],
  useGrowthAdjustments: false,
  outlierRemoval: true,
  minimumPeers: 3,
  peerSelectionCriteria: {
    industryMatch: true,
    sizeRange: { min: 500000000, max: 2000000000 },
    growthSimilarity: false,
    profitabilityThreshold: 0.05
  },
  ...overrides
});

describe('Relative Valuation Calculator', () => {
  describe('calculateMultiples', () => {
    it('should calculate all multiples correctly', () => {
      const company = createMockCompany();
      const multiples = calculateMultiples(company);
      
      expect(multiples.PE).toBeCloseTo(20, 1); // 1B / 50M = 20
      expect(multiples.PS).toBeCloseTo(2, 1); // 1B / 500M = 2
      expect(multiples.EV_SALES).toBeCloseTo(2.2, 1); // 1.1B / 500M = 2.2
      expect(multiples.EV_EBITDA).toBeCloseTo(11, 1); // 1.1B / 100M = 11
      expect(multiples.PB).toBeCloseTo(5, 1); // 1B / 200M = 5
      expect(multiples.PEG).toBeCloseTo(1.33, 2); // 20 / 15 = 1.33
    });
    
    it('should handle negative earnings correctly', () => {
      const company = createMockCompany({ netIncome: -10000000 });
      const multiples = calculateMultiples(company);
      
      expect(multiples.PE).toBeUndefined();
      expect(multiples.PEG).toBeUndefined();
      expect(multiples.PS).toBeDefined(); // Should still calculate P/S
    });
    
    it('should handle zero growth rate', () => {
      const company = createMockCompany({ growthRate: 0 });
      const multiples = calculateMultiples(company);
      
      expect(multiples.PE).toBeDefined();
      expect(multiples.PEG).toBeUndefined(); // Can't divide by zero growth
    });
    
    it('should handle zero revenue', () => {
      const company = createMockCompany({ revenue: 0 });
      const multiples = calculateMultiples(company);
      
      expect(multiples.PS).toBeUndefined();
      expect(multiples.EV_SALES).toBeUndefined();
      expect(multiples.PE).toBeDefined(); // Should still work
    });
  });
  
  describe('calculateStatistics', () => {
    it('should calculate correct statistics for normal distribution', () => {
      const values = [10, 15, 20, 25, 30];
      const stats = calculateStatistics(values);
      
      expect(stats.median).toBe(20);
      expect(stats.mean).toBe(20);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(30);
      expect(stats.q1).toBe(15);
      expect(stats.q3).toBe(25);
      expect(stats.count).toBe(5);
    });
    
    it('should handle even number of values for median', () => {
      const values = [10, 20, 30, 40];
      const stats = calculateStatistics(values);
      
      expect(stats.median).toBe(25); // (20 + 30) / 2
      expect(stats.mean).toBe(25);
    });
    
    it('should handle single value', () => {
      const values = [15];
      const stats = calculateStatistics(values);
      
      expect(stats.median).toBe(15);
      expect(stats.mean).toBe(15);
      expect(stats.min).toBe(15);
      expect(stats.max).toBe(15);
      expect(stats.standardDeviation).toBe(0);
    });
    
    it('should handle empty array', () => {
      const values: number[] = [];
      const stats = calculateStatistics(values);
      
      expect(stats.median).toBe(0);
      expect(stats.mean).toBe(0);
      expect(stats.count).toBe(0);
    });
  });
  
  describe('removeOutliers', () => {
    it('should remove outliers using IQR method', () => {
      const peers = [
        createMockCompany({ symbol: 'P1', marketCap: 100000000, netIncome: 5000000 }), // PE = 20
        createMockCompany({ symbol: 'P2', marketCap: 200000000, netIncome: 10000000 }), // PE = 20
        createMockCompany({ symbol: 'P3', marketCap: 300000000, netIncome: 15000000 }), // PE = 20
        createMockCompany({ symbol: 'P4', marketCap: 400000000, netIncome: 20000000 }), // PE = 20
        createMockCompany({ symbol: 'P5', marketCap: 1000000000, netIncome: 10000000 }) // PE = 100 (outlier)
      ].map(peer => ({ ...peer, multiples: calculateMultiples(peer) }));
      
      const { filtered } = removeOutliers(peers, 'PE');
      
      expect(filtered).toHaveLength(4);
      expect(outliers).toHaveLength(1);
      expect(outliers[0].symbol).toBe('P5');
      expect(outliers[0].isOutlier).toBe(true);
    });
    
    it('should not remove outliers when sample size is too small', () => {
      const peers = [
        createMockCompany({ symbol: 'P1' }),
        createMockCompany({ symbol: 'P2' })
      ].map(peer => ({ ...peer, multiples: calculateMultiples(peer) }));
      
      const { filtered } = removeOutliers(peers, 'PE');
      
      expect(filtered).toHaveLength(2);
      expect(outliers).toHaveLength(0);
    });
    
    it('should handle undefined multiples', () => {
      const peers = [
        createMockCompany({ symbol: 'P1', netIncome: -5000000 }), // Negative earnings
        createMockCompany({ symbol: 'P2' })
      ].map(peer => ({ ...peer, multiples: calculateMultiples(peer) }));
      
      const { filtered } = removeOutliers(peers, 'PE');
      
      expect(filtered).toHaveLength(1); // Only P2 has valid PE
      expect(filtered[0].symbol).toBe('P2');
    });
  });
  
  describe('analyzePeerGroup', () => {
    it('should analyze peer group and calculate implied valuation', () => {
      const target = createMockInputs().targetCompany;
      const peers = createMockInputs().peerCompanies;
      
      const analysis = analyzePeerGroup(target, peers, 'PE', true);
      
      expect(analysis.type).toBe('PE');
      expect(analysis.name).toBe('Price-to-Earnings');
      expect(analysis.targetValue).toBeCloseTo(20, 1); // Target P/E = 1B / 50M
      expect(analysis.peerValues).toHaveLength(5);
      expect(analysis.statistics.count).toBe(5);
      expect(analysis.impliedValue).toBeGreaterThan(0);
      expect(analysis.impliedPricePerShare).toBeGreaterThan(0);
    });
    
    it('should calculate PEG ratio correctly', () => {
      const target = createMockInputs().targetCompany;
      const peers = createMockInputs().peerCompanies;
      
      const analysis = analyzePeerGroup(target, peers, 'PEG', true);
      
      expect(analysis.type).toBe('PEG');
      expect(analysis.targetValue).toBeCloseTo(1.33, 2); // PE 20 / Growth 15%
    });
    
    it('should handle insufficient peer data', () => {
      const target = createMockInputs().targetCompany;
      const peers = [createMockCompany({ netIncome: -5000000 })]; // No valid peers
      
      const analysis = analyzePeerGroup(target, peers, 'PE', true);
      
      expect(analysis.peerValues).toHaveLength(0);
      expect(analysis.impliedValue).toBe(0);
      expect(analysis.statistics.count).toBe(0);
    });
  });
  
  describe('calculateValuationRanges', () => {
    it('should calculate conservative, moderate, and optimistic ranges', () => {
      const multiples = [
        { impliedValue: 800000000, impliedPricePerShare: 8 },
        { impliedValue: 1000000000, impliedPricePerShare: 10 },
        { impliedValue: 1200000000, impliedPricePerShare: 12 },
        { impliedValue: 1400000000, impliedPricePerShare: 14 }
      ] as Partial<ValuationMultiple>[];
      
      const ranges = calculateValuationRanges(multiples);
      
      expect(ranges.conservative.min).toBeLessThanOrEqual(ranges.conservative.max);
      expect(ranges.moderate.min).toBeLessThanOrEqual(ranges.moderate.max);
      expect(ranges.optimistic.min).toBeLessThanOrEqual(ranges.optimistic.max);
      
      expect(ranges.conservative.max).toBeLessThanOrEqual(ranges.moderate.min);
      expect(ranges.moderate.max).toBeLessThanOrEqual(ranges.optimistic.min);
    });
    
    it('should handle empty multiples array', () => {
      const multiples: unknown[] = [];
      const ranges = calculateValuationRanges(multiples);
      
      expect(ranges.conservative.min).toBe(0);
      expect(ranges.moderate.min).toBe(0);
      expect(ranges.optimistic.min).toBe(0);
    });
  });
  
  describe('calculateRelativePositioning', () => {
    it('should calculate growth and profitability premiums', () => {
      const target = createMockInputs().targetCompany;
      target.growthRate = 0.20; // 20% growth
      target.netIncome = 60000000; // Higher profit margin
      
      const peers = createMockInputs().peerCompanies.map(peer => ({
        ...peer,
        growthRate: 0.10 // 10% average growth
      }));
      
      const positioning = calculateRelativePositioning(target, peers);
      
      expect(positioning.growthPremium).toBeGreaterThan(0); // Should be positive
      expect(positioning.profitabilityPremium).toBeGreaterThan(0); // Higher margins
      expect(positioning.overallPremium).toBeGreaterThan(0);
    });
    
    it('should handle discount positioning', () => {
      const target = createMockInputs().targetCompany;
      target.growthRate = 0.05; // 5% growth (low)
      target.netIncome = 25000000; // Lower profit margin
      
      const peers = createMockInputs().peerCompanies;
      
      const positioning = calculateRelativePositioning(target, peers);
      
      expect(positioning.growthPremium).toBeLessThan(0); // Should be negative
      expect(positioning.overallPremium).toBeLessThan(0);
    });
    
    it('should handle empty peer group', () => {
      const target = createMockInputs().targetCompany;
      const peers: PeerCompany[] = [];
      
      const positioning = calculateRelativePositioning(target, peers);
      
      expect(positioning.growthPremium).toBe(0);
      expect(positioning.profitabilityPremium).toBe(0);
      expect(positioning.sizePremium).toBe(0);
      expect(positioning.overallPremium).toBe(0);
    });
  });
  
  describe('determineCompanyTier', () => {
    it('should classify premium tier correctly', () => {
      const multiples = [
        { percentile: 85 }, // High percentile
        { percentile: 90 }
      ] as Partial<ValuationMultiple>[];
      
      const positioning = { overallPremium: 25 } as RelativeValuationResult['relativePositioning'];
      
      const tier = determineCompanyTier(multiples, positioning);
      
      expect(tier.tier).toBe('premium');
      expect(tier.description).toContain('Premium');
    });
    
    it('should classify discount tier correctly', () => {
      const multiples = [
        { percentile: 15 }, // Low percentile
        { percentile: 20 }
      ] as Partial<ValuationMultiple>[];
      
      const positioning = { overallPremium: -30 } as RelativeValuationResult['relativePositioning'];
      
      const tier = determineCompanyTier(multiples, positioning);
      
      expect(tier.tier).toBe('discount');
      expect(tier.description).toContain('Discount');
    });
    
    it('should classify deep discount for very low percentiles', () => {
      const multiples = [
        { percentile: 5 }, // Very low percentile
        { percentile: 8 }
      ] as Partial<ValuationMultiple>[];
      
      const positioning = { overallPremium: -40 } as RelativeValuationResult['relativePositioning'];
      
      const tier = determineCompanyTier(multiples, positioning);
      
      expect(tier.tier).toBe('deep-discount');
      expect(tier.description).toContain('Deep Discount');
    });
    
    it('should classify market tier for average positioning', () => {
      const multiples = [
        { percentile: 45 },
        { percentile: 55 }
      ] as Partial<ValuationMultiple>[];
      
      const positioning = { overallPremium: 5 } as RelativeValuationResult['relativePositioning'];
      
      const tier = determineCompanyTier(multiples, positioning);
      
      expect(tier.tier).toBe('market');
      expect(tier.description).toContain('Market');
    });
  });
  
  describe('generateRecommendation', () => {
    it('should generate strong buy for high upside discount stock', () => {
      const target = createMockInputs().targetCompany;
      target.marketCap = 500000000; // Lower current valuation
      
      const multiples = [
        { impliedValue: 1000000000 }, // 2x upside
        { impliedValue: 1200000000 }
      ] as Partial<ValuationMultiple>[];
      
      const tier = { tier: 'discount' } as RelativeValuationResult['relativePositioning'];
      const positioning = { growthPremium: 20, profitabilityPremium: 15 } as RelativeValuationResult['relativePositioning'];
      
      const recommendation = generateRecommendation(target, multiples, tier, positioning);
      
      expect(recommendation.overallRating).toBe('strong-buy');
      expect(recommendation.confidence).toBe('high');
      expect(recommendation.upside).toBeGreaterThan(50);
    });
    
    it('should generate sell for overvalued stock', () => {
      const target = createMockInputs().targetCompany;
      target.marketCap = 1300000000; // Higher current valuation
      
      const multiples = [
        { impliedValue: 800000000 }, // Significant downside
        { impliedValue: 900000000 }
      ] as Partial<ValuationMultiple>[];
      
      const tier = { tier: 'premium' } as RelativeValuationResult['relativePositioning'];
      const positioning = { growthPremium: -10, profitabilityPremium: -5 } as RelativeValuationResult['relativePositioning'];
      
      const recommendation = generateRecommendation(target, multiples, tier, positioning);
      
      // Should be sell or strong-sell based on the significant downside
      expect(['sell', 'strong-sell']).toContain(recommendation.overallRating);
      expect(recommendation.upside).toBeLessThan(-15);
    });
    
    it('should handle insufficient data gracefully', () => {
      const target = createMockInputs().targetCompany;
      const multiples: unknown[] = []; // No valid multiples
      const tier = { tier: 'market' } as RelativeValuationResult['relativePositioning'];
      const positioning = { overallPremium: 0 } as RelativeValuationResult['relativePositioning'];
      
      const recommendation = generateRecommendation(target, multiples, tier, positioning);
      
      expect(recommendation.overallRating).toBe('hold');
      expect(recommendation.confidence).toBe('low');
      expect(recommendation.keyFactors).toContain('Insufficient peer data for analysis');
    });
  });
  
  describe('validateRelativeValuationInputs', () => {
    it('should pass validation for valid inputs', () => {
      const inputs = createMockInputs();
      const validation = validateRelativeValuationInputs(inputs);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
    
    it('should reject empty symbol', () => {
      const inputs = createMockInputs();
      inputs.targetCompany.symbol = '';
      
      const validation = validateRelativeValuationInputs(inputs);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Target company symbol is required');
    });
    
    it('should reject zero or negative market cap', () => {
      const inputs = createMockInputs();
      inputs.targetCompany.marketCap = 0;
      
      const validation = validateRelativeValuationInputs(inputs);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Market cap must be positive');
    });
    
    it('should reject insufficient peer companies', () => {
      const inputs = createMockInputs();
      inputs.peerCompanies = [createMockCompany(), createMockCompany()]; // Only 2 peers
      inputs.minimumPeers = 3;
      
      const validation = validateRelativeValuationInputs(inputs);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Insufficient peer companies: need at least 3, got 2');
    });
    
    it('should reject empty multiple selection', () => {
      const inputs = createMockInputs();
      inputs.selectedMultiples = [];
      
      const validation = validateRelativeValuationInputs(inputs);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('At least one valuation multiple must be selected');
    });
    
    it('should warn about negative earnings', () => {
      const inputs = createMockInputs();
      inputs.targetCompany.netIncome = -5000000;
      
      const validation = validateRelativeValuationInputs(inputs);
      
      expect(validation.isValid).toBe(true); // Not an error, just a warning
      expect(validation.warnings).toContain('Net income is not positive - P/E and PEG ratios may be unreliable');
    });
    
    it('should warn about small peer group', () => {
      const inputs = createMockInputs();
      inputs.peerCompanies = [
        createMockCompany(),
        createMockCompany(),
        createMockCompany()
      ]; // Only 3 peers
      
      const validation = validateRelativeValuationInputs(inputs);
      
      expect(validation.warnings).toContain('Small peer group may affect accuracy of relative valuation');
    });
  });
  
  describe('calculateRelativeValuation', () => {
    it('should calculate complete relative valuation successfully', () => {
      const inputs = createMockInputs();
      const result = calculateRelativeValuation(inputs);
      
      expect(result.targetCompany).toBe('TARGET');
      expect(result.currentMarketCap).toBe(1000000000);
      expect(result.multiples).toHaveLength(3); // PE, PS, EV_EBITDA
      expect(result.valuationRanges.conservative).toBeDefined();
      expect(result.valuationRanges.moderate).toBeDefined();
      expect(result.valuationRanges.optimistic).toBeDefined();
      expect(result.peerAnalysis.totalPeers).toBe(5);
      expect(result.companyTier).toBeDefined();
      expect(result.relativePositioning).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });
    
    it('should throw error for invalid inputs', () => {
      const inputs = createMockInputs();
      inputs.targetCompany.marketCap = 0; // Invalid
      
      expect(() => calculateRelativeValuation(inputs)).toThrow('Invalid relative valuation inputs');
    });
    
    it('should handle all multiple types correctly', () => {
      const inputs = createMockInputs();
      inputs.selectedMultiples = ['PE', 'PEG', 'PS', 'EV_SALES', 'EV_EBITDA', 'PB'];
      
      const result = calculateRelativeValuation(inputs);
      
      expect(result.multiples).toHaveLength(6);
      
      const multipleTypes = result.multiples.map(m => m.type);
      expect(multipleTypes).toContain('PE');
      expect(multipleTypes).toContain('PEG');
      expect(multipleTypes).toContain('PS');
      expect(multipleTypes).toContain('EV_SALES');
      expect(multipleTypes).toContain('EV_EBITDA');
      expect(multipleTypes).toContain('PB');
    });
    
    it('should calculate price per share correctly', () => {
      const inputs = createMockInputs();
      const result = calculateRelativeValuation(inputs);
      
      const expectedPricePerShare = result.currentMarketCap / inputs.targetCompany.sharesOutstanding;
      expect(result.currentPricePerShare).toBeCloseTo(expectedPricePerShare, 2);
    });
    
    it('should handle mixed peer data quality', () => {
      const inputs = createMockInputs();
      inputs.peerCompanies = [
        createMockCompany({ symbol: 'GOOD1' }),
        createMockCompany({ symbol: 'GOOD2' }),
        createMockCompany({ symbol: 'BAD1', netIncome: -5000000 }), // Negative earnings
        createMockCompany({ symbol: 'BAD2', revenue: 0 }), // No revenue
        createMockCompany({ symbol: 'GOOD3' })
      ];
      
      const result = calculateRelativeValuation(inputs);
      
      expect(result.peerAnalysis.totalPeers).toBe(5);
      // Some peers may be excluded for certain multiples but still qualify for others
      expect(result.peerAnalysis.qualifyingPeers).toBeLessThanOrEqual(5);
      expect(result.multiples.every(m => m.peerValues.length > 0)).toBe(true);
    });
  });
});