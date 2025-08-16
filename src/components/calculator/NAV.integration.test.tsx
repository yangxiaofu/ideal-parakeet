/**
 * Integration tests for NAV Calculator components
 * Tests the full workflow from input form to results display
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ResizeObserver for chart tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
import { NAVCalculator } from './NAVCalculator';
import type { BalanceSheet } from '../../types';

// Mock the nav calculator utility
vi.mock('../../utils/navCalculator', () => ({
  calculateNAV: vi.fn().mockReturnValue({
    bookValueNAV: 1000000000,
    adjustedNAV: 1200000000,
    navPerShare: 12.00,
    bookValuePerShare: 10.00,
    totalAdjustedAssets: 2000000000,
    totalAdjustedLiabilities: 800000000,
    netAdjustments: 200000000,
    assetBreakdown: [
      {
        category: 'cash_and_equivalents',
        description: 'Cash and Cash Equivalents',
        bookValue: 200000000,
        adjustedValue: 200000000,
        adjustmentAmount: 0,
        adjustmentPercentage: 0,
        qualityScore: 100,
        liquidationValue: 200000000,
        liquidationDiscount: 0
      },
      {
        category: 'property_plant_equipment',
        description: 'Property, Plant & Equipment',
        bookValue: 700000000,
        adjustedValue: 800000000,
        adjustmentAmount: 100000000,
        adjustmentPercentage: 14.3,
        qualityScore: 75,
        liquidationValue: 680000000,
        liquidationDiscount: 0.15
      },
      {
        category: 'intangible_assets',
        description: 'Intangible Assets',
        bookValue: 160000000,
        adjustedValue: 120000000,
        adjustmentAmount: -40000000,
        adjustmentPercentage: -25.0,
        qualityScore: 40,
        liquidationValue: 48000000,
        liquidationDiscount: 0.60
      }
    ],
    liabilityBreakdown: [
      {
        category: 'long_term_debt',
        description: 'Long-term Debt',
        bookValue: 600000000,
        adjustedValue: 600000000,
        adjustmentAmount: 0,
        adjustmentPercentage: 0
      },
      {
        category: 'accounts_payable',
        description: 'Accounts Payable',
        bookValue: 200000000,
        adjustedValue: 200000000,
        adjustmentAmount: 0,
        adjustmentPercentage: 0
      }
    ],
    assetQuality: {
      overallScore: 72,
      scoreCategory: 'good',
      tangibleAssetRatio: 0.85,
      liquidAssetRatio: 0.20,
      intangibleAssetRatio: 0.15,
      categoryScores: {},
      hasExcessCash: false,
      hasMarketableSecurities: true,
      heavyIntangibles: false,
      significantGoodwill: false
    },
    liquidationAnalysis: [
      {
        scenario: 'orderly',
        totalLiquidationValue: 1680000000,
        liquidationValuePerShare: 8.80,
        averageDiscount: 0.16,
        timeFrame: '12-24 months',
        assetLiquidationValues: {}
      },
      {
        scenario: 'quick',
        totalLiquidationValue: 1440000000,
        liquidationValuePerShare: 6.40,
        averageDiscount: 0.28,
        timeFrame: '3-6 months',
        assetLiquidationValues: {}
      },
      {
        scenario: 'forced',
        totalLiquidationValue: 1200000000,
        liquidationValuePerShare: 4.00,
        averageDiscount: 0.40,
        timeFrame: '1-3 months',
        assetLiquidationValues: {}
      }
    ],
    confidenceLevel: 'medium',
    warnings: [
      {
        type: 'info',
        category: 'data_quality',
        message: 'Verify balance sheet data is current and reflects recent financial position',
        severity: 'low',
        suggestion: 'Use most recent quarterly or annual financial statements'
      }
    ],
    calculationDate: new Date('2025-01-15'),
    sharesOutstanding: 100000000
  })
}));

describe('NAV Calculator Integration', () => {
  const mockBalanceSheet: BalanceSheet = {
    totalAssets: 2000000000, // $2B
    totalLiabilities: 800000000, // $800M
    cash: 200000000,
    totalDebt: 600000000,
    sharesOutstanding: 100000000,
    bookValue: 1200000000,
    workingCapital: 100000000,
    retainedEarnings: 800000000,
    date: '2024-12-31'
  };

  const mockHistoricalBookValues = [
    { year: '2023', value: 9.50 },
    { year: '2022', value: 8.75 },
    { year: '2021', value: 8.00 }
  ];

  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Calculator Loading and Initialization', () => {
    it('displays balance sheet required message when no balance sheet provided', () => {
      render(<NAVCalculator />);
      
      expect(screen.getByText('Balance Sheet Required')).toBeInTheDocument();
      expect(screen.getByText(/Please select a company to load balance sheet data/)).toBeInTheDocument();
    });

    it('displays calculator form when balance sheet is provided', () => {
      render(
        <NAVCalculator 
          symbol="AAPL"
          currentPrice={150.25}
          balanceSheet={mockBalanceSheet}
          historicalBookValues={mockHistoricalBookValues}
        />
      );
      
      expect(screen.getByText('Net Asset Value Calculator')).toBeInTheDocument();
      expect(screen.getByText('(AAPL)')).toBeInTheDocument();
      expect(screen.getByText('$150.25')).toBeInTheDocument();
      expect(screen.getByText('Balance Sheet Summary')).toBeInTheDocument();
    });

    it('displays balance sheet summary correctly', () => {
      render(
        <NAVCalculator 
          balanceSheet={mockBalanceSheet}
        />
      );
      
      // Look for balance sheet summary section specifically
      const balanceSheetSection = screen.getByText('Balance Sheet Summary').closest('div');
      expect(balanceSheetSection).toBeInTheDocument();
      
      // Check the formatted values are present within the balance sheet section
      expect(screen.getByText('Total Assets')).toBeInTheDocument();
      expect(screen.getByText('Total Liabilities')).toBeInTheDocument();
      expect(screen.getByText('Book Value')).toBeInTheDocument();
    });
  });

  describe('Input Form Interaction', () => {
    it('allows user to modify shares outstanding', async () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      const sharesInput = screen.getByLabelText('Shares Outstanding');
      expect(sharesInput).toHaveValue(100000000); // Default value
      
      await user.clear(sharesInput);
      await user.type(sharesInput, '120000000');
      
      expect(sharesInput).toHaveValue(120000000);
    });

    it('allows user to change liquidation scenario', async () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      const scenarioSelect = screen.getByLabelText('Liquidation Scenario');
      expect(scenarioSelect).toHaveValue('orderly');
      
      await user.selectOptions(scenarioSelect, 'quick');
      expect(scenarioSelect).toHaveValue('quick');
    });

    it('toggles analysis options correctly', async () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      const includeIntangiblesCheckbox = screen.getByLabelText('Include Intangible Assets');
      expect(includeIntangiblesCheckbox).toBeChecked();
      
      await user.click(includeIntangiblesCheckbox);
      expect(includeIntangiblesCheckbox).not.toBeChecked();
      
      const includeGoodwillCheckbox = screen.getByLabelText('Include Goodwill');
      expect(includeGoodwillCheckbox).not.toBeChecked();
      
      await user.click(includeGoodwillCheckbox);
      expect(includeGoodwillCheckbox).toBeChecked();
    });

    it('shows and hides advanced options', async () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      const advancedToggle = screen.getByText('Advanced Options');
      await user.click(advancedToggle);
      
      expect(screen.getByLabelText('Custom Liquidation Discount (%)')).toBeInTheDocument();
      
      await user.click(advancedToggle);
      expect(screen.queryByLabelText('Custom Liquidation Discount (%)')).not.toBeInTheDocument();
    });
  });

  describe('Asset Adjustments', () => {
    it('displays asset categories with estimated values', () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      expect(screen.getByText('Cash & Equivalents')).toBeInTheDocument();
      expect(screen.getByText('Property, Plant & Equipment')).toBeInTheDocument();
      expect(screen.getByText('Intangible Assets')).toBeInTheDocument();
    });

    it('displays asset categories that can be interacted with', async () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      // Check that asset categories are displayed
      expect(screen.getByText('Cash & Equivalents')).toBeInTheDocument();
      expect(screen.getByText('Property, Plant & Equipment')).toBeInTheDocument();
      expect(screen.getByText('Intangible Assets')).toBeInTheDocument();
      
      // Categories should have cursor-pointer styling indicating they're clickable
      const cashCategory = screen.getByText('Cash & Equivalents');
      const cashCategoryParent = cashCategory.closest('div[class*="cursor-pointer"]');
      expect(cashCategoryParent).toBeInTheDocument();
    });

    it('shows asset adjustment structure is in place', async () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      // Verify the asset adjustment form structure exists
      expect(screen.getByText('Asset Adjustments')).toBeInTheDocument();
      expect(screen.getByText(/Adjust book values to reflect fair market values/)).toBeInTheDocument();
      
      // Asset categories should be listed
      expect(screen.getByText('Cash & Equivalents')).toBeInTheDocument();
      expect(screen.getByText('Property, Plant & Equipment')).toBeInTheDocument();
    });
  });

  describe('Liability Adjustments', () => {
    it('displays liability categories with estimated values', () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      expect(screen.getByText('Long-term Debt')).toBeInTheDocument();
      expect(screen.getByText('Accounts Payable')).toBeInTheDocument();
      expect(screen.getByText('Short-term Debt')).toBeInTheDocument();
    });

    it('shows liability adjustment structure is in place', async () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      // Verify liability adjustments section exists
      expect(screen.getByText('Liability Adjustments')).toBeInTheDocument();
      expect(screen.getByText(/Adjust liability values to reflect actual obligations/)).toBeInTheDocument();
      
      // Liability categories should be displayed
      expect(screen.getByText('Long-term Debt')).toBeInTheDocument();
      expect(screen.getByText('Accounts Payable')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error for invalid shares outstanding', async () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      const sharesInput = screen.getByLabelText('Shares Outstanding');
      await user.clear(sharesInput);
      await user.type(sharesInput, '0');
      
      const submitButton = screen.getByText('Calculate Net Asset Value');
      await user.click(submitButton);
      
      expect(screen.getByText('Shares outstanding must be positive')).toBeInTheDocument();
    });

    it('shows advanced liquidation discount input', async () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      // Show advanced options
      const advancedToggle = screen.getByText('Advanced Options');
      await user.click(advancedToggle);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Custom Liquidation Discount (%)')).toBeInTheDocument();
      });
      
      const discountInput = screen.getByLabelText('Custom Liquidation Discount (%)');
      expect(discountInput).toBeInTheDocument();
      
      // Verify the input accepts values
      await user.clear(discountInput);
      await user.type(discountInput, '25');
      expect(discountInput).toHaveValue(25);
    });
  });

  describe('Calculation Flow', () => {
    it('submits form and displays results', async () => {
      const onCalculationComplete = vi.fn();
      
      render(
        <NAVCalculator 
          balanceSheet={mockBalanceSheet}
          currentPrice={150.25}
          onCalculationComplete={onCalculationComplete}
        />
      );
      
      const submitButton = screen.getByText('Calculate Net Asset Value');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('NAV Analysis Results')).toBeInTheDocument();
      });
      
      // Check main result display
      expect(screen.getAllByText(/\$12\.00/).length).toBeGreaterThan(0);
      expect(screen.getAllByText('Adjusted NAV').length).toBeGreaterThan(0);
      
      // Check callback was called
      expect(onCalculationComplete).toHaveBeenCalledWith(12.00);
    });

    it('displays loading state during calculation', async () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      const submitButton = screen.getByText('Calculate Net Asset Value');
      await user.click(submitButton);
      
      // Should show loading state briefly
      expect(screen.getByText('Calculating NAV...')).toBeInTheDocument();
    });

    it('shows calculate again button after results', async () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      const submitButton = screen.getByText('Calculate Net Asset Value');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Calculate Again')).toBeInTheDocument();
      });
    });

    it('allows resetting to input form', async () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      // Calculate first
      const submitButton = screen.getByText('Calculate Net Asset Value');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('NAV Analysis Results')).toBeInTheDocument();
      });
      
      // Reset
      const resetButton = screen.getByText('Calculate Again');
      await user.click(resetButton);
      
      // Should be back to input form
      expect(screen.getByText('Calculate Net Asset Value')).toBeInTheDocument();
      expect(screen.queryByText('NAV Analysis Results')).not.toBeInTheDocument();
    });
  });

  describe('Results Display', () => {
    beforeEach(async () => {
      render(
        <NAVCalculator 
          balanceSheet={mockBalanceSheet}
          currentPrice={150.25}
        />
      );
      
      const submitButton = screen.getByText('Calculate Net Asset Value');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('NAV Analysis Results')).toBeInTheDocument();
      });
    });

    it('displays main NAV metrics', () => {
      expect(screen.getAllByText(/\$12\.00/).length).toBeGreaterThan(0); // NAV per share
      expect(screen.getAllByText(/\$10\.00/).length).toBeGreaterThan(0); // Book value per share
      expect(screen.getAllByText(/\$150\.25/).length).toBeGreaterThan(0); // Current price
      expect(screen.getAllByText(/72/).length).toBeGreaterThan(0); // Asset quality score
    });

    it('displays discount/premium calculation correctly', () => {
      // NAV $12.00 vs Price $150.25 should show a premium
      expect(screen.getByText(/Premium:/)).toBeInTheDocument();
    });

    it('shows confidence level badge', () => {
      expect(screen.getByText('medium confidence')).toBeInTheDocument();
    });

    it('allows switching between result tabs', async () => {
      // Should start on overview tab
      expect(screen.getByText('NAV Summary')).toBeInTheDocument();
      
      // Switch to assets tab
      const assetsTab = screen.getByText('Asset Breakdown');
      await user.click(assetsTab);
      
      expect(screen.getByText('Asset Value Adjustments')).toBeInTheDocument();
      expect(screen.getByText('Detailed Asset Analysis')).toBeInTheDocument();
      
      // Switch to quality tab
      const qualityTab = screen.getByText('Asset Quality');
      await user.click(qualityTab);
      
      expect(screen.getByText('Asset Quality Analysis')).toBeInTheDocument();
      expect(screen.getByText('Overall Quality Score')).toBeInTheDocument();
    });

    it('displays warnings when present', () => {
      expect(screen.getByText('Analysis Warnings & Notes')).toBeInTheDocument();
      expect(screen.getByText(/Verify balance sheet data is current/)).toBeInTheDocument();
    });

    it('shows liquidation scenarios in scenarios tab', async () => {
      const scenariosTab = screen.getByText('Liquidation Scenarios');
      await user.click(scenariosTab);
      
      expect(screen.getByText('Liquidation Value Analysis')).toBeInTheDocument();
      expect(screen.getByText('Orderly')).toBeInTheDocument();
      expect(screen.getByText('Quick')).toBeInTheDocument();
      expect(screen.getByText('Forced')).toBeInTheDocument();
    });
  });

  describe('Real Estate Investment Trust (REIT) Scenario', () => {
    const reitBalanceSheet: BalanceSheet = {
      totalAssets: 5000000000, // $5B heavy in real estate
      totalLiabilities: 2000000000, // $2B mostly debt
      cash: 100000000, // Low cash
      totalDebt: 1800000000, // High debt typical for REITs
      sharesOutstanding: 200000000,
      bookValue: 3000000000,
      workingCapital: -50000000, // Negative working capital common for REITs
      retainedEarnings: 500000000,
      date: '2024-12-31'
    };

    it('handles REIT-like balance sheet appropriately', async () => {
      render(<NAVCalculator balanceSheet={reitBalanceSheet} />);
      
      // Should display appropriate balance sheet summary
      expect(screen.getByText('Balance Sheet Summary')).toBeInTheDocument();
      
      // Calculate with REIT assumptions
      const submitButton = screen.getByText('Calculate Net Asset Value');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('NAV Analysis Results')).toBeInTheDocument();
      });
    });
  });

  describe('Manufacturing Company Scenario', () => {
    const manufacturingBalanceSheet: BalanceSheet = {
      totalAssets: 3000000000, // $3B
      totalLiabilities: 1500000000, // $1.5B
      cash: 300000000, // Reasonable cash position
      totalDebt: 800000000, // Moderate debt
      sharesOutstanding: 150000000,
      bookValue: 1500000000,
      workingCapital: 400000000, // Positive working capital
      retainedEarnings: 800000000,
      date: '2024-12-31'
    };

    it('handles manufacturing company balance sheet', async () => {
      render(<NAVCalculator balanceSheet={manufacturingBalanceSheet} />);
      
      // Should show manufacturing-appropriate asset categories
      expect(screen.getByText('Property, Plant & Equipment')).toBeInTheDocument();
      expect(screen.getByText('Inventory')).toBeInTheDocument();
      
      const submitButton = screen.getByText('Calculate Net Asset Value');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('NAV Analysis Results')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error when calculation fails', async () => {
      const { calculateNAV } = await import('../../utils/navCalculator');
      
      // Mock calculation to throw error
      vi.mocked(calculateNAV).mockImplementationOnce(() => {
        throw new Error('Invalid balance sheet data');
      });
      
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      const submitButton = screen.getByText('Calculate Net Asset Value');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Calculation Error')).toBeInTheDocument();
        expect(screen.getByText('Invalid balance sheet data')).toBeInTheDocument();
      });
    });

    it('handles missing balance sheet gracefully', () => {
      render(<NAVCalculator />);
      
      expect(screen.getByText('Balance Sheet Required')).toBeInTheDocument();
      expect(screen.queryByText('Calculate Net Asset Value')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and form structure', () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      expect(screen.getByLabelText('Shares Outstanding')).toBeInTheDocument();
      expect(screen.getByLabelText('Liquidation Scenario')).toBeInTheDocument();
      expect(screen.getByLabelText('Include Intangible Assets')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Calculate Net Asset Value' })).toBeInTheDocument();
    });

    it('maintains keyboard navigation', async () => {
      render(<NAVCalculator balanceSheet={mockBalanceSheet} />);
      
      const sharesInput = screen.getByLabelText('Shares Outstanding');
      sharesInput.focus();
      expect(document.activeElement).toBe(sharesInput);
      
      // Tab to next element
      await user.tab();
      const liquidationSelect = screen.getByLabelText('Liquidation Scenario');
      expect(document.activeElement).toBe(liquidationSelect);
    });
  });
});