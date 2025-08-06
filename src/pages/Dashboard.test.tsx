import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { Dashboard } from './Dashboard';
import { mockCompanyFinancials } from '../test-utils';
import { fmpApi } from '../services/fmpApi';

// Mock the FMP API
vi.mock('../services/fmpApi');

describe('Dashboard', () => {
  const mockGetCompanyFinancials = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup FMP API mock
    vi.mocked(fmpApi.getCompanyFinancials).mockImplementation(mockGetCompanyFinancials);
  });

  it('renders the dashboard basic elements', () => {
    render(<Dashboard />);
    
    // Test basic elements that should always be present
    expect(screen.getByText('Professional Equity Valuation')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., AAPL, MSFT, GOOGL')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles form submission with ticker input', async () => {
    mockGetCompanyFinancials.mockResolvedValue(mockCompanyFinancials);

    render(<Dashboard />);
    
    const input = screen.getByPlaceholderText('e.g., AAPL, MSFT, GOOGL');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'AAPL' } });
    fireEvent.click(button);

    expect(mockGetCompanyFinancials).toHaveBeenCalledWith('AAPL');
  });

  it('displays error message when API call fails', async () => {
    const errorMessage = 'Company not found';
    mockGetCompanyFinancials.mockRejectedValue(new Error(errorMessage));

    render(<Dashboard />);
    
    const input = screen.getByPlaceholderText('e.g., AAPL, MSFT, GOOGL');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'INVALID' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});