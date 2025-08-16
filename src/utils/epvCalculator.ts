/**
 * Earnings Power Value (EPV) Calculator
 * 
 * Calculates intrinsic value based on normalized sustainable earnings
 * divided by cost of capital, assuming no growth.
 * 
 * EPV = Normalized Earnings / Cost of Capital
 */

import type {
  EPVInputs,
  EPVResult,
  EarningsNormalizationResult,
  MaintenanceCapexAnalysis,
  CostOfCapitalComponents,
  EPVWarning,
  MoatAnalysis,
  EPVSensitivity
} from '../types/epv';

/**
 * Calculate normalized earnings using specified method and adjustments
 */
function calculateNormalizedEarnings(inputs: EPVInputs): EarningsNormalizationResult {
  const { historicalEarnings, normalizationMethod, normalizationPeriod, manualNormalizedEarnings, earningsAdjustments } = inputs;
  
  // Get earnings for the specified period
  const periodEarnings = historicalEarnings.slice(0, normalizationPeriod).map(e => e.netIncome);
  const rawEarnings = [...periodEarnings];
  
  // Calculate base normalized earnings
  let normalizedEarnings: number;
  
  switch (normalizationMethod) {
    case 'average': {
      normalizedEarnings = periodEarnings.reduce((sum, e) => sum + e, 0) / periodEarnings.length;
      break;
    }
    case 'median': {
      const sorted = [...periodEarnings].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      normalizedEarnings = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
      break;
    }
    case 'latest': {
      normalizedEarnings = periodEarnings[0] || 0;
      break;
    }
    case 'manual': {
      normalizedEarnings = manualNormalizedEarnings || 0;
      break;
    }
    default: {
      normalizedEarnings = periodEarnings.reduce((sum, e) => sum + e, 0) / periodEarnings.length;
    }
  }
  
  // Apply earnings adjustments
  let adjustedEarnings = [...periodEarnings];
  const adjustmentsByCategory: Record<string, number> = {};
  let totalAdjustments = 0;
  
  earningsAdjustments.forEach(adjustment => {
    const yearlyAdjustment = adjustment.amount / normalizationPeriod;
    adjustedEarnings = adjustedEarnings.map(e => e + yearlyAdjustment);
    adjustmentsByCategory[adjustment.category] = (adjustmentsByCategory[adjustment.category] || 0) + adjustment.amount;
    totalAdjustments += adjustment.amount;
  });
  
  // Recalculate normalized earnings after adjustments
  const finalNormalized = normalizedEarnings + totalAdjustments;
  
  // Calculate earnings quality metrics
  const avgEarnings = adjustedEarnings.reduce((sum, e) => sum + e, 0) / adjustedEarnings.length;
  const variance = adjustedEarnings.reduce((sum, e) => sum + Math.pow(e - avgEarnings, 2), 0) / adjustedEarnings.length;
  const volatility = Math.sqrt(variance) / Math.abs(avgEarnings);
  
  // Determine earnings trend
  const firstHalf = adjustedEarnings.slice(0, Math.ceil(adjustedEarnings.length / 2));
  const secondHalf = adjustedEarnings.slice(Math.ceil(adjustedEarnings.length / 2));
  const firstHalfAvg = firstHalf.reduce((sum, e) => sum + e, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, e) => sum + e, 0) / secondHalf.length;
  
  let trend: 'improving' | 'stable' | 'declining';
  const trendThreshold = 0.05; // 5% threshold
  if ((firstHalfAvg - secondHalfAvg) / Math.abs(secondHalfAvg) > trendThreshold) {
    trend = 'improving';
  } else if ((secondHalfAvg - firstHalfAvg) / Math.abs(firstHalfAvg) > trendThreshold) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }
  
  // Calculate quality score (0-100)
  let qualityScore = 100;
  if (volatility > 0.3) qualityScore -= 30; // High volatility penalty
  else if (volatility > 0.15) qualityScore -= 15; // Moderate volatility penalty
  
  if (trend === 'declining') qualityScore -= 20;
  else if (trend === 'improving') qualityScore += 10;
  
  // Penalty for too few data points
  if (periodEarnings.length < 5) qualityScore -= (5 - periodEarnings.length) * 5;
  
  return {
    rawEarnings,
    adjustedEarnings,
    normalizedEarnings: finalNormalized,
    adjustmentsSummary: {
      totalAdjustments,
      adjustmentsByCategory,
      netImpact: totalAdjustments / finalNormalized
    },
    qualityScore: Math.max(0, Math.min(100, qualityScore)),
    volatility,
    trend
  };
}

