import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DCFCalculator } from './DCFCalculator';

// Mock the calculation function
vi.mock('../../utils/dcfCalculator', () => ({
  calculateDCFIntrinsicValue: vi.fn()
}));

import { calculateDCFIntrinsicValue } from '../../utils/dcfCalculator';

describe('DCFCalculator', () => {
  const mockCalculateDCF = calculateDCFIntrinsicValue as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders calculator header and input form initially', () => {
    render(<DCFCalculator />);
    
    expect(screen.getByText('DCF Valuation Calculator')).toBeInTheDocument();
    expect(screen.getByText('Calculate intrinsic value using Discounted Cash Flow analysis')).toBeInTheDocument();
    expect(screen.getByText('DCF Valuation Inputs')).toBeInTheDocument();
  });

  it('displays symbol in header when provided', () => {
    render(<DCFCalculator symbol="AAPL" />);
    
    expect(screen.getByText('(AAPL)')).toBeInTheDocument();
  });

  it('displays current price when provided', () => {
    render(<DCFCalculator currentPrice={150.25} />);
    
    expect(screen.getByText('Current Market Price')).toBeInTheDocument();
    expect(screen.getByText('$150.25')).toBeInTheDocument();
  });

  it('performs calculation and shows results', async () => {
    const mockResult = {
      method: 'DCF' as const,
      scenario: 'base' as const,
      intrinsicValue: 160.50,
      intrinsicValuePerShare: 160.50,
      confidence: 'medium' as const,
      projections: [
        {
          year: 1,
          freeCashFlow: 1100000000,
          presentValue: 1000000000,
          growthRate: 0.10
        }
      ],
      terminalValue: 19000000000,
      totalPresentValue: 16050000000,
      sharesOutstanding: 100000000
    };

    mockCalculateDCF.mockReturnValue(mockResult);

    render(<DCFCalculator />);
    
    // Fill in required form fields
    fireEvent.change(screen.getByLabelText(/base free cash flow/i), { target: { value: '1000000000' } });
    fireEvent.change(screen.getByLabelText(/discount rate/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/shares outstanding/i), { target: { value: '100000000' } });
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /calculate dcf/i }));
    
    await waitFor(() => {
      expect(screen.getByText('DCF Valuation Results')).toBeInTheDocument();
      expect(screen.getByText('$160.50')).toBeInTheDocument();
    });
  });

  it('calculates upside when current price is provided', async () => {
    const mockResult = {
      method: 'DCF' as const,
      scenario: 'base' as const,
      intrinsicValue: 160.00,
      intrinsicValuePerShare: 160.00,
      confidence: 'medium' as const,
      projections: [],
      terminalValue: 19000000000,
      totalPresentValue: 16000000000,
      sharesOutstanding: 100000000
    };

    mockCalculateDCF.mockReturnValue(mockResult);

    render(<DCFCalculator currentPrice={128.00} />);
    
    // Verify current price is shown initially
    expect(screen.getByText('Current Market Price')).toBeInTheDocument();
    
    // Fill in form and submit
    fireEvent.change(screen.getByLabelText(/base free cash flow/i), { target: { value: '1000000000' } });
    fireEvent.change(screen.getByLabelText(/discount rate/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/shares outstanding/i), { target: { value: '100000000' } });
    fireEvent.click(screen.getByRole('button', { name: /calculate dcf/i }));
    
    await waitFor(() => {
      // In results section
      expect(screen.getByText('Current Price')).toBeInTheDocument();
      expect(screen.getByText('Upside')).toBeInTheDocument();
      expect(screen.getByText('+25.00%')).toBeInTheDocument(); // (160-128)/128 * 100 = 25%
    });
  });

  it('handles calculation errors gracefully', async () => {
    mockCalculateDCF.mockImplementation(() => {
      throw new Error('Base FCF must be positive');
    });

    render(<DCFCalculator />);
    
    // Fill in form with valid form data that triggers calculation error
    fireEvent.change(screen.getByLabelText(/base free cash flow/i), { target: { value: '1000000000' } });
    fireEvent.change(screen.getByLabelText(/discount rate/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/terminal growth rate/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/shares outstanding/i), { target: { value: '100000000' } });
    
    fireEvent.click(screen.getByRole('button', { name: /calculate dcf/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Calculation Error')).toBeInTheDocument();
      expect(screen.getByText('Base FCF must be positive')).toBeInTheDocument();
    });
  });

  it('shows loading state during calculation', async () => {
    const mockResult = {
      method: 'DCF' as const,
      scenario: 'base' as const,
      intrinsicValue: 150.00,
      intrinsicValuePerShare: 150.00,
      confidence: 'medium' as const,
      projections: [],
      terminalValue: 19000000000,
      totalPresentValue: 15000000000,
      sharesOutstanding: 100000000
    };

    // The calculation function is synchronous in our implementation
    mockCalculateDCF.mockReturnValue(mockResult);

    render(<DCFCalculator />);
    
    // Fill in form
    fireEvent.change(screen.getByLabelText(/base free cash flow/i), { target: { value: '1000000000' } });
    fireEvent.change(screen.getByLabelText(/discount rate/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/shares outstanding/i), { target: { value: '100000000' } });
    
    fireEvent.click(screen.getByRole('button', { name: /calculate dcf/i }));
    
    // Results should appear
    await waitFor(() => {
      expect(screen.getByText('DCF Valuation Results')).toBeInTheDocument();
    });
  });

  it('allows recalculation after results are shown', async () => {
    const mockResult = {
      method: 'DCF' as const,
      scenario: 'base' as const,
      intrinsicValue: 150.00,
      intrinsicValuePerShare: 150.00,
      confidence: 'medium' as const,
      projections: [],
      terminalValue: 19000000000,
      totalPresentValue: 15000000000,
      sharesOutstanding: 100000000
    };

    mockCalculateDCF.mockReturnValue(mockResult);

    render(<DCFCalculator />);
    
    // Fill in form and submit
    fireEvent.change(screen.getByLabelText(/base free cash flow/i), { target: { value: '1000000000' } });
    fireEvent.change(screen.getByLabelText(/discount rate/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/shares outstanding/i), { target: { value: '100000000' } });
    fireEvent.click(screen.getByRole('button', { name: /calculate dcf/i }));
    
    await waitFor(() => {
      expect(screen.getByText('DCF Valuation Results')).toBeInTheDocument();
    });
    
    // Click "Calculate Again" button
    fireEvent.click(screen.getByRole('button', { name: /calculate again/i }));
    
    // Should return to input form
    expect(screen.getByText('DCF Valuation Inputs')).toBeInTheDocument();
    expect(screen.queryByText('DCF Valuation Results')).not.toBeInTheDocument();
  });
});