/**
 * Payment and Billing Type Definitions
 * Mock payment system types that simulate real Stripe-like functionality
 */

export type PaymentStatus = 'idle' | 'processing' | 'succeeded' | 'failed';
export type PaymentMethod = 'credit_card' | 'paypal' | 'bank_transfer';

export interface MockCreditCard {
  id: string;
  last4: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'discover';
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description: string;
  metadata?: Record<string, string>;
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface MockCustomer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: BillingAddress;
  paymentMethods: MockCreditCard[];
  defaultPaymentMethod?: string;
}

export interface MockSubscription {
  id: string;
  customerId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  priceId: string;
  quantity: number;
  metadata?: Record<string, string>;
}

export interface MockInvoice {
  id: string;
  customerId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  created: Date;
  dueDate?: Date;
  paidAt?: Date;
  hostedInvoiceUrl: string;
  invoicePdf: string;
  description: string;
  lineItems: MockInvoiceLineItem[];
}

export interface MockInvoiceLineItem {
  id: string;
  description: string;
  amount: number;
  quantity: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface PaymentFormData {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  billingAddress: BillingAddress;
  saveCard: boolean;
}

export interface PaymentResult {
  success: boolean;
  paymentIntent?: PaymentIntent;
  error?: {
    code: string;
    message: string;
    type: 'card_error' | 'validation_error' | 'api_error';
  };
}

export interface SubscriptionChangePreview {
  immediateCharge?: number;
  nextInvoiceAmount: number;
  nextInvoiceDate: Date;
  prorationAmount: number;
  description: string;
}

// Mock webhook event types
export type WebhookEventType = 
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed';

export interface MockWebhookEvent {
  id: string;
  type: WebhookEventType;
  created: Date;
  data: {
    object: MockSubscription | PaymentIntent | MockInvoice;
    previous_attributes?: Partial<MockSubscription | PaymentIntent | MockInvoice>;
  };
  livemode: boolean;
}