/**
 * Calculate cost of capital using specified method
 */
function calculateCostOfCapital(inputs: EPVInputs): CostOfCapitalComponents {
  const { costOfCapitalMethod, manualCostOfCapital, costOfCapitalComponents } = inputs;
  
  if (costOfCapitalMethod === 'manual' && manualCostOfCapital) {
    return {
      ...costOfCapitalComponents,
      wacc: manualCostOfCapital
    };
  }
  
  const {
    riskFreeRate,
    marketRiskPremium,
    beta,
    costOfDebt,
    weightOfEquity,
    weightOfDebt,
    taxRate
  } = costOfCapitalComponents;
  
  // Calculate cost of equity using CAPM
  const costOfEquity = riskFreeRate + (beta * marketRiskPremium);
  
  // Calculate after-tax cost of debt
  const afterTaxCostOfDebt = costOfDebt * (1 - taxRate);
  
  // Calculate WACC  
  const wacc = (costOfEquity * weightOfEquity) + (afterTaxCostOfDebt * weightOfDebt);
  
  return {
    ...costOfCapitalComponents,
    costOfEquity,
    wacc
  };
}

/**
 * Analyze maintenance capital expenditure requirements
 */
function analyzeMaintenanceCapex(inputs: EPVInputs): MaintenanceCapexAnalysis {
  const { maintenanceCapex } = inputs;
  
  // The maintenance capex analysis is provided in inputs
  // This function could be enhanced to perform additional validation or calculations
  return {
    ...maintenanceCapex,
    capexAsPercentOfSales: maintenanceCapex.maintenanceCapex / (inputs.historicalEarnings[0]?.revenue || 1)
  };
}

/**
 * Assess competitive moat strength
 */
function analyzeMoat(inputs: EPVInputs): MoatAnalysis {
  const { competitivePosition, businessStability } = inputs;
  
  // Simple heuristic-based moat analysis
  let moatStrength: 'none' | 'narrow' | 'wide';
  let hasEconomicMoat: boolean;
  
  if (competitivePosition === 'dominant' && businessStability === 'very_stable') {
    moatStrength = 'wide';
    hasEconomicMoat = true;
  } else if (competitivePosition === 'strong' && ['very_stable', 'stable'].includes(businessStability)) {
    moatStrength = 'narrow';
    hasEconomicMoat = true;
  } else if (competitivePosition === 'average' && businessStability === 'very_stable') {
    moatStrength = 'narrow';
    hasEconomicMoat = true;
  } else {
    moatStrength = 'none';
    hasEconomicMoat = false;
  }
  
  // Determine moat sustainability based on competitive position trend
  let moatSustainability: 'declining' | 'stable' | 'strengthening';
  if (competitivePosition === 'dominant' || competitivePosition === 'strong') {
    moatSustainability = 'stable';
  } else if (competitivePosition === 'weak' || competitivePosition === 'poor') {
    moatSustainability = 'declining';
  } else {
    moatSustainability = 'stable';
  }
  
  // Assess competitive pressure
  let competitivePressure: 'high' | 'medium' | 'low';
  if (businessStability === 'very_volatile' || businessStability === 'volatile') {
    competitivePressure = 'high';
  } else if (businessStability === 'moderate') {
    competitivePressure = 'medium';
  } else {
    competitivePressure = 'low';
  }
  
  return {
    hasEconomicMoat,
    moatStrength,
    moatSources: [], // This would need additional input data to populate
    moatSustainability,
    competitivePressure
  };
}

/**
 * Generate warnings based on EPV calculation inputs and results
 */
