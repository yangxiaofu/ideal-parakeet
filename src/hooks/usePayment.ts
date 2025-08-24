/**
 * usePayment Hook
 * Manages payment processing, subscription changes, and billing operations
 */

import { useState, useCallback } from 'react';
import { mockBillingService } from '../services/MockBillingService';
import { useAuth } from '../contexts/AuthContext';
import type { 
  PaymentFormData, 
  SubscriptionChangePreview 
} from '../types/payment';
import type { SubscriptionTier } from '../types/index';

interface PaymentState {
  processing: boolean;
  error: string | null;
  success: boolean;
}

interface SubscriptionChangeState extends PaymentState {
  requiresPayment: boolean;
  preview: SubscriptionChangePreview | null;
}

interface UsePaymentResult {
  // Payment state
  paymentState: PaymentState;
  subscriptionState: SubscriptionChangeState;
  
  // Actions
  processUpgrade: (
    targetTier: SubscriptionTier,
    paymentData?: PaymentFormData
  ) => Promise<boolean>;
  
  processDowngrade: (targetTier: SubscriptionTier) => Promise<boolean>;
  
  cancelSubscription: (
    reason?: string,
    feedback?: string
  ) => Promise<boolean>;
  
  reactivateSubscription: () => Promise<boolean>;
  
  updatePaymentMethod: (paymentData: PaymentFormData) => Promise<boolean>;
  
  getChangePreview: (targetTier: SubscriptionTier) => Promise<void>;
  
  // Reset states
  resetPaymentState: () => void;
  resetSubscriptionState: () => void;
}

export function usePayment(): UsePaymentResult {
  const { user, refreshProfile } = useAuth();
  
  const [paymentState, setPaymentState] = useState<PaymentState>({
    processing: false,
    error: null,
    success: false,
  });

  const [subscriptionState, setSubscriptionState] = useState<SubscriptionChangeState>({
    processing: false,
    error: null,
    success: false,
    requiresPayment: false,
    preview: null,
  });

  const processUpgrade = useCallback(async (
    targetTier: SubscriptionTier,
    paymentData?: PaymentFormData
  ): Promise<boolean> => {
    if (!user) {
      setSubscriptionState(prev => ({
        ...prev,
        error: 'User not authenticated',
        success: false,
      }));
      return false;
    }

    setSubscriptionState(prev => ({
      ...prev,
      processing: true,
      error: null,
      success: false,
    }));

    try {
      console.log('Processing upgrade to:', targetTier);
      
      const result = await mockBillingService.changeSubscription(
        user.uid,
        targetTier,
        paymentData
      );

      if (result.success) {
        setSubscriptionState(prev => ({
          ...prev,
          processing: false,
          success: true,
          requiresPayment: false,
        }));

        // Refresh user profile to get updated subscription data
        await refreshProfile();
        
        console.log('Successfully upgraded to:', targetTier);
        return true;
      } else {
        setSubscriptionState(prev => ({
          ...prev,
          processing: false,
          error: result.error || 'Upgrade failed',
          requiresPayment: result.requiresPayment || false,
        }));
        return false;
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
      setSubscriptionState(prev => ({
        ...prev,
        processing: false,
        error: error instanceof Error ? error.message : 'Upgrade failed',
      }));
      return false;
    }
  }, [user, refreshProfile]);

  const processDowngrade = useCallback(async (targetTier: SubscriptionTier): Promise<boolean> => {
    if (!user) {
      setSubscriptionState(prev => ({
        ...prev,
        error: 'User not authenticated',
        success: false,
      }));
      return false;
    }

    setSubscriptionState(prev => ({
      ...prev,
      processing: true,
      error: null,
      success: false,
    }));

    try {
      console.log('Processing downgrade to:', targetTier);
      
      const result = await mockBillingService.changeSubscription(user.uid, targetTier);

      if (result.success) {
        setSubscriptionState(prev => ({
          ...prev,
          processing: false,
          success: true,
        }));

        // Refresh user profile to get updated subscription data
        await refreshProfile();
        
        console.log('Successfully downgraded to:', targetTier);
        return true;
      } else {
        setSubscriptionState(prev => ({
          ...prev,
          processing: false,
          error: result.error || 'Downgrade failed',
        }));
        return false;
      }
    } catch (error) {
      console.error('Downgrade failed:', error);
      setSubscriptionState(prev => ({
        ...prev,
        processing: false,
        error: error instanceof Error ? error.message : 'Downgrade failed',
      }));
      return false;
    }
  }, [user, refreshProfile]);

  const cancelSubscription = useCallback(async (
    reason?: string,
    feedback?: string
  ): Promise<boolean> => {
    if (!user) {
      setSubscriptionState(prev => ({
        ...prev,
        error: 'User not authenticated',
        success: false,
      }));
      return false;
    }

    setSubscriptionState(prev => ({
      ...prev,
      processing: true,
      error: null,
      success: false,
    }));

    try {
      console.log('Processing subscription cancellation');
      
      const result = await mockBillingService.cancelSubscription(user.uid, reason, feedback);

      if (result.success) {
        setSubscriptionState(prev => ({
          ...prev,
          processing: false,
          success: true,
        }));

        // Refresh user profile
        await refreshProfile();
        
        console.log('Successfully cancelled subscription');
        return true;
      } else {
        setSubscriptionState(prev => ({
          ...prev,
          processing: false,
          error: result.error || 'Cancellation failed',
        }));
        return false;
      }
    } catch (error) {
      console.error('Cancellation failed:', error);
      setSubscriptionState(prev => ({
        ...prev,
        processing: false,
        error: error instanceof Error ? error.message : 'Cancellation failed',
      }));
      return false;
    }
  }, [user, refreshProfile]);

  const reactivateSubscription = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setSubscriptionState(prev => ({
        ...prev,
        error: 'User not authenticated',
        success: false,
      }));
      return false;
    }

    setSubscriptionState(prev => ({
      ...prev,
      processing: true,
      error: null,
      success: false,
    }));

    try {
      console.log('Processing subscription reactivation');
      
      const result = await mockBillingService.reactivateSubscription(user.uid);

      if (result.success) {
        setSubscriptionState(prev => ({
          ...prev,
          processing: false,
          success: true,
        }));

        // Refresh user profile
        await refreshProfile();
        
        console.log('Successfully reactivated subscription');
        return true;
      } else {
        setSubscriptionState(prev => ({
          ...prev,
          processing: false,
          error: result.error || 'Reactivation failed',
        }));
        return false;
      }
    } catch (error) {
      console.error('Reactivation failed:', error);
      setSubscriptionState(prev => ({
        ...prev,
        processing: false,
        error: error instanceof Error ? error.message : 'Reactivation failed',
      }));
      return false;
    }
  }, [user, refreshProfile]);

  const updatePaymentMethod = useCallback(async (paymentData: PaymentFormData): Promise<boolean> => {
    if (!user) {
      setPaymentState(prev => ({
        ...prev,
        error: 'User not authenticated',
        success: false,
      }));
      return false;
    }

    setPaymentState(prev => ({
      ...prev,
      processing: true,
      error: null,
      success: false,
    }));

    try {
      console.log('Updating payment method');
      
      const result = await mockBillingService.updatePaymentMethod(user.uid, paymentData);

      if (result.success) {
        setPaymentState(prev => ({
          ...prev,
          processing: false,
          success: true,
        }));
        
        console.log('Successfully updated payment method');
        return true;
      } else {
        setPaymentState(prev => ({
          ...prev,
          processing: false,
          error: result.error || 'Payment method update failed',
        }));
        return false;
      }
    } catch (error) {
      console.error('Payment method update failed:', error);
      setPaymentState(prev => ({
        ...prev,
        processing: false,
        error: error instanceof Error ? error.message : 'Payment method update failed',
      }));
      return false;
    }
  }, [user]);

  const getChangePreview = useCallback(async (targetTier: SubscriptionTier): Promise<void> => {
    if (!user) return;

    try {
      console.log('Getting subscription change preview for:', targetTier);
      const preview = await mockBillingService.getSubscriptionChangePreview(user.uid, targetTier);
      
      setSubscriptionState(prev => ({
        ...prev,
        preview,
      }));
    } catch (error) {
      console.error('Failed to get change preview:', error);
      setSubscriptionState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get preview',
      }));
    }
  }, [user]);

  const resetPaymentState = useCallback((): void => {
    setPaymentState({
      processing: false,
      error: null,
      success: false,
    });
  }, []);

  const resetSubscriptionState = useCallback((): void => {
    setSubscriptionState({
      processing: false,
      error: null,
      success: false,
      requiresPayment: false,
      preview: null,
    });
  }, []);

  return {
    paymentState,
    subscriptionState,
    processUpgrade,
    processDowngrade,
    cancelSubscription,
    reactivateSubscription,
    updatePaymentMethod,
    getChangePreview,
    resetPaymentState,
    resetSubscriptionState,
  };
}

// Helper hook for simple upgrade checks
export function useCanUpgrade(): {
  canUpgrade: boolean;
  currentTier: SubscriptionTier | null;
  nextTier: SubscriptionTier | null;
} {
  const { userProfile } = useAuth();
  
  const currentTier = userProfile?.subscriptionTier || null;
  const tierOrder: SubscriptionTier[] = ['basic', 'pro', 'premium'];
  const currentIndex = currentTier ? tierOrder.indexOf(currentTier) : -1;
  const nextTier = currentIndex >= 0 && currentIndex < tierOrder.length - 1 
    ? tierOrder[currentIndex + 1] 
    : null;

  return {
    canUpgrade: !!nextTier,
    currentTier,
    nextTier,
  };
}