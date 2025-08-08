/**
 * Types and interfaces for Net Asset Value (NAV) calculations
 */

/**
 * Asset categories for NAV adjustments
 */
export type AssetCategory = 
  | 'cash_and_equivalents'
  | 'marketable_securities'
  | 'accounts_receivable'
  | 'inventory'
  | 'prepaid_expenses'
  | 'property_plant_equipment'
  | 'intangible_assets'
  | 'goodwill'
  | 'investments'
  | 'other_assets';

/**
 * Liability categories for NAV adjustments
 */
export type LiabilityCategory =
  | 'accounts_payable'
  | 'accrued_expenses'
  | 'short_term_debt'
  | 'long_term_debt'
  | 'pension_obligations'
  | 'deferred_tax_liabilities'
  | 'contingent_liabilities'
  | 'other_liabilities';

/**
 * Asset quality scoring levels
 */
export type AssetQualityScore = 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';

/**
 * Liquidation scenario types for discount calculations
 */
export type LiquidationScenario = 'orderly' | 'quick' | 'forced';

/**
 * Individual asset adjustment entry
 */
export interface AssetAdjustment {
  category: AssetCategory;
  description: string;
  bookValue: number;          // Original book value
  adjustedValue: number;      // Fair value or liquidation value
  adjustmentReason: string;   // Reason for adjustment
  confidenceLevel: 'high' | 'medium' | 'low';
}

/**
 * Individual liability adjustment entry
 */
export interface LiabilityAdjustment {
  category: LiabilityCategory;
  description: string;
  bookValue: number;          // Original book value
  adjustedValue: number;      // Adjusted liability value
  adjustmentReason: string;   // Reason for adjustment
  confidenceLevel: 'high' | 'medium' | 'low';
}

/**
 * Input parameters for NAV calculations
 */
export interface NAVInputs {
  // Asset adjustments mapped by category
  assetAdjustments: Record<AssetCategory, AssetAdjustment[]>;
  
  // Liability adjustments mapped by category
  liabilityAdjustments: Record<LiabilityCategory, LiabilityAdjustment[]>;
  
  // Liquidation scenario parameters
  liquidationScenario?: LiquidationScenario;
  customLiquidationDiscount?: number;  // Custom discount percentage (0-1)
  
  // Analysis parameters
  includeIntangibles: boolean;         // Whether to include intangible assets
  includeGoodwill: boolean;           // Whether to include goodwill
  useMarketValues: boolean;           // Use market values where available
  
  // Shares outstanding for per-share calculations
  sharesOutstanding: number;
}

/**
 * Detailed breakdown of assets by category
 */
export interface AssetBreakdown {
  category: AssetCategory;
  description: string;
  bookValue: number;
  adjustedValue: number;
  adjustmentAmount: number;
  adjustmentPercentage: number;
  qualityScore: number;           // Asset quality score (0-100)
  liquidationValue: number;       // Estimated liquidation value
  liquidationDiscount: number;    // Discount applied for liquidation
}

/**
 * Detailed breakdown of liabilities by category
 */
export interface LiabilityBreakdown {
  category: LiabilityCategory;
  description: string;
  bookValue: number;
  adjustedValue: number;
  adjustmentAmount: number;
  adjustmentPercentage: number;
}

/**
 * Asset quality analysis result
 */
export interface AssetQualityAnalysis {
  overallScore: number;               // 0-100 overall quality score
  scoreCategory: AssetQualityScore;   // Categorical assessment
  tangibleAssetRatio: number;         // Tangible assets / total assets
  liquidAssetRatio: number;           // Liquid assets / total assets
  intangibleAssetRatio: number;       // Intangible assets / total assets
  
  // Detailed scoring by category
  categoryScores: Record<AssetCategory, {
    score: number;
    weight: number;
    contribution: number;
  }>;
  
  // Quality indicators
  hasExcessCash: boolean;
  hasMarketableSecurities: boolean;
  heavyIntangibles: boolean;
  significantGoodwill: boolean;
}

/**
 * NAV calculation warnings
 */
export interface NAVWarning {
  type: 'error' | 'warning' | 'info';
  category: 'data_quality' | 'calculation' | 'assumption' | 'market_condition';
  message: string;
  severity: 'high' | 'medium' | 'low';
  suggestion?: string;
}

/**
 * Liquidation value analysis by scenario
 */
export interface LiquidationAnalysis {
  scenario: LiquidationScenario;
  totalLiquidationValue: number;
  liquidationValuePerShare: number;
  averageDiscount: number;
  timeFrame: string;              // Estimated time to liquidate
  
  // Breakdown by asset category
  assetLiquidationValues: Record<AssetCategory, {
    bookValue: number;
    liquidationValue: number;
    discount: number;
    marketability: 'high' | 'medium' | 'low';
  }>;
}

/**
 * Main NAV calculation result
 */
export interface NAVResult {
  // Basic NAV metrics
  bookValueNAV: number;               // Pure book value NAV
  adjustedNAV: number;                // NAV after adjustments
  navPerShare: number;                // Adjusted NAV per share
  bookValuePerShare: number;          // Book value per share
  