function generateWarnings(inputs: EPVInputs, result: Partial<EPVResult>): EPVWarning[] {
  const warnings: EPVWarning[] = [];
  
  // Check for insufficient historical data
  if (inputs.historicalEarnings.length < 5) {
    warnings.push({
      type: 'warning',
      category: 'data_quality',
      message: `Only ${inputs.historicalEarnings.length} years of earnings data available. EPV is more reliable with 5+ years of data.`,
      severity: 'medium',
      suggestion: 'Consider using additional data sources or extending the historical period.'
    });
  }
  
  // Check for highly volatile earnings
  const earningsVolatility = result.earningsNormalization?.volatility || 0;
  if (earningsVolatility > 0.3) {
    warnings.push({
      type: 'warning',
      category: 'earnings_quality',
      message: 'High earnings volatility detected. EPV may not be appropriate for highly cyclical businesses.',
      severity: 'high',
      suggestion: 'Consider using a longer normalization period or cyclical adjustments.'
    });
  }
  
  // Check for declining earnings trend
  if (result.earningsNormalization?.trend === 'declining') {
    warnings.push({
      type: 'warning',
      category: 'earnings_quality',
      message: 'Declining earnings trend detected. Current earnings may not be sustainable.',
      severity: 'high',
      suggestion: 'Investigate causes of decline and consider if normalization is appropriate.'
    });
  }
  
  // Check for poor earnings quality
  if (inputs.earningsQuality === 'poor' || inputs.earningsQuality === 'very_poor') {
    warnings.push({
      type: 'warning',
      category: 'earnings_quality',
      message: 'Poor earnings quality assessment. EPV results should be interpreted with caution.',
      severity: 'high',
      suggestion: 'Review earnings adjustments and consider alternative valuation methods.'
    });
  }
  
  // Check for high growth businesses
  if (inputs.businessStability === 'very_volatile' || inputs.businessStability === 'volatile') {
    warnings.push({
      type: 'info',
      category: 'business_model',
      message: 'EPV assumes no growth. This may be overly conservative for businesses with significant growth potential.',
      severity: 'medium',
      suggestion: 'Consider using EPV as a floor value alongside growth-based valuation methods.'
    });
  }
  
  // Check for very high cost of capital
  const costOfCapital = result.costOfCapital || 0;
  if (costOfCapital > 0.20) {
    warnings.push({
      type: 'warning',
      category: 'business_model',
      message: 'Very high cost of capital (>20%) may indicate excessive business risk.',
      severity: 'medium',
      suggestion: 'Review cost of capital assumptions and business risk assessment.'
    });
  }
  
  return warnings;
}

/**
 * Calculate EPV sensitivity analysis
 */
function calculateSensitivity(
  normalizedEarnings: number,
  maintenanceCapex: number,
  baseCostOfCapital: number,
  sharesOutstanding: number
): EPVSensitivity {
  const baseAdjustedEarnings = normalizedEarnings - maintenanceCapex;
  const baseEPV = baseAdjustedEarnings / baseCostOfCapital / sharesOutstanding;
  
  // Cost of capital sensitivity
  const costOfCapitalRanges = [-0.02, -0.01, -0.005, 0, 0.005, 0.01, 0.02];
  const costOfCapitalSensitivity = costOfCapitalRanges.map(change => {
    const newCostOfCapital = Math.max(0.01, baseCostOfCapital + change);
    const newEPV = baseAdjustedEarnings / newCostOfCapital / sharesOutstanding;
    return {
      costOfCapital: newCostOfCapital,
      epvPerShare: newEPV,
      percentChange: ((newEPV - baseEPV) / baseEPV) * 100
    };
  });
  
  // Earnings sensitivity
  const earningsChanges = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3];
  const earningsSensitivity = earningsChanges.map(change => {
    const newEarnings = normalizedEarnings * (1 + change);
    const newAdjustedEarnings = newEarnings - maintenanceCapex;
    const newEPV = newAdjustedEarnings / baseCostOfCapital / sharesOutstanding;
    return {
      earningsChange: change * 100,
      epvPerShare: newEPV,
      percentChange: ((newEPV - baseEPV) / baseEPV) * 100
    };
  });
  
  // Maintenance capex sensitivity
  const capexPercentages = [0, 0.02, 0.05, 0.10, 0.15, 0.20];
  const maintenanceCapexSensitivity = capexPercentages.map(percentage => {
    const newCapex = normalizedEarnings * percentage;
    const newAdjustedEarnings = normalizedEarnings - newCapex;
    const newEPV = newAdjustedEarnings / baseCostOfCapital / sharesOutstanding;
    return {
      maintenanceCapexPercent: percentage * 100,
      epvPerShare: newEPV,
      percentChange: ((newEPV - baseEPV) / baseEPV) * 100
    };
  });
  
  return {
    baseEPV,
    costOfCapitalSensitivity,
    earningsSensitivity,
    maintenanceCapexSensitivity
  };
}

/**
 * Main EPV calculation function
 */
