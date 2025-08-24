/**
 * useBilling Hook
 * Manages billing dashboard data, invoices, and subscription management
 */

import { useState, useEffect, useCallback } from 'react';
import { mockBillingService } from '../services/MockBillingService';
import { useAuth } from '../contexts/AuthContext';
import type { 
  MockSubscription,
  MockInvoice
} from '../types/payment';

interface BillingDashboardData {
  subscription: MockSubscription | null;
  nextInvoice: MockInvoice | null;
  recentInvoices: MockInvoice[];
  paymentMethods: Array<{
    id: string;
    last4: string;
    brand: string;
    isDefault: boolean;
  }>;
}

interface UseBillingResult {
  // Data
  billingData: BillingDashboardData | null;
  
  // Loading states
  loading: boolean;
  invoiceDownloading: string | null;
  
  // Error handling
  error: string | null;
  
  // Actions
  loadBillingData: () => Promise<void>;
  downloadInvoice: (invoiceId: string) => Promise<void>;
  
  // Subscription status helpers
  isSubscriptionActive: () => boolean;
  isSubscriptionCanceled: () => boolean;
  getSubscriptionStatus: () => string;
  getDaysUntilRenewal: () => number;
  
  // Reset
  clearError: () => void;
}

export function useBilling(): UseBillingResult {
  const { user } = useAuth();
  const [billingData, setBillingData] = useState<BillingDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoiceDownloading, setInvoiceDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBillingData = useCallback(async (): Promise<void> => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Loading billing data for user:', user.uid);
      const data = await mockBillingService.getBillingDashboard(user.uid);
      setBillingData(data);
    } catch (err) {
      console.error('Failed to load billing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const downloadInvoice = useCallback(async (invoiceId: string): Promise<void> => {
    setInvoiceDownloading(invoiceId);
    setError(null);

    try {
      console.log('Downloading invoice:', invoiceId);
      const result = await mockBillingService.downloadInvoice(invoiceId);

      if (result.success && result.blob) {
        // Create download link and trigger download
        const url = window.URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bedrock-value-invoice-${invoiceId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log('Invoice downloaded successfully');
      } else {
        throw new Error(result.error || 'Failed to download invoice');
      }
    } catch (err) {
      console.error('Invoice download failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to download invoice');
    } finally {
      setInvoiceDownloading(null);
    }
  }, []);

  // Load billing data when user changes
  useEffect(() => {
    if (user) {
      loadBillingData();
    } else {
      setBillingData(null);
    }
  }, [user, loadBillingData]);

  // Subscription status helpers
  const isSubscriptionActive = useCallback((): boolean => {
    return billingData?.subscription?.status === 'active';
  }, [billingData]);

  const isSubscriptionCanceled = useCallback((): boolean => {
    return billingData?.subscription?.cancelAtPeriodEnd === true ||
           billingData?.subscription?.status === 'canceled';
  }, [billingData]);

  const getSubscriptionStatus = useCallback((): string => {
    const subscription = billingData?.subscription;
    if (!subscription) return 'No subscription';

    switch (subscription.status) {
      case 'active':
        if (subscription.cancelAtPeriodEnd) {
          return 'Canceling at period end';
        }
        return 'Active';
      case 'canceled':
        return 'Canceled';
      case 'past_due':
        return 'Past due';
      case 'unpaid':
        return 'Unpaid';
      case 'incomplete':
        return 'Incomplete';
      default:
        return subscription.status;
    }
  }, [billingData]);

  const getDaysUntilRenewal = useCallback((): number => {
    const subscription = billingData?.subscription;
    if (!subscription) return 0;

    const now = new Date();
    const endDate = new Date(subscription.currentPeriodEnd);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }, [billingData]);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    billingData,
    loading,
    invoiceDownloading,
    error,
    loadBillingData,
    downloadInvoice,
    isSubscriptionActive,
    isSubscriptionCanceled,
    getSubscriptionStatus,
    getDaysUntilRenewal,
    clearError,
  };
}

// Helper hook for subscription status display
export function useSubscriptionStatus(): {
  statusText: string;
  statusColor: 'green' | 'yellow' | 'red' | 'gray';
  daysUntilRenewal: number;
  isActive: boolean;
  isCanceling: boolean;
} {
  const { billingData } = useBilling();
  const subscription = billingData?.subscription;

  let statusText = 'No subscription';
  let statusColor: 'green' | 'yellow' | 'red' | 'gray' = 'gray';
  let isActive = false;
  let isCanceling = false;

  if (subscription) {
    isActive = subscription.status === 'active';
    isCanceling = subscription.cancelAtPeriodEnd === true;

    if (isActive && !isCanceling) {
      statusText = 'Active';
      statusColor = 'green';
    } else if (isActive && isCanceling) {
      statusText = 'Canceling';
      statusColor = 'yellow';
    } else if (subscription.status === 'past_due') {
      statusText = 'Past Due';
      statusColor = 'red';
    } else if (subscription.status === 'canceled') {
      statusText = 'Canceled';
      statusColor = 'red';
    } else {
      statusText = subscription.status;
      statusColor = 'gray';
    }
  }

  const daysUntilRenewal = subscription
    ? Math.max(0, Math.ceil(
        (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ))
    : 0;

  return {
    statusText,
    statusColor,
    daysUntilRenewal,
    isActive,
    isCanceling,
  };
}