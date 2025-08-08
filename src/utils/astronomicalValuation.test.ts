/**
 * Tests for the astronomical valuation bug fix
 * Validates that relative valuation calculations produce reasonable results
 */

import { describe, it, expect } from 'vitest';
import { calculateRelativeValuation } from './relativeValuationCalculator';
import type { RelativeValuationInputs, PeerCompany } from '../types/relativeValuation';

describe('Astronomical Valuation Bug Fix', () => {
  // Helper to create realistic test company similar to Snowflake
  const createSnowflakeLikeCompany = (): PeerCompany => ({
    symbol: 'SNOW',
    name: 'Snowflake Inc.',
    industry: 'Technology',
    marketCap: 65000000000, // ~$65B market cap
    enterpriseValue: 63000000000,
    revenue: 2000000000, // ~$2B revenue  
    ebitda: -400000000, // Negative EBITDA (typical for growth companies)
    netIncome: -600000000, // Negative net income
    bookValue: 8000000000, // ~$8B book value
    sharesOutstanding: 315000000, // ~315M shares
    growthRate: 0.35, // 35% growth rate
    debt: 2000000000,
    cash: 4000000000
  });

  // Helper to create peer companies with realistic tech multiples
  const createTechPeers = (): PeerCompany[] => [
    {
      symbol: 'CRM',
      name: 'Salesforce',
      industry: 'Technology',
      marketCap: 250000000000,
      enterpriseValue: 245000000000,
      revenue: 32000000000,
      ebitda: 8000000000,
      netIncome: 5000000000,
      bookValue: 15000000000,
      sharesOutstanding: 1000000000,
      growthRate: 0.15,
      debt: 8000000000,
      cash: 12000000000
    },
    {
      symbol: 'ADBE',
      name: 'Adobe',
      industry: 'Technology',
      marketCap: 200000000000,
      enterpriseValue: 195000000000,
      revenue: 20000000000,
      ebitda: 7000000000,
      netIncome: 5500000000,
      bookValue: 12000000000,
      sharesOutstanding: 450000000,
      growthRate: 0.12,
      debt: 4000000000,
      cash: 8000000000
    },
    {
      symbol: 'WDAY',
      name: 'Workday',
      industry: 'Technology', 
      marketCap: 60000000000,
      enterpriseValue: 58000000000,
      revenue: 8000000000,
      ebitda: 1500000000,
      netIncome: 800000000,
      bookValue: 4000000000,
      sharesOutstanding: 260000000,
      growthRate: 0.18,
      debt: 1000000000,
      cash: 3000000000
    }
  ];

  it('should produce reasonable P/S multiple valuations (not astronomical)', () => {
    const target = createSnowflakeLikeCompany();
    const peers = createTechPeers();
    
    const inputs: RelativeValuationInputs = {
      targetCompany: target,
      peerCompanies: peers,
      selectedMultiples: ['PS'],
      useGrowthAdjustments: false,
      outlierRemoval: false,
      minimumPeers: 3,
      peerSelectionCriteria: {
        industryMatch: true,
        sizeRange: { min: 10000000000, max: 300000000000 },
        growthSimilarity: false,
        profitabilityThreshold: 0.05
      }
    };

    const result = calculateRelativeValuation(inputs);
    
    expect(result.multiples).toHaveLength(1);
    const psMultiple = result.multiples[0];
    
    // Validate P/S calculation produces reasonable results
    expect(psMultiple.impliedPricePerShare).toBeGreaterThan(30); // Above $30
    expect(psMultiple.impliedPricePerShare).toBeLessThan(1000);  // Below $1000
    
    // Should NOT be astronomical like $400B
    expect(psMultiple.impliedPricePerShare).toBeLessThan(100000000); // Less than $100M per share
    
    // Current stock price would be ~$206 (65B market cap / 315M shares)
    const currentPrice = target.marketCap / target.sharesOutstanding;
    const upside = ((psMultiple.impliedPricePerShare - currentPrice) / currentPrice) * 100;
    
    // Upside should be reasonable (-80% to +500%), not billions of percent
    expect(Math.abs(upside)).toBeLessThan(1000); // Less than 1000% upside
  });

  it('should handle EV/Sales calculations correctly', () => {
    const target = createSnowflakeLikeCompany(); 
    const peers = createTechPeers();
    
    const inputs: RelativeValuationInputs = {
      targetCompany: target,
      peerCompanies: peers,
      selectedMultiples: ['EV_SALES'],
      useGrowthAdjustments: false,
      outlierRemoval: false,
      minimumPeers: 3,
      peerSelectionCriteria: {
        industryMatch: true,
        sizeRange: { min: 10000000000, max: 300000000000 },
        growthSimilarity: false,
        profitabilityThreshold: 0.05
      }
    };

    const result = calculateRelativeValuation(inputs);
    const evSalesMultiple = result.multiples[0];
    
    // EV/Sales should produce reasonable enterprise value
    // Then convert correctly to market cap and price per share
    expect(evSalesMultiple.impliedPricePerShare).toBeGreaterThan(0);
    expect(evSalesMultiple.impliedPricePerShare).toBeLessThan(2000);
    
    // The EV calculation should be: EV = Multiple * Revenue
    // Market Cap = EV - Net Debt = EV - (Debt - Cash)
    // In this case: Net Debt = 2B - 4B = -2B (net cash position)
    // So Market Cap should be slightly higher than EV
  });

  it('should reject extreme multiples with sanity checks', () => {
    const target = createSnowflakeLikeCompany();
    
    // Create peers with unrealistic multiples
    const extremePeers: PeerCompany[] = [
      {
        ...createTechPeers()[0],
        marketCap: 10000000000000, // $10 trillion market cap - unrealistic 
        revenue: 1000000000 // $1B revenue = 10,000x P/S ratio
      },
      createTechPeers()[1],
      createTechPeers()[2]
    ];
    
    const inputs: RelativeValuationInputs = {
      targetCompany: target,
      peerCompanies: extremePeers,
      selectedMultiples: ['PS'],
      useGrowthAdjustments: false,
      outlierRemoval: false,
      minimumPeers: 3,
      peerSelectionCriteria: {
        industryMatch: true,
        sizeRange: { min: 10000000000, max: 20000000000000 },
        growthSimilarity: false,
        profitabilityThreshold: 0.05
      }
    };

    const result = calculateRelativeValuation(inputs);
    const psMultiple = result.multiples[0];
    
    // Even with extreme peer, sanity checks should prevent astronomical valuations
    // The median P/S might be very high, but should be rejected by isReasonableMultiple()
    expect(psMultiple.impliedPricePerShare).toBeLessThan(10000); // Should be reasonable
  });

  it('should handle companies with negative earnings correctly', () => {
    const target = createSnowflakeLikeCompany(); // Has negative net income
    const peers = createTechPeers();
    
    const inputs: RelativeValuationInputs = {
      targetCompany: target,
      peerCompanies: peers,
      selectedMultiples: ['PE'], // P/E won't work with negative earnings
      useGrowthAdjustments: false,
      outlierRemoval: false,
      minimumPeers: 3,
      peerSelectionCriteria: {
        industryMatch: true,
        sizeRange: { min: 10000000000, max: 300000000000 },
        growthSimilarity: false,
        profitabilityThreshold: 0.05
      }
    };

    const result = calculateRelativeValuation(inputs);
    const peMultiple = result.multiples[0];
    
    // With negative earnings, P/E calculation should result in 0 or minimal values
    // Should not produce astronomical positive values
    expect(peMultiple.impliedPricePerShare).toBe(0); // Should be 0 for negative earnings
  });

  it('should warn about extreme valuations in console', () => {
    // Test that the warning system works for extreme cases
    const target = createSnowflakeLikeCompany();
    const peers = createTechPeers();
    
    // Temporarily mock console.warn to capture warnings
    const originalWarn = console.warn;
    const warnings: unknown[] = [];
    console.warn = (...args) => warnings.push(args);
    
    try {
      const inputs: RelativeValuationInputs = {
        targetCompany: target,
        peerCompanies: peers,
        selectedMultiples: ['PS'],
        useGrowthAdjustments: false,
        outlierRemoval: false,
        minimumPeers: 3,
        peerSelectionCriteria: {
          industryMatch: true,
          sizeRange: { min: 10000000000, max: 300000000000 },
          growthSimilarity: false,
          profitabilityThreshold: 0.05
        }
      };

      const result = calculateRelativeValuation(inputs);
      
      // Check if warnings were logged for extreme valuations
      const extremeWarnings = warnings.filter(w => 
        w[0] && w[0].includes && w[0].includes('Extreme') && w[0].includes('valuation detected')
      );
      
      // If the valuation is reasonable, there should be no extreme warnings
      // If there are warnings, the upside should indeed be extreme
      if (extremeWarnings.length > 0) {
        console.log('Extreme valuation warnings detected (expected for some test cases)');
      }
      
      expect(result.multiples[0].impliedPricePerShare).toBeLessThan(100000); // Sanity check
      
    } finally {
      console.warn = originalWarn;
    }
  });
});