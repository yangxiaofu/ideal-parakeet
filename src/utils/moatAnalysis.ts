/**
 * Standalone MOAT analysis utilities
 * Can be used independently of EPV calculations
 * 
 * Economic moats represent sustainable competitive advantages that protect
 * a company's profits from competition. This module analyzes financial data
 * to identify and assess these competitive advantages.
 * 
 * For detailed methodology, see: docs/moat-analysis-methodology.md
 */

import type { MoatAnalysis } from '../types/epv';
import type { CompanyFinancials, IncomeStatement } from '../types';
import { analyzeROIC, getDefaultWACCInputs, type ROICAnalysis } from './roicCalculator';

export interface MoatAnalysisInputs {
  // Financial stability indicators
  revenueGrowthConsistency?: number;  // 0-1, how consistent revenue growth is
  profitabilityTrend?: 'improving' | 'stable' | 'declining';
  marginStability?: number;  // 0-1, how stable profit margins are
  
  // Enhanced metrics for sophisticated analysis
  grossMarginLevel?: number;  // Average gross margin
  grossMarginStability?: number;  // 0-1, stability of gross margins
  sgaEfficiencyTrend?: 'improving' | 'stable' | 'declining';  // SG&A as % of revenue trend
  rdIntensity?: number;  // R&D as % of revenue
  deferredRevenueGrowth?: number;  // YoY growth in deferred revenue
  assetTurnover?: number;  // Revenue / Total Assets
  roicAnalysis?: ROICAnalysis;  // ROIC vs WACC analysis
  
  // Business characteristics (can be inferred or manually set)
  businessStability?: 'very_stable' | 'stable' | 'moderate' | 'volatile' | 'very_volatile';
  competitivePosition?: 'dominant' | 'strong' | 'average' | 'weak' | 'poor';
  
  // Industry characteristics
  industryType?: string;
  barrierToEntry?: 'high' | 'medium' | 'low';
}

/**
 * Calculate MOAT analysis from company financial data
 */
export function calculateMoatFromFinancials(
  companyData: CompanyFinancials, 
  additionalInputs: Partial<MoatAnalysisInputs> = {}
): MoatAnalysis {
  // First, perform ROIC analysis if not provided
  const roicAnalysis = additionalInputs.roicAnalysis || analyzeROIC(
    companyData,
    getDefaultWACCInputs()
  );
  
  const inputs = inferMoatInputsFromFinancials(companyData, {
    ...additionalInputs,
    roicAnalysis
  });
  
  return analyzeMoat(inputs);
}

/**
 * Infer MOAT analysis inputs from financial data
 */
