/**
 * ROIC (Return on Invested Capital) Calculator
 * 
 * ROIC measures how efficiently a company generates returns from its invested capital.
 * A key metric for assessing competitive advantages (moats).
 * 
 * ROIC = NOPAT / Invested Capital
 * Where:
 * - NOPAT = Net Operating Profit After Tax
 * - Invested Capital = Total Assets - Cash - Current Liabilities + Short-term Debt
 */

import type { IncomeStatement, BalanceSheet, CompanyFinancials } from '../types';

export interface ROICResult {
  roic: number;
  nopat: number;
  investedCapital: number;
  wacc?: number;
  spread?: number; // ROIC - WACC
  year: string;
}

export interface WACCInputs {
  riskFreeRate: number; // e.g., 10-year Treasury yield
  marketRiskPremium: number; // Typically 5-7%
  beta: number; // Company's beta
  costOfDebt: number; // Interest rate on debt
  taxRate: number; // Effective tax rate
  debtToEquity: number; // Debt/Equity ratio
}

export interface ROICAnalysis {
  historicalROIC: ROICResult[];
  averageROIC: number;
  medianROIC: number;
  trend: 'improving' | 'stable' | 'declining';
  consistency: number; // 0-1, how consistent ROIC is over time
  currentWACC?: number;
  averageSpread?: number; // Average ROIC - WACC
  moatClassification: 'wide' | 'narrow' | 'none';
}

/**
 * Calculate NOPAT (Net Operating Profit After Tax)
 * NOPAT = Operating Income × (1 - Tax Rate)
 */
export function calculateNOPAT(
  operatingIncome: number,
  taxRate: number
): number {
  return operatingIncome * (1 - taxRate);
}

/**
 * Calculate Invested Capital
 * Invested Capital = Total Assets - Cash - Current Liabilities + Short-term Debt
 * 
 * Alternative formula: Total Equity + Total Debt - Cash
 */
export function calculateInvestedCapital(
  totalAssets: number,
  cash: number,
  currentLiabilities: number,
  shortTermDebt: number
): number {
  return totalAssets - cash - currentLiabilities + shortTermDebt;
}

/**
 * Calculate ROIC for a single period
 */
export function calculateROIC(
  incomeStatement: IncomeStatement,
  balanceSheet: BalanceSheet
): ROICResult | null {
  // Need operating income and tax rate
  if (!incomeStatement.operatingIncome) {
    return null;
  }
  
  // Calculate effective tax rate
  let taxRate = 0.21; // Default corporate tax rate
  if (incomeStatement.effectiveTaxRate !== undefined) {
    taxRate = incomeStatement.effectiveTaxRate;
  } else if (incomeStatement.incomeTaxExpense && incomeStatement.operatingIncome) {
    // Estimate tax rate from income tax expense
    taxRate = Math.min(incomeStatement.incomeTaxExpense / incomeStatement.operatingIncome, 0.4);
  }
  
  // Calculate NOPAT
  const nopat = calculateNOPAT(incomeStatement.operatingIncome, taxRate);
  
  // Calculate Invested Capital
  const cash = balanceSheet.cash || balanceSheet.cashAndEquivalents || 0;
  const currentLiabilities = balanceSheet.currentLiabilities || 0;
  const shortTermDebt = balanceSheet.shortTermDebt || 0;
  
  // Use pre-calculated invested capital if available, otherwise calculate
  const investedCapital = balanceSheet.investedCapital || 
    calculateInvestedCapital(
      balanceSheet.totalAssets,
      cash,
      currentLiabilities,
      shortTermDebt
    );
  
  // Avoid division by zero or negative invested capital
  if (investedCapital <= 0) {
    return null;
  }
  
  const roic = nopat / investedCapital;
  
  return {
    roic,
    nopat,
    investedCapital,
    year: incomeStatement.date
  };
}

/**
 * Calculate WACC (Weighted Average Cost of Capital)
 * WACC = (E/V × Re) + (D/V × Rd × (1 - Tc))
 * Where:
 * - E = Market value of equity
 * - D = Market value of debt
 * - V = E + D
 * - Re = Cost of equity (CAPM: Rf + β × Market Risk Premium)
 * - Rd = Cost of debt
 * - Tc = Tax rate
 */
export function calculateWACC(inputs: WACCInputs): number {
  const { riskFreeRate, marketRiskPremium, beta, costOfDebt, taxRate, debtToEquity } = inputs;
  
  // Calculate cost of equity using CAPM
  const costOfEquity = riskFreeRate + (beta * marketRiskPremium);
  
  // Calculate weights
  const debtWeight = debtToEquity / (1 + debtToEquity);
  const equityWeight = 1 / (1 + debtToEquity);
  
  // Calculate WACC
  const wacc = (equityWeight * costOfEquity) + (debtWeight * costOfDebt * (1 - taxRate));
  
  return wacc;
}