  // Asset and liability breakdowns
  totalAdjustedAssets: number;
  totalAdjustedLiabilities: number;
  netAdjustments: number;             // Total net adjustments made
  
  // Detailed breakdowns
  assetBreakdown: AssetBreakdown[];
  liabilityBreakdown: LiabilityBreakdown[];
  
  // Quality analysis
  assetQuality: AssetQualityAnalysis;
  
  // Liquidation scenarios
  liquidationAnalysis: LiquidationAnalysis[];
  
  // Confidence and warnings
  confidenceLevel: 'high' | 'medium' | 'low';
  warnings: NAVWarning[];
  
  // Metadata
  calculationDate: Date;
  sharesOutstanding: number;
}

/**
 * Sensitivity analysis for NAV calculations
 */
export interface NAVSensitivity {
  baseNAV: number;
  
  // Sensitivity to asset value changes
  assetValueSensitivity: Array<{
    adjustmentPercentage: number;     // % change in asset values
    navPerShare: number;
    percentChange: number;
  }>;
  
  // Sensitivity to liquidation discounts
  liquidationSensitivity: Array<{
    discountRate: number;             // Liquidation discount rate
    liquidationValue: number;
    percentChange: number;
  }>;
  
  // Sensitivity to intangible asset inclusion
  intangibleSensitivity: {
    withIntangibles: number;
    withoutIntangibles: number;
    difference: number;
    percentImpact: number;
  };
}

/**
 * Historical NAV analysis data
 */
export interface NAVHistory {
  date: string;
  bookValuePerShare: number;
  adjustedNAVPerShare: number;
  marketPrice?: number;
  priceToBook: number;
  priceToNAV?: number;
  discount?: number;                  // Discount/premium to NAV
}

/**
 * Validation result for NAV inputs
 */
export interface NAVValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Peer comparison data for NAV analysis
 */
export interface NAVPeerComparison {
  symbol: string;
  name: string;
  bookValuePerShare: number;
  priceToBook: number;
  tangibleBookValue: number;
  assetQualityScore: number;
  industry: string;
}

/**
 * Default liquidation discounts by asset category and scenario
 */
export const DEFAULT_LIQUIDATION_DISCOUNTS: Record<LiquidationScenario, Record<AssetCategory, number>> = {
  orderly: {
    cash_and_equivalents: 0.00,      // No discount for cash
    marketable_securities: 0.05,     // 5% discount for orderly liquidation
    accounts_receivable: 0.10,       // 10% discount for collection risk
    inventory: 0.20,                 // 20% discount for orderly sale
    prepaid_expenses: 0.50,          // 50% discount - mostly non-recoverable
    property_plant_equipment: 0.15,  // 15% discount for orderly sale
    intangible_assets: 0.60,         // 60% discount - difficult to sell
    goodwill: 1.00,                  // 100% discount - no liquidation value
    investments: 0.10,               // 10% discount for private investments
    other_assets: 0.30               // 30% discount for misc assets
  },
  quick: {
    cash_and_equivalents: 0.00,      // No discount for cash
    marketable_securities: 0.15,     // 15% discount for quick sale
    accounts_receivable: 0.25,       // 25% discount for quick collection
    inventory: 0.40,                 // 40% discount for quick sale
    prepaid_expenses: 0.70,          // 70% discount - mostly lost
    property_plant_equipment: 0.30,  // 30% discount for quick sale
    intangible_assets: 0.80,         // 80% discount - very difficult to sell quickly
    goodwill: 1.00,                  // 100% discount - no liquidation value
    investments: 0.25,               // 25% discount for quick sale
    other_assets: 0.50               // 50% discount for misc assets
  },
  forced: {
    cash_and_equivalents: 0.00,      // No discount for cash
    marketable_securities: 0.25,     // 25% discount for fire sale
    accounts_receivable: 0.40,       // 40% discount for forced collection
    inventory: 0.60,                 // 60% discount for fire sale
    prepaid_expenses: 0.90,          // 90% discount - almost completely lost
    property_plant_equipment: 0.50,  // 50% discount for fire sale
    intangible_assets: 0.95,         // 95% discount - almost no value
    goodwill: 1.00,                  // 100% discount - no liquidation value
    investments: 0.40,               // 40% discount for forced sale
    other_assets: 0.70               // 70% discount for misc assets
  }
};

/**
 * Asset quality weights for scoring calculation
 */
export const ASSET_QUALITY_WEIGHTS: Record<AssetCategory, number> = {
  cash_and_equivalents: 1.0,         // Highest quality
  marketable_securities: 0.9,        // Very high quality
  accounts_receivable: 0.7,          // Good quality
  inventory: 0.6,                    // Fair quality
  prepaid_expenses: 0.3,             // Lower quality
  property_plant_equipment: 0.8,     // Good quality
  intangible_assets: 0.4,            // Lower quality
  goodwill: 0.1,                     // Very low quality
  investments: 0.7,                  // Variable quality
  other_assets: 0.5                  // Average quality
};