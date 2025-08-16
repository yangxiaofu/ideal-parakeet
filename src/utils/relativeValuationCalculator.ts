/**
 * Relative Valuation Calculator
 * Implements comprehensive relative valuation using multiple ratios and peer analysis
 */

import type {
  RelativeValuationInputs,
  RelativeValuationResult,
  RelativeValuationValidation,
  ValuationMultiple,
  ValuationMultipleType,
  PeerCompany,
  MultipleTier,
  RelativeValuationSensitivity
} from '../types/relativeValuation';

/**
 * Calculate all valuation multiples for a company
 */
export function calculateMultiples(company: PeerCompany): Partial<Record<ValuationMultipleType, number>> {
  const multiples: Partial<Record<ValuationMultipleType, number>> = {};
  
  // P/E Ratio (Price to Earnings)
  if (company.netIncome > 0 && company.marketCap > 0) {
    multiples.PE = company.marketCap / company.netIncome;
  }
  
  // PEG Ratio (Price/Earnings to Growth)
  if (multiples.PE && company.growthRate > 0) {
    multiples.PEG = multiples.PE / (company.growthRate * 100);
  }
  
  // P/S Ratio (Price to Sales)
  if (company.revenue > 0 && company.marketCap > 0) {
    multiples.PS = company.marketCap / company.revenue;
  }
  
  // EV/Sales Ratio
  if (company.revenue > 0 && company.enterpriseValue > 0) {
    multiples.EV_SALES = company.enterpriseValue / company.revenue;
  }
  
  // EV/EBITDA Ratio
  if (company.ebitda > 0 && company.enterpriseValue > 0) {
    multiples.EV_EBITDA = company.enterpriseValue / company.ebitda;
  }
  
  // P/B Ratio (Price to Book)
  if (company.bookValue > 0 && company.marketCap > 0) {
    multiples.PB = company.marketCap / company.bookValue;
  }
  
  return multiples;
}

/**
 * Calculate statistical measures for peer group multiples
 */
