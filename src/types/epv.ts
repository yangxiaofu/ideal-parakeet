/**
 * Types and interfaces for Earnings Power Value (EPV) calculations
 * 
 * EPV represents the value of a company assuming no growth, calculated as:
 * EPV = Normalized Earnings / Cost of Capital
 * 
 * This conservative valuation method focuses on a company's current ability
 * to generate sustainable profits without speculating on future growth.
 */

/**
 * Earnings normalization methods for EPV calculation
 */
export type EarningsNormalizationMethod = 
  | 'average' // Average earnings over period
  | 'median'  // Median earnings over period
  | 'latest'  // Most recent year earnings
  | 'manual'; // User-specified normalized earnings

/**
 * Cost of capital calculation methods
 */
export type CostOfCapitalMethod =
  | 'wacc'     // Weighted Average Cost of Capital
  | 'capm'     // Capital Asset Pricing Model
  | 'manual';  // User-specified discount rate

/**
 * Earnings quality assessment levels
 */
export type EarningsQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';

/**
 * Individual earnings adjustment entry
 */
export interface EarningsAdjustment {
  description: string;
  amount: number;              // Adjustment amount (positive or negative)
  reason: string;              // Explanation for the adjustment
  category: 'operational' | 'non_recurring' | 'accounting' | 'other';
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Maintenance capital expenditure analysis
 */
export interface MaintenanceCapexAnalysis {
  historicalCapex: number[];        // Historical capex amounts
  historicalDepreciation: number[]; // Historical depreciation amounts
  averageCapex: number;            // Average capex over period
  averageDepreciation: number;     // Average depreciation over period
  maintenanceCapex: number;        // Estimated maintenance capex
  growthCapex: number;            // Estimated growth capex
  capexAsPercentOfSales: number;  // Capex as % of revenue
  method: 'depreciation_proxy' | 'historical_average' | 'manual';
}

/**
 * Cost of capital components
 */
export interface CostOfCapitalComponents {
  riskFreeRate: number;           // 10-year Treasury rate
  marketRiskPremium: number;      // Equity risk premium
  beta: number;                   // Company's beta coefficient
  costOfEquity: number;           // Cost of equity (CAPM)
  costOfDebt: number;             // After-tax cost of debt
  weightOfEquity: number;         // Market value weight of equity
  weightOfDebt: number;           // Market value weight of debt
  taxRate: number;                // Corporate tax rate
  wacc: number;                   // Weighted average cost of capital
}

/**
 * Input parameters for EPV calculations
 */
export interface EPVInputs {
  // Company identification
  symbol: string;
  
  // Historical earnings data (in chronological order, latest first)
  historicalEarnings: Array<{
    year: number;
    netIncome: number;
    operatingIncome: number;
    revenue: number;
    date: string;
  }>;
  
  // Earnings normalization
  normalizationMethod: EarningsNormalizationMethod;
  normalizationPeriod: number;    // Number of years to use for normalization
  manualNormalizedEarnings?: number; // Used if normalizationMethod is 'manual'
  earningsAdjustments: EarningsAdjustment[];
  
  // Maintenance capital expenditure
  maintenanceCapex: MaintenanceCapexAnalysis;
  
  // Cost of capital
  costOfCapitalMethod: CostOfCapitalMethod;
  manualCostOfCapital?: number;   // Used if costOfCapitalMethod is 'manual'
  costOfCapitalComponents: CostOfCapitalComponents;
  
  // Shares outstanding for per-share calculations
  sharesOutstanding: number;
  
  // Analysis parameters
  includeMaintenanceCapex: boolean; // Whether to subtract maintenance capex
  taxAdjustments: boolean;         // Whether to apply tax adjustments
  
  // Quality assessments
  earningsQuality: EarningsQuality;
  businessStability: 'very_stable' | 'stable' | 'moderate' | 'volatile' | 'very_volatile';
  competitivePosition: 'dominant' | 'strong' | 'average' | 'weak' | 'poor';
}

/**
 * Earnings normalization result
 */
export interface EarningsNormalizationResult {
  rawEarnings: number[];           // Original earnings data
  adjustedEarnings: number[];      // After adjustments
  normalizedEarnings: number;      // Final normalized earnings
  adjustmentsSummary: {
    totalAdjustments: number;
    adjustmentsByCategory: Record<string, number>;
    netImpact: number;
  };
  qualityScore: number;            // 0-100 earnings quality score
  volatility: number;              // Coefficient of variation
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * EPV calculation warnings and considerations
 */
export interface EPVWarning {
  type: 'error' | 'warning' | 'info';
  category: 'earnings_quality' | 'business_model' | 'cyclical' | 'growth' | 'data_quality';
  message: string;
  severity: 'high' | 'medium' | 'low';
  suggestion?: string;
}

/**
 * Competitive moat analysis for EPV context
 */
export interface MoatAnalysis {
  hasEconomicMoat: boolean;
  moatStrength: 'none' | 'narrow' | 'wide';
  moatSources: Array<'brand' | 'patents' | 'network_effects' | 'switching_costs' | 'scale' | 'location'>;
  moatSustainability: 'declining' | 'stable' | 'strengthening';
  competitivePressure: 'high' | 'medium' | 'low';
}

/**
 * Main EPV calculation result
 */
export interface EPVResult {
  // Basic EPV metrics
  normalizedEarnings: number;      // Annual normalized earnings
  maintenanceCapex: number;        // Annual maintenance capex
  adjustedEarnings: number;        // Earnings after maintenance capex
  costOfCapital: number;           // Cost of capital used
  epvTotalValue: number;           // Total EPV of company
  epvPerShare: number;             // EPV per share
  
