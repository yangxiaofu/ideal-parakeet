/**
 * Capital Allocation Assessment Module
 * 
 * Evaluates management's capital allocation decisions and their impact on shareholder value.
 * Good capital allocation is essential for maintaining and growing competitive advantages.
 */

import type { CompanyFinancials, BalanceSheet, CashFlowStatement } from '../types';
import { type ROICAnalysis } from './roicCalculator';

export type AllocationGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface CapitalAllocationMetrics {
  reinvestmentRate: number; // CapEx / Operating Cash Flow
  incrementalROIC: number; // Change in NOPAT / Change in Invested Capital
  dividendConsistency: number; // 0-1, consistency of dividend payments
  buybackEffectiveness: number; // Average price paid vs current price
  acquisitionReturns?: number; // Estimated returns from M&A activity
  debtManagement: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface CapitalAllocationAssessment {
  grade: AllocationGrade;
  score: number; // 0-100
  metrics: CapitalAllocationMetrics;
  strengths: string[];
  weaknesses: string[];
  trend: 'improving' | 'stable' | 'deteriorating';
  recommendation: string;
}

/**
 * Calculate reinvestment rate
 * Shows how much of operating cash flow is being reinvested in the business
 */
function calculateReinvestmentRate(
  cashFlowStatements: CashFlowStatement[]
): number {
  if (cashFlowStatements.length === 0) return 0;
  
  const recentCF = cashFlowStatements.slice(0, Math.min(3, cashFlowStatements.length));
  const avgCapEx = recentCF.reduce((sum, cf) => sum + Math.abs(cf.capitalExpenditure), 0) / recentCF.length;
  const avgOCF = recentCF.reduce((sum, cf) => sum + cf.operatingCashFlow, 0) / recentCF.length;
  
  if (avgOCF <= 0) return 0;
  return Math.min(avgCapEx / avgOCF, 1);
}

/**
 * Calculate incremental ROIC
 * Measures the return on new invested capital
 */
function calculateIncrementalROIC(
  roicAnalysis: ROICAnalysis
): number {
  const historicalROIC = roicAnalysis.historicalROIC;
  if (historicalROIC.length < 2) return roicAnalysis.averageROIC;
  
  // Compare change in NOPAT to change in invested capital
  const recent = historicalROIC[0];
  const previous = historicalROIC[1];
  
  const changeInNOPAT = recent.nopat - previous.nopat;
  const changeInCapital = recent.investedCapital - previous.investedCapital;
  
  if (changeInCapital <= 0) return roicAnalysis.averageROIC;
  
  return changeInNOPAT / changeInCapital;
}

/**
 * Analyze dividend consistency
 */
function analyzeDividendConsistency(
  cashFlowStatements: CashFlowStatement[]
): number {
  if (cashFlowStatements.length < 3) return 0;
  
  const dividends = cashFlowStatements.map(cf => Math.abs(cf.dividendsPaid || 0));
  const nonZeroDividends = dividends.filter(d => d > 0);
  
  // No dividends or inconsistent dividends
  if (nonZeroDividends.length === 0) return 0;
  if (nonZeroDividends.length < dividends.length * 0.8) return 0.3; // Paid less than 80% of the time
  
  // Calculate consistency of dividend amounts
  const avgDividend = nonZeroDividends.reduce((sum, d) => sum + d, 0) / nonZeroDividends.length;
  const variance = nonZeroDividends.reduce((sum, d) => sum + Math.pow(d - avgDividend, 2), 0) / nonZeroDividends.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / avgDividend;
  
  // Lower CV means more consistent dividends
  return Math.max(0, 1 - coefficientOfVariation);
}

/**
 * Analyze debt management quality
 */
function analyzeDebtManagement(
  balanceSheets: BalanceSheet[]
): 'excellent' | 'good' | 'fair' | 'poor' {
  if (balanceSheets.length === 0) return 'fair';
  
  const latest = balanceSheets[0];
  const totalDebt = (latest.shortTermDebt || 0) + (latest.longTermDebt || 0);
  const equity = latest.totalEquity;
  
  if (equity <= 0) return 'poor';
  
  const debtToEquity = totalDebt / equity;
  
  // Assess based on debt levels and trends
  if (debtToEquity < 0.3) return 'excellent';
  if (debtToEquity < 0.6) return 'good';
  if (debtToEquity < 1.0) return 'fair';
  return 'poor';
}

/**
 * Main function to assess capital allocation
 */
export function assessCapitalAllocation(
  financials: CompanyFinancials,
  roicAnalysis: ROICAnalysis
): CapitalAllocationAssessment {
  const { balanceSheet, cashFlowStatement } = financials;
  
  // Calculate metrics
  const reinvestmentRate = calculateReinvestmentRate(cashFlowStatement);
  const incrementalROIC = calculateIncrementalROIC(roicAnalysis);
  const dividendConsistency = analyzeDividendConsistency(cashFlowStatement);
  const debtManagement = analyzeDebtManagement(balanceSheet);
  
  // For buyback effectiveness, we'd need stock price history - using placeholder
  const buybackEffectiveness = 0.5; // Neutral assumption
  
  const metrics: CapitalAllocationMetrics = {
    reinvestmentRate,
    incrementalROIC,
    dividendConsistency,
    buybackEffectiveness,
    debtManagement
  };
  
  // Score components (0-100 scale)
  let score = 0;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  
  // 1. ROIC trend (30 points)
  if (roicAnalysis.trend === 'improving') {
    score += 30;
    strengths.push('Improving returns on invested capital');
  } else if (roicAnalysis.trend === 'stable' && roicAnalysis.averageROIC > 0.12) {
    score += 20;
    strengths.push('Stable high returns on capital');
  } else if (roicAnalysis.trend === 'declining') {
    score += 5;
    weaknesses.push('Declining returns on invested capital');
  } else {
    score += 10;
  }
  
  // 2. Incremental ROIC vs Average (25 points)
  if (incrementalROIC > roicAnalysis.averageROIC * 1.2) {
    score += 25;
    strengths.push('New investments generating superior returns');
  } else if (incrementalROIC > roicAnalysis.averageROIC) {
    score += 20;
    strengths.push('New investments maintaining return levels');
  } else if (incrementalROIC > (roicAnalysis.currentWACC || 0.08)) {
    score += 15;
  } else {
    score += 5;
    weaknesses.push('New investments generating sub-par returns');
  }
  
  // 3. Reinvestment efficiency (20 points)
  if (reinvestmentRate > 0.3 && reinvestmentRate < 0.7 && incrementalROIC > 0.15) {
    score += 20;
    strengths.push('Balanced reinvestment with high returns');
  } else if (reinvestmentRate > 0.8) {
    score += 5;
    weaknesses.push('Excessive capital intensity');
  } else if (reinvestmentRate < 0.2 && roicAnalysis.averageROIC > 0.20) {
    score += 15;
    strengths.push('Capital-light business model');
  } else {
    score += 10;
  }
  
  // 4. Shareholder returns (15 points)
  if (dividendConsistency > 0.8) {
    score += 15;
    strengths.push('Consistent dividend payments');
  } else if (dividendConsistency > 0.5) {
    score += 10;
  } else if (dividendConsistency > 0) {
    score += 5;
  }
  
  // 5. Debt management (10 points)
  if (debtManagement === 'excellent') {
    score += 10;
    strengths.push('Conservative balance sheet');
  } else if (debtManagement === 'good') {
    score += 7;
  } else if (debtManagement === 'fair') {
    score += 4;
  } else {
    weaknesses.push('High debt levels');
  }
  
  // Determine grade
  let grade: AllocationGrade;
  if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 55) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';
  
  // Determine trend
  let trend: 'improving' | 'stable' | 'deteriorating' = 'stable';
  if (roicAnalysis.trend === 'improving' && incrementalROIC > roicAnalysis.averageROIC) {
    trend = 'improving';
  } else if (roicAnalysis.trend === 'declining' || incrementalROIC < roicAnalysis.averageROIC * 0.8) {
    trend = 'deteriorating';
  }
  
  // Generate recommendation
  let recommendation = '';
  if (grade === 'A' || grade === 'B') {
    recommendation = 'Management demonstrates strong capital allocation skills. The company is creating value through disciplined investment decisions.';
  } else if (grade === 'C') {
    recommendation = 'Capital allocation is adequate but could be improved. Monitor for signs of value-destructive investments.';
  } else {
    recommendation = 'Poor capital allocation is destroying shareholder value. Management should focus on improving returns or returning more capital to shareholders.';
  }
  
  return {
    grade,
    score,
    metrics,
    strengths,
    weaknesses,
    trend,
    recommendation
  };
}