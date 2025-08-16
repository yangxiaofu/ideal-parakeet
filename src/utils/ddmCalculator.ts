/**
 * Dividend Discount Model (DDM) calculation utilities
 */

import type {
  DDMInputs,
  DDMResult,
  DDMValidation,
  DividendProjection,
  DDMSensitivity
} from '../types/ddm';

/**
 * Main DDM calculation function that routes to appropriate model
 */
export function calculateDDM(inputs: DDMInputs): DDMResult {
  // Validate inputs first
  const validation = validateDDMInputs(inputs);
  if (!validation.isValid) {
    throw new Error(`Invalid DDM inputs: ${validation.errors.join(', ')}`);
  }

  switch (inputs.modelType) {
    case 'gordon':
      return calculateGordonGrowthModel(inputs);
    case 'zero':
      return calculateZeroGrowthDDM(inputs);
    case 'two-stage':
      return calculateTwoStageDDM(inputs);
    case 'multi-stage':
      return calculateMultiStageDDM(inputs);
    default:
      throw new Error(`Unknown DDM model type: ${inputs.modelType}`);
  }
}

/**
 * Gordon Growth Model (Constant Growth DDM)
 * P = D1 / (r - g)
 */
export function calculateGordonGrowthModel(inputs: DDMInputs): DDMResult {
  const { currentDividend, sharesOutstanding, requiredReturn, gordonGrowthRate = 0 } = inputs;
  
  // Calculate next year's dividend (D1)
  const nextDividend = currentDividend * (1 + gordonGrowthRate);
  
  // Calculate intrinsic value per share
  const intrinsicValuePerShare = nextDividend / (requiredReturn - gordonGrowthRate);
  
  // Generate dividend projections for visualization (10 years)
  const projections: DividendProjection[] = [];
  for (let year = 1; year <= 10; year++) {
    const dividend = currentDividend * Math.pow(1 + gordonGrowthRate, year);
    const discountFactor = Math.pow(1 + requiredReturn, year);
    const presentValue = dividend / discountFactor;
    
    projections.push({
      year,
      dividend,
      presentValue,
      growthRate: gordonGrowthRate,
      discountFactor: 1 / discountFactor
    });
  }
  
  return {
    intrinsicValue: intrinsicValuePerShare * sharesOutstanding,
    intrinsicValuePerShare,
    currentDividendYield: currentDividend / intrinsicValuePerShare,
    forwardDividendYield: nextDividend / intrinsicValuePerShare,
    dividendProjections: projections,
    modelType: 'gordon',
    totalPVofDividends: intrinsicValuePerShare, // In Gordon model, this equals the total value
    yearsProjected: Infinity // Gordon model assumes perpetual growth
  };
}

/**
 * Zero Growth DDM
 * P = D / r
 */
export function calculateZeroGrowthDDM(inputs: DDMInputs): DDMResult {
  const { currentDividend, sharesOutstanding, requiredReturn } = inputs;
  
  // For zero growth, value is simply dividend divided by required return
  const intrinsicValuePerShare = currentDividend / requiredReturn;
  
  // Generate dividend projections (constant for 10 years)
  const projections: DividendProjection[] = [];
  for (let year = 1; year <= 10; year++) {
    const discountFactor = Math.pow(1 + requiredReturn, year);
    const presentValue = currentDividend / discountFactor;
    
    projections.push({
      year,
      dividend: currentDividend,
      presentValue,
      growthRate: 0,
      discountFactor: 1 / discountFactor
    });
  }
  
  return {
    intrinsicValue: intrinsicValuePerShare * sharesOutstanding,
    intrinsicValuePerShare,
    currentDividendYield: currentDividend / intrinsicValuePerShare,
    forwardDividendYield: currentDividend / intrinsicValuePerShare,
    dividendProjections: projections,
    modelType: 'zero',
    totalPVofDividends: intrinsicValuePerShare,
    yearsProjected: Infinity
  };
}

