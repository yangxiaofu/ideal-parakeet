/**
 * Mock Billing Service
 * Handles subscription management, billing operations, and integration with payment service
 */

import { mockPaymentService } from './MockPaymentService';
import { userProfileService } from './UserProfileService';
import type {
  MockSubscription,
  MockInvoice,
  PaymentFormData,
  SubscriptionChangePreview
} from '../types/payment';
import type { SubscriptionTier } from '../types/index';

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

interface SubscriptionManagementResult {
  success: boolean;
  subscription?: MockSubscription;
  error?: string;
  requiresPayment?: boolean;
}

export class MockBillingService {
  private static instance: MockBillingService;

  private constructor() {}

  static getInstance(): MockBillingService {
    if (!MockBillingService.instance) {
      MockBillingService.instance = new MockBillingService();
    }
    return MockBillingService.instance;
  }

  /**
   * Initialize billing for a new user
   */
  async initializeBilling(userId: string, email: string, name?: string): Promise<void> {
    try {
      console.log('Initializing billing for user:', userId);
      await mockPaymentService.createCustomer(userId, email, name);
    } catch (error) {
      console.error('Failed to initialize billing:', error);
      throw error;
    }
  }

  /**
   * Get complete billing dashboard data
   */
  async getBillingDashboard(userId: string): Promise<BillingDashboardData> {
    console.log('Loading billing dashboard for user:', userId);

    const [customer, subscription, invoices] = await Promise.all([
      mockPaymentService.getCustomer(userId),
      mockPaymentService.getSubscription(userId),
      mockPaymentService.getInvoices(userId, 5)
    ]);

    return {
      subscription,
      nextInvoice: invoices.find(inv => inv.status === 'open') || null,
      recentInvoices: invoices.filter(inv => inv.status === 'paid'),
      paymentMethods: customer?.paymentMethods.map(pm => ({
        id: pm.id,
        last4: pm.last4,
        brand: pm.brand,
        isDefault: pm.isDefault,
      })) || [],
    };
  }

  /**
   * Process upgrade/downgrade with payment handling
   */
  async changeSubscription(
    userId: string,
    newTier: SubscriptionTier,
    paymentData?: PaymentFormData
  ): Promise<SubscriptionManagementResult> {
    try {
      console.log('Processing subscription change:', { userId, newTier });

      const customer = await mockPaymentService.getCustomer(userId);
      const currentSubscription = await mockPaymentService.getSubscription(userId);

      // If no customer exists, create one
      if (!customer) {
        const userProfile = await userProfileService.getUserProfile(userId);
        if (!userProfile) {
          return { success: false, error: 'User profile not found' };
        }
        await mockPaymentService.createCustomer(userId, userProfile.email, userProfile.displayName);
      }

      // Handle payment method for new subscriptions
      if (!currentSubscription && newTier !== 'basic') {
        if (!paymentData) {
          return {
            success: false,
            error: 'Payment method required for paid subscriptions',
            requiresPayment: true
          };
        }

        // Add payment method
        const paymentResult = await mockPaymentService.addPaymentMethod(userId, paymentData);
        if (!paymentResult.success) {
          return { success: false, error: paymentResult.error };
        }
      }

      let subscriptionResult;

      if (!currentSubscription) {
        // Create new subscription
        if (newTier === 'basic') {
          // Basic tier doesn't need payment processing
          await userProfileService.updateSubscriptionTier(userId, newTier);
          return { success: true };
        } else {
          subscriptionResult = await mockPaymentService.createSubscription(userId, newTier);
        }
      } else {
        // Update existing subscription
        if (newTier === 'basic') {
          // Downgrade to basic (cancel subscription)
          subscriptionResult = await mockPaymentService.cancelSubscription(userId, false);
          if (subscriptionResult.success) {
            // Update to basic immediately for UX
            await userProfileService.updateSubscriptionTier(userId, newTier);
          }
        } else {
          subscriptionResult = await mockPaymentService.updateSubscription(userId, newTier);
        }
      }

      if (!subscriptionResult.success) {
        return { success: false, error: subscriptionResult.error };
      }

      // Update user profile with new tier
      if (newTier !== 'basic') {
        await userProfileService.updateSubscriptionTier(userId, newTier);
      }

      console.log('Successfully changed subscription to:', newTier);
      return { 
        success: true, 
        subscription: subscriptionResult.subscription 
      };

    } catch (error) {
      console.error('Failed to change subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  /**
   * Cancel subscription with retention offers
   */
  async cancelSubscription(
    userId: string,
    reason?: string,
    feedback?: string
  ): Promise<SubscriptionManagementResult> {
    try {
      console.log('Processing subscription cancellation:', { userId, reason });

      const result = await mockPaymentService.cancelSubscription(userId, false);
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Log cancellation reason for analytics
      console.log('Subscription cancelled:', { userId, reason, feedback });

      return { success: true, subscription: result.subscription };
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to cancel subscription'
      };
    }
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(userId: string): Promise<SubscriptionManagementResult> {
    try {
      console.log('Reactivating subscription for user:', userId);

      const subscription = await mockPaymentService.getSubscription(userId);
      if (!subscription) {
        return { success: false, error: 'No subscription found' };
      }

      if (subscription.status !== 'canceled' && !subscription.cancelAtPeriodEnd) {
        return { success: false, error: 'Subscription is not cancelled' };
      }

      // Remove cancellation
      const reactivatedSubscription: MockSubscription = {
        ...subscription,
        cancelAtPeriodEnd: false,
        canceledAt: undefined,
        status: 'active',
      };

      // In a real implementation, this would call Stripe
      console.log('Subscription reactivated:', reactivatedSubscription.id);

      return { success: true, subscription: reactivatedSubscription };
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reactivate subscription'
      };
    }
  }

  /**
   * Get preview of subscription changes (pricing, prorations, etc.)
   */
  async getSubscriptionChangePreview(
    userId: string,
    newTier: SubscriptionTier
  ): Promise<SubscriptionChangePreview> {
    return mockPaymentService.previewSubscriptionChange(userId, newTier);
  }

  /**
   * Download invoice PDF
   */
  async downloadInvoice(invoiceId: string): Promise<{ success: boolean; blob?: Blob; error?: string }> {
    try {
      console.log('Downloading invoice:', invoiceId);

      // Simulate PDF generation delay
      const isDevelopment = import.meta.env.DEV;
      const delay = isDevelopment ? 200 : 1000 + Math.random() * 2000; // Fast in dev, realistic in prod
      await new Promise(resolve => setTimeout(resolve, delay));

      // Generate mock PDF blob
      const pdfContent = this.generateMockInvoicePDF(invoiceId);
      const blob = new Blob([pdfContent], { type: 'application/pdf' });

      return { success: true, blob };
    } catch (error) {
      console.error('Failed to download invoice:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to download invoice'
      };
    }
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(
    userId: string,
    paymentData: PaymentFormData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Updating payment method for user:', userId);

      const result = await mockPaymentService.addPaymentMethod(userId, paymentData);
      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to update payment method:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update payment method'
      };
    }
  }

  // Private helper methods

  private generateMockInvoicePDF(invoiceId: string): string {
    // Generate mock PDF content (in real app, use a proper PDF library)
    return `%PDF-1.4
Mock Invoice PDF for ${invoiceId}
Generated by BedRock Value

This is a mock PDF invoice for testing purposes.
In production, this would be generated using react-pdf or similar library.

Invoice ID: ${invoiceId}
Date: ${new Date().toISOString()}
Amount: $29.00
Status: Paid

Thank you for your business!
%%EOF`;
  }

  /**
   * Handle webhook events from payment processor
   */
  async handleWebhookEvent(eventType: string, data: unknown): Promise<void> {
    console.log('Processing webhook event:', eventType, data);

    try {
      switch (eventType) {
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(data);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(data);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(data);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(data);
          break;
        default:
          console.log('Unhandled webhook event type:', eventType);
      }
    } catch (error) {
      console.error('Failed to process webhook event:', error);
      throw error;
    }
  }

  private async handleSubscriptionUpdated(data: unknown): Promise<void> {
    console.log('Handling subscription updated:', data);
    // In real implementation, sync subscription status with user profile
  }

  private async handleSubscriptionDeleted(data: unknown): Promise<void> {
    console.log('Handling subscription deleted:', data);
    // In real implementation, downgrade user to basic tier
  }

  private async handlePaymentSucceeded(data: unknown): Promise<void> {
    console.log('Handling payment succeeded:', data);
    // In real implementation, update billing status, send confirmation email
  }

  private async handlePaymentFailed(data: unknown): Promise<void> {
    console.log('Handling payment failed:', data);
    // In real implementation, notify user, attempt retry, or suspend account
  }
}

// Export singleton instance
export const mockBillingService = MockBillingService.getInstance();