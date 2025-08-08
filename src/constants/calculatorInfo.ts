export interface CalculatorInfo {
  id: string;
  name: string;
  fullName: string;
  description: string;
  valuationType: string;
  investmentStyle: string[];
  bestFor: string[];
  idealBusinesses: string[];
  notIdealFor: string[];
  keyRequirements: string[];
  icon?: string;
}

export const CALCULATOR_INFO: Record<string, CalculatorInfo> = {
  DCF: {
    id: 'DCF',
    name: 'DCF',
    fullName: 'Discounted Cash Flow',
    description: 'Calculates intrinsic value by projecting future cash flows and discounting them to present value. This "discounting" accounts for the time value of money, meaning a dollar today is worth more than a dollar in the future.',
    valuationType: 'Intrinsic valuation - determines value based on ability to generate cash, independent of market sentiment',
    investmentStyle: ['Value Investing', 'Growth Investing', 'Long-term Perspective'],
    bestFor: [
      'Long-term investors',
      'Fundamental analysis',
      'Companies with predictable cash flows',
      'Ensuring not overpaying for growth'
    ],
    idealBusinesses: [
      'Stable and predictable companies',
      'Mature companies in established industries',
      'Businesses with consistent cash flow history',
      'Companies with visible growth trajectories'
    ],
    notIdealFor: [
      'Startups without cash flow history',
      'Highly cyclical companies',
      'Businesses with unpredictable cash flows',
      'Companies in rapid transformation'
    ],
    keyRequirements: [
      'Historical cash flow data',
      'Reasonable growth projections',
      'Appropriate discount rate'
    ],
    icon: '💰'
  },
  
  DDM: {
    id: 'DDM',
    name: 'DDM',
    fullName: 'Dividend Discount Model',
    description: 'Values stock based on the present value of all future dividend payments. A direct way of looking at the returns an investor will receive from holding a stock.',
    valuationType: 'Intrinsic valuation - focuses on cash returned directly to shareholders',
    investmentStyle: ['Dividend Investing', 'Value Investing', 'Income Investing'],
    bestFor: [
      'Income-focused investors',
      'Conservative investors',
      'Retirement portfolios',
      'Investors seeking regular income',
      'Tangible return on investment'
    ],
    idealBusinesses: [
      'Mature dividend-paying companies',
      'Blue-chip stocks',
      'Utilities and telecoms',
      'Financial institutions',
      'Real Estate Investment Trusts (REITs)',
      'Companies with stable dividend history'
    ],
    notIdealFor: [
      'Growth companies that reinvest earnings',
      'Companies with inconsistent dividend policies',
      'Startups and early-stage companies',
      'Companies that don\'t pay dividends'
    ],
    keyRequirements: [
      'Long and stable dividend history',
      'Consistent payout ratio',
      'Predictable dividend growth'
    ],
    icon: '💵'
  },
  
  NAV: {
    id: 'NAV',
    name: 'NAV',
    fullName: 'Net Asset Value',
    description: 'Determines value by subtracting total liabilities from total assets. Essentially the company\'s book value or what would theoretically be left for shareholders if the company were liquidated.',
    valuationType: 'Asset-based valuation - provides a "floor" value based on tangible assets',
    investmentStyle: ['Deep Value Investing', 'Asset-Based Investing'],
    bestFor: [
      'Finding undervalued companies',
      'Establishing floor value',
      'Liquidation analysis',
      'Companies trading below tangible asset value'
    ],
    idealBusinesses: [
      'Asset-heavy industries (manufacturing, real estate)',
      'Natural resource companies',
      'Holding companies',
      'Investment funds and REITs',
      'Banks and financial institutions',
      'Cyclical businesses at cycle bottom'
    ],
    notIdealFor: [
      'Technology and software companies',
      'Service-based businesses',
      'Companies where intangibles dominate',
      'High-growth companies with minimal assets'
    ],
    keyRequirements: [
      'Detailed balance sheet',
      'Fair value of assets',
      'Tangible assets significance'
    ],
    icon: '🏭'
  },
  
  EPV: {
    id: 'EPV',
    name: 'EPV',
    fullName: 'Earnings Power Value',
    description: 'Values company based on current sustainable earnings, assuming no future growth. Calculates value by dividing adjusted earnings by cost of capital.',
    valuationType: 'Intrinsic valuation - conservative estimate based on demonstrated ability to generate profits',
    investmentStyle: ['Value Investing', 'Conservative Investing', 'Greenwald Method'],
    bestFor: [
      'Conservative valuations',
      'Avoiding growth speculation',
      'Finding margin of safety',
      'Determining worth without growth forecasts'
    ],
    idealBusinesses: [
      'Mature and stable businesses',
      'Companies with sustainable competitive advantages (moats)',
      'Non-cyclical industries',
      'Businesses with consistent profit margins',
      'Companies with predictable earnings'
    ],
    notIdealFor: [
      'High-growth companies',
      'Startups and early-stage businesses',
      'Companies in rapidly changing industries',
      'Cyclical companies at peak earnings',
      'Companies where current earnings don\'t reflect potential'
    ],
    keyRequirements: [
      'History of consistent earnings',
      'Stable profit margins',
      'Sustainable competitive advantage'
    ],
    icon: '📊'
  }
};

