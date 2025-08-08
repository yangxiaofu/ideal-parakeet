import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RelativeValuationCalculator } from './RelativeValuationCalculator';
import { RelativeValuationResults } from './RelativeValuationResults';
import * as relativeValuationCalculator from '../../utils/relativeValuationCalculator';
import type { 
  RelativeValuationResult,
  PeerCompany 
} from '../../types/relativeValuation';

// Mock the calculation utilities
vi.mock('../../utils/relativeValuationCalculator', () => ({
  calculateRelativeValuation: vi.fn(),
  validateRelativeValuationInputs: vi.fn()
}));

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ScatterChart: ({ children }: { children: React.ReactNode }) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => <div data-testid="scatter" />,
  Cell: () => <div data-testid="cell" />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />
}));

// Test data
const mockTargetCompany = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  marketCap: 3000000000000, // $3T
  enterpriseValue: 2950000000000,
  revenue: 365000000000,
  ebitda: 120000000000,
  netIncome: 100000000000,
  bookValue: 65000000000,
  sharesOutstanding: 16000000000,
  growthRate: 0.12,
  debt: 120000000000,
  cash: 170000000000
};

const mockPeerCompanies: PeerCompany[] = [
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    industry: 'Technology',
    marketCap: 2800000000000,
    enterpriseValue: 2750000000000,
    revenue: 200000000000,
    ebitda: 80000000000,
    netIncome: 70000000000,
    bookValue: 80000000000,
    sharesOutstanding: 7500000000,
    growthRate: 0.10,
    debt: 60000000000,
    cash: 110000000000
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    industry: 'Technology',
    marketCap: 1700000000000,
    enterpriseValue: 1600000000000,
    revenue: 280000000000,
    ebitda: 75000000000,
    netIncome: 60000000000,
    bookValue: 270000000000,
    sharesOutstanding: 13000000000,
    growthRate: 0.08,
    debt: 30000000000,
    cash: 130000000000
  }
];

const mockResult: RelativeValuationResult = {
  targetCompany: 'AAPL',
  currentMarketCap: 3000000000000,
  currentPricePerShare: 187.50,
  multiples: [
    {
      type: 'PE',
      name: 'Price-to-Earnings',
      targetValue: 30,
      peerValues: [28, 32, 26],
      statistics: {
        median: 28,
        mean: 28.67,
        min: 26,
        max: 32,
        q1: 27,
        q3: 30,
        standardDeviation: 3,
        count: 3
      },
      impliedValue: 2800000000000,
      impliedPricePerShare: 175,
      percentile: 67
    }
  ],
  valuationRanges: {
    conservative: {
      min: 2500000000000,
      max: 2700000000000,
      pricePerShare: { min: 156, max: 169 }
    },
    moderate: {
      min: 2700000000000,
      max: 3100000000000,
      pricePerShare: { min: 169, max: 194 }
    },
    optimistic: {
      min: 3100000000000,
      max: 3500000000000,
      pricePerShare: { min: 194, max: 219 }
    }
  },
  peerAnalysis: {
    totalPeers: 2,
    qualifyingPeers: 2,
    excludedPeers: [],
    industryClassification: 'Technology',
    medianMarketCap: 2250000000000,
    medianGrowthRate: 0.09
  },
  companyTier: {
    tier: 'premium',
    description: 'Premium Valuation - Trading above peer median',
    percentileRange: { min: 75, max: 100 },
    impliedValueRange: { min: 2800000000000, max: 2800000000000 },
    reasoningFactors: ['Superior growth profile', 'Higher profitability margins']
  },
  relativePositioning: {
    growthPremium: 20,
    profitabilityPremium: 15,
    sizePremium: 10,
    overallPremium: 18
  },
  recommendation: {
    overallRating: 'hold',
    confidence: 'medium',
    keyFactors: ['Premium valuation reflects strong fundamentals', 'Market leadership position'],
    risks: ['High valuation multiple limits upside'],
    upside: -6.7
  },
  sensitivity: {
    peerGroupSensitivity: [],
    growthSensitivity: [],
    multipleWeightingSensitivity: []
  }
};

