import { render, screen, fireEvent } from '@testing-library/react';
import { DCFInputForm } from './DCFInputForm';

describe('DCFInputForm - Simple Tests', () => {
  const mockOnSubmit = vi.fn();
  
  const defaultProps = {
    onSubmit: mockOnSubmit
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form title', () => {
    render(<DCFInputForm {...defaultProps} />);
    
    expect(screen.getByText('DCF Valuation Inputs')).toBeInTheDocument();
    expect(screen.getByText('Enter the parameters for Discounted Cash Flow analysis')).toBeInTheDocument();
  });

  it('renders base form inputs', () => {
    render(<DCFInputForm {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('1000000000')).toBeInTheDocument(); // Base FCF
    expect(screen.getByPlaceholderText('100000000')).toBeInTheDocument(); // Shares Outstanding
    expect(screen.getAllByPlaceholderText('10')).toHaveLength(6); // Discount Rate + 5 growth rates
    expect(screen.getByPlaceholderText('3')).toBeInTheDocument(); // Terminal Growth Rate
  });

  it('renders the calculate button', () => {
    render(<DCFInputForm {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: 'Calculate DCF' })).toBeInTheDocument();
  });

  it('renders scenario select', () => {
    render(<DCFInputForm {...defaultProps} />);
    
    expect(screen.getByDisplayValue('Base Case (Realistic)')).toBeInTheDocument();
  });

  it('renders projection years select', () => {
    render(<DCFInputForm {...defaultProps} />);
    
    expect(screen.getByDisplayValue('5 years')).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    render(<DCFInputForm {...defaultProps} loading={true} />);
    
    const button = screen.getByRole('button', { name: 'Calculating...' });
    expect(button).toBeDisabled();
  });

  it('handles form input changes', () => {
    render(<DCFInputForm {...defaultProps} />);
    
    const baseFCFInput = screen.getByPlaceholderText('1000000000');
    fireEvent.change(baseFCFInput, { target: { value: '500000000' } });
    
    expect(baseFCFInput).toHaveValue(500000000);
  });
});