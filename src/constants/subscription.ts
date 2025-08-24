import type { SubscriptionTier, SubscriptionLimits } from '../types/index';
import type { SubscriptionPlan } from '../types/subscription';

// Subscription Tier Limits
export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  basic: {
    searchesPerMonth: 5,
    calculatorAccess: ['DCF'], // Only DCF calculator
    exportEnabled: false,
    historyLimit: 3, // Last 3 calculations only
    supportLevel: 'community',
  },
  pro: {
    searchesPerMonth: -1, // Unlimited
    calculatorAccess: ['DCF', 'DDM', 'NAV', 'EPV', 'RELATIVE'], // All calculators
    exportEnabled: true,
    historyLimit: -1, // Unlimited history
    supportLevel: 'email',
  },
  premium: {
    searchesPerMonth: -1, // Unlimited
    calculatorAccess: ['DCF', 'DDM', 'NAV', 'EPV', 'RELATIVE'], // All calculators
    exportEnabled: true,
    historyLimit: -1, // Unlimited history
    supportLevel: 'priority',
  },
};

// Subscription Plan Definitions (aligned with monetization strategy)
export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  basic: {
    tier: 'basic',
    name: 'BedRock Basic',
    description: 'Get started with professional valuation',
    price: {
      monthly: 0,
    },
    limits: SUBSCRIPTION_LIMITS.basic,
    features: [
      '5 company searches per month',
      'Basic DCF calculator',
      'Last 3 calculations saved',
      'Community support',
      'Basic results display',
    ],
  },
  pro: {
    tier: 'pro',
    name: 'BedRock Professional',
    description: 'For active investors and advisors',
    price: {
      monthly: 29,
      annual: 290, // 17% discount for annual
    },
    limits: SUBSCRIPTION_LIMITS.pro,
    features: [
      'Unlimited company searches',
      'All 5 valuation models (DCF, DDM, NAV, EPV, Relative)',
      'Complete calculation history',
      'PDF/Excel export',
      'Advanced comparison tools',
      'Email support (48-hour response)',
      'Mobile-responsive interface',
    ],
    popular: true,
  },
  premium: {
    tier: 'premium',
    name: 'BedRock Enterprise',
    description: 'For investment firms and consultants',
    price: {
      monthly: 79,
      annual: 790, // 17% discount for annual
    },
    limits: SUBSCRIPTION_LIMITS.premium,
    features: [
      'Everything in Professional, plus:',
      'Portfolio tracking',
      'Custom peer groups',
      'API access',
      'White-label reports',
      'Advanced analytics',
      'Priority email + phone support',
      'Team collaboration features',
    ],
  },
};

// Usage Tracking Constants
export const USAGE_CONSTANTS = {
  // Reset periods
  MONTHLY_RESET_DAY: 1, // First day of each month
  
  // Grace periods
  GRACE_PERIOD_DAYS: 3, // Days after billing period ends before blocking access
  
  // Soft limits (warnings)
  WARNING_THRESHOLDS: {
    searches: 0.8, // Warn at 80% usage
    exports: 0.9, // Warn at 90% usage
  },
  
  // Cache duration for usage data
  USAGE_CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
  
  // History retention
  SEARCH_HISTORY_RETENTION_MONTHS: 12, // Keep 12 months of search history
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  // Calculator access by tier
  CALCULATOR_ACCESS: {
    DCF: ['basic', 'pro', 'premium'],
    DDM: ['pro', 'premium'],
    NAV: ['pro', 'premium'],
    EPV: ['pro', 'premium'],
    RELATIVE: ['pro', 'premium'],
  },
  
  // Export features
  PDF_EXPORT: ['pro', 'premium'],
  EXCEL_EXPORT: ['pro', 'premium'],
  WHITE_LABEL_EXPORT: ['premium'],
  
  // Advanced features
  PORTFOLIO_TRACKING: ['premium'],
  CUSTOM_PEER_GROUPS: ['premium'],
  API_ACCESS: ['premium'],
  TEAM_COLLABORATION: ['premium'],
} as const;

// Error Messages
export const SUBSCRIPTION_ERRORS = {
  SEARCH_LIMIT_EXCEEDED: 'Monthly search limit exceeded. Upgrade to continue analyzing companies.',
  CALCULATOR_RESTRICTED: 'This calculator is only available for Pro and Premium users.',
  EXPORT_RESTRICTED: 'Export functionality is only available for paid plans.',
  HISTORY_LIMIT_EXCEEDED: 'History limit reached. Upgrade to save unlimited calculations.',
  SUBSCRIPTION_EXPIRED: 'Your subscription has expired. Please update your payment method.',
  USAGE_NOT_FOUND: 'Usage data not found. Please contact support.',
  INVALID_TIER: 'Invalid subscription tier specified.',
} as const;

// Success Messages
export const SUBSCRIPTION_MESSAGES = {
  UPGRADE_SUCCESS: 'Successfully upgraded your subscription!',
  DOWNGRADE_SUCCESS: 'Successfully changed your subscription plan.',
  CANCELLATION_SUCCESS: 'Subscription cancelled. Access will continue until the end of your billing period.',
  USAGE_RESET: 'Your monthly usage has been reset.',
} as const;

// Helper Functions
export const isFeatureAvailable = (
  feature: keyof typeof FEATURE_FLAGS,
  tier: SubscriptionTier
): boolean => {
  const allowedTiers = FEATURE_FLAGS[feature];
  return Array.isArray(allowedTiers) ? allowedTiers.includes(tier) : false;
};

export const getSearchLimit = (tier: SubscriptionTier): number => {
  return SUBSCRIPTION_LIMITS[tier].searchesPerMonth;
};

export const isUnlimitedTier = (tier: SubscriptionTier): boolean => {
  return tier === 'pro' || tier === 'premium';
};

export const getUpgradeMessage = (currentTier: SubscriptionTier, feature: string): string => {
  if (currentTier === 'basic') {
    return `Upgrade to Professional ($29/month) to access ${feature} and unlimited searches.`;
  }
  return `Upgrade to Enterprise ($79/month) to access ${feature} and advanced features.`;
};

export const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

// Billing Cycle Utilities
export const getBillingCycleStart = (date: Date = new Date()): Date => {
  const start = new Date(date);
  start.setDate(USAGE_CONSTANTS.MONTHLY_RESET_DAY);
  start.setHours(0, 0, 0, 0);
  
  // If current date is before reset day, use previous month
  if (date.getDate() < USAGE_CONSTANTS.MONTHLY_RESET_DAY) {
    start.setMonth(start.getMonth() - 1);
  }
  
  return start;
};

export const getBillingCycleEnd = (date: Date = new Date()): Date => {
  const end = getBillingCycleStart(date);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  return end;
};

export const getCurrentUsageMonth = (date: Date = new Date()): string => {
  const start = getBillingCycleStart(date);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
};