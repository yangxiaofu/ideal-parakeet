/**
 * Net Asset Value (NAV) calculation utilities
 * 
 * This module provides comprehensive NAV calculation functionality including:
 * - Basic book value NAV calculation
 * - Asset and liability adjustments
 * - Asset quality analysis
 * - Liquidation value calculations
 * - Warning generation for data quality issues
 */

import type { BalanceSheet } from '../types';
import type {
  NAVInputs,
  NAVResult,
  AssetBreakdown,
  LiabilityBreakdown,
  AssetQualityAnalysis,
  LiquidationAnalysis,
  NAVWarning,
  AssetCategory,
  LiabilityCategory,
  LiquidationScenario,
  AssetQualityScore,
  NAVValidation,
  NAVSensitivity
} from '../types/nav';

import {
  DEFAULT_LIQUIDATION_DISCOUNTS,
  ASSET_QUALITY_WEIGHTS
} from '../types/nav';

/**
 * Calculate basic book value NAV from balance sheet data
 * Formula: NAV = Total Assets - Total Liabilities
 */
export function calculateBookValueNAV(balanceSheet: BalanceSheet): number {
  if (!balanceSheet) {
    throw new Error('Balance sheet data is required for NAV calculation');
  }
  
  return balanceSheet.totalAssets - balanceSheet.totalLiabilities;
}

/**
 * Apply asset adjustments to convert book values to fair values
 * Returns array of detailed asset breakdowns with adjustments applied
 */
export function applyAssetAdjustments(
  balanceSheet: BalanceSheet,
  assetAdjustments: NAVInputs['assetAdjustments']
): AssetBreakdown[] {
  const breakdown: AssetBreakdown[] = [];
  
  // Create default asset categories with book values
  const defaultAssets: Record<AssetCategory, number> = {
    cash_and_equivalents: balanceSheet.totalAssets * 0.10, // Estimate 10% cash
    marketable_securities: balanceSheet.totalAssets * 0.05, // Estimate 5% securities
    accounts_receivable: balanceSheet.totalAssets * 0.15,  // Estimate 15% receivables
    inventory: balanceSheet.totalAssets * 0.20,            // Estimate 20% inventory
    prepaid_expenses: balanceSheet.totalAssets * 0.02,     // Estimate 2% prepaid
    property_plant_equipment: balanceSheet.totalAssets * 0.35, // Estimate 35% PPE
    intangible_assets: balanceSheet.totalAssets * 0.08,    // Estimate 8% intangibles
    goodwill: balanceSheet.totalAssets * 0.03,             // Estimate 3% goodwill
    investments: balanceSheet.totalAssets * 0.02,          // Estimate 2% investments
    other_assets: balanceSheet.totalAssets * 0.00          // Residual
  };
  
  // Process each asset category
  Object.entries(defaultAssets).forEach(([categoryKey, bookValue]) => {
    const category = categoryKey as AssetCategory;
    const adjustments = assetAdjustments[category] || [];
    
    // Calculate total adjusted value for this category
    const totalAdjustedValue = adjustments.reduce((sum, adj) => sum + adj.adjustedValue, bookValue);
    const adjustmentAmount = totalAdjustedValue - bookValue;
    const adjustmentPercentage = bookValue > 0 ? (adjustmentAmount / bookValue) * 100 : 0;
    
    // Calculate quality score for this asset category
    const qualityScore = calculateAssetCategoryQuality(category, adjustments);
    
    // Calculate liquidation values for different scenarios
    const liquidationDiscounts = DEFAULT_LIQUIDATION_DISCOUNTS.orderly[category];
    const liquidationValue = totalAdjustedValue * (1 - liquidationDiscounts);
    
    breakdown.push({
      category,
      description: getCategoryDescription(category),
      bookValue,
      adjustedValue: totalAdjustedValue,
      adjustmentAmount,
      adjustmentPercentage,
      qualityScore,
      liquidationValue,
      liquidationDiscount: liquidationDiscounts
    });
  });
  
  return breakdown;
}

/**
 * Apply liability adjustments to convert book values to fair values
 * Returns array of detailed liability breakdowns with adjustments applied
 */