function inferMoatInputsFromFinancials(
  companyData: CompanyFinancials,
  additionalInputs: Partial<MoatAnalysisInputs>
): MoatAnalysisInputs {
  // Get financial statements from the company data structure
  const incomeStatements = companyData.incomeStatement || [];
  const balanceSheets = companyData.balanceSheet || [];
  
  // Calculate revenue growth consistency
  let revenueGrowthConsistency = 0.5; // default moderate
  if (incomeStatements.length >= 3) {
    const growthRates = [];
    for (let i = 0; i < incomeStatements.length - 1; i++) {
      const current = incomeStatements[i].revenue;
      const previous = incomeStatements[i + 1].revenue;
      if (previous && previous !== 0) {
        growthRates.push((current - previous) / previous);
      }
    }
    
    if (growthRates.length > 0) {
      const avgGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
      const variance = growthRates.reduce((sum, rate) => sum + Math.pow(rate - avgGrowth, 2), 0) / growthRates.length;
      const stdDev = Math.sqrt(variance);
      
      // Lower standard deviation = higher consistency
      revenueGrowthConsistency = Math.max(0, 1 - (stdDev * 2)); // Normalize to 0-1
    }
  }
  
  // Calculate gross margin metrics
  let grossMarginLevel = 0;
  let grossMarginStability = 0.5;
  const grossMargins: number[] = [];
  
  for (const stmt of incomeStatements) {
    if (stmt.grossProfit !== undefined && stmt.revenue) {
      grossMargins.push(stmt.grossProfit / stmt.revenue);
    } else if (stmt.grossMargin !== undefined) {
      grossMargins.push(stmt.grossMargin);
    }
  }
  
  if (grossMargins.length > 0) {
    grossMarginLevel = grossMargins.reduce((sum, m) => sum + m, 0) / grossMargins.length;
    
    // Calculate stability
    const avgMargin = grossMarginLevel;
    const variance = grossMargins.reduce((sum, m) => sum + Math.pow(m - avgMargin, 2), 0) / grossMargins.length;
    const stdDev = Math.sqrt(variance);
    grossMarginStability = Math.max(0, 1 - (stdDev * 3)); // Lower multiplier for gross margins
  }
  
  // Analyze SG&A efficiency trend
  let sgaEfficiencyTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (incomeStatements.length >= 3) {
    const sgaRatios: number[] = [];
    for (const stmt of incomeStatements) {
      if (stmt.sellingGeneralAndAdministrative !== undefined && stmt.revenue) {
        sgaRatios.push(stmt.sellingGeneralAndAdministrative / stmt.revenue);
      }
    }
    
    if (sgaRatios.length >= 3) {
      const recentAvg = sgaRatios.slice(0, 2).reduce((sum, r) => sum + r, 0) / 2;
      const olderAvg = sgaRatios.slice(-2).reduce((sum, r) => sum + r, 0) / 2;
      
      // Lower SG&A ratio is better (more efficient)
      if (recentAvg < olderAvg * 0.95) sgaEfficiencyTrend = 'improving';
      else if (recentAvg > olderAvg * 1.05) sgaEfficiencyTrend = 'declining';
    }
  }
  
  // Calculate R&D intensity
  let rdIntensity = 0;
  if (incomeStatements.length > 0 && incomeStatements[0].researchAndDevelopment !== undefined) {
    rdIntensity = incomeStatements[0].researchAndDevelopment / incomeStatements[0].revenue;
  }
  
  // Calculate deferred revenue growth (proxy for switching costs)
  let deferredRevenueGrowth = 0;
  if (balanceSheets.length >= 2) {
    const currentDeferred = balanceSheets[0].deferredRevenue || 0;
    const previousDeferred = balanceSheets[1].deferredRevenue || 0;
    if (previousDeferred > 0) {
      deferredRevenueGrowth = (currentDeferred - previousDeferred) / previousDeferred;
    }
  }
  
  // Calculate asset turnover (efficiency metric for scale advantages)
  let assetTurnover = 0;
  if (incomeStatements.length > 0 && balanceSheets.length > 0) {
    const latestRevenue = incomeStatements[0].revenue;
    const latestAssets = balanceSheets[0].totalAssets;
    if (latestAssets > 0) {
      assetTurnover = latestRevenue / latestAssets;
    }
  }

  // Calculate margin stability
  let marginStability = 0.5; // default moderate
  if (incomeStatements.length >= 3) {
    const netMargins = incomeStatements
      .filter((stmt: IncomeStatement) => stmt.revenue && stmt.revenue !== 0)
      .map((stmt: IncomeStatement) => stmt.netIncome / stmt.revenue);
    
    if (netMargins.length > 0) {
      const avgMargin = netMargins.reduce((sum: number, margin: number) => sum + margin, 0) / netMargins.length;
      const variance = netMargins.reduce((sum: number, margin: number) => sum + Math.pow(margin - avgMargin, 2), 0) / netMargins.length;
      const stdDev = Math.sqrt(variance);
      
      // Lower standard deviation = higher stability
      marginStability = Math.max(0, 1 - (stdDev * 5)); // Adjust multiplier as needed
    }
  }

  // Infer profitability trend
  let profitabilityTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (incomeStatements.length >= 3) {
    const recentMargins = incomeStatements.slice(0, 2).map((stmt: IncomeStatement) => 
      stmt.revenue ? stmt.netIncome / stmt.revenue : 0
    );
    const olderMargins = incomeStatements.slice(-2).map((stmt: IncomeStatement) => 
      stmt.revenue ? stmt.netIncome / stmt.revenue : 0
    );
    
    const recentAvg = recentMargins.reduce((sum: number, m: number) => sum + m, 0) / recentMargins.length;
    const olderAvg = olderMargins.reduce((sum: number, m: number) => sum + m, 0) / olderMargins.length;
    
    const improvement = (recentAvg - olderAvg) / Math.abs(olderAvg);
    if (improvement > 0.1) profitabilityTrend = 'improving';
    else if (improvement < -0.1) profitabilityTrend = 'declining';
  }

  // Infer business stability from financial metrics
  let businessStability: MoatAnalysisInputs['businessStability'] = 'moderate';
  const combinedStability = (revenueGrowthConsistency + marginStability) / 2;
  if (combinedStability > 0.8) businessStability = 'very_stable';
  else if (combinedStability > 0.6) businessStability = 'stable';
  else if (combinedStability > 0.4) businessStability = 'moderate';
  else if (combinedStability > 0.2) businessStability = 'volatile';
  else businessStability = 'very_volatile';

  // Infer competitive position from profitability and size
  let competitivePosition: MoatAnalysisInputs['competitivePosition'] = 'average';
  const latestIncome = incomeStatements[0];
  if (latestIncome) {
    const netMargin = latestIncome.revenue ? latestIncome.netIncome / latestIncome.revenue : 0;
    const revenueSize = latestIncome.revenue || 0;
    
    // High margin + large revenue suggests strong position
    if (netMargin > 0.15 && revenueSize > 10_000_000_000) { // >15% margin, >$10B revenue
      competitivePosition = 'dominant';
    } else if (netMargin > 0.10 && revenueSize > 5_000_000_000) { // >10% margin, >$5B revenue
      competitivePosition = 'strong';
    } else if (netMargin > 0.05 && revenueSize > 1_000_000_000) { // >5% margin, >$1B revenue
      competitivePosition = 'average';
    } else if (netMargin > 0 && revenueSize > 100_000_000) { // Positive margin, >$100M revenue
      competitivePosition = 'weak';
    } else {
      competitivePosition = 'poor';
    }
  }

  return {
    revenueGrowthConsistency,
    profitabilityTrend,
    marginStability,
    grossMarginLevel,
    grossMarginStability,
    sgaEfficiencyTrend,
    rdIntensity,
    deferredRevenueGrowth,
    assetTurnover,
    businessStability: additionalInputs.businessStability || businessStability,
    competitivePosition: additionalInputs.competitivePosition || competitivePosition,
    ...additionalInputs
  };
}

