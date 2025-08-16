import type { CompanyFinancials } from '../types';

// Mock data for testing when API limit is exceeded
export const getMockCompanyData = (ticker: string): CompanyFinancials => {
  const mockData: Record<string, CompanyFinancials> = {
    'DEMO': {
      symbol: 'DEMO',
      name: 'Demo Company Inc.',
      currentPrice: 150.00,
      sharesOutstanding: 1000000000,
      incomeStatement: [
        {
          date: '2023-12-31',
          revenue: 100000000000,
          operatingIncome: 25000000000,
          netIncome: 20000000000,
          eps: 20.00,
          sharesOutstanding: 1000000000,
          grossProfit: 40000000000,
          grossMargin: 0.4,
          researchAndDevelopmentExpenses: 5000000000,
          sellingGeneralAndAdministrativeExpenses: 10000000000,
          operatingExpenses: 15000000000,
          ebitda: 30000000000,
          ebitdaratio: 0.3,
          interestExpense: 1000000000,
          incomeTaxExpense: 4000000000,
          effectiveTaxRate: 0.2
        },
        {
          date: '2022-12-31',
          revenue: 90000000000,
          operatingIncome: 22000000000,
          netIncome: 18000000000,
          eps: 18.00,
          sharesOutstanding: 1000000000,
          grossProfit: 36000000000,
          grossMargin: 0.4,
          researchAndDevelopmentExpenses: 4500000000,
          sellingGeneralAndAdministrativeExpenses: 9500000000,
          operatingExpenses: 14000000000,
          ebitda: 27000000000,
          ebitdaratio: 0.3,
          interestExpense: 900000000,
          incomeTaxExpense: 3600000000,
          effectiveTaxRate: 0.2
        },
        {
          date: '2021-12-31',
          revenue: 80000000000,
          operatingIncome: 19000000000,
          netIncome: 15000000000,
          eps: 15.00,
          sharesOutstanding: 1000000000,
          grossProfit: 32000000000,
          grossMargin: 0.4,
          researchAndDevelopmentExpenses: 4000000000,
          sellingGeneralAndAdministrativeExpenses: 9000000000,
          operatingExpenses: 13000000000,
          ebitda: 24000000000,
          ebitdaratio: 0.3,
          interestExpense: 800000000,
          incomeTaxExpense: 3200000000,
          effectiveTaxRate: 0.21
        }
      ],
      balanceSheet: [
        {
          date: '2023-12-31',
          totalAssets: 200000000000,
          totalLiabilities: 80000000000,
          totalEquity: 120000000000,
          bookValuePerShare: 120.00,
          currentAssets: 80000000000,
          cash: 30000000000,
          cashAndEquivalents: 35000000000,
          marketableSecurities: 10000000000,
          accountsReceivable: 15000000000,
          inventory: 20000000000,
          propertyPlantEquipment: 50000000000,
          intangibleAssets: 20000000000,
          goodwill: 15000000000,
          investments: 25000000000,
          currentLiabilities: 30000000000,
          accountsPayable: 10000000000,
          shortTermDebt: 5000000000,
          longTermDebt: 30000000000,
          tangibleBookValue: 85000000000,
          workingCapital: 50000000000,
          netTangibleAssets: 85000000000,
          sharesOutstanding: 1000000000
        },
        {
          date: '2022-12-31',
          totalAssets: 180000000000,
          totalLiabilities: 75000000000,
          totalEquity: 105000000000,
          bookValuePerShare: 105.00,
          currentAssets: 70000000000,
          cash: 25000000000,
          cashAndEquivalents: 30000000000,
          marketableSecurities: 8000000000,
          accountsReceivable: 12000000000,
          inventory: 18000000000,
          propertyPlantEquipment: 45000000000,
          intangibleAssets: 18000000000,
          goodwill: 14000000000,
          investments: 22000000000,
          currentLiabilities: 28000000000,
          accountsPayable: 9000000000,
          shortTermDebt: 4000000000,
          longTermDebt: 28000000000,
          tangibleBookValue: 73000000000,
          workingCapital: 42000000000,
          netTangibleAssets: 73000000000,
          sharesOutstanding: 1000000000
        }
      ],
      cashFlowStatement: [
        {
          date: '2023-12-31',
          operatingCashFlow: 28000000000,
          capitalExpenditure: 8000000000,
          freeCashFlow: 20000000000,
          dividendsPaid: 5000000000
        },
        {
          date: '2022-12-31',
          operatingCashFlow: 25000000000,
          capitalExpenditure: 7000000000,
          freeCashFlow: 18000000000,
          dividendsPaid: 4500000000
        },
        {
          date: '2021-12-31',
          operatingCashFlow: 22000000000,
          capitalExpenditure: 6000000000,
          freeCashFlow: 16000000000,
          dividendsPaid: 4000000000
        }
      ]
    }
  };

  // Return demo data for any ticker when in demo mode
  const data = mockData['DEMO'];
  return {
    ...data,
    symbol: ticker.toUpperCase(),
    name: `${ticker.toUpperCase()} Demo Company`
  };
};

export const isDemo = (ticker: string): boolean => {
  return ticker.toUpperCase() === 'DEMO' || ticker.toUpperCase().startsWith('TEST');
};