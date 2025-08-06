import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { DCFInputForm } from './DCFInputForm';
import type { DCFInputs } from '../../types';

describe('DCFInputForm', () => {
  const mockOnSubmit = vi.fn();
  
  const defaultProps = {
    onSubmit: mockOnSubmit,
    loading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required input fields', () => {
    render(<DCFInputForm {...defaultProps} />);
    
    expect(screen.getByLabelText(/base free cash flow/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/discount rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/terminal growth rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/projection years/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/shares outstanding/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/scenario/i)).toBeInTheDocument();
  });

  it('renders growth rate inputs based on projection years', async () => {
    render(<DCFInputForm {...defaultProps} />);
    
    const projectionYearsInput = screen.getByLabelText(/projection years/i);
    fireEvent.change(projectionYearsInput, { target: { value: '3' } });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/year 1 growth rate/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/year 2 growth rate/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/year 3 growth rate/i)).toBeInTheDocument();
    });
  });

  it('updates growth rate inputs when projection years change', async () => {
    render(<DCFInputForm {...defaultProps} />);
    
    // Set to 2 years
    const projectionYearsInput = screen.getByLabelText(/projection years/i);
    fireEvent.change(projectionYearsInput, { target: { value: '2' } });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/year 1 growth rate/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/year 2 growth rate/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/year 3 growth rate/i)).not.toBeInTheDocument();
    });
    
    // Change to 4 years
    fireEvent.change(projectionYearsInput, { target: { value: '4' } });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/year 4 growth rate/i)).toBeInTheDocument();
    });
  });

  it('submits form with correct DCF inputs', async () => {
    render(<DCFInputForm {...defaultProps} />);
    
    // Fill in form values
    fireEvent.change(screen.getByLabelText(/base free cash flow/i), { target: { value: '1000000000' } });
    fireEvent.change(screen.getByLabelText(/discount rate/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/terminal growth rate/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/projection years/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/shares outstanding/i), { target: { value: '100000000' } });
    
    await waitFor(() => {
      const year1Input = screen.getByLabelText(/year 1 growth rate/i);
      const year2Input = screen.getByLabelText(/year 2 growth rate/i);
      fireEvent.change(year1Input, { target: { value: '15' } });
      fireEvent.change(year2Input, { target: { value: '10' } });
    });
    
    fireEvent.click(screen.getByRole('button', { name: /calculate dcf/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        baseFCF: 1000000000,
        discountRate: 0.10,
        terminalGrowthRate: 0.03,
        projectionYears: 2,
        fcfGrowthRates: [0.15, 0.10],
        sharesOutstanding: 100000000,
        scenario: 'base'
      });
    });
  });

  it('handles scenario selection', async () => {
    render(<DCFInputForm {...defaultProps} />);
    
    const scenarioSelect = screen.getByLabelText(/scenario/i);
    fireEvent.change(scenarioSelect, { target: { value: 'bull' } });
    
    // Submit form to verify scenario is included
    fireEvent.change(screen.getByLabelText(/base free cash flow/i), { target: { value: '1000000000' } });
    fireEvent.click(screen.getByRole('button', { name: /calculate dcf/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ scenario: 'bull' })
      );
    });
  });

  it('validates required fields', async () => {
    render(<DCFInputForm {...defaultProps} />);
    
    fireEvent.click(screen.getByRole('button', { name: /calculate dcf/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/base free cash flow is required/i)).toBeInTheDocument();
      expect(screen.getByText(/discount rate is required/i)).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates that terminal growth rate is less than discount rate', async () => {
    render(<DCFInputForm {...defaultProps} />);
    
    fireEvent.change(screen.getByLabelText(/discount rate/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/terminal growth rate/i), { target: { value: '10' } });
    
    fireEvent.click(screen.getByRole('button', { name: /calculate dcf/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/terminal growth rate must be less than discount rate/i)).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows loading state when calculating', () => {
    render(<DCFInputForm {...defaultProps} loading={true} />);
    
    const button = screen.getByRole('button', { name: /calculating/i });
    expect(button).toBeDisabled();
  });

  it('pre-fills form with initial values when provided', () => {
    const initialValues: DCFInputs = {
      baseFCF: 500000000,
      discountRate: 0.12,
      terminalGrowthRate: 0.025,
      projectionYears: 3,
      fcfGrowthRates: [0.20, 0.15, 0.10],
      sharesOutstanding: 50000000,
      scenario: 'bull'
    };
    
    render(<DCFInputForm {...defaultProps} initialValues={initialValues} />);
    
    expect(screen.getByDisplayValue('500000000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50000000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('bull')).toBeInTheDocument();
  });

  it('provides scenario presets that update growth rates', async () => {
    render(<DCFInputForm {...defaultProps} />);
    
    // Set projection years first
    fireEvent.change(screen.getByLabelText(/projection years/i), { target: { value: '3' } });
    
    await waitFor(() => {
      expect(screen.getByLabelText(/year 1 growth rate/i)).toBeInTheDocument();
    });
    
    // Change to bull scenario
    fireEvent.change(screen.getByLabelText(/scenario/i), { target: { value: 'bull' } });
    
    await waitFor(() => {
      // Bull scenario should have higher growth rates
      const year1Input = screen.getByLabelText(/year 1 growth rate/i) as HTMLInputElement;
      expect(parseFloat(year1Input.value)).toBeGreaterThan(0);
    });
  });
});