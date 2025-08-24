/**
 * Mock Payment Service
 * Simulates Stripe-like payment processing with realistic delays and behaviors
 */

import type {
  MockCreditCard,
  MockCustomer,
  MockSubscription,
  MockInvoice,
  PaymentIntent,
  PaymentFormData,
  SubscriptionChangePreview,
  MockWebhookEvent,
  WebhookEventType
} from '../types/payment';
import type { SubscriptionTier } from '../types/index';
import { SUBSCRIPTION_PLANS } from '../constants/subscription';

// Mock database - in real app this would be Firestore/database
const mockCustomers = new Map<string, MockCustomer>();
const mockSubscriptions = new Map<string, MockSubscription>();
const mockInvoices = new Map<string, MockInvoice>();

export class MockPaymentService {
  private static instance: MockPaymentService;

  private constructor() {}

  static getInstance(): MockPaymentService {
    if (!MockPaymentService.instance) {
      MockPaymentService.instance = new MockPaymentService();
    }
    return MockPaymentService.instance;
  }

  /**
   * Create or update a customer
   */
  async createCustomer(userId: string, email: string, name?: string): Promise<MockCustomer> {
    await this.simulateDelay(500, 1200);

    const customer: MockCustomer = {
      id: `cus_${userId.substring(0, 8)}${Date.now()}`,
      email,
      name,
      paymentMethods: [],
    };

    mockCustomers.set(userId, customer);
    console.log('Mock: Created customer', customer.id);
    return customer;
  }

  /**
   * Get customer by user ID
   */
  async getCustomer(userId: string): Promise<MockCustomer | null> {
    await this.simulateDelay(200, 500);
    return mockCustomers.get(userId) || null;
  }

  /**
   * Add payment method to customer
   */
  async addPaymentMethod(
    userId: string, 
    paymentData: PaymentFormData
  ): Promise<{ success: boolean; paymentMethod?: MockCreditCard; error?: string }> {
    await this.simulateDelay(1000, 2000);

    // Simulate validation errors
    if (!this.isValidCard(paymentData.cardNumber)) {
      return {
        success: false,
        error: 'Invalid card number'
      };
    }

    if (this.isDeclinedCard(paymentData.cardNumber)) {
      return {
        success: false,
        error: 'Your card was declined'
      };
    }

    const customer = mockCustomers.get(userId);
    if (!customer) {
      return {
        success: false,
        error: 'Customer not found'
      };
    }

    const paymentMethod: MockCreditCard = {
      id: `pm_${Date.now()}${Math.random().toString(36).substring(2, 15)}`,
      last4: paymentData.cardNumber.slice(-4),
      brand: this.getCardBrand(paymentData.cardNumber),
      expMonth: parseInt(paymentData.expiryDate.split('/')[0]),
      expYear: parseInt(`20${paymentData.expiryDate.split('/')[1]}`),
      isDefault: customer.paymentMethods.length === 0,
    };

    customer.paymentMethods.push(paymentMethod);
    if (paymentMethod.isDefault) {
      customer.defaultPaymentMethod = paymentMethod.id;
    }

    console.log('Mock: Added payment method', paymentMethod.id);
    return { success: true, paymentMethod };
  }

  /**
   * Create subscription for a customer
   */
  async createSubscription(
    userId: string, 
    tier: SubscriptionTier
  ): Promise<{ success: boolean; subscription?: MockSubscription; error?: string }> {
    await this.simulateDelay(1500, 3000);

    const customer = await this.getCustomer(userId);
    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    // Simulate payment failure (5% chance)
    if (Math.random() < 0.05) {
      return {
        success: false,
        error: 'Payment failed. Please try a different payment method.'
      };
    }

    const plan = SUBSCRIPTION_PLANS[tier];
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription: MockSubscription = {
      id: `sub_${Date.now()}${Math.random().toString(36).substring(2, 15)}`,
      customerId: customer.id,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      priceId: `price_${tier}`,
      quantity: 1,
      metadata: {
        userId,
        tier,
      },
    };

    mockSubscriptions.set(userId, subscription);

    // Generate first invoice
    await this.generateInvoice(customer.id, subscription, plan.price.monthly);

    console.log('Mock: Created subscription', subscription.id, 'for tier', tier);
    this.emitWebhookEvent('customer.subscription.created', subscription);

    return { success: true, subscription };
  }

  /**
   * Update subscription (upgrade/downgrade)
   */
  async updateSubscription(
    userId: string,
    newTier: SubscriptionTier
  ): Promise<{ success: boolean; subscription?: MockSubscription; error?: string }> {
    await this.simulateDelay(1000, 2000);

    const subscription = mockSubscriptions.get(userId);
    if (!subscription) {
      return { success: false, error: 'Subscription not found' };
    }

    const oldTier = subscription.metadata?.tier;
    
    const updatedSubscription: MockSubscription = {
      ...subscription,
      priceId: `price_${newTier}`,
      metadata: {
        ...subscription.metadata,
        tier: newTier || subscription.metadata?.tier,
      },
    };

    mockSubscriptions.set(userId, updatedSubscription);

    console.log('Mock: Updated subscription', subscription.id, 'from', oldTier, 'to', newTier);
    this.emitWebhookEvent('customer.subscription.updated', updatedSubscription, {
      metadata: { tier: oldTier || 'basic' },
    });

    return { success: true, subscription: updatedSubscription };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    userId: string,
    immediate = false
  ): Promise<{ success: boolean; subscription?: MockSubscription; error?: string }> {
    await this.simulateDelay(800, 1500);

    const subscription = mockSubscriptions.get(userId);
    if (!subscription) {
      return { success: false, error: 'Subscription not found' };
    }

    const canceledSubscription: MockSubscription = {
      ...subscription,
      status: immediate ? 'canceled' : 'active',
      cancelAtPeriodEnd: !immediate,
      canceledAt: immediate ? new Date() : undefined,
    };

    mockSubscriptions.set(userId, canceledSubscription);

    console.log('Mock: Canceled subscription', subscription.id, immediate ? 'immediately' : 'at period end');
    this.emitWebhookEvent('customer.subscription.updated', canceledSubscription);

    return { success: true, subscription: canceledSubscription };
  }

  /**
   * Get subscription for user
   */
  async getSubscription(userId: string): Promise<MockSubscription | null> {
    await this.simulateDelay(200, 500);
    return mockSubscriptions.get(userId) || null;
  }

  /**
   * Preview subscription change (prorations, etc.)
   */
  async previewSubscriptionChange(
    userId: string,
    newTier: SubscriptionTier
  ): Promise<SubscriptionChangePreview> {
    await this.simulateDelay(500, 1000);

    const subscription = mockSubscriptions.get(userId);
    const currentTier = subscription?.metadata?.tier as SubscriptionTier;
    const currentPlan = currentTier ? SUBSCRIPTION_PLANS[currentTier] : null;
    const newPlan = SUBSCRIPTION_PLANS[newTier];

    if (!currentPlan || !subscription) {
      return {
        immediateCharge: newPlan.price.monthly,
        nextInvoiceAmount: newPlan.price.monthly,
        nextInvoiceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        prorationAmount: 0,
        description: `Upgrade to ${newPlan.name}`,
      };
    }

    // Calculate proration (simplified)
    const daysRemaining = Math.ceil(
      (subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const dailyOldRate = currentPlan.price.monthly / 30;
    const dailyNewRate = newPlan.price.monthly / 30;
    const prorationAmount = Math.max(0, (dailyNewRate - dailyOldRate) * daysRemaining);

    return {
      immediateCharge: prorationAmount,
      nextInvoiceAmount: newPlan.price.monthly,
      nextInvoiceDate: subscription.currentPeriodEnd,
      prorationAmount,
      description: prorationAmount > 0 
        ? `Upgrade to ${newPlan.name}` 
        : `Downgrade to ${newPlan.name}`,
    };
  }

  /**
   * Get customer invoices
   */
  async getInvoices(userId: string, limit = 10): Promise<MockInvoice[]> {
    await this.simulateDelay(300, 800);

    const customer = await this.getCustomer(userId);
    if (!customer) return [];

    return Array.from(mockInvoices.values())
      .filter(invoice => invoice.customerId === customer.id)
      .sort((a, b) => b.created.getTime() - a.created.getTime())
      .slice(0, limit);
  }

  // Private helper methods

  private async simulateDelay(min = 500, max = 2000): Promise<void> {
    // Skip delays in development mode for faster testing
    const isDevelopment = import.meta.env.DEV;
    if (isDevelopment) {
      return new Promise(resolve => setTimeout(resolve, 100)); // Minimal delay for UI feedback
    }
    
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private isValidCard(cardNumber: string): boolean {
    // In development mode, bypass validation for easier testing
    const isDevelopment = import.meta.env.DEV;
    if (isDevelopment) {
      // Just check basic format in development
      const digits = cardNumber.replace(/\D/g, '');
      return digits.length >= 13 && digits.length <= 19;
    }

    // Production mode: Full Luhn algorithm check
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  private isDeclinedCard(cardNumber: string): boolean {
    // Simulate declined cards (specific test numbers)
    const declinedNumbers = ['4000000000000002', '4000000000000069', '4000000000000119'];
    return declinedNumbers.includes(cardNumber.replace(/\D/g, ''));
  }

  private getCardBrand(cardNumber: string): 'visa' | 'mastercard' | 'amex' | 'discover' {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.startsWith('4')) return 'visa';
    if (digits.startsWith('5') || digits.startsWith('2')) return 'mastercard';
    if (digits.startsWith('3')) return 'amex';
    return 'discover';
  }

  private async generateInvoice(
    customerId: string,
    subscription: MockSubscription,
    amount: number
  ): Promise<MockInvoice> {
    const invoice: MockInvoice = {
      id: `in_${Date.now()}${Math.random().toString(36).substring(2, 15)}`,
      customerId,
      subscriptionId: subscription.id,
      amount,
      currency: 'usd',
      status: 'paid',
      created: new Date(),
      paidAt: new Date(),
      hostedInvoiceUrl: `https://invoice.bedrock-value.com/invoice/${Date.now()}`,
      invoicePdf: `https://invoice.bedrock-value.com/pdf/${Date.now()}`,
      description: `${SUBSCRIPTION_PLANS[subscription.metadata?.tier as SubscriptionTier]?.name || 'BedRock Value'} subscription`,
      lineItems: [{
        id: `li_${Date.now()}`,
        description: `${SUBSCRIPTION_PLANS[subscription.metadata?.tier as SubscriptionTier]?.name || 'BedRock Value'} (Monthly)`,
        amount,
        quantity: 1,
        period: {
          start: subscription.currentPeriodStart,
          end: subscription.currentPeriodEnd,
        },
      }],
    };

    mockInvoices.set(invoice.id, invoice);
    return invoice;
  }

  private emitWebhookEvent(
    type: WebhookEventType,
    object: MockSubscription | PaymentIntent | MockInvoice,
    previousAttributes?: Partial<MockSubscription | PaymentIntent | MockInvoice>
  ): void {
    const event: MockWebhookEvent = {
      id: `evt_${Date.now()}${Math.random().toString(36).substring(2, 15)}`,
      type,
      created: new Date(),
      data: {
        object,
        previous_attributes: previousAttributes,
      },
      livemode: false,
    };

    console.log('Mock Webhook Event:', event.type, event.id);
    // In real implementation, this would trigger webhook handlers
  }
}

// Export singleton instance
export const mockPaymentService = MockPaymentService.getInstance();