/**
 * Analyze competitive moat from inputs with ROIC-based classification
 */
export function analyzeMoat(inputs: MoatAnalysisInputs): MoatAnalysis {
  const { 
    competitivePosition = 'average', 
    businessStability = 'moderate',
    roicAnalysis 
  } = inputs;
  
  // ROIC-based moat classification (primary method)
  let moatStrength: 'none' | 'narrow' | 'wide';
  let hasEconomicMoat: boolean;
  
  if (roicAnalysis) {
    // Use ROIC vs WACC spread and consistency for classification
    moatStrength = roicAnalysis.moatClassification;
    hasEconomicMoat = moatStrength !== 'none';
    
    // Override with business characteristics if they suggest stronger moat
    if (!hasEconomicMoat && competitivePosition === 'dominant' && businessStability === 'very_stable') {
      moatStrength = 'narrow';
      hasEconomicMoat = true;
    }
  } else {
    // Fallback to heuristic-based analysis
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
  }
  
  // Determine moat sustainability based on competitive position trend
  let moatSustainability: 'declining' | 'stable' | 'strengthening';
  if (inputs.profitabilityTrend === 'improving' && ['dominant', 'strong'].includes(competitivePosition)) {
    moatSustainability = 'strengthening';
  } else if (inputs.profitabilityTrend === 'declining' || ['weak', 'poor'].includes(competitivePosition)) {
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
  
  // Infer potential moat sources based on business characteristics
  const moatSources: Array<'brand' | 'patents' | 'network_effects' | 'switching_costs' | 'scale' | 'location'> = [];
  
  /**
   * Enhanced MOAT Source Detection Logic
   * Using sophisticated financial metrics for more accurate detection
   */
  
  // 1. BRAND POWER: High gross margins + stable margins + efficient SG&A
  // Strong brands command pricing power and require less marketing over time
  const hasBrandPower = (
    (inputs.grossMarginLevel && inputs.grossMarginLevel > 0.6) || // High gross margin (>60%)
    (inputs.grossMarginStability && inputs.grossMarginStability > 0.7) // Stable gross margins
  ) && (
    inputs.sgaEfficiencyTrend === 'improving' || // Decreasing marketing needs
    (inputs.marginStability && inputs.marginStability > 0.7) // Stable net margins
  );
  
  if (hasBrandPower) {
    moatSources.push('brand');
  }
  
  // 2. SCALE ADVANTAGES: Superior efficiency metrics + dominant position
  // True scale advantages show in asset turnover and ROIC
  const hasScaleAdvantage = (
    (competitivePosition === 'dominant' || competitivePosition === 'strong') &&
    (
      (inputs.assetTurnover && inputs.assetTurnover > 1.5) || // High asset efficiency
      (roicAnalysis && roicAnalysis.averageROIC > 0.15) // High returns on capital
    )
  );
  
  if (hasScaleAdvantage) {
    moatSources.push('scale');
  }
  
  // 3. SWITCHING COSTS: Revenue durability + deferred revenue growth
  // Strong customer lock-in shows in predictable revenue and prepayments
  const hasSwitchingCosts = (
    (inputs.revenueGrowthConsistency && inputs.revenueGrowthConsistency > 0.8) || // Very consistent revenue
    (inputs.deferredRevenueGrowth && inputs.deferredRevenueGrowth > 0.1) // Growing deferred revenue
  );
  
  if (hasSwitchingCosts) {
    moatSources.push('switching_costs');
  }
  
  // 4. PATENTS/IP: High R&D intensity + high gross margins
  // Companies with valuable IP invest heavily in R&D and maintain high margins
  const hasPatentsIP = (
    (inputs.rdIntensity && inputs.rdIntensity > 0.05) || // R&D > 5% of revenue
    (inputs.grossMarginLevel && inputs.grossMarginLevel > 0.6) // Gross margin > 60%
  ) && (
    inputs.grossMarginStability && inputs.grossMarginStability > 0.5 // Stable high margins
  );
  
  if (hasPatentsIP) {
    moatSources.push('patents');
  }
  
  // 5. NETWORK EFFECTS (Heuristic): Accelerating revenue with stable/improving margins
  // Indicates the business becomes more valuable as it grows (platform dynamics)
  // Note: This requires income statement data which is not available in this scope
  // Network effects detection would need to be done at a higher level with access to financial data
  const hasNetworkEffects = false; // Placeholder - needs implementation at data level
  
  if (hasNetworkEffects) {
    moatSources.push('network_effects');
  }
  
  // TODO: Location advantages require industry classification data
  
  return {
    hasEconomicMoat,
    moatStrength,
    moatSources,
    moatSustainability,
    competitivePressure
  };
}

/**
 * Get default MOAT analysis for cases where financial data is insufficient
 */
export function getDefaultMoatAnalysis(): MoatAnalysis {
  return {
    hasEconomicMoat: false,
    moatStrength: 'none',
    moatSources: [],
    moatSustainability: 'stable',
    competitivePressure: 'medium'
  };
}