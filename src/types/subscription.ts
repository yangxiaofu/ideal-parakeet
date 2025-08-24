import type { SubscriptionTier, SubscriptionStatus, SubscriptionLimits, UserProfile } from './index';
import type { Timestamp } from 'firebase/firestore';

// Subscription Management Types
export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: {
    monthly: number;
    annual?: number;
  };
  limits: SubscriptionLimits;
  features: string[];
  popular?: boolean;
}

// Usage Tracking Types
export interface UsageQuota {
  current: number;
  limit: number;
  percentage: number;
  resetDate: Date;
}

export interface UsageResponse {
  allowed: boolean;
  quotas: {
    searches: UsageQuota;
    exports?: UsageQuota;
  };
  message?: string;
  upgradeRequired?: boolean;
}

// Billing and Payment Types
export interface SubscriptionChange {
  fromTier: SubscriptionTier;
  toTier: SubscriptionTier;
  effectiveDate: Date;
  prorationAmount?: number;
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'canceled';
}

// Firestore Document Types (for type-safe database operations)
export interface UserProfileDoc {
  email: string;
  displayName?: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  createdAt: Timestamp; // Firestore Timestamp
  updatedAt: Timestamp; // Firestore Timestamp
  currentPeriodStart: Timestamp; // Firestore Timestamp
  currentPeriodEnd: Timestamp; // Firestore Timestamp
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface UsageDataDoc {
  month: string;
  searchCount: number;
  searchLimit: number;
  lastReset: Timestamp; // Firestore Timestamp
  searchHistory: Array<{
    symbol: string;
    timestamp: Timestamp; // Firestore Timestamp
    fromCache: boolean;
    calculatorType?: string;
  }>;
  createdAt: Timestamp; // Firestore Timestamp
  updatedAt: Timestamp; // Firestore Timestamp
}

// Hook Return Types
export interface UseSubscriptionResult {
  userProfile: UserProfile | null;
  subscriptionPlan: SubscriptionPlan | null;
  loading: boolean;
  error: string | null;
  updateSubscription: (tier: SubscriptionTier) => Promise<void>;
  cancelSubscription: () => Promise<void>;
}

export interface UseUsageTrackingResult {
  usageData: UsageResponse | null;
  loading: boolean;
  error: string | null;
  checkUsageLimit: (action: 'search' | 'export') => Promise<UsageResponse>;
  incrementUsage: (action: 'search' | 'export', metadata?: Record<string, unknown>) => Promise<void>;
  refreshUsage: () => Promise<void>;
}

// API Response Types
export interface CreateSubscriptionResponse {
  success: boolean;
  subscriptionId?: string;
  clientSecret?: string;
  error?: string;
}

export interface UpgradePreviewResponse {
  success: boolean;
  prorationAmount: number;
  nextBillingDate: Date;
  newMonthlyAmount: number;
  error?: string;
}