/**
 * Analyze historical ROIC to determine moat strength
 */
export function analyzeROIC(
  financials: CompanyFinancials,
  waccInputs?: WACCInputs
): ROICAnalysis {
  const { incomeStatement, balanceSheet } = financials;
  
  // Calculate ROIC for each available period
  const historicalROIC: ROICResult[] = [];
  
  for (let i = 0; i < Math.min(incomeStatement.length, balanceSheet.length); i++) {
    // Match income statement with balance sheet by date
    const income = incomeStatement[i];
    const balance = balanceSheet.find(bs => bs.date === income.date);
    
    if (balance) {
      const roicResult = calculateROIC(income, balance);
      if (roicResult) {
        // Add WACC if inputs provided
        if (waccInputs) {
          roicResult.wacc = calculateWACC(waccInputs);
          roicResult.spread = roicResult.roic - roicResult.wacc;
        }
        historicalROIC.push(roicResult);
      }
    }
  }
  
  if (historicalROIC.length === 0) {
    return {
      historicalROIC: [],
      averageROIC: 0,
      medianROIC: 0,
      trend: 'stable',
      consistency: 0,
      moatClassification: 'none'
    };
  }
  
  // Calculate statistics
  const roicValues = historicalROIC.map(r => r.roic);
  const averageROIC = roicValues.reduce((sum, r) => sum + r, 0) / roicValues.length;
  
  // Calculate median
  const sortedROIC = [...roicValues].sort((a, b) => a - b);
  const medianROIC = sortedROIC.length % 2 === 0
    ? (sortedROIC[sortedROIC.length / 2 - 1] + sortedROIC[sortedROIC.length / 2]) / 2
    : sortedROIC[Math.floor(sortedROIC.length / 2)];
  
  // Calculate trend (compare recent vs older periods)
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (historicalROIC.length >= 3) {
    const recentAvg = roicValues.slice(0, Math.ceil(roicValues.length / 2))
      .reduce((sum, r) => sum + r, 0) / Math.ceil(roicValues.length / 2);
    const olderAvg = roicValues.slice(Math.ceil(roicValues.length / 2))
      .reduce((sum, r) => sum + r, 0) / (roicValues.length - Math.ceil(roicValues.length / 2));
    
    if (recentAvg > olderAvg * 1.1) trend = 'improving';
    else if (recentAvg < olderAvg * 0.9) trend = 'declining';
  }
  
  // Calculate consistency (1 - coefficient of variation)
  const stdDev = Math.sqrt(
    roicValues.reduce((sum, r) => sum + Math.pow(r - averageROIC, 2), 0) / roicValues.length
  );
  const consistency = Math.max(0, 1 - (stdDev / Math.abs(averageROIC)));
  
  // Calculate average spread if WACC provided
  let currentWACC: number | undefined;
  let averageSpread: number | undefined;
  if (waccInputs) {
    currentWACC = calculateWACC(waccInputs);
    const spreads = historicalROIC
      .filter(r => r.spread !== undefined)
      .map(r => r.spread!);
    if (spreads.length > 0) {
      averageSpread = spreads.reduce((sum, s) => sum + s, 0) / spreads.length;
    }
  }
  
  // Classify moat based on ROIC and spread
  let moatClassification: 'wide' | 'narrow' | 'none' = 'none';
  
  if (currentWACC !== undefined && averageSpread !== undefined) {
    // Use ROIC vs WACC spread for classification
    if (averageSpread > 0.08 && consistency > 0.7) {
      moatClassification = 'wide';
    } else if (averageSpread > 0.02 && consistency > 0.5) {
      moatClassification = 'narrow';
    }
  } else {
    // Fallback to absolute ROIC levels
    if (averageROIC > 0.20 && consistency > 0.7) {
      moatClassification = 'wide';
    } else if (averageROIC > 0.12 && consistency > 0.5) {
      moatClassification = 'narrow';
    }
  }
  
  return {
    historicalROIC,
    averageROIC,
    medianROIC,
    trend,
    consistency,
    currentWACC,
    averageSpread,
    moatClassification
  };
}

/**
 * Get recommended WACC inputs based on industry and current market conditions
 * This is a simplified version - in production, would fetch real-time data
 */
export function getDefaultWACCInputs(
  _industry?: string,
  currentDebtToEquity?: number
): WACCInputs {
  // Default values as of 2024
  return {
    riskFreeRate: 0.045, // ~4.5% for 10-year Treasury
    marketRiskPremium: 0.06, // 6% historical average
    beta: 1.0, // Market average
    costOfDebt: 0.05, // 5% typical corporate borrowing rate
    taxRate: 0.21, // US corporate tax rate
    debtToEquity: currentDebtToEquity || 0.5 // 0.5 is moderate leverage
  };
}