describe('Relative Valuation Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks
    vi.mocked(relativeValuationCalculator.validateRelativeValuationInputs).mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    });
  });

  describe('RelativeValuationCalculator Integration', () => {
    it('should render input form initially', () => {
      render(<RelativeValuationCalculator />);
      
      expect(screen.getByText('Target Company')).toBeInTheDocument();
      expect(screen.getByText('Valuation Multiples')).toBeInTheDocument();
      expect(screen.getByText('Peer Companies (1)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /calculate relative valuation/i })).toBeInTheDocument();
    });

    it('should populate default company data when provided', () => {
      render(
        <RelativeValuationCalculator 
          defaultCompanyData={mockTargetCompany}
          symbol="AAPL"
        />
      );
      
      expect(screen.getByDisplayValue('AAPL')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Apple Inc.')).toBeInTheDocument();
    });

    it('should show loading state during calculation', async () => {
      // const user = userEvent.setup();
      vi.mocked(relativeValuationCalculator.calculateRelativeValuation)
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockResult), 1000)));
      
      render(<RelativeValuationCalculator defaultCompanyData={mockTargetCompany} />);
      
      // Fill in required peer data
      const peerSymbolInput = screen.getAllByPlaceholderText('Symbol')[1];
      await user.type(peerSymbolInput, 'MSFT');
      
      const calculateButton = screen.getByRole('button', { name: /calculate relative valuation/i });
      await user.click(calculateButton);
      
      expect(screen.getByText('Calculating Relative Valuation')).toBeInTheDocument();
      expect(screen.getByText(/Analyzing peer group multiples/)).toBeInTheDocument();
    });

    it('should display results after successful calculation', async () => {
      // const user = userEvent.setup();
      vi.mocked(relativeValuationCalculator.calculateRelativeValuation)
        .mockResolvedValue(mockResult);
      
      render(<RelativeValuationCalculator defaultCompanyData={mockTargetCompany} />);
      
      // Fill minimum required data
      const peerSymbolInput = screen.getAllByPlaceholderText('Symbol')[1];
      await user.type(peerSymbolInput, 'MSFT');
      
      const marketCapInput = screen.getAllByPlaceholderText('Market Cap')[1];
      await user.type(marketCapInput, '2800000000000');
      
      const calculateButton = screen.getByRole('button', { name: /calculate relative valuation/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Valuation Summary')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Investment Recommendation')).toBeInTheDocument();
      expect(screen.getByText('Multiple Analysis')).toBeInTheDocument();
      expect(screen.getByText('HOLD')).toBeInTheDocument();
    });

    it('should display error message when calculation fails', async () => {
      // const user = userEvent.setup();
      const errorMessage = 'Invalid peer data provided';
      vi.mocked(relativeValuationCalculator.calculateRelativeValuation)
        .mockRejectedValue(new Error(errorMessage));
      
      render(<RelativeValuationCalculator defaultCompanyData={mockTargetCompany} />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate relative valuation/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Calculation Error')).toBeInTheDocument();
      });
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should allow recalculation after showing results', async () => {
      // const user = userEvent.setup();
      vi.mocked(relativeValuationCalculator.calculateRelativeValuation)
        .mockResolvedValue(mockResult);
      
      render(<RelativeValuationCalculator defaultCompanyData={mockTargetCompany} />);
      
      // Perform initial calculation
      const calculateButton = screen.getByRole('button', { name: /calculate relative valuation/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Valuation Summary')).toBeInTheDocument();
      });
      
      // Click modify analysis
      const modifyButton = screen.getByRole('button', { name: /modify analysis/i });
      await user.click(modifyButton);
      
      // Should show input form again
      expect(screen.getByText('Target Company')).toBeInTheDocument();
      expect(screen.queryByText('Valuation Summary')).not.toBeInTheDocument();
    });

    it('should call onCalculationComplete with correct value', async () => {
      const onCalculationComplete = vi.fn();
      // const user = userEvent.setup();
      vi.mocked(relativeValuationCalculator.calculateRelativeValuation)
        .mockResolvedValue(mockResult);
      
      render(
        <RelativeValuationCalculator 
          defaultCompanyData={mockTargetCompany}
          onCalculationComplete={onCalculationComplete}
        />
      );
      
      const calculateButton = screen.getByRole('button', { name: /calculate relative valuation/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(onCalculationComplete).toHaveBeenCalledWith(2800000000000);
      });
    });
  });

  describe('Form Validation Integration', () => {
    it('should show validation errors and prevent calculation', async () => {
      // const user = userEvent.setup();
      vi.mocked(relativeValuationCalculator.validateRelativeValuationInputs)
        .mockReturnValue({
          isValid: false,
          errors: ['Market cap must be positive'],
          warnings: []
        });
      
      render(<RelativeValuationCalculator />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate relative valuation/i });
      expect(calculateButton).toBeDisabled();
      
      await waitFor(() => {
        expect(screen.getByText('Market cap must be positive')).toBeInTheDocument();
      });
    });

    it('should show warnings but allow calculation', async () => {
      // const user = userEvent.setup();
      vi.mocked(relativeValuationCalculator.validateRelativeValuationInputs)
        .mockReturnValue({
          isValid: true,
          errors: [],
          warnings: ['Small peer group may affect accuracy']
        });
      
      render(<RelativeValuationCalculator defaultCompanyData={mockTargetCompany} />);
      
      await waitFor(() => {
        expect(screen.getByText('Small peer group may affect accuracy')).toBeInTheDocument();
      });
      
      const calculateButton = screen.getByRole('button', { name: /calculate relative valuation/i });
      expect(calculateButton).not.toBeDisabled();
    });

    it('should update validation in real-time as user types', async () => {
      // const user = userEvent.setup();
      
      // First mock - invalid
      vi.mocked(relativeValuationCalculator.validateRelativeValuationInputs)
        .mockReturnValueOnce({
          isValid: false,
          errors: ['Target company symbol is required'],
          warnings: []
        });
      
      render(<RelativeValuationCalculator />);
      
      await waitFor(() => {
        expect(screen.getByText('Target company symbol is required')).toBeInTheDocument();
      });
      
      // Second mock - valid
      vi.mocked(relativeValuationCalculator.validateRelativeValuationInputs)
        .mockReturnValue({
          isValid: true,
          errors: [],
          warnings: []
        });
      
      // Type in symbol
      const symbolInput = screen.getByPlaceholderText('AAPL');
      await user.type(symbolInput, 'AAPL');
      
      await waitFor(() => {
        expect(screen.queryByText('Target company symbol is required')).not.toBeInTheDocument();
      });
    });
  });

  describe('Multiple Selection Integration', () => {
    it('should suggest appropriate multiples based on company characteristics', async () => {
      // const user = userEvent.setup();
      
      render(<RelativeValuationCalculator defaultCompanyData={mockTargetCompany} />);
      
      const useSuggestedButton = screen.getByRole('button', { name: /use suggested/i });
      await user.click(useSuggestedButton);
      
      // Should select multiples based on positive financials
      expect(screen.getByLabelText('P/E Ratio')).toBeChecked();
      expect(screen.getByLabelText('P/S Ratio')).toBeChecked();
      expect(screen.getByLabelText('EV/EBITDA')).toBeChecked();
    });

    it('should allow manual multiple selection', async () => {
      // const user = userEvent.setup();
      
      render(<RelativeValuationCalculator />);
      
      const pegCheckbox = screen.getByLabelText('PEG Ratio');
      await user.click(pegCheckbox);
      
      expect(pegCheckbox).toBeChecked();
    });
  });

  describe('Peer Management Integration', () => {
    it('should allow adding and removing peer companies', async () => {
      // const user = userEvent.setup();
      
      render(<RelativeValuationCalculator />);
      
      // Initially 1 peer
      expect(screen.getByText('Peer Companies (1)')).toBeInTheDocument();
      
      // Add peer
      const addPeerButton = screen.getByRole('button', { name: /add peer/i });
      await user.click(addPeerButton);
      
      expect(screen.getByText('Peer Companies (2)')).toBeInTheDocument();
      
      // Remove peer
      const removeButtons = screen.getAllByRole('button', { name: '' });
      const trashButton = removeButtons.find(btn => 
        btn.querySelector('svg') && 
        btn.querySelector('svg')?.getAttribute('data-testid') === null
      );
      
      if (trashButton) {
        await user.click(trashButton);
        expect(screen.getByText('Peer Companies (1)')).toBeInTheDocument();
      }
    });

    it('should populate peer data correctly', async () => {
      // const user = userEvent.setup();
      
      render(
        <RelativeValuationCalculator 
          suggestedPeers={mockPeerCompanies}
        />
      );
      
      expect(screen.getByDisplayValue('MSFT')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Microsoft Corporation')).toBeInTheDocument();
    });
  });

  describe('Results Display Integration', () => {
    it('should display all result sections correctly', async () => {
      render(
        <RelativeValuationResults 
          result={mockResult} 
          currentPrice={187.50}
          symbol="AAPL"
        />
      );
      
      expect(screen.getByText('Valuation Summary')).toBeInTheDocument();
      expect(screen.getByText('Investment Recommendation')).toBeInTheDocument();
      expect(screen.getByText('Multiple Analysis')).toBeInTheDocument();
      expect(screen.getByText('Valuation Scenarios')).toBeInTheDocument();
      expect(screen.getByText('Peer Group Analysis')).toBeInTheDocument();
    });

    it('should render charts correctly', () => {
      render(
        <RelativeValuationResults 
          result={mockResult} 
          currentPrice={187.50}
          symbol="AAPL"
        />
      );
      
      expect(screen.getByTestId('chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should display recommendation with correct styling', () => {
      render(
        <RelativeValuationResults 
          result={mockResult} 
          currentPrice={187.50}
          symbol="AAPL"
        />
      );
      
      expect(screen.getByText('HOLD')).toBeInTheDocument();
      expect(screen.getByText('medium confidence')).toBeInTheDocument();
    });

    it('should show tier classification correctly', () => {
      render(
        <RelativeValuationResults 
          result={mockResult} 
          currentPrice={187.50}
          symbol="AAPL"
        />
      );
      
      expect(screen.getByText('premium Tier')).toBeInTheDocument();
      expect(screen.getByText('Premium Valuation - Trading above peer median')).toBeInTheDocument();
    });

    it('should display peer analysis metrics', () => {
      render(
        <RelativeValuationResults 
          result={mockResult} 
          currentPrice={187.50}
          symbol="AAPL"
        />
      );
      
      expect(screen.getByText('2')).toBeInTheDocument(); // Qualifying peers
      expect(screen.getByText('of 2 total')).toBeInTheDocument();
      expect(screen.getByText('+20.0%')).toBeInTheDocument(); // Growth premium
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle calculation errors gracefully', async () => {
      // const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.mocked(relativeValuationCalculator.calculateRelativeValuation)
        .mockRejectedValue(new Error('Network error'));
      
      render(<RelativeValuationCalculator defaultCompanyData={mockTargetCompany} />);
      
      const calculateButton = screen.getByRole('button', { name: /calculate relative valuation/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Calculation Error')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Relative valuation calculation failed:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle empty peer data gracefully', () => {
      const emptyResult = {
        ...mockResult,
        multiples: [],
        peerAnalysis: {
          ...mockResult.peerAnalysis,
          qualifyingPeers: 0
        }
      };
      
      render(
        <RelativeValuationResults 
          result={emptyResult} 
          currentPrice={187.50}
          symbol="AAPL"
        />
      );
      
      expect(screen.getByText('Valuation Summary')).toBeInTheDocument();
      // Should still render without crashing
    });
  });

  describe('Data Flow Integration', () => {
    it('should pass calculation inputs correctly from form to calculator', async () => {
      // const user = userEvent.setup();
      const calculateSpy = vi.mocked(relativeValuationCalculator.calculateRelativeValuation);
      calculateSpy.mockResolvedValue(mockResult);
      
      render(<RelativeValuationCalculator defaultCompanyData={mockTargetCompany} />);
      
      // Add peer data
      const peerSymbolInput = screen.getAllByPlaceholderText('Symbol')[1];
      await user.type(peerSymbolInput, 'MSFT');
      
      const calculateButton = screen.getByRole('button', { name: /calculate relative valuation/i });
      await user.click(calculateButton);
      
      await waitFor(() => {
        expect(calculateSpy).toHaveBeenCalledWith(expect.objectContaining({
          targetCompany: expect.objectContaining({
            symbol: 'AAPL',
            name: 'Apple Inc.'
          }),
          selectedMultiples: expect.arrayContaining(['PE', 'PS', 'EV_EBITDA']),
          peerCompanies: expect.arrayContaining([
            expect.objectContaining({
              symbol: 'MSFT'
            })
          ])
        }));
      });
    });
  });
});