  // Supporting calculations
  earningsNormalization: EarningsNormalizationResult;
  costOfCapitalBreakdown: CostOfCapitalComponents;
  maintenanceCapexAnalysis: MaintenanceCapexAnalysis;
  
  // Quality and risk assessment
  moatAnalysis: MoatAnalysis;
  confidenceLevel: 'high' | 'medium' | 'low';
  warnings: EPVWarning[];
  
  // Comparative metrics
  currentPrice?: number;
  upside?: number;                 // Upside vs current price (%)
  priceToEPV?: number;            // Current price / EPV per share
  earningsYield: number;          // Normalized earnings / market cap
  
  // Metadata
  calculationDate: Date;
  sharesOutstanding: number;
}

/**
 * EPV sensitivity analysis
 */
export interface EPVSensitivity {
  baseEPV: number;
  
  // Sensitivity to cost of capital changes
  costOfCapitalSensitivity: Array<{
    costOfCapital: number;
    epvPerShare: number;
    percentChange: number;
  }>;
  
  // Sensitivity to normalized earnings changes
  earningsSensitivity: Array<{
    earningsChange: number;        // % change in normalized earnings
    epvPerShare: number;
    percentChange: number;
  }>;
  
  // Sensitivity to maintenance capex assumptions
  maintenanceCapexSensitivity: Array<{
    maintenanceCapexPercent: number; // As % of normalized earnings
    epvPerShare: number;
    percentChange: number;
  }>;
}

/**
 * Historical EPV analysis
 */
export interface EPVHistory {
  year: number;
  normalizedEarnings: number;
  costOfCapital: number;
  epvPerShare: number;
  marketPrice?: number;
  priceToEPV?: number;
  earningsYield?: number;
}

/**
 * Validation result for EPV inputs
 */
export interface EPVValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  dataQualityScore: number;        // 0-100 overall data quality
}

/**
 * Peer comparison for EPV analysis
 */
export interface EPVPeerComparison {
  symbol: string;
  name: string;
  epvPerShare: number;
  currentPrice: number;
  priceToEPV: number;
  earningsYield: number;
  moatStrength: 'none' | 'narrow' | 'wide';
  industry: string;
}

/**
 * Default cost of capital parameters by industry/risk profile
 */
export const DEFAULT_COST_OF_CAPITAL_PARAMS = {
  riskFreeRate: 0.045,          // Current 10-year Treasury (~4.5%)
  marketRiskPremium: 0.065,     // Historical equity risk premium (~6.5%)
  
  // Beta ranges by business type
  betaRanges: {
    utilities: { min: 0.3, max: 0.7, default: 0.5 },
    consumer_staples: { min: 0.4, max: 0.8, default: 0.6 },
    industrials: { min: 0.8, max: 1.2, default: 1.0 },
    financials: { min: 0.9, max: 1.4, default: 1.1 },
    technology: { min: 1.0, max: 1.8, default: 1.3 },
    biotechnology: { min: 1.2, max: 2.5, default: 1.8 }
  },
  
  // Tax rates by jurisdiction
  corporateTaxRates: {
    US: 0.21,
    canada: 0.26,
    uk: 0.25,
    germany: 0.30,
    default: 0.25
  }
} as const;

/**
 * EPV quality scoring weights
 */
export const EPV_QUALITY_WEIGHTS = {
  earningsStability: 0.30,        // Consistency of historical earnings
  businessStability: 0.25,       // Predictability of business model
  competitivePosition: 0.20,     // Strength of competitive moat
  dataQuality: 0.15,            // Quality and availability of financial data
  cyclicalAdjustments: 0.10      // Appropriateness of cyclical adjustments
} as const;

/**
 * Maintenance capex estimation methods and typical ratios
 */
export const MAINTENANCE_CAPEX_BENCHMARKS = {
  // Typical maintenance capex as % of revenue by industry
  industryBenchmarks: {
    utilities: 0.06,              // 6% of revenue
    railroads: 0.12,             // 12% of revenue
    airlines: 0.08,              // 8% of revenue
    manufacturing: 0.04,         // 4% of revenue
    retail: 0.02,               // 2% of revenue
    software: 0.01,             // 1% of revenue
    default: 0.03               // 3% of revenue
  },
  
  // Capex to depreciation ratios for maintenance estimation
  capexToDepreciationRatios: {
    mature_stable: 1.0,          // Capex = Depreciation
    growing_moderately: 1.2,     // Capex = 1.2x Depreciation
    high_growth: 1.5,           // Capex = 1.5x Depreciation
    declining: 0.8              // Capex = 0.8x Depreciation
  }
} as const;