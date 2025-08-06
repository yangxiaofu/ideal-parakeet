import { render, screen } from '@testing-library/react';
import { DCFResults } from './DCFResults';
import type { DCFResult } from '../../types';

describe('DCFResults', () => {
  const mockDCFResult: DCFResult = {
    method: 'DCF',
    scenario: 'base',
    intrinsicValue: 150.25,
    intrinsicValuePerShare: 150.25,
    confidence: 'medium',
    projections: [
      {
        year: 1,
        freeCashFlow: 1100000000,
        presentValue: 1000000000,
        growthRate: 0.10
      },
      {
        year: 2,
        freeCashFlow: 1188000000,
        presentValue: 982644628,
        growthRate: 0.08
      },
      {
        year: 3,
        freeCashFlow: 1259280000,
        presentValue: 946207500,
        growthRate: 0.06
      }
    ],
    terminalValue: 19000000000,
    totalPresentValue: 15025000000,
    sharesOutstanding: 100000000
  };

  it('displays the intrinsic value prominently', () => {
    render(<DCFResults result={mockDCFResult} />);
    
    expect(screen.getByText('Intrinsic Value')).toBeInTheDocument();
    expect(screen.getByText('$150.25')).toBeInTheDocument();
    expect(screen.getByText('per share')).toBeInTheDocument();
  });

  it('shows the scenario used', () => {
    render(<DCFResults result={mockDCFResult} />);
    
    expect(screen.getByText(/base case/i)).toBeInTheDocument();
  });

  it('displays confidence level', () => {
    render(<DCFResults result={mockDCFResult} />);
    
    expect(screen.getByText(/medium confidence/i)).toBeInTheDocument();
  });

  it('shows current price comparison when provided', () => {
    const resultWithPrice = {
      ...mockDCFResult,
      currentPrice: 120.00,
      upside: 25.21
    };

    render(<DCFResults result={resultWithPrice} />);
    
    expect(screen.getByText('Current Price')).toBeInTheDocument();
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    expect(screen.getByText('Upside')).toBeInTheDocument();
    expect(screen.getByText('+25.21%')).toBeInTheDocument();
  });

  it('renders projections table', () => {
    render(<DCFResults result={mockDCFResult} />);
    
    expect(screen.getByText('Cash Flow Projections')).toBeInTheDocument();
    
    // Check table headers
    expect(screen.getByText('Year')).toBeInTheDocument();
    expect(screen.getByText('Free Cash Flow')).toBeInTheDocument();
    expect(screen.getByText('Growth Rate')).toBeInTheDocument();
    expect(screen.getByText('Present Value')).toBeInTheDocument();

    // Check first year data
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('$1.10B')).toBeInTheDocument();
    expect(screen.getByText('10.0%')).toBeInTheDocument();
    expect(screen.getByText('$1.00B')).toBeInTheDocument();
  });

  it('displays terminal value information', () => {
    render(<DCFResults result={mockDCFResult} />);
    
    expect(screen.getByText('Terminal Value')).toBeInTheDocument();
    expect(screen.getByText('$19.00B')).toBeInTheDocument();
  });

  it('shows total present value', () => {
    render(<DCFResults result={mockDCFResult} />);
    
    expect(screen.getByText('Total Present Value')).toBeInTheDocument();
    expect(screen.getByText('$15.03B')).toBeInTheDocument();
  });

  it('displays shares outstanding', () => {
    render(<DCFResults result={mockDCFResult} />);
    
    expect(screen.getByText('Shares Outstanding')).toBeInTheDocument();
    expect(screen.getByText('100.0M')).toBeInTheDocument();
  });

  it('handles bull scenario styling', () => {
    const bullResult = { ...mockDCFResult, scenario: 'bull' as const };
    render(<DCFResults result={bullResult} />);
    
    expect(screen.getByText(/bull case/i)).toBeInTheDocument();
  });

  it('handles bear scenario styling', () => {
    const bearResult = { ...mockDCFResult, scenario: 'bear' as const };
    render(<DCFResults result={bearResult} />);
    
    expect(screen.getByText(/bear case/i)).toBeInTheDocument();
  });

  it('shows positive upside in green', () => {
    const resultWithPositiveUpside = {
      ...mockDCFResult,
      currentPrice: 100.00,
      upside: 50.25
    };

    render(<DCFResults result={resultWithPositiveUpside} />);
    
    const upsideElement = screen.getByText('+50.25%');
    expect(upsideElement).toHaveClass('text-green-600');
  });

  it('shows negative upside in red', () => {
    const resultWithNegativeUpside = {
      ...mockDCFResult,
      currentPrice: 180.00,
      upside: -16.53
    };

    render(<DCFResults result={resultWithNegativeUpside} />);
    
    const upsideElement = screen.getByText('-16.53%');
    expect(upsideElement).toHaveClass('text-red-600');
  });

  it('displays high confidence with appropriate styling', () => {
    const highConfidenceResult = { ...mockDCFResult, confidence: 'high' as const };
    render(<DCFResults result={highConfidenceResult} />);
    
    const confidenceElement = screen.getByText(/high confidence/i);
    expect(confidenceElement).toHaveClass('text-green-600');
  });

  it('displays low confidence with appropriate styling', () => {
    const lowConfidenceResult = { ...mockDCFResult, confidence: 'low' as const };
    render(<DCFResults result={lowConfidenceResult} />);
    
    const confidenceElement = screen.getByText(/low confidence/i);
    expect(confidenceElement).toHaveClass('text-red-600');
  });
});