export function calculateEPVIntrinsicValue(inputs: EPVInputs): EPVResult {
  // Step 1: Normalize earnings
  const earningsNormalization = calculateNormalizedEarnings(inputs);
  
  // Step 2: Calculate cost of capital
  const costOfCapitalBreakdown = calculateCostOfCapital(inputs);
  
  // Step 3: Analyze maintenance capex
  const maintenanceCapexAnalysis = analyzeMaintenanceCapex(inputs);
  
  // Step 4: Calculate EPV
  let adjustedEarnings = earningsNormalization.normalizedEarnings;
  if (inputs.includeMaintenanceCapex) {
    adjustedEarnings -= maintenanceCapexAnalysis.maintenanceCapex;
  }
  
  const epvTotalValue = adjustedEarnings / costOfCapitalBreakdown.wacc;
  const epvPerShare = epvTotalValue / inputs.sharesOutstanding;
  const earningsYield = adjustedEarnings / (epvTotalValue);
  
  // Step 5: Analyze competitive moat
  const moatAnalysis = analyzeMoat(inputs);
  
  // Step 6: Determine confidence level
  let confidenceLevel: 'high' | 'medium' | 'low';
  const qualityScore = earningsNormalization.qualityScore;
  
  if (qualityScore >= 80 && moatAnalysis.hasEconomicMoat && inputs.historicalEarnings.length >= 7) {
    confidenceLevel = 'high';
  } else if (qualityScore >= 60 && inputs.historicalEarnings.length >= 5) {
    confidenceLevel = 'medium';
  } else {
    confidenceLevel = 'low';
  }
  
  // Create partial result for warning generation
  const partialResult: Partial<EPVResult> = {
    earningsNormalization,
    costOfCapital: costOfCapitalBreakdown.wacc,
    moatAnalysis
  };
  
  // Step 7: Generate warnings
  const warnings = generateWarnings(inputs, partialResult);
  
  // Step 8: Calculate current price metrics if available
  let currentPrice: number | undefined;
  let upside: number | undefined;
  let priceToEPV: number | undefined;
  
  // Current price would need to be passed in or fetched
  // For now, these are undefined
  
  const result: EPVResult = {
    normalizedEarnings: earningsNormalization.normalizedEarnings,
    maintenanceCapex: maintenanceCapexAnalysis.maintenanceCapex,
    adjustedEarnings,
    costOfCapital: costOfCapitalBreakdown.wacc,
    epvTotalValue,
    epvPerShare,
    earningsNormalization,
    costOfCapitalBreakdown,
    maintenanceCapexAnalysis,
    moatAnalysis,
    confidenceLevel,
    warnings,
    currentPrice,
    upside,
    priceToEPV,
    earningsYield,
    calculationDate: new Date(),
    sharesOutstanding: inputs.sharesOutstanding
  };
  
  return result;
}

/**
 * Calculate EPV sensitivity analysis
 */
export function calculateEPVSensitivity(result: EPVResult): EPVSensitivity {
  return calculateSensitivity(
    result.normalizedEarnings,
    result.maintenanceCapex,
    result.costOfCapital,
    result.sharesOutstanding
  );
}

/**
 * Validate EPV inputs
 */
export function validateEPVInputs(inputs: EPVInputs): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required field validations
  if (!inputs.symbol) {
    errors.push('Company symbol is required');
  }
  
  if (!inputs.historicalEarnings || inputs.historicalEarnings.length === 0) {
    errors.push('Historical earnings data is required');
  }
  
  if (inputs.sharesOutstanding <= 0) {
    errors.push('Shares outstanding must be positive');
  }
  
  if (inputs.normalizationPeriod <= 0) {
    errors.push('Normalization period must be positive');
  }
  
  // Data quality warnings
  if (inputs.historicalEarnings && inputs.historicalEarnings.length < 5) {
    warnings.push('Less than 5 years of earnings data may reduce calculation reliability');
  }
  
  if (inputs.normalizationPeriod > inputs.historicalEarnings?.length) {
    errors.push('Normalization period cannot exceed available historical data');
  }
  
  // Cost of capital validations
  if (inputs.costOfCapitalMethod === 'manual') {
    if (!inputs.manualCostOfCapital || inputs.manualCostOfCapital <= 0) {
      errors.push('Manual cost of capital must be positive when manual method is selected');
    }
    if (inputs.manualCostOfCapital && inputs.manualCostOfCapital > 0.5) {
      warnings.push('Cost of capital >50% is unusually high');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}