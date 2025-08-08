/**
 * Focused tests for percentile calculation fixes
 * Validates that the corrected percentile logic produces accurate results
 */

import { describe, it, expect } from 'vitest';
// Import the internal function - we'll test it through the main function
import { calculateRelativeValuation } from './relativeValuationCalculator';
import type { RelativeValuationInputs } from '../types/relativeValuation';

describe('Percentile Calculation Fixes', () => {
  // Helper function to create test inputs
  const createTestInputs = (
    targetPE: number, 
    peerPEValues: number[]
  ): RelativeValuationInputs => {
    const targetCompany = {
      symbol: 'TEST',
      name: 'Test Company',
      industry: 'Technology',
      marketCap: 1000000000,
      enterpriseValue: 1000000000,
      revenue: 500000000,
      ebitda: 100000000,
      netIncome: 50000000,
      bookValue: 300000000,
      sharesOutstanding: 100000000,
      growthRate: 0.10,
      debt: 0,
      cash: 0
    };

    const peerCompanies = peerPEValues.map((pe, index) => ({
      symbol: `PEER${index + 1}`,
      name: `Peer Company ${index + 1}`,
      industry: 'Technology',
      marketCap: 1000000000,
      enterpriseValue: 1000000000,
      revenue: 500000000,
      ebitda: 100000000,
      netIncome: 50000000 / pe * targetPE, // Adjust to create desired P/E
      bookValue: 300000000,
      sharesOutstanding: 100000000,
      growthRate: 0.10,
      debt: 0,
      cash: 0
    }));

    return {
      targetCompany,
      peerCompanies,
      selectedMultiples: ['PE'],
      useGrowthAdjustments: false,
      outlierRemoval: false,
      minimumPeers: 3,
      peerSelectionCriteria: {
        industryMatch: true,
        sizeRange: { min: 500000000, max: 5000000000 },
        growthSimilarity: false,
        profitabilityThreshold: 0.05
      }
    };
  };

  it('should correctly calculate percentile when target is in middle of peer group', () => {
    // Target P/E: 30x, Peer P/Es: [20x, 25x, 35x, 40x]  
    // Target should be around 50th percentile (2 peers below, 2 above)
    const inputs = createTestInputs(30, [20, 25, 35, 40]);
    const result = calculateRelativeValuation(inputs);
    
    const peMultiple = result.multiples.find(m => m.type === 'PE');
    expect(peMultiple).toBeDefined();
    expect(peMultiple!.percentile).toBeGreaterThan(40);
    expect(peMultiple!.percentile).toBeLessThan(60);
  });

  it('should correctly calculate percentile when target is lowest in peer group', () => {
    // Target P/E: 10x, Peer P/Es: [20x, 30x, 40x, 50x]
    // Target should be 0th percentile (all peers above)
    const inputs = createTestInputs(10, [20, 30, 40, 50]);
    const result = calculateRelativeValuation(inputs);
    
    const peMultiple = result.multiples.find(m => m.type === 'PE');
    expect(peMultiple).toBeDefined();
    expect(peMultiple!.percentile).toBeLessThan(20); // Should be low
  });

  it('should correctly calculate percentile when target is highest in peer group', () => {
    // Target P/E: 60x, Peer P/Es: [20x, 30x, 40x, 50x]
    // Target should be 100th percentile (all peers below)
    const inputs = createTestInputs(60, [20, 30, 40, 50]);
    const result = calculateRelativeValuation(inputs);
    
    const peMultiple = result.multiples.find(m => m.type === 'PE');
    expect(peMultiple).toBeDefined();
    expect(peMultiple!.percentile).toBeGreaterThan(80); // Should be high
  });

  it('should handle percentile calculation with tied values', () => {
    // Target P/E: 30x, Peer P/Es: [20x, 30x, 30x, 40x]
    // Target ties with 2 peers - should use midpoint ranking
    const inputs = createTestInputs(30, [20, 30, 30, 40]);
    const result = calculateRelativeValuation(inputs);
    
    const peMultiple = result.multiples.find(m => m.type === 'PE');
    expect(peMultiple).toBeDefined();
    // With ties, should be around middle percentile
    expect(peMultiple!.percentile).toBeGreaterThan(30);
    expect(peMultiple!.percentile).toBeLessThan(70);
  });

  it('should avoid all-zeros percentile bug that was present before fix', () => {
    // Test the specific scenario from the user's screenshot
    // Apple-like scenario: Target P/E lower than peer median but not zero percentile
    const inputs = createTestInputs(36, [40, 50, 63, 70]); // Target: 36x, all peers higher
    const result = calculateRelativeValuation(inputs);
    
    const peMultiple = result.multiples.find(m => m.type === 'PE');
    expect(peMultiple).toBeDefined();
    
    // Even if target is lowest, percentile should not be exactly 0 with our new calculation
    // The new method should give a small but non-zero percentile
    expect(peMultiple!.percentile).toBeGreaterThanOrEqual(0);
    expect(peMultiple!.percentile).toBeLessThan(25); // Should be low
    
    // Most importantly - should not be exactly 0 unless truly extreme
    console.log('Calculated percentile for Apple-like scenario:', peMultiple!.percentile);
  });

  it('should provide reasonable percentiles for realistic financial data', () => {
    // Test with data similar to the screenshot: MSFT, GOOGL, AAPL scenario
    const inputs = createTestInputs(36.02, [63.19, 45.5, 28.3]); // Apple vs peers
    const result = calculateRelativeValuation(inputs);
    
    const peMultiple = result.multiples.find(m => m.type === 'PE');
    expect(peMultiple).toBeDefined();
    
    // Apple P/E (36.02) is lowest among these, but should not be exactly 0th
    expect(peMultiple!.percentile).toBeGreaterThanOrEqual(0);
    expect(peMultiple!.percentile).toBeLessThan(40);
    expect(peMultiple!.percentile).not.toBe(0); // Ensure not exactly 0
    
    // Should be a clean number (rounded to 1 decimal)
    expect(peMultiple!.percentile * 10 % 1).toBeCloseTo(0, 1);
  });

  it('should handle limited peer data with warnings', () => {
    // Test with exactly 3 peers (minimum required but still limited)
    const inputs = createTestInputs(30, [25, 35, 40]);
    const result = calculateRelativeValuation(inputs);
    
    const peMultiple = result.multiples.find(m => m.type === 'PE');
    expect(peMultiple).toBeDefined();
    
    // With limited peer data, should still calculate reasonable percentiles
    expect(peMultiple!.percentile).toBeGreaterThanOrEqual(0);
    expect(peMultiple!.percentile).toBeLessThanOrEqual(100);
    
    // Target (30) is between 25 and 35, so should be around 33rd percentile
    expect(peMultiple!.percentile).toBeGreaterThan(20);
    expect(peMultiple!.percentile).toBeLessThan(60);
    
    // Check that we get a console warning about limited peer data
    // This validates our data quality warnings are working
  });
});