export function calculateStatistics(values: number[]): {
  median: number;
  mean: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  standardDeviation: number;
  count: number;
} {
  if (values.length === 0) {
    return { median: 0, mean: 0, min: 0, max: 0, q1: 0, q3: 0, standardDeviation: 0, count: 0 };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  
  // Basic statistics
  const min = sorted[0];
  const max = sorted[count - 1];
  const mean = values.reduce((sum, val) => sum + val, 0) / count;
  
  // Median
  const median = count % 2 === 0
    ? (sorted[Math.floor(count / 2) - 1] + sorted[Math.floor(count / 2)]) / 2
    : sorted[Math.floor(count / 2)];
  
  // Quartiles
  const q1Index = Math.floor(count * 0.25);
  const q3Index = Math.floor(count * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  
  // Standard deviation
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
  const standardDeviation = Math.sqrt(variance);
  
  return { median, mean, min, max, q1, q3, standardDeviation, count };
}

/**
 * Remove outliers using IQR method
 */
export function removeOutliers(peerCompanies: PeerCompany[], multipleType: ValuationMultipleType): {
  filtered: PeerCompany[];
  outliers: PeerCompany[];
} {
  const validPeers = peerCompanies.filter(peer => {
    const multiple = peer.multiples?.[multipleType];
    return multiple !== undefined && multiple > 0;
  });
  
  if (validPeers.length < 4) {
    return { filtered: validPeers, outliers: [] };
  }
  
  const values = validPeers.map(peer => peer.multiples![multipleType]!);
  const stats = calculateStatistics(values);
  
  const iqr = stats.q3 - stats.q1;
  const lowerBound = stats.q1 - 1.5 * iqr;
  const upperBound = stats.q3 + 1.5 * iqr;
  
  const filtered: PeerCompany[] = [];
  const outliers: PeerCompany[] = [];
  
  validPeers.forEach(peer => {
    const value = peer.multiples![multipleType]!;
    if (value >= lowerBound && value <= upperBound) {
      filtered.push(peer);
    } else {
      const outlierPeer = { 
        ...peer, 
        isOutlier: true,
        excludeReason: `${multipleType} multiple (${value.toFixed(2)}) outside acceptable range (${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)})`
      };
      outliers.push(outlierPeer);
    }
  });
  
  return { filtered, outliers };
}

/**
 * Analyze peer group and calculate multiple statistics
 */
export function analyzePeerGroup(
  targetCompany: RelativeValuationInputs['targetCompany'],
  peerCompanies: PeerCompany[],
  multipleType: ValuationMultipleType,
  removeOutlierValues: boolean = true
): ValuationMultiple {
  // Calculate multiples for all companies
  const peersWithMultiples = peerCompanies.map(peer => ({
    ...peer,
    multiples: calculateMultiples(peer)
  }));
  
  // Filter and remove outliers if requested
  const { filtered } = removeOutlierValues 
    ? removeOutliers(peersWithMultiples, multipleType)
    : { filtered: peersWithMultiples };
  
  const validValues = filtered
    .map(peer => peer.multiples![multipleType])
    .filter((value): value is number => value !== undefined && value > 0);
  
  const statistics = calculateStatistics(validValues);
  
  // Calculate target company's multiple
  const targetMultiples = calculateMultiples({
    ...targetCompany,
    multiples: {}
  } as PeerCompany);
  
  const targetValue = targetMultiples[multipleType] || 0;
  
  // Calculate implied valuation using peer median
  let impliedMarketCap = 0;
  let impliedPricePerShare = 0;
  
  // Add sanity checks for reasonable multiples to prevent astronomical valuations
  const isReasonableMultiple = (multiple: number, type: ValuationMultipleType): boolean => {
    switch (type) {
      case 'PE': return multiple > 0 && multiple < 200;  // P/E ratios above 200x are usually unrealistic
      case 'PEG': return multiple > 0.1 && multiple < 5; // PEG ratios outside 0.1-5 are usually extreme
      case 'PS': return multiple > 0 && multiple < 50;   // P/S ratios above 50x are rare
      case 'EV_SALES': return multiple > 0 && multiple < 50;
      case 'EV_EBITDA': return multiple > 0 && multiple < 100;
      case 'PB': return multiple > 0 && multiple < 20;   // P/B ratios above 20x are unusual
      default: return multiple > 0;
    }
  };

  if (statistics.median > 0 && targetCompany.sharesOutstanding > 0 && 
      isReasonableMultiple(statistics.median, multipleType)) {
    switch (multipleType) {
      case 'PE':
        // P/E = Market Cap / Net Income → Market Cap = P/E * Net Income
        impliedMarketCap = statistics.median * targetCompany.netIncome;
        impliedPricePerShare = impliedMarketCap / targetCompany.sharesOutstanding;
        break;
        
      case 'PEG': {
        // PEG = P/E / Growth Rate → P/E = PEG * Growth Rate
        // Growth rate should be in percentage form (e.g., 15 for 15%)
        const growthRatePercent = targetCompany.growthRate * 100;
        if (growthRatePercent > 0) {
          const impliedPE = statistics.median * growthRatePercent;
          impliedMarketCap = impliedPE * targetCompany.netIncome;
          impliedPricePerShare = impliedMarketCap / targetCompany.sharesOutstanding;
        }
        break;
      }
        
      case 'PS':
        // P/S = Market Cap / Revenue → Market Cap = P/S * Revenue
        impliedMarketCap = statistics.median * targetCompany.revenue;
        impliedPricePerShare = impliedMarketCap / targetCompany.sharesOutstanding;
        break;
        
      case 'EV_SALES': {
        // EV/Sales = Enterprise Value / Revenue → EV = Multiple * Revenue
        // Market Cap = EV - Net Debt = EV - (Debt - Cash)
        const impliedEV = statistics.median * targetCompany.revenue;
        const netDebt = targetCompany.debt - targetCompany.cash;
        impliedMarketCap = impliedEV - netDebt;
        impliedPricePerShare = Math.max(0, impliedMarketCap) / targetCompany.sharesOutstanding;
        break;
      }
        
      case 'EV_EBITDA': {
        // EV/EBITDA = Enterprise Value / EBITDA → EV = Multiple * EBITDA  
        // Market Cap = EV - Net Debt = EV - (Debt - Cash)
        const impliedEVFromEBITDA = statistics.median * targetCompany.ebitda;
        const netDebtFromEBITDA = targetCompany.debt - targetCompany.cash;
        impliedMarketCap = impliedEVFromEBITDA - netDebtFromEBITDA;
        impliedPricePerShare = Math.max(0, impliedMarketCap) / targetCompany.sharesOutstanding;
        break;
      }
        
      case 'PB':
        // P/B = Market Cap / Book Value → Market Cap = P/B * Book Value
        impliedMarketCap = statistics.median * targetCompany.bookValue;
        impliedPricePerShare = impliedMarketCap / targetCompany.sharesOutstanding;
        break;
    }
    
    // Additional sanity check: ensure implied price per share is reasonable
    // Flag extremely high valuations for review
    if (impliedPricePerShare > 0) {
      const currentMarketCap = targetCompany.marketCap;
      const currentPricePerShare = currentMarketCap > 0 && targetCompany.sharesOutstanding > 0 
        ? currentMarketCap / targetCompany.sharesOutstanding 
        : 0;
        
      if (currentPricePerShare > 0) {
        const impliedUpside = ((impliedPricePerShare - currentPricePerShare) / currentPricePerShare) * 100;
        
        // Log warning for extreme valuations (>1000% upside or downside)
        if (Math.abs(impliedUpside) > 1000) {
          console.warn(`[Relative Valuation] Extreme ${multipleType} valuation detected:`, {
            impliedPrice: impliedPricePerShare,
            currentPrice: currentPricePerShare,
            upside: `${impliedUpside.toFixed(1)}%`,
            peerMedian: statistics.median,
            targetMetric: targetValue
          });
        }
      }
    }
  }
  
  // Calculate percentile ranking using correct statistical method
  let percentile = 0;
  if (targetValue > 0 && validValues.length > 0) {
    // Count how many peer values are strictly less than the target value
    const valuesBelow = validValues.filter(val => val < targetValue).length;
    const valuesEqual = validValues.filter(val => val === targetValue).length;
    
    // Use the standard percentile formula with interpolation for ties
    // For tied values, use the midpoint of their percentile range
    if (validValues.length >= 2) {
      percentile = ((valuesBelow + (valuesEqual / 2)) / validValues.length) * 100;
      
      // Round to 1 decimal place for cleaner display, but ensure it's not exactly 0 or 100
      // unless truly at the extremes
      percentile = Math.round(percentile * 10) / 10;
      
      // Ensure percentile is between 0 and 100
      percentile = Math.max(0, Math.min(100, percentile));
    } else {
      // With insufficient data, default to 50th percentile to avoid misleading extremes
      percentile = 50;
    }
  }
  
  return {
    type: multipleType,
    name: getMultipleName(multipleType),
    targetValue,
    peerValues: validValues,
    statistics,
    impliedValue: Math.max(0, impliedMarketCap), // This is market cap, not per-share
    impliedPricePerShare: Math.max(0, impliedPricePerShare),
    percentile
  };
}

/**
 * Get human-readable name for multiple type
 */
function getMultipleName(type: ValuationMultipleType): string {
  const names: Record<ValuationMultipleType, string> = {
    PE: 'Price-to-Earnings',
    PEG: 'Price/Earnings-to-Growth',
    PS: 'Price-to-Sales',
    EV_SALES: 'Enterprise Value-to-Sales',
    EV_EBITDA: 'Enterprise Value-to-EBITDA',
    PB: 'Price-to-Book'
  };
  return names[type];
}

/**
 * Determine company tier based on peer positioning
 */
export function determineCompanyTier(
  multiples: ValuationMultiple[],
  relativePositioning: RelativeValuationResult['relativePositioning']
): MultipleTier {
  // Calculate average percentile across multiples
  const validMultiples = multiples.filter(m => m.percentile > 0);
  const averagePercentile = validMultiples.length > 0
    ? validMultiples.reduce((sum, m) => sum + m.percentile, 0) / validMultiples.length
    : 50;
  
  // Determine tier based on percentile and fundamental factors
  const overallPremium = relativePositioning.overallPremium;
  
  if (averagePercentile >= 75 || overallPremium > 20) {
    return {
      tier: 'premium',
      description: 'Premium Valuation - Trading above peer median',
      percentileRange: { min: 75, max: 100 },
      impliedValueRange: { 
        min: Math.min(...multiples.map(m => m.impliedValue)), 
        max: Math.max(...multiples.map(m => m.impliedValue)) 
      },
      reasoningFactors: [
        'Superior growth profile',
        'Higher profitability margins',
        'Strong competitive position',
        'Market leadership premium'
      ]
    };
  } else if (averagePercentile <= 25 || overallPremium < -20) {
    return {
      tier: averagePercentile <= 10 ? 'deep-discount' : 'discount',
      description: averagePercentile <= 10 
        ? 'Deep Discount - Significantly undervalued vs peers'
        : 'Discount Valuation - Trading below peer median',
      percentileRange: { min: 0, max: 25 },
      impliedValueRange: { 
        min: Math.min(...multiples.map(m => m.impliedValue)), 
        max: Math.max(...multiples.map(m => m.impliedValue)) 
      },
      reasoningFactors: [
        'Below-average growth expectations',
        'Lower profitability margins',
        'Operational challenges',
        'Market concerns or risks'
      ]
    };
  } else {
    return {
      tier: 'market',
      description: 'Market Valuation - In line with peer median',
      percentileRange: { min: 25, max: 75 },
      impliedValueRange: { 
        min: Math.min(...multiples.map(m => m.impliedValue)), 
        max: Math.max(...multiples.map(m => m.impliedValue)) 
      },
      reasoningFactors: [
        'Comparable growth profile',
        'Similar profitability metrics',
        'Market-average positioning',
        'Balanced risk-reward profile'
      ]
    };
  }
}

/**
 * Calculate valuation ranges using different methodologies
 */
export function calculateValuationRanges(multiples: ValuationMultiple[]): RelativeValuationResult['valuationRanges'] {
  const validMultiples = multiples.filter(m => m.impliedValue > 0);
  
  if (validMultiples.length === 0) {
    const emptyRange = { min: 0, max: 0, pricePerShare: { min: 0, max: 0 } };
    return {
      conservative: emptyRange,
      moderate: emptyRange,
      optimistic: emptyRange
    };
  }
  
  const impliedValues = validMultiples.map(m => m.impliedValue);
  const impliedPrices = validMultiples.map(m => m.impliedPricePerShare);
  
  impliedValues.sort((a, b) => a - b);
  impliedPrices.sort((a, b) => a - b);
  
  // Conservative: Use lower quartile to median
  const conservativeMin = impliedValues[Math.floor(impliedValues.length * 0.25)];
  const conservativeMax = impliedValues[Math.floor(impliedValues.length * 0.5)];
  const conservativePriceMin = impliedPrices[Math.floor(impliedPrices.length * 0.25)];
  const conservativePriceMax = impliedPrices[Math.floor(impliedPrices.length * 0.5)];
  
  // Moderate: Use median to upper quartile
  const moderateMin = impliedValues[Math.floor(impliedValues.length * 0.5)];
  const moderateMax = impliedValues[Math.floor(impliedValues.length * 0.75)];
  const moderatePriceMin = impliedPrices[Math.floor(impliedPrices.length * 0.5)];
  const moderatePriceMax = impliedPrices[Math.floor(impliedPrices.length * 0.75)];
  
  // Optimistic: Use upper quartile to maximum
  const optimisticMin = impliedValues[Math.floor(impliedValues.length * 0.75)];
  const optimisticMax = Math.max(...impliedValues);
  const optimisticPriceMin = impliedPrices[Math.floor(impliedPrices.length * 0.75)];
  const optimisticPriceMax = Math.max(...impliedPrices);
  
  return {
    conservative: {
      min: conservativeMin,
      max: conservativeMax,
      pricePerShare: { min: conservativePriceMin, max: conservativePriceMax }
    },
    moderate: {
      min: moderateMin,
      max: moderateMax,
      pricePerShare: { min: moderatePriceMin, max: moderatePriceMax }
    },
    optimistic: {
      min: optimisticMin,
      max: optimisticMax,
      pricePerShare: { min: optimisticPriceMin, max: optimisticPriceMax }
    }
  };
}

/**
 * Calculate relative positioning metrics
 */
export function calculateRelativePositioning(
  targetCompany: RelativeValuationInputs['targetCompany'],
  peerCompanies: PeerCompany[]
): RelativeValuationResult['relativePositioning'] {
  if (peerCompanies.length === 0) {
    return { growthPremium: 0, profitabilityPremium: 0, sizePremium: 0, overallPremium: 0 };
  }
  
  // Calculate peer medians
  const peerGrowthRates = peerCompanies.map(p => p.growthRate).filter(g => g > 0);
  const peerProfitMargins = peerCompanies
    .map(p => p.netIncome / p.revenue)
    .filter(m => m > 0 && isFinite(m));
  const peerMarketCaps = peerCompanies.map(p => p.marketCap).filter(mc => mc > 0);
  
  const medianGrowth = peerGrowthRates.length > 0 
    ? peerGrowthRates.sort((a, b) => a - b)[Math.floor(peerGrowthRates.length / 2)]
    : targetCompany.growthRate;
  
  const medianProfitMargin = peerProfitMargins.length > 0
    ? peerProfitMargins.sort((a, b) => a - b)[Math.floor(peerProfitMargins.length / 2)]
    : targetCompany.netIncome / targetCompany.revenue;
  
  const medianMarketCap = peerMarketCaps.length > 0
    ? peerMarketCaps.sort((a, b) => a - b)[Math.floor(peerMarketCaps.length / 2)]
    : targetCompany.marketCap;
  
  // Calculate premiums/discounts
  const growthPremium = medianGrowth > 0 
    ? ((targetCompany.growthRate - medianGrowth) / medianGrowth) * 100 
    : 0;
  
  const targetProfitMargin = targetCompany.revenue > 0 ? targetCompany.netIncome / targetCompany.revenue : 0;
  const profitabilityPremium = medianProfitMargin > 0 
    ? ((targetProfitMargin - medianProfitMargin) / medianProfitMargin) * 100 
    : 0;
  
  const sizePremium = medianMarketCap > 0 
    ? Math.log(targetCompany.marketCap / medianMarketCap) * 10 // Log scale for size
    : 0;
  
  const overallPremium = (growthPremium * 0.4) + (profitabilityPremium * 0.4) + (sizePremium * 0.2);
  
  return {
    growthPremium: Number(growthPremium.toFixed(2)),
    profitabilityPremium: Number(profitabilityPremium.toFixed(2)),
    sizePremium: Number(sizePremium.toFixed(2)),
    overallPremium: Number(overallPremium.toFixed(2))
  };
}

/**
 * Generate investment recommendation based on analysis
 */
export function generateRecommendation(
  targetCompany: RelativeValuationInputs['targetCompany'],
  multiples: ValuationMultiple[],
  companyTier: MultipleTier,
  relativePositioning: RelativeValuationResult['relativePositioning']
): RelativeValuationResult['recommendation'] {
  const validMultiples = multiples.filter(m => m.impliedValue > 0);
  
  if (validMultiples.length === 0) {
    return {
      overallRating: 'hold',
      confidence: 'low',
      keyFactors: ['Insufficient peer data for analysis'],
      risks: ['Limited comparable company data'],
      upside: 0
    };
  }
  
  // Calculate average upside
  const currentMarketCap = targetCompany.marketCap;
  const avgImpliedValue = validMultiples.reduce((sum, m) => sum + m.impliedValue, 0) / validMultiples.length;
  const upside = currentMarketCap > 0 ? ((avgImpliedValue - currentMarketCap) / currentMarketCap) * 100 : 0;
  
  // Determine rating based on upside and tier
  let overallRating: RelativeValuationResult['recommendation']['overallRating'] = 'hold';
  let confidence: RelativeValuationResult['recommendation']['confidence'] = 'medium';
  
  if (upside > 25 && companyTier.tier === 'discount') {
    overallRating = 'strong-buy';
    confidence = 'high';
  } else if (upside > 15) {
    overallRating = 'buy';
    confidence = upside > 20 ? 'high' : 'medium';
  } else if (upside < -15) {
    overallRating = upside < -25 ? 'strong-sell' : 'sell';
    confidence = 'medium';
  }
  
  // Generate key factors
  const keyFactors: string[] = [];
  if (relativePositioning.growthPremium > 15) {
    keyFactors.push(`Superior growth profile (+${relativePositioning.growthPremium.toFixed(1)}% vs peers)`);
  }
  if (relativePositioning.profitabilityPremium > 10) {
    keyFactors.push(`Higher profitability margins (+${relativePositioning.profitabilityPremium.toFixed(1)}% vs peers)`);
  }
  if (companyTier.tier === 'discount') {
    keyFactors.push('Trading at discount to peer group median');
  }
  if (companyTier.tier === 'premium') {
    keyFactors.push('Premium valuation reflects strong fundamentals');
  }
  
  // Generate risks
  const risks: string[] = [];
  if (validMultiples.length < 5) {
    risks.push('Limited peer group may affect valuation accuracy');
  }
  if (relativePositioning.growthPremium < -20) {
    risks.push('Below-average growth expectations vs peers');
  }
  if (companyTier.tier === 'premium' && upside < 10) {
    risks.push('Premium valuation may limit further upside');
  }
  
  return {
    overallRating,
    confidence,
    keyFactors: keyFactors.length > 0 ? keyFactors : ['Standard peer-relative valuation'],
    risks: risks.length > 0 ? risks : ['General market and industry risks'],
    upside: Number(upside.toFixed(2))
  };
}

/**
 * Validate relative valuation inputs
 */
export function validateRelativeValuationInputs(inputs: RelativeValuationInputs): RelativeValuationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate target company data
  if (!inputs.targetCompany.symbol) {
    errors.push('Target company symbol is required');
  }
  
  if (inputs.targetCompany.marketCap <= 0) {
    errors.push('Market cap must be positive');
  }
  
  if (inputs.targetCompany.revenue <= 0) {
    warnings.push('Revenue is zero - P/S and EV/Sales multiples unavailable');
  }
  
  if (inputs.targetCompany.netIncome <= 0) {
    warnings.push('Net income is not positive - P/E and PEG ratios may be unreliable');
  }
  
  if (inputs.targetCompany.ebitda <= 0) {
    warnings.push('EBITDA is not positive - EV/EBITDA multiple unavailable');
  }
  
  // Validate peer group
  if (inputs.peerCompanies.length < inputs.minimumPeers) {
    errors.push(`Insufficient peer companies: need at least ${inputs.minimumPeers}, got ${inputs.peerCompanies.length}`);
  }
  
  if (inputs.peerCompanies.length < 5) {
    warnings.push('Small peer group may affect accuracy of relative valuation');
  }
  
  // Validate selected multiples
  if (inputs.selectedMultiples.length === 0) {
    errors.push('At least one valuation multiple must be selected');
  }
  
  // Validate peer data quality
  const validPeers = inputs.peerCompanies.filter(peer => 
    peer.marketCap > 0 && (peer.revenue > 0 || peer.netIncome > 0)
  );
  
  if (validPeers.length < inputs.peerCompanies.length * 0.8) {
    warnings.push('Some peer companies have incomplete financial data');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Main relative valuation calculation function
 */
export function calculateRelativeValuation(inputs: RelativeValuationInputs): RelativeValuationResult {
  // Validate inputs
  const validation = validateRelativeValuationInputs(inputs);
  if (!validation.isValid) {
    throw new Error(`Invalid relative valuation inputs: ${validation.errors.join(', ')}`);
  }
  
  // Calculate multiples for each selected type
  const multiples: ValuationMultiple[] = [];
  
  for (const multipleType of inputs.selectedMultiples) {
    const multiple = analyzePeerGroup(
      inputs.targetCompany,
      inputs.peerCompanies,
      multipleType,
      inputs.outlierRemoval
    );
    multiples.push(multiple);
  }
  
  // Calculate relative positioning
  const relativePositioning = calculateRelativePositioning(inputs.targetCompany, inputs.peerCompanies);
  
  // Determine company tier
  const companyTier = determineCompanyTier(multiples, relativePositioning);
  
  // Calculate valuation ranges
  const valuationRanges = calculateValuationRanges(multiples);
  
  // Generate recommendation
  const recommendation = generateRecommendation(
    inputs.targetCompany,
    multiples,
    companyTier,
    relativePositioning
  );
  
  // Prepare peer analysis summary
  const totalPeers = inputs.peerCompanies.length;
  const qualifyingPeers = inputs.peerCompanies.filter(peer => {
    const peerMultiples = calculateMultiples(peer);
    return Object.values(peerMultiples).some(value => value !== undefined && value > 0);
  }).length;

  // Add data quality warnings for insufficient peer data
  if (qualifyingPeers < 3) {
    console.warn(`[Relative Valuation] Limited peer data: Only ${qualifyingPeers} qualifying peers. Percentiles may be unreliable with fewer than 3 peers.`);
  } else if (qualifyingPeers < 5) {
    console.warn(`[Relative Valuation] Moderate peer data: ${qualifyingPeers} qualifying peers. Consider adding more peers for robust percentile analysis.`);
  }
  
  const peerMarketCaps = inputs.peerCompanies.map(p => p.marketCap).filter(mc => mc > 0);
  const medianMarketCap = peerMarketCaps.length > 0
    ? peerMarketCaps.sort((a, b) => a - b)[Math.floor(peerMarketCaps.length / 2)]
    : 0;
  
  const peerGrowthRates = inputs.peerCompanies.map(p => p.growthRate).filter(g => g > 0);
  const medianGrowthRate = peerGrowthRates.length > 0
    ? peerGrowthRates.sort((a, b) => a - b)[Math.floor(peerGrowthRates.length / 2)]
    : 0;
  
  // Create basic sensitivity analysis
  const sensitivity: RelativeValuationSensitivity = {
    peerGroupSensitivity: [],
    growthSensitivity: [],
    multipleWeightingSensitivity: []
  };
  
  return {
    targetCompany: inputs.targetCompany.symbol,
    currentMarketCap: inputs.targetCompany.marketCap,
    currentPricePerShare: inputs.targetCompany.sharesOutstanding > 0 
      ? inputs.targetCompany.marketCap / inputs.targetCompany.sharesOutstanding 
      : 0,
    multiples,
    valuationRanges,
    peerAnalysis: {
      totalPeers,
      qualifyingPeers,
      excludedPeers: [], // Outlier tracking not implemented yet
      industryClassification: 'Technology', // This would come from industry classification
      medianMarketCap,
      medianGrowthRate
    },
    companyTier,
    relativePositioning,
    recommendation,
    sensitivity
  };
}