/**
 * Two-Stage DDM
 * Stage 1: High growth for n years
 * Stage 2: Stable growth perpetually
 */
export function calculateTwoStageDDM(inputs: DDMInputs): DDMResult {
  const {
    currentDividend,
    sharesOutstanding,
    requiredReturn,
    highGrowthRate = 0,
    highGrowthYears = 5,
    stableGrowthRate = 0
  } = inputs;
  
  const projections: DividendProjection[] = [];
  let totalPV = 0;
  
  // Stage 1: High growth period
  for (let year = 1; year <= highGrowthYears; year++) {
    const dividend = currentDividend * Math.pow(1 + highGrowthRate, year);
    const discountFactor = Math.pow(1 + requiredReturn, year);
    const presentValue = dividend / discountFactor;
    
    totalPV += presentValue;
    projections.push({
      year,
      dividend,
      presentValue,
      growthRate: highGrowthRate,
      discountFactor: 1 / discountFactor
    });
  }
  
  // Stage 2: Calculate terminal value at end of high growth period
  const lastHighGrowthDividend = currentDividend * Math.pow(1 + highGrowthRate, highGrowthYears);
  const firstStableDividend = lastHighGrowthDividend * (1 + stableGrowthRate);
  const terminalValue = firstStableDividend / (requiredReturn - stableGrowthRate);
  const terminalDiscountFactor = Math.pow(1 + requiredReturn, highGrowthYears);
  const terminalValuePV = terminalValue / terminalDiscountFactor;
  
  // Add a few years of stable growth for visualization
  for (let year = highGrowthYears + 1; year <= highGrowthYears + 5; year++) {
    const yearsIntoStable = year - highGrowthYears;
    const dividend = lastHighGrowthDividend * Math.pow(1 + stableGrowthRate, yearsIntoStable);
    const discountFactor = Math.pow(1 + requiredReturn, year);
    const presentValue = dividend / discountFactor;
    
    projections.push({
      year,
      dividend,
      presentValue,
      growthRate: stableGrowthRate,
      discountFactor: 1 / discountFactor
    });
  }
  
  const intrinsicValuePerShare = totalPV + terminalValuePV;
  
  return {
    intrinsicValue: intrinsicValuePerShare * sharesOutstanding,
    intrinsicValuePerShare,
    currentDividendYield: currentDividend / intrinsicValuePerShare,
    forwardDividendYield: (currentDividend * (1 + highGrowthRate)) / intrinsicValuePerShare,
    dividendProjections: projections,
    terminalValue,
    terminalValuePV,
    modelType: 'two-stage',
    totalPVofDividends: totalPV,
    yearsProjected: highGrowthYears
  };
}

/**
 * Multi-Stage DDM (Three or more stages)
 */
