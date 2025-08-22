// Growth pattern utility functions for DCF calculator
// Follows SoC by separating business logic from UI components

export type DistributionType = 'front-loaded' | 'balanced';
export type FrontLoadIntensity = 'light' | 'medium' | 'heavy' | 'extreme';
export type ScenarioType = 'bull' | 'base' | 'bear';

export interface PatternConfig {
  startRate: number;
  endRate: number;
  distribution: DistributionType;
  intensity: FrontLoadIntensity;
}

/**
 * Generate a decay pattern with distribution controls
 * @param start - Starting growth rate (decimal, e.g., 0.075 for 7.5%)
 * @param end - Ending growth rate (decimal, e.g., 0.05 for 5%)
 * @param years - Number of projection years
 * @param distribution - Distribution type: 'balanced' (linear) or 'front-loaded'
 * @param frontLoadIntensity - Intensity of front-loading for non-linear distributions
 * @returns Array of growth rates for each year
 */
export const generateDecayPattern = (
  start: number,
  end: number,
  years: number,
  distribution: DistributionType = 'balanced',
  frontLoadIntensity: FrontLoadIntensity = 'medium'
): number[] => {
  const rates: number[] = [];
  
  for (let i = 0; i < years; i++) {
    let progress = i / Math.max(years - 1, 1);
    
    // Apply distribution curve
    if (distribution === 'front-loaded') {
      // Apply front-loading based on intensity
      const intensity = {
        light: 1.5,    // 60/40 split
        medium: 2.0,   // 70/30 split
        heavy: 3.0,    // 80/20 split
        extreme: 5.0   // 90/10 split
      }[frontLoadIntensity];
      
      progress = Math.pow(progress, intensity);
    }
    // 'balanced' uses linear progress
    
    // Linear interpolation with distribution curve
    const rate = start - (start - end) * progress;
    rates.push(Math.round(rate * 1000) / 1000); // Round to 0.1%
  }
  
  return rates;
};

/**
 * Generate predefined growth patterns for common scenarios
 * @param scenario - Bull, base, or bear case scenario
 * @param years - Number of projection years
 * @returns Array of growth rates for each year
 */
export const generateGrowthPattern = (scenario: ScenarioType, years: number): number[] => {
  switch(scenario) {
    case 'bull':
      // Start at 20%, decay to 5% over the period
      return generateDecayPattern(0.20, 0.05, years, 'balanced');
    case 'base':
      // Start at 7.5%, decay to 5% over the period
      return generateDecayPattern(0.075, 0.05, years, 'balanced');
    case 'bear':
      // Start at 5%, decay to 2% over the period
      return generateDecayPattern(0.05, 0.02, years, 'balanced');
    default:
      return generateDecayPattern(0.075, 0.05, years, 'balanced');
  }
};

/**
 * Generate custom pattern with user-defined parameters
 * @param config - Pattern configuration object
 * @param years - Number of projection years
 * @returns Array of growth rates for each year
 */
export const generateCustomPattern = (
  config: PatternConfig,
  years: number
): number[] => {
  return generateDecayPattern(
    config.startRate,
    config.endRate,
    years,
    config.distribution,
    config.intensity
  );
};

/**
 * Validate growth rate pattern for business logic constraints
 * @param rates - Array of growth rates to validate
 * @param terminalGrowthRate - Terminal growth rate for comparison
 * @returns Validation result with warnings/errors
 */
export const validateGrowthPattern = (
  rates: number[],
  terminalGrowthRate: number
): { isValid: boolean; warnings: string[]; errors: string[] } => {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for extremely high growth rates
  rates.forEach((rate, index) => {
    if (rate > 0.30) {
      warnings.push(`Year ${index + 1}: Growth rate ${(rate * 100).toFixed(1)}% is very high`);
    }
    if (rate > 0.50) {
      errors.push(`Year ${index + 1}: Growth rate ${(rate * 100).toFixed(1)}% is unrealistic`);
    }
  });

  // Check final year alignment with terminal growth
  const finalRate = rates[rates.length - 1];
  const terminalDiff = Math.abs(finalRate - terminalGrowthRate);
  if (terminalDiff > 0.05) { // 5% difference threshold
    warnings.push(
      `Final year growth (${(finalRate * 100).toFixed(1)}%) differs significantly from terminal growth (${(terminalGrowthRate * 100).toFixed(1)}%)`
    );
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
};

/**
 * Format growth pattern for display
 * @param rates - Array of growth rates
 * @returns Formatted string describing the pattern
 */
export const formatPatternDescription = (rates: number[]): string => {
  if (rates.length === 0) return 'No pattern';
  
  const start = rates[0];
  const end = rates[rates.length - 1];
  
  if (Math.abs(start - end) < 0.001) {
    return `Constant ${(start * 100).toFixed(1)}%`;
  }
  
  return `Decaying from ${(start * 100).toFixed(1)}% to ${(end * 100).toFixed(1)}%`;
};

/**
 * Get scenario display name and description
 * @param scenario - Scenario type
 * @returns Display information for the scenario
 */
export const getScenarioInfo = (scenario: ScenarioType) => {
  const scenarioMap = {
    bull: {
      name: 'Bull Case (Optimistic)',
      description: 'High growth expectations with strong market conditions',
      defaultPattern: '20% → 5%'
    },
    base: {
      name: 'Base Case (Realistic)',
      description: 'Balanced growth assumptions for normal market conditions',
      defaultPattern: '7.5% → 5%'
    },
    bear: {
      name: 'Bear Case (Conservative)',
      description: 'Conservative growth in challenging market conditions',
      defaultPattern: '5% → 2%'
    }
  };

  return scenarioMap[scenario];
};