/**
 * Types and interfaces for Relative Valuation calculations
 * Supporting P/E, PEG, P/S, EV/Sales, EV/EBITDA, and P/B ratios
 */

export type ValuationMultipleType = 'PE' | 'PEG' | 'PS' | 'EV_SALES' | 'EV_EBITDA' | 'PB';

/**
 * Input parameters for relative valuation calculations
 */
export interface RelativeValuationInputs {
  // Target company financial metrics
  targetCompany: {
    symbol: string;
    name: string;
    marketCap: number;
    enterpriseValue: number;
    revenue: number;
    ebitda: number;
    netIncome: number;
    bookValue: number;
    sharesOutstanding: number;
    growthRate: number; // Expected earnings growth rate
    debt: number;
    cash: number;
  };
  
  // Peer group data
  peerCompanies: PeerCompany[];
  
  // Analysis configuration
  selectedMultiples: ValuationMultipleType[];
  useGrowthAdjustments: boolean;
  outlierRemoval: boolean;
  minimumPeers: number;
  
  // Filtering criteria
  peerSelectionCriteria: {
    industryMatch: boolean;
    sizeRange: { min: number; max: number }; // Market cap range
    growthSimilarity: boolean;
    profitabilityThreshold: number; // Minimum margins
  };
}

/**
 * Individual peer company data
 */
export interface PeerCompany {
  symbol: string;
  name: string;
  industry: string;
  marketCap: number;
  enterpriseValue: number;
  revenue: number;
  ebitda: number;
  netIncome: number;
  bookValue: number;
  sharesOutstanding: number;
  growthRate: number;
  debt: number;
  cash: number;
  
  // Calculated multiples
  multiples?: {
    PE?: number;
    PEG?: number;
    PS?: number;
    EV_SALES?: number;
    EV_EBITDA?: number;
    PB?: number;
  };
  
  // Analysis flags
  isOutlier?: boolean;
  excludeReason?: string;
}

/**
 * Individual valuation multiple data
 */
export interface ValuationMultiple {
  type: ValuationMultipleType;
  name: string;
  targetValue: number;
  peerValues: number[];
  statistics: {
    median: number;
    mean: number;
    min: number;
    max: number;
    q1: number;
    q3: number;
    standardDeviation: number;
    count: number;
  };
  impliedValue: number;
  impliedPricePerShare: number;
  percentile: number; // Where target ranks vs peers
}

/**
 * Multiple tier classification based on peer positioning
 */
export interface MultipleTier {
  tier: 'premium' | 'market' | 'discount' | 'deep-discount';
  description: string;
  percentileRange: { min: number; max: number };
  impliedValueRange: { min: number; max: number };
  reasoningFactors: string[];
}

/**
 * Complete relative valuation result
 */
export interface RelativeValuationResult {
  // Core valuation results
  targetCompany: string;
  currentMarketCap: number;
  currentPricePerShare: number;
  
  // Multiple-specific results
  multiples: ValuationMultiple[];
  
  // Aggregate valuation ranges
  valuationRanges: {
    conservative: { min: number; max: number; pricePerShare: { min: number; max: number } };
    moderate: { min: number; max: number; pricePerShare: { min: number; max: number } };
    optimistic: { min: number; max: number; pricePerShare: { min: number; max: number } };
  };
  
  // Peer analysis
  peerAnalysis: {
    totalPeers: number;
    qualifyingPeers: number;
    excludedPeers: PeerCompany[];
    industryClassification: string;
    medianMarketCap: number;
    medianGrowthRate: number;
  };
  
  // Positioning analysis
  companyTier: MultipleTier;
  relativePositioning: {
    growthPremium: number;
    profitabilityPremium: number;
    sizePremium: number;
    overallPremium: number;
  };
  
  // Recommendations
  recommendation: {
    overallRating: 'strong-buy' | 'buy' | 'hold' | 'sell' | 'strong-sell';
    confidence: 'high' | 'medium' | 'low';
    keyFactors: string[];
    risks: string[];
    upside: number; // Percentage upside to fair value
  };
  
  // Sensitivity analysis
  sensitivity: RelativeValuationSensitivity;
}

/**
 * Sensitivity analysis for relative valuation
 */
export interface RelativeValuationSensitivity {
  // Impact of peer group changes
  peerGroupSensitivity: Array<{
    scenario: string;
    peerCount: number;
    medianMultiple: number;
    impliedValue: number;
    percentChange: number;
  }>;
  
  // Growth rate sensitivity
  growthSensitivity: Array<{
    growthRate: number;
    pegRatio: number;
    impliedPEMultiple: number;
    impliedValue: number;
    percentChange: number;
  }>;
  
  // Multiple selection sensitivity
  multipleWeightingSensitivity: Array<{
    weightingScheme: string;
    impliedValue: number;
    percentChange: number;
    dominantMultiples: string[];
  }>;
}

/**
 * Validation result for relative valuation inputs
 */
export interface RelativeValuationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Peer comparison data for visualization
 */
export interface PeerComparison {
  multiple: ValuationMultipleType;
  targetValue: number;
  peerData: Array<{
    symbol: string;
    name: string;
    value: number;
    isOutlier: boolean;
  }>;
  industryBenchmarks: {
    median: number;
    q1: number;
    q3: number;
    topDecile: number;
    bottomDecile: number;
  };
}

/**
 * Industry classification for peer selection
 */
export interface IndustryClassification {
  sector: string;
  industry: string;
  subIndustry: string;
  gicsCode?: string;
  typicalMultiples: ValuationMultipleType[];
  averageGrowthRate: number;
  averageMargins: {
    gross: number;
    operating: number;
    net: number;
  };
}

/**
 * Historical multiple data for trend analysis
 */
export interface HistoricalMultiple {
  date: string;
  multiple: ValuationMultipleType;
  value: number;
  marketCondition: 'bull' | 'bear' | 'neutral';
}

/**
 * Relative valuation methodology configuration
 */
export interface RelativeValuationConfig {
  preferredMultiples: ValuationMultipleType[];
  outlierThreshold: number; // Standard deviations for outlier detection
  minimumSampleSize: number;
  confidenceInterval: number;
  growthAdjustmentFactor: number;
  
  // Weighting schemes for aggregated valuation
  multipleWeights: Partial<Record<ValuationMultipleType, number>>;
  
  // Tier thresholds
  tierThresholds: {
    premium: number; // 75th percentile and above
    market: { min: number; max: number }; // 25th to 75th percentile
    discount: number; // 25th percentile and below
  };
}