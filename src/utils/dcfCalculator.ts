// DCF Calculator - Pure calculation functions for Discounted Cash Flow valuation

import type { DCFInputs, DCFProjections, DCFResult } from '../types';

/**
 * Calculate present value of a future cash flow
 * Formula: PV = FV / (1 + r)^n
 */
export function calculatePresentValue(
  futureValue: number,
  discountRate: number,
  year: number
): number {
  if (discountRate === 0) {
    return futureValue;
  }
  return futureValue / Math.pow(1 + discountRate, year);
}

/**
 * Calculate terminal value using perpetual growth model
 * Formula: TV = FCF * (1 + g) / (r - g)
 */
export function calculateTerminalValue(
  finalYearFCF: number,
  terminalGrowthRate: number,
  discountRate: number
): number {
  if (terminalGrowthRate >= discountRate) {
    throw new Error('Terminal growth rate must be less than discount rate');
  }
  
  const growthAdjustedFCF = finalYearFCF * (1 + terminalGrowthRate);
  return growthAdjustedFCF / (discountRate - terminalGrowthRate);
}

/**
 * Project free cash flows for specified years with growth rates
 */
export function projectFreeCashFlows(
  baseFCF: number,
  growthRates: number[]
): DCFProjections[] {
  const projections: DCFProjections[] = [];
  let currentFCF = baseFCF;

  for (let i = 0; i < growthRates.length; i++) {
    const growthRate = growthRates[i];
    currentFCF = currentFCF * (1 + growthRate);
    
    projections.push({
      year: i + 1,
      freeCashFlow: currentFCF,
      presentValue: 0, // Will be calculated separately
      growthRate: growthRate
    });
  }

  return projections;
}

/**
 * Calculate complete DCF intrinsic value
 */
export function calculateDCFIntrinsicValue(inputs: DCFInputs): DCFResult {
  validateDCFInputs(inputs);

  // Project future cash flows
  const projections = projectFreeCashFlows(inputs.baseFCF, inputs.fcfGrowthRates);
  
  // Calculate present value for each projection
  projections.forEach(projection => {
    projection.presentValue = calculatePresentValue(
      projection.freeCashFlow,
      inputs.discountRate,
      projection.year
    );
  });

  // Calculate terminal value
  const finalYearFCF = projections[projections.length - 1].freeCashFlow;
  const terminalValue = calculateTerminalValue(
    finalYearFCF,
    inputs.terminalGrowthRate,
    inputs.discountRate
  );

  // Calculate present value of terminal value
  const terminalPresentValue = calculatePresentValue(
    terminalValue,
    inputs.discountRate,
    inputs.projectionYears
  );

  // Sum all present values
  const projectionsPresentValue = projections.reduce(
    (sum, projection) => sum + projection.presentValue,
    0
  );
  const totalPresentValue = projectionsPresentValue + terminalPresentValue;

  // Calculate intrinsic value per share
  const intrinsicValuePerShare = totalPresentValue / inputs.sharesOutstanding;

  return {
    method: 'DCF',
    scenario: inputs.scenario,
    projections,
    terminalValue,
    totalPresentValue,
    intrinsicValue: intrinsicValuePerShare,
    intrinsicValuePerShare,
    sharesOutstanding: inputs.sharesOutstanding,
    confidence: 'medium' // Default confidence level
  };
}

/**
 * Validate DCF inputs for common errors
 */
export function validateDCFInputs(inputs: DCFInputs): void {
  if (inputs.baseFCF <= 0) {
    throw new Error('Base FCF must be positive');
  }

  if (inputs.discountRate <= 0) {
    throw new Error('Discount rate must be positive');
  }

  if (inputs.sharesOutstanding <= 0) {
    throw new Error('Shares outstanding must be positive');
  }

  if (inputs.fcfGrowthRates.length !== inputs.projectionYears) {
    throw new Error('Growth rates array length must match projection years');
  }

  if (inputs.terminalGrowthRate >= inputs.discountRate) {
    throw new Error('Terminal growth rate must be less than discount rate');
  }

  if (inputs.projectionYears <= 0) {
    throw new Error('Projection years must be positive');
  }
}