// Helper function to get recommended calculators based on company characteristics
export function getRecommendedCalculators(companyData: {
  balanceSheet?: Array<{ totalAssets: number; totalEquity: number; totalLiabilities: number; date: string }>;
  incomeStatement?: Array<{ revenue: number; netIncome: number; date: string }>;
  cashFlowStatement?: Array<{ dividendsPaid: number; freeCashFlow: number; date: string }>;
}): {
  recommended: string[];
  caution: string[];
  notRecommended: string[];
  reasons: Record<string, string>;
} {
  const recommendations = {
    recommended: [] as string[],
    caution: [] as string[],
    notRecommended: [] as string[],
    reasons: {} as Record<string, string>
  };

  // Check if company has consistent cash flows (for DCF)
  if (companyData.cashFlowStatement && Array.isArray(companyData.cashFlowStatement) && companyData.cashFlowStatement.length >= 3) {
    const cashFlows = companyData.cashFlowStatement.slice(0, 3).map(cf => cf.freeCashFlow);
    const avgCashFlow = cashFlows.reduce((a, b) => a + b, 0) / cashFlows.length;
    const allPositive = cashFlows.every(cf => cf > 0);
    
    if (allPositive && avgCashFlow > 0) {
      recommendations.recommended.push('DCF');
      recommendations.reasons['DCF'] = 'Strong and consistent free cash flows';
    } else if (avgCashFlow > 0) {
      recommendations.caution.push('DCF');
      recommendations.reasons['DCF'] = 'Mixed cash flow history';
    } else {
      recommendations.notRecommended.push('DCF');
      recommendations.reasons['DCF'] = 'Negative or inconsistent cash flows';
    }
  }

  // Check for dividend payments (for DDM)
  if (companyData.cashFlowStatement && Array.isArray(companyData.cashFlowStatement) && companyData.cashFlowStatement.length > 0) {
    const latestDividend = companyData.cashFlowStatement[0].dividendsPaid;
    const hasConsistentDividends = companyData.cashFlowStatement
      .slice(0, Math.min(3, companyData.cashFlowStatement.length))
      .every(cf => cf.dividendsPaid && cf.dividendsPaid < 0); // Dividends are negative in cash flow
    
    if (hasConsistentDividends) {
      recommendations.recommended.push('DDM');
      recommendations.reasons['DDM'] = 'Consistent dividend payment history';
    } else if (latestDividend && latestDividend < 0) {
      recommendations.caution.push('DDM');
      recommendations.reasons['DDM'] = 'Some dividend payments but not consistent';
    } else {
      recommendations.notRecommended.push('DDM');
      recommendations.reasons['DDM'] = 'No dividend payment history';
    }
  }

  // Check asset intensity (for NAV) - Enhanced logic for better asset-heavy detection
  if (companyData.balanceSheet && Array.isArray(companyData.balanceSheet) && companyData.balanceSheet.length > 0 && 
      companyData.incomeStatement && Array.isArray(companyData.incomeStatement) && companyData.incomeStatement.length > 0) {
    const latestBalance = companyData.balanceSheet[0];
    const latestIncome = companyData.incomeStatement[0];
    
    const totalAssets = latestBalance.totalAssets;
    const totalEquity = latestBalance.totalEquity;
    const revenue = latestIncome.revenue;
    
    // Calculate multiple ratios to better identify asset-heavy businesses
    const assetToEquityRatio = totalAssets / totalEquity;
    const assetToRevenueRatio = totalAssets / revenue;
    const assetTurnoverRatio = revenue / totalAssets;
    
    // Enhanced scoring for asset-heavy business identification
    let navScore = 0;
    let reason = '';
    
    // High asset-to-equity ratio suggests leveraged asset base
    if (assetToEquityRatio > 3) {
      navScore += 2;
      reason += 'High leverage with substantial asset base';
    } else if (assetToEquityRatio > 2) {
      navScore += 1;
    }
    
    // High asset-to-revenue ratio suggests asset-intensive business
    if (assetToRevenueRatio > 2) {
      navScore += 2;
      if (reason) reason += '; ';
      reason += 'Asset-intensive operations';
    } else if (assetToRevenueRatio > 1) {
      navScore += 1;
    }
    
    // Low asset turnover suggests asset-heavy model
    if (assetTurnoverRatio < 0.5) {
      navScore += 2;
      if (reason) reason += '; ';
      reason += 'Low asset turnover indicates capital-intensive business';
    } else if (assetTurnoverRatio < 1) {
      navScore += 1;
    }
    
    // Additional check for manufacturing/real estate indicators
    // Look for consistent asset growth (typical of asset-heavy industries)
    if (companyData.balanceSheet.length >= 3) {
      const assetGrowthRates: number[] = [];
      for (let i = 0; i < Math.min(3, companyData.balanceSheet.length - 1); i++) {
        const current = companyData.balanceSheet[i].totalAssets;
        const previous = companyData.balanceSheet[i + 1].totalAssets;
        if (previous > 0) {
          assetGrowthRates.push((current - previous) / previous);
        }
      }
      
      const avgAssetGrowth = assetGrowthRates.length > 0 
        ? assetGrowthRates.reduce((a, b) => a + b) / assetGrowthRates.length 
        : 0;
        
      // Consistent asset growth suggests ongoing capital investment
      if (avgAssetGrowth > 0.05 && assetGrowthRates.every(rate => rate > -0.1)) {
        navScore += 1;
        if (reason) reason += '; ';
        reason += 'Consistent asset base growth';
      }
    }
    
    // Final recommendation based on comprehensive scoring
    if (navScore >= 4) {
      recommendations.recommended.push('NAV');
      recommendations.reasons['NAV'] = `Strong asset-heavy characteristics: ${reason}`;
    } else if (navScore >= 2) {
      recommendations.caution.push('NAV');
      recommendations.reasons['NAV'] = `Moderate asset intensity: ${reason || 'Some asset-heavy indicators present'}`;
    } else {
      recommendations.caution.push('NAV');
      recommendations.reasons['NAV'] = 'Asset-light business model - NAV may provide conservative floor value only';
    }
  }

  // Check earnings stability (for EPV)
  if (companyData.incomeStatement && Array.isArray(companyData.incomeStatement) && companyData.incomeStatement.length >= 3) {
    const earnings = companyData.incomeStatement.slice(0, 3).map(is => is.netIncome);
    const allPositive = earnings.every(e => e > 0);
    const avgEarnings = earnings.reduce((a, b) => a + b, 0) / earnings.length;
    
    // Calculate earnings volatility
    const variance = earnings.reduce((sum, e) => 
      sum + Math.pow(e - avgEarnings, 2), 0) / earnings.length;
    const coefficientOfVariation = Math.sqrt(variance) / Math.abs(avgEarnings);
    
    if (allPositive && coefficientOfVariation < 0.2) {
      recommendations.recommended.push('EPV');
      recommendations.reasons['EPV'] = 'Stable and consistent earnings';
    } else if (allPositive) {
      recommendations.caution.push('EPV');
      recommendations.reasons['EPV'] = 'Positive but variable earnings';
    } else {
      recommendations.notRecommended.push('EPV');
      recommendations.reasons['EPV'] = 'Inconsistent or negative earnings';
    }
  }

  return recommendations;
}