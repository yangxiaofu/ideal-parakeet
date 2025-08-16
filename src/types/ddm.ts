/**
 * Types and interfaces for Dividend Discount Model (DDM) calculations
 */

export type DDMModelType = 'gordon' | 'zero' | 'two-stage' | 'multi-stage';

/**
 * Input parameters for DDM calculations
 */
export interface DDMInputs {
  // Common inputs for all models
  currentDividend: number;        // D0 - Most recent annual dividend per share
  sharesOutstanding: number;      // Total shares outstanding
  requiredReturn: number;         // Required rate of return (r)
  modelType: DDMModelType;        // Which DDM variant to use
  
  // Gordon Growth Model specific
  gordonGrowthRate?: number;      // Constant growth rate (g)
  
  // Two-Stage Model specific
  highGrowthRate?: number;        // Initial high growth rate (g1)
  highGrowthYears?: number;       // Number of years in high growth phase
  stableGrowthRate?: number;      // Terminal stable growth rate (g2)
  
  // Multi-Stage Model specific
  growthPhases?: GrowthPhase[];   // Array of growth phases
}

/**
 * Represents a single growth phase in multi-stage DDM
 */
export interface GrowthPhase {
  growthRate: number;             // Growth rate for this phase
  years: number;                  // Duration of this phase in years
  description?: string;           // Optional description (e.g., "High Growth", "Transition")
}

/**
 * Individual year's dividend projection
 */
export interface DividendProjection {
  year: number;                   // Year number (1, 2, 3, etc.)
  dividend: number;               // Projected dividend for that year
  presentValue: number;           // Present value of that year's dividend
  growthRate: number;             // Growth rate applied for this year
  discountFactor: number;         // Discount factor applied (1/(1+r)^t)
}

/**
 * Result of DDM calculation
 */
export interface DDMResult {
  // Core valuation results
  intrinsicValue: number;         // Total intrinsic value of all shares
  intrinsicValuePerShare: number; // Intrinsic value per share
  currentPrice?: number;          // Current market price (for comparison)
  upside?: number;                // Percentage upside/downside
  
  // Dividend metrics
  currentDividendYield: number;   // Current dividend / current price
  forwardDividendYield: number;   // Next year's dividend / intrinsic value
  impliedGrowthRate?: number;     // Growth rate implied by current price
  
  // Detailed projections
  dividendProjections: DividendProjection[];
  terminalValue?: number;         // Terminal value (for multi-stage models)
  terminalValuePV?: number;       // Present value of terminal value
  
  // Model metadata
  modelType: DDMModelType;
  totalPVofDividends: number;     // Sum of all discounted dividends
  yearsProjected: number;         // Total years projected
}

/**
 * Sensitivity analysis result
 */
export interface DDMSensitivity {
  baseValue: number;
  growthRateSensitivity: Array<{
    growthRate: number;
    value: number;
    percentChange: number;
  }>;
  discountRateSensitivity: Array<{
    discountRate: number;
    value: number;
    percentChange: number;
  }>;
  matrix: Array<{
    growthRate: number;
    values: Array<{
      discountRate: number;
      value: number;
    }>;
  }>;
}

/**
 * Validation result for DDM inputs
 */
export interface DDMValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Historical dividend data for analysis
 */
export interface DividendHistory {
  year: string;
  dividendPerShare: number;
  payoutRatio: number;
  growthRate?: number;  // YoY growth rate
}