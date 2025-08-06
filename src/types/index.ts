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
}

export interface BalanceSheet {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  bookValuePerShare: number;
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