export function calculateMultiStageDDM(inputs: DDMInputs): DDMResult {
  const {
    currentDividend,
    sharesOutstanding,
    requiredReturn,
    growthPhases = []
  } = inputs;
  
  if (growthPhases.length < 2) {
    throw new Error('Multi-stage DDM requires at least 2 growth phases');
  }
  
  const projections: DividendProjection[] = [];
  let totalPV = 0;
  let currentYear = 0;
  let lastDividend = currentDividend;
  
  // Process each growth phase except the last (which is terminal)
  for (let phaseIndex = 0; phaseIndex < growthPhases.length - 1; phaseIndex++) {
    const phase = growthPhases[phaseIndex];
    
    for (let yearInPhase = 1; yearInPhase <= phase.years; yearInPhase++) {
      currentYear++;
      const dividend = lastDividend * (1 + phase.growthRate);
      const discountFactor = Math.pow(1 + requiredReturn, currentYear);
      const presentValue = dividend / discountFactor;
      
      totalPV += presentValue;
      projections.push({
        year: currentYear,
        dividend,
        presentValue,
        growthRate: phase.growthRate,
        discountFactor: 1 / discountFactor
      });
      
      lastDividend = dividend;
    }
  }
  
  // Terminal phase (last phase is assumed to be perpetual)
  const terminalPhase = growthPhases[growthPhases.length - 1];
  const terminalDividend = lastDividend * (1 + terminalPhase.growthRate);
  const terminalValue = terminalDividend / (requiredReturn - terminalPhase.growthRate);
  const terminalDiscountFactor = Math.pow(1 + requiredReturn, currentYear);
  const terminalValuePV = terminalValue / terminalDiscountFactor;
  
  // Add a few years of terminal growth for visualization
  for (let year = 1; year <= 5; year++) {
    const dividend = lastDividend * Math.pow(1 + terminalPhase.growthRate, year);
    const discountFactor = Math.pow(1 + requiredReturn, currentYear + year);
    const presentValue = dividend / discountFactor;
    
    projections.push({
      year: currentYear + year,
      dividend,
      presentValue,
      growthRate: terminalPhase.growthRate,
      discountFactor: 1 / discountFactor
    });
  }
  
  const intrinsicValuePerShare = totalPV + terminalValuePV;
  
  return {
    intrinsicValue: intrinsicValuePerShare * sharesOutstanding,
    intrinsicValuePerShare,
    currentDividendYield: currentDividend / intrinsicValuePerShare,
    forwardDividendYield: (currentDividend * (1 + growthPhases[0].growthRate)) / intrinsicValuePerShare,
    dividendProjections: projections,
    terminalValue,
    terminalValuePV,
    modelType: 'multi-stage',
    totalPVofDividends: totalPV,
    yearsProjected: currentYear
  };
}

/**
 * Validate DDM inputs
 */
