// Financial Data Types
export interface CompanyFinancials {
  symbol: string;
  name: string;
  currentPrice?: number;
  sharesOutstanding?: number;
  incomeStatement: IncomeStatement[];
  balanceSheet: BalanceSheet[];
  cashFlowStatement: CashFlowStatement[];
}

export interface IncomeStatement {
  date: string;
  revenue: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  sharesOutstanding: number;
  
  // Enhanced fields for MOAT analysis
  grossProfit?: number;
  grossMargin?: number; // grossProfit / revenue
  sellingGeneralAndAdministrative?: number; // SG&A expenses
  researchAndDevelopment?: number; // R&D expenses
  operatingExpenses?: number; // Total operating expenses
  ebitda?: number; // Earnings before interest, taxes, depreciation, amortization
  ebit?: number; // Earnings before interest and taxes
  interestExpense?: number; // For WACC calculation
  incomeTaxExpense?: number; // For NOPAT calculation
  effectiveTaxRate?: number; // incomeTaxExpense / incomeBeforeTax
}

export interface BalanceSheet {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  bookValuePerShare: number;
  
  // Enhanced asset breakdown for NAV analysis (optional fields)
  currentAssets?: number;
  cash?: number;
  cashAndEquivalents?: number;
  marketableSecurities?: number;
  accountsReceivable?: number;
  inventory?: number;
  prepaidExpenses?: number;
  otherCurrentAssets?: number;
  
  // Non-current assets
  propertyPlantEquipment?: number;
  intangibleAssets?: number;
  goodwill?: number;
  investments?: number;
  otherNonCurrentAssets?: number;
  
  // Enhanced liability breakdown for NAV analysis (optional fields)
  currentLiabilities?: number;
  accountsPayable?: number;
  accruedExpenses?: number;
  shortTermDebt?: number;
  otherCurrentLiabilities?: number;
  deferredRevenue?: number; // Important for switching costs analysis
  
  // Non-current liabilities
  longTermDebt?: number;
  pensionObligations?: number;
  deferredTaxLiabilities?: number;
  otherNonCurrentLiabilities?: number;
  deferredRevenueNonCurrent?: number;
  
  // Additional fields for comprehensive analysis
  tangibleBookValue?: number;
  workingCapital?: number;
  netTangibleAssets?: number;
  sharesOutstanding?: number;
  
  // ROIC calculation fields
  investedCapital?: number; // Total Assets - Cash - Current Liabilities + Short-term Debt
  returnOnAssets?: number; // Net Income / Total Assets
  returnOnEquity?: number; // Net Income / Total Equity
}

export interface CashFlowStatement {
  date: string;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
  dividendsPaid: number;
}

// Valuation Types
export interface ValuationInputs {
  discountRate: number;
  terminalGrowthRate: number;
  projectionYears: number;
  scenario: 'bull' | 'base' | 'bear';
}

export interface DCFInputs extends ValuationInputs {
  baseFCF: number;
  fcfGrowthRates: number[];
  sharesOutstanding: number;
}

export interface DDMInputs extends ValuationInputs {
  dividendGrowthRates: number[];
  payoutRatio: number;
}

export interface NAVInputs {
  assetAdjustments: Record<string, number>;
  liabilityAdjustments: Record<string, number>;
}

export interface EPVInputs {
  normalizedEarnings: number;
  maintenanceCapex: number;
}

export interface ValuationResult {
  method: 'DCF' | 'DDM' | 'NAV' | 'EPV';
  intrinsicValue: number;
  currentPrice?: number;
  upside?: number;
  confidence: 'high' | 'medium' | 'low';
}

// DCF-specific types
export interface DCFProjections {
  year: number;
  freeCashFlow: number;
  presentValue: number;
  growthRate: number;
}

export interface DCFResult extends ValuationResult {
  method: 'DCF';
  scenario: 'bull' | 'base' | 'bear';
  projections: DCFProjections[];
  terminalValue: number;
  totalPresentValue: number;
  intrinsicValuePerShare: number;
  sharesOutstanding: number;
}

// User and Saved Analysis Types
export interface User {
  uid: string;
  email: string;
  displayName?: string;
}

export interface SavedAnalysis {
  id: string;
  userId: string;
  symbol: string;
  companyName: string;
  createdAt: Date;
  updatedAt: Date;
  valuationResults: ValuationResult[];
  inputs: {
    dcf?: DCFInputs;
    ddm?: DDMInputs;
    nav?: NAVInputs;
    epv?: EPVInputs;
  };
  notes?: string;
}

// Chart Data Types
export interface ChartDataPoint {
  date: string;
  value: number;
  projected?: boolean;
}

export interface ScenarioProjections {
  bull: ChartDataPoint[];
  base: ChartDataPoint[];
  bear: ChartDataPoint[];
}