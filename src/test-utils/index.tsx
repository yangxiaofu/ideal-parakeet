import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';

// Mock user for testing
export const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
};

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  authenticated?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    initialEntries = ['/'],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    authenticated = true,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Test utilities for mocking API responses
export const mockCompanyFinancials = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  incomeStatement: [
    {
      date: '2023-09-30',
      revenue: 383285000000,
      operatingIncome: 114301000000,
      netIncome: 96995000000,
      eps: 6.16,
      sharesOutstanding: 15744231000,
    },
  ],
  balanceSheet: [
    {
      date: '2023-09-30',
      totalAssets: 352755000000,
      totalLiabilities: 290437000000,
      totalEquity: 62318000000,
      bookValuePerShare: 3.95,
    },
  ],
  cashFlowStatement: [
    {
      date: '2023-09-30',
      operatingCashFlow: 110543000000,
      capitalExpenditure: 10959000000,
      freeCashFlow: 99584000000,
      dividendsPaid: 15025000000,
    },
  ],
};

// Mock FMP API responses
export const mockApiResponses = {
  companyProfile: {
    symbol: 'AAPL',
    companyName: 'Apple Inc.',
    price: 202.38,
  },
  searchResults: [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
  ],
};

// Re-export everything from React Testing Library
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react';

// Override render method for convenience
export { renderWithProviders as render };