export function validateDDMInputs(inputs: DDMInputs): DDMValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Common validations
  if (inputs.currentDividend < 0) {
    errors.push('Current dividend cannot be negative');
  }
  
  if (inputs.currentDividend === 0) {
    warnings.push('Current dividend is zero - company may not be suitable for DDM');
  }
  
  if (inputs.sharesOutstanding <= 0) {
    errors.push('Shares outstanding must be positive');
  }
  
  if (inputs.requiredReturn <= 0) {
    errors.push('Required return must be positive');
  }
  
  if (inputs.requiredReturn > 0.5) {
    warnings.push('Required return seems very high (>50%)');
  }
  
  // Model-specific validations
  switch (inputs.modelType) {
    case 'gordon':
      if (inputs.gordonGrowthRate !== undefined) {
        if (inputs.gordonGrowthRate >= inputs.requiredReturn) {
          errors.push('Growth rate must be less than required return for Gordon model');
        }
        if (inputs.gordonGrowthRate > 0.15) {
          warnings.push('Growth rate >15% may not be sustainable long-term');
        }
        if (inputs.gordonGrowthRate < -0.1) {
          warnings.push('Negative growth rate <-10% may indicate distressed company');
        }
      }
      break;
      
    case 'two-stage':
      if (inputs.highGrowthRate !== undefined && inputs.stableGrowthRate !== undefined) {
        if (inputs.stableGrowthRate >= inputs.requiredReturn) {
          errors.push('Stable growth rate must be less than required return');
        }
        if (inputs.highGrowthRate < inputs.stableGrowthRate) {
          warnings.push('High growth rate is less than stable rate - consider using Gordon model');
        }
        if ((inputs.highGrowthYears || 0) > 10) {
          warnings.push('High growth period >10 years may be unrealistic');
        }
      }
      break;
      
    case 'multi-stage':
      if (inputs.growthPhases && inputs.growthPhases.length > 0) {
        const terminalGrowth = inputs.growthPhases[inputs.growthPhases.length - 1].growthRate;
        if (terminalGrowth >= inputs.requiredReturn) {
          errors.push('Terminal growth rate must be less than required return');
        }
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculate sensitivity analysis for DDM
 */
export function calculateDDMSensitivity(
  inputs: DDMInputs,
  growthRateRange: number[] = [-0.02, -0.01, 0, 0.01, 0.02],
  discountRateRange: number[] = [-0.02, -0.01, 0, 0.01, 0.02]
): DDMSensitivity {
  const baseResult = calculateDDM(inputs);
  const baseValue = baseResult.intrinsicValuePerShare;
  
  // Growth rate sensitivity
  const growthRateSensitivity = growthRateRange.map(delta => {
    const modifiedInputs = { ...inputs };
    if (inputs.modelType === 'gordon' && inputs.gordonGrowthRate !== undefined) {
      modifiedInputs.gordonGrowthRate = inputs.gordonGrowthRate + delta;
    } else if (inputs.modelType === 'two-stage' && inputs.stableGrowthRate !== undefined) {
      modifiedInputs.stableGrowthRate = inputs.stableGrowthRate + delta;
    }
    
    try {
      const result = calculateDDM(modifiedInputs);
      return {
        growthRate: (modifiedInputs.gordonGrowthRate || modifiedInputs.stableGrowthRate || 0),
        value: result.intrinsicValuePerShare,
        percentChange: ((result.intrinsicValuePerShare - baseValue) / baseValue) * 100
      };
    } catch {
      return {
        growthRate: 0,
        value: 0,
        percentChange: 0
      };
    }
  });
  
  // Discount rate sensitivity
  const discountRateSensitivity = discountRateRange.map(delta => {
    const modifiedInputs = {
      ...inputs,
      requiredReturn: inputs.requiredReturn + delta
    };
    
    try {
      const result = calculateDDM(modifiedInputs);
      return {
        discountRate: modifiedInputs.requiredReturn,
        value: result.intrinsicValuePerShare,
        percentChange: ((result.intrinsicValuePerShare - baseValue) / baseValue) * 100
      };
    } catch {
      return {
        discountRate: modifiedInputs.requiredReturn,
        value: 0,
        percentChange: 0
      };
    }
  });
  
  // Matrix sensitivity (growth vs discount rate)
  const matrix = growthRateRange.map(growthDelta => {
    const values = discountRateRange.map(discountDelta => {
      const modifiedInputs = { ...inputs };
      
      if (inputs.modelType === 'gordon' && inputs.gordonGrowthRate !== undefined) {
        modifiedInputs.gordonGrowthRate = inputs.gordonGrowthRate + growthDelta;
      }
      modifiedInputs.requiredReturn = inputs.requiredReturn + discountDelta;
      
      try {
        const result = calculateDDM(modifiedInputs);
        return {
          discountRate: modifiedInputs.requiredReturn,
          value: result.intrinsicValuePerShare
        };
      } catch {
        return {
          discountRate: modifiedInputs.requiredReturn,
          value: 0
        };
      }
    });
    
    return {
      growthRate: (inputs.gordonGrowthRate || 0) + growthDelta,
      values
    };
  });
  
  return {
    baseValue,
    growthRateSensitivity,
    discountRateSensitivity,
    matrix
  };
}

/**
 * Calculate implied growth rate from current price
 * For Gordon model: g = r - (D1 / P0)
 */
export function calculateImpliedGrowthRate(
  currentPrice: number,
  currentDividend: number,
  requiredReturn: number
): number {
  const dividendYield = currentDividend / currentPrice;
  return requiredReturn - dividendYield;
}

/**
 * Calculate historical dividend growth rate
 */
export function calculateHistoricalDividendGrowth(
  dividends: Array<{ year: string; value: number }>
): number {
  if (dividends.length < 2) return 0;
  
  // Sort by year to ensure correct order
  const sorted = [...dividends].sort((a, b) => parseInt(a.year) - parseInt(b.year));
  
  // Calculate CAGR
  const firstValue = sorted[0].value;
  const lastValue = sorted[sorted.length - 1].value;
  const years = sorted.length - 1;
  
  if (firstValue <= 0 || lastValue <= 0) return 0;
  
  return Math.pow(lastValue / firstValue, 1 / years) - 1;
}