export function applyLiabilityAdjustments(
  balanceSheet: BalanceSheet,
  liabilityAdjustments: NAVInputs['liabilityAdjustments']
): LiabilityBreakdown[] {
  const breakdown: LiabilityBreakdown[] = [];
  
  // Create default liability categories with book values
  const defaultLiabilities: Record<LiabilityCategory, number> = {
    accounts_payable: balanceSheet.totalLiabilities * 0.25,      // Estimate 25% payables
    accrued_expenses: balanceSheet.totalLiabilities * 0.15,      // Estimate 15% accrued
    short_term_debt: balanceSheet.totalLiabilities * 0.20,       // Estimate 20% short-term debt
    long_term_debt: balanceSheet.totalLiabilities * 0.30,        // Estimate 30% long-term debt
    pension_obligations: balanceSheet.totalLiabilities * 0.05,   // Estimate 5% pension
    deferred_tax_liabilities: balanceSheet.totalLiabilities * 0.03, // Estimate 3% deferred tax
    contingent_liabilities: balanceSheet.totalLiabilities * 0.02,   // Estimate 2% contingent
    other_liabilities: balanceSheet.totalLiabilities * 0.00         // Residual
  };
  
  // Process each liability category
  Object.entries(defaultLiabilities).forEach(([categoryKey, bookValue]) => {
    const category = categoryKey as LiabilityCategory;
    const adjustments = liabilityAdjustments[category] || [];
    
    // Calculate total adjusted value for this category
    const totalAdjustedValue = adjustments.reduce((sum, adj) => sum + adj.adjustedValue, bookValue);
    const adjustmentAmount = totalAdjustedValue - bookValue;
    const adjustmentPercentage = bookValue > 0 ? (adjustmentAmount / bookValue) * 100 : 0;
    
    breakdown.push({
      category,
      description: getLiabilityCategoryDescription(category),
      bookValue,
      adjustedValue: totalAdjustedValue,
      adjustmentAmount,
      adjustmentPercentage
    });
  });
  
  return breakdown;
}

/**
 * Calculate liquidation value with appropriate discounts based on scenario
 * Formula: Liquidation Value = Σ(Asset Value × (1 - Discount Rate))
 */
export function calculateLiquidationValue(
  assetBreakdown: AssetBreakdown[],
  scenario: LiquidationScenario = 'orderly',
  customDiscount?: number
): LiquidationAnalysis {
  const discounts = DEFAULT_LIQUIDATION_DISCOUNTS[scenario];
  const assetLiquidationValues: Record<string, number> = {};
  let totalLiquidationValue = 0;
  let totalBookValue = 0;
  
  assetBreakdown.forEach(asset => {
    const discount = customDiscount ?? discounts[asset.category];
    const liquidationValue = asset.adjustedValue * (1 - discount);
    
    totalLiquidationValue += liquidationValue;
    totalBookValue += asset.bookValue;
    
    assetLiquidationValues[asset.category] = {
      bookValue: asset.bookValue,
      liquidationValue,
      discount,
      marketability: getAssetMarketability(asset.category)
    };
  });
  
  const averageDiscount = totalBookValue > 0 ? 1 - (totalLiquidationValue / totalBookValue) : 0;
  
  return {
    scenario,
    totalLiquidationValue,
    liquidationValuePerShare: 0, // Will be calculated with shares outstanding
    averageDiscount,
    timeFrame: getLiquidationTimeFrame(scenario),
    assetLiquidationValues
  };
}

/**
 * Analyze asset quality and provide score from 0-100
 * Higher score indicates better asset quality (more liquid, tangible, reliable)
 */
export function analyzeAssetQuality(
  assetBreakdown: AssetBreakdown[],
  balanceSheet: BalanceSheet
): AssetQualityAnalysis {
  let overallScore = 0;
  let totalWeight = 0;
  const categoryScores: Record<string, { score: number; weight: number; confidence: number }> = {};
  
  // Calculate asset ratios
  const totalAssets = balanceSheet.totalAssets;
  let tangibleAssets = 0;
  let liquidAssets = 0;
  let intangibleAssets = 0;
  
  // Calculate weighted quality score and asset ratios
  assetBreakdown.forEach(asset => {
    const weight = ASSET_QUALITY_WEIGHTS[asset.category];
    const assetScore = asset.qualityScore;
    const contribution = (asset.adjustedValue / totalAssets) * assetScore * weight;
    
    overallScore += contribution;
    totalWeight += weight * (asset.adjustedValue / totalAssets);
    
    categoryScores[asset.category] = {
      score: assetScore,
      weight,
      contribution
    };
    
    // Categorize assets for ratio calculations
    if (asset.category === 'intangible_assets' || asset.category === 'goodwill') {
      intangibleAssets += asset.adjustedValue;
    } else {
      tangibleAssets += asset.adjustedValue;
    }
    
    if (asset.category === 'cash_and_equivalents' || asset.category === 'marketable_securities') {
      liquidAssets += asset.adjustedValue;
    }
  });
  
  // Normalize overall score
  if (totalWeight > 0) {
    overallScore = (overallScore / totalWeight);
  }
  
  // Calculate ratios
  const tangibleAssetRatio = tangibleAssets / totalAssets;
  const liquidAssetRatio = liquidAssets / totalAssets;
  const intangibleAssetRatio = intangibleAssets / totalAssets;
  
  // Quality indicators
  const hasExcessCash = liquidAssets > totalAssets * 0.20; // >20% liquid assets
  const hasMarketableSecurities = assetBreakdown.some(a => 
    a.category === 'marketable_securities' && a.adjustedValue > 0
  );
  const heavyIntangibles = intangibleAssetRatio > 0.30; // >30% intangibles
  const significantGoodwill = assetBreakdown.some(a => 
    a.category === 'goodwill' && a.adjustedValue > totalAssets * 0.10
  );
  
  return {
    overallScore,
    scoreCategory: getScoreCategory(overallScore),
    tangibleAssetRatio,
    liquidAssetRatio,
    intangibleAssetRatio,
    categoryScores,
    hasExcessCash,
    hasMarketableSecurities,
    heavyIntangibles,
    significantGoodwill
  };
}

/**
 * Generate warnings based on NAV inputs and calculation results
 * Helps identify potential issues with data quality or calculation assumptions
 */
export function generateNAVWarnings(
  inputs: NAVInputs,
  result: NAVResult,
  balanceSheet: BalanceSheet
): NAVWarning[] {
  const warnings: NAVWarning[] = [];
  
  // Check for negative book value
  if (result.bookValueNAV < 0) {
    warnings.push({
      type: 'error',
      category: 'data_quality',
      message: 'Company has negative book value (liabilities exceed assets)',
      severity: 'high',
      suggestion: 'Verify balance sheet data accuracy and consider debt restructuring analysis'
    });
  }
  
  // Check for excessive goodwill/intangibles
  if (result.assetQuality.intangibleAssetRatio > 0.50) {
    warnings.push({
      type: 'warning',
      category: 'calculation',
      message: 'Intangible assets represent >50% of total assets',
      severity: 'medium',
      suggestion: 'Consider excluding intangibles for conservative NAV estimate'
    });
  }
  
  // Check for asset quality issues
  if (result.assetQuality.overallScore < 40) {
    warnings.push({
      type: 'warning',
      category: 'data_quality',
      message: 'Low asset quality score indicates potentially unreliable asset values',
      severity: 'medium',
      suggestion: 'Apply higher liquidation discounts and verify asset valuations'
    });
  }
  
  // Check for large adjustments
  const totalAdjustments = Math.abs(result.netAdjustments);
  if (totalAdjustments > balanceSheet.totalAssets * 0.25) {
    warnings.push({
      type: 'info',
      category: 'calculation',
      message: 'Large adjustments (>25% of assets) applied to book values',
      severity: 'low',
      suggestion: 'Document and validate significant adjustment assumptions'
    });
  }
  
  // Check for missing share count
  if (inputs.sharesOutstanding <= 0) {
    warnings.push({
      type: 'error',
      category: 'data_quality',
      message: 'Invalid shares outstanding count',
      severity: 'high',
      suggestion: 'Provide accurate shares outstanding for per-share calculations'
    });
  }
  
  // Check for outdated data (placeholder - would need actual date checking)
  warnings.push({
    type: 'info',
    category: 'data_quality',
    message: 'Verify balance sheet data is current and reflects recent financial position',
    severity: 'low',
    suggestion: 'Use most recent quarterly or annual financial statements'
  });
  
  return warnings;
}

/**
 * Main NAV calculation function that orchestrates all sub-calculations
 * This is the primary entry point for NAV analysis
 */
export function calculateNAV(inputs: NAVInputs, balanceSheet: BalanceSheet): NAVResult {
  // Validate inputs first
  const validation = validateNAVInputs(inputs, balanceSheet);
  if (!validation.isValid) {
    throw new Error(`Invalid NAV inputs: ${validation.errors.join(', ')}`);
  }
  
  // Calculate basic book value NAV
  const bookValueNAV = calculateBookValueNAV(balanceSheet);
  
  // Apply asset adjustments
  const assetBreakdown = applyAssetAdjustments(balanceSheet, inputs.assetAdjustments);
  
  // Apply intangible exclusions if specified
  if (!inputs.includeIntangibles || !inputs.includeGoodwill) {
    assetBreakdown.forEach(asset => {
      if (!inputs.includeIntangibles && asset.category === 'intangible_assets') {
        asset.adjustedValue = 0;
        asset.adjustmentAmount = -asset.bookValue;
        asset.adjustmentPercentage = -100;
      }
      if (!inputs.includeGoodwill && asset.category === 'goodwill') {
        asset.adjustedValue = 0;
        asset.adjustmentAmount = -asset.bookValue;
        asset.adjustmentPercentage = -100;
      }
    });
  }
  
  // Apply liability adjustments
  const liabilityBreakdown = applyLiabilityAdjustments(balanceSheet, inputs.liabilityAdjustments);
  
  // Calculate totals
  const totalAdjustedAssets = assetBreakdown.reduce((sum, asset) => sum + asset.adjustedValue, 0);
  const totalAdjustedLiabilities = liabilityBreakdown.reduce((sum, liability) => sum + liability.adjustedValue, 0);
  
  // Calculate adjusted NAV
  const adjustedNAV = totalAdjustedAssets - totalAdjustedLiabilities;
  const navPerShare = adjustedNAV / inputs.sharesOutstanding;
  const bookValuePerShare = bookValueNAV / inputs.sharesOutstanding;
  const netAdjustments = adjustedNAV - bookValueNAV;
  
  // Analyze asset quality
  const assetQuality = analyzeAssetQuality(assetBreakdown, balanceSheet);
  
  // Calculate liquidation scenarios
  const liquidationAnalysis: LiquidationAnalysis[] = [
    calculateLiquidationValue(assetBreakdown, 'orderly'),
    calculateLiquidationValue(assetBreakdown, 'quick'),
    calculateLiquidationValue(assetBreakdown, 'forced')
  ];
  
  // Update liquidation analysis with per-share values
  liquidationAnalysis.forEach(analysis => {
    analysis.liquidationValuePerShare = (analysis.totalLiquidationValue - totalAdjustedLiabilities) / inputs.sharesOutstanding;
  });
  
  // If custom liquidation scenario is specified
  if (inputs.liquidationScenario && inputs.customLiquidationDiscount) {
    const customAnalysis = calculateLiquidationValue(
      assetBreakdown, 
      inputs.liquidationScenario, 
      inputs.customLiquidationDiscount
    );
    customAnalysis.liquidationValuePerShare = (customAnalysis.totalLiquidationValue - totalAdjustedLiabilities) / inputs.sharesOutstanding;
    liquidationAnalysis.push(customAnalysis);
  }
  
  // Determine confidence level
  const confidenceLevel = determineConfidenceLevel(assetQuality, validation.warnings.length);
  
  // Generate result
  const result: NAVResult = {
    bookValueNAV,
    adjustedNAV,
    navPerShare,
    bookValuePerShare,
    totalAdjustedAssets,
    totalAdjustedLiabilities,
    netAdjustments,
    assetBreakdown,
    liabilityBreakdown,
    assetQuality,
    liquidationAnalysis,
    confidenceLevel,
    warnings: [], // Will be populated next
    calculationDate: new Date(),
    sharesOutstanding: inputs.sharesOutstanding
  };
  
  // Generate warnings
  result.warnings = generateNAVWarnings(inputs, result, balanceSheet);
  
  return result;
}

/**
 * Validate NAV inputs for common errors and data quality issues
 */
export function validateNAVInputs(inputs: NAVInputs, balanceSheet?: BalanceSheet): NAVValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Check shares outstanding
  if (inputs.sharesOutstanding <= 0) {
    errors.push('Shares outstanding must be positive');
  }
  
  if (inputs.sharesOutstanding > 100000000000) { // 100B shares seems excessive
    warnings.push('Unusually high shares outstanding count');
    suggestions.push('Verify shares outstanding figure is correct');
  }
  
  // Check balance sheet data
  if (balanceSheet) {
    if (balanceSheet.totalAssets <= 0) {
      errors.push('Total assets must be positive');
    }
    
    if (balanceSheet.totalLiabilities < 0) {
      errors.push('Total liabilities cannot be negative');
    }
    
    if (balanceSheet.totalAssets < balanceSheet.totalLiabilities) {
      warnings.push('Company has negative equity (assets < liabilities)');
      suggestions.push('Consider distressed valuation methods');
    }
  }
  
  // Check for reasonable adjustment magnitudes
  Object.values(inputs.assetAdjustments).flat().forEach(adjustment => {
    if (adjustment.adjustedValue < 0) {
      warnings.push(`Negative adjusted value for ${adjustment.description}`);
    }
    
    if (adjustment.bookValue > 0) {
      const adjustmentRatio = Math.abs(adjustment.adjustedValue - adjustment.bookValue) / adjustment.bookValue;
      if (adjustmentRatio > 2.0) { // >200% adjustment
        warnings.push(`Large adjustment (${(adjustmentRatio * 100).toFixed(0)}%) for ${adjustment.description}`);
        suggestions.push('Validate significant adjustments with supporting documentation');
      }
    }
  });
  
  // Check liquidation parameters
  if (inputs.customLiquidationDiscount !== undefined) {
    if (inputs.customLiquidationDiscount < 0 || inputs.customLiquidationDiscount > 1) {
      errors.push('Custom liquidation discount must be between 0 and 1');
    }
    
    if (inputs.customLiquidationDiscount > 0.8) {
      warnings.push('Very high liquidation discount (>80%) applied');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Calculate sensitivity analysis for NAV
 */
export function calculateNAVSensitivity(
  inputs: NAVInputs,
  balanceSheet: BalanceSheet,
  assetValueChanges: number[] = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3],
  liquidationDiscounts: number[] = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]
): NAVSensitivity {
  const baseResult = calculateNAV(inputs, balanceSheet);
  const baseNAV = baseResult.navPerShare;
  
  // Asset value sensitivity
  const assetValueSensitivity = assetValueChanges.map(change => {
    const modifiedInputs = { ...inputs };
    
    // Apply percentage change to all asset adjustments
    Object.keys(modifiedInputs.assetAdjustments).forEach(categoryKey => {
      const category = categoryKey as AssetCategory;
      modifiedInputs.assetAdjustments[category] = modifiedInputs.assetAdjustments[category].map(adj => ({
        ...adj,
        adjustedValue: adj.adjustedValue * (1 + change)
      }));
    });
    
    // Also apply percentage change to estimated asset values by modifying the balance sheet
    const modifiedBalanceSheet = {
      ...balanceSheet,
      totalAssets: balanceSheet.totalAssets * (1 + change)
    };
    
    const result = calculateNAV(modifiedInputs, modifiedBalanceSheet);
    return {
      adjustmentPercentage: change * 100,
      navPerShare: result.navPerShare,
      percentChange: ((result.navPerShare - baseNAV) / baseNAV) * 100
    };
  });
  
  // Liquidation sensitivity
  const liquidationSensitivity = liquidationDiscounts.map(discount => {
    const assetBreakdown = applyAssetAdjustments(balanceSheet, inputs.assetAdjustments);
    const liquidationAnalysis = calculateLiquidationValue(assetBreakdown, 'orderly', discount);
    const liabilityBreakdown = applyLiabilityAdjustments(balanceSheet, inputs.liabilityAdjustments);
    const totalLiabilities = liabilityBreakdown.reduce((sum, l) => sum + l.adjustedValue, 0);
    
    const liquidationValue = (liquidationAnalysis.totalLiquidationValue - totalLiabilities) / inputs.sharesOutstanding;
    
    return {
      discountRate: discount,
      liquidationValue,
      percentChange: ((liquidationValue - baseNAV) / baseNAV) * 100
    };
  });
  
  // Intangible asset sensitivity
  const withIntangiblesInputs = { ...inputs, includeIntangibles: true };
  const withoutIntangiblesInputs = { ...inputs, includeIntangibles: false };
  
  const withIntangibles = calculateNAV(withIntangiblesInputs, balanceSheet).navPerShare;
  const withoutIntangibles = calculateNAV(withoutIntangiblesInputs, balanceSheet).navPerShare;
  
  return {
    baseNAV,
    assetValueSensitivity,
    liquidationSensitivity,
    intangibleSensitivity: {
      withIntangibles,
      withoutIntangibles,
      difference: withIntangibles - withoutIntangibles,
      percentImpact: ((withIntangibles - withoutIntangibles) / withoutIntangibles) * 100
    }
  };
}

// Helper functions

function calculateAssetCategoryQuality(
  category: AssetCategory, 
  adjustments: Array<{ amount: number; description: string }>
): number {
  // Base quality score from predefined weights
  let baseScore = ASSET_QUALITY_WEIGHTS[category] * 100;
  
  // Adjust based on confidence levels of adjustments
  if (adjustments.length > 0) {
    const avgConfidence = adjustments.reduce((sum, adj) => {
      const confidenceScore = adj.confidenceLevel === 'high' ? 1.0 : 
                            adj.confidenceLevel === 'medium' ? 0.8 : 0.6;
      return sum + confidenceScore;
    }, 0) / adjustments.length;
    
    baseScore = baseScore * avgConfidence;
  }
  
  return Math.max(0, Math.min(100, baseScore));
}

function getCategoryDescription(category: AssetCategory): string {
  const descriptions: Record<AssetCategory, string> = {
    cash_and_equivalents: 'Cash and Cash Equivalents',
    marketable_securities: 'Marketable Securities',
    accounts_receivable: 'Accounts Receivable',
    inventory: 'Inventory',
    prepaid_expenses: 'Prepaid Expenses',
    property_plant_equipment: 'Property, Plant & Equipment',
    intangible_assets: 'Intangible Assets',
    goodwill: 'Goodwill',
    investments: 'Investments',
    other_assets: 'Other Assets'
  };
  return descriptions[category];
}

function getLiabilityCategoryDescription(category: LiabilityCategory): string {
  const descriptions: Record<LiabilityCategory, string> = {
    accounts_payable: 'Accounts Payable',
    accrued_expenses: 'Accrued Expenses',
    short_term_debt: 'Short-term Debt',
    long_term_debt: 'Long-term Debt',
    pension_obligations: 'Pension Obligations',
    deferred_tax_liabilities: 'Deferred Tax Liabilities',
    contingent_liabilities: 'Contingent Liabilities',
    other_liabilities: 'Other Liabilities'
  };
  return descriptions[category];
}

function getAssetMarketability(category: AssetCategory): 'high' | 'medium' | 'low' {
  const marketability: Record<AssetCategory, 'high' | 'medium' | 'low'> = {
    cash_and_equivalents: 'high',
    marketable_securities: 'high',
    accounts_receivable: 'medium',
    inventory: 'medium',
    prepaid_expenses: 'low',
    property_plant_equipment: 'medium',
    intangible_assets: 'low',
    goodwill: 'low',
    investments: 'medium',
    other_assets: 'low'
  };
  return marketability[category];
}

function getLiquidationTimeFrame(scenario: LiquidationScenario): string {
  const timeFrames: Record<LiquidationScenario, string> = {
    orderly: '12-24 months',
    quick: '3-6 months',
    forced: '1-3 months'
  };
  return timeFrames[scenario];
}

function getScoreCategory(score: number): AssetQualityScore {
  if (score >= 80) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 30) return 'poor';
  return 'very_poor';
}

function determineConfidenceLevel(
  assetQuality: AssetQualityAnalysis, 
  warningCount: number
): 'high' | 'medium' | 'low' {
  if (assetQuality.overallScore >= 70 && warningCount <= 2) {
    return 'high';
  }
  if (assetQuality.overallScore >= 50 && warningCount <= 5) {
    return 'medium';
  }
  return 'low';
}