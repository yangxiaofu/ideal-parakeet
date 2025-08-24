/**
 * PaymentForm Component
 * Mock payment form with realistic validation and user experience
 */

import React, { useState, useEffect } from 'react';
import { CreditCard, Lock, ArrowLeft, TestTube } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { PaymentFormData } from '../../types/payment';

interface PaymentFormProps {
  onSubmit: (paymentData: PaymentFormData) => Promise<void>;
  onBack: () => void;
  processing: boolean;
  error: string | null;
  planName: string;
  amount: number;
}

// Test data for development mode
const TEST_PAYMENT_DATA: PaymentFormData = {
  cardNumber: '4242 4242 4242 4242', // Common test card number
  expiryDate: '12/28',
  cvv: '123',
  cardholderName: 'John Doe',
  billingAddress: {
    line1: '123 Test Street',
    line2: 'Apt 4B',
    city: 'Test City',
    state: 'CA',
    postalCode: '12345',
    country: 'US',
  },
  saveCard: true,
};

// Check if running in development mode
const isDevelopment = import.meta.env.DEV;


export const PaymentForm: React.FC<PaymentFormProps> = ({
  onSubmit,
  onBack,
  processing,
  error,
  planName,
  amount,
}) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
    },
    saveCard: true,
  });

  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof PaymentFormData, string>>>({});
  const [cardType, setCardType] = useState<string>('');
  const [usingTestData, setUsingTestData] = useState<boolean>(false);

  // Auto-populate with test data in development mode
  useEffect(() => {
    if (isDevelopment) {
      fillTestData();
    }
  }, []);

  const fillTestData = () => {
    setFormData(TEST_PAYMENT_DATA);
    setCardType(detectCardType(TEST_PAYMENT_DATA.cardNumber));
    setUsingTestData(true);
    setValidationErrors({}); // Clear any validation errors
  };

  const clearTestData = () => {
    setFormData({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: '',
      billingAddress: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      },
      saveCard: true,
    });
    setCardType('');
    setUsingTestData(false);
    setValidationErrors({});
  };

  const detectCardType = (cardNumber: string): string => {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (cleaned.startsWith('4')) return 'Visa';
    if (cleaned.startsWith('5') || cleaned.startsWith('2')) return 'Mastercard';
    if (cleaned.startsWith('3')) return 'Amex';
    if (cleaned.startsWith('6')) return 'Discover';
    return '';
  };

  const formatCardNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;

    if (formatted.startsWith('3')) {
      // Amex format: 4-6-5
      formatted = formatted.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
    } else {
      // Standard format: 4-4-4-4
      formatted = formatted.replace(/(\d{4})(?=\d)/g, '$1 ');
    }

    return formatted.trim();
  };

  const formatExpiryDate = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof PaymentFormData, string>> = {};

    // Card number validation (relaxed in development mode)
    const cleanedCardNumber = formData.cardNumber.replace(/\D/g, '');
    if (!cleanedCardNumber) {
      errors.cardNumber = 'Card number is required';
    } else if (cleanedCardNumber.length < 13 || cleanedCardNumber.length > 19) {
      errors.cardNumber = 'Invalid card number length';
    } else if (!isDevelopment && !isValidLuhn(cleanedCardNumber)) {
      // Skip Luhn validation in development mode for easier testing
      errors.cardNumber = 'Invalid card number';
    }

    // Expiry date validation (relaxed in development mode)
    if (!formData.expiryDate) {
      errors.expiryDate = 'Expiry date is required';
    } else if (!isDevelopment) {
      // Only check expiry date logic in production mode
      const [month, year] = formData.expiryDate.split('/');
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      if (!month || !year || parseInt(month) < 1 || parseInt(month) > 12) {
        errors.expiryDate = 'Invalid expiry date';
      } else if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        errors.expiryDate = 'Card has expired';
      }
    } else {
      // In development mode, just check basic format
      const [month, year] = formData.expiryDate.split('/');
      if (!month || !year || parseInt(month) < 1 || parseInt(month) > 12) {
        errors.expiryDate = 'Invalid expiry date format';
      }
    }

    // CVV validation
    if (!formData.cvv) {
      errors.cvv = 'CVV is required';
    } else if ((cardType === 'Amex' && formData.cvv.length !== 4) || (cardType !== 'Amex' && formData.cvv.length !== 3)) {
      errors.cvv = cardType === 'Amex' ? 'CVV must be 4 digits for Amex' : 'CVV must be 3 digits';
    }

    // Cardholder name validation
    if (!formData.cardholderName.trim()) {
      errors.cardholderName = 'Cardholder name is required';
    }

    // Address validation
    if (!formData.billingAddress.line1.trim()) {
      errors.cardholderName = 'Billing address is required'; // Using cardholderName field for simplicity
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidLuhn = (cardNumber: string): boolean => {
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  const handleInputChange = (field: keyof PaymentFormData, value: string) => {
    let processedValue = value;

    if (field === 'cardNumber') {
      processedValue = formatCardNumber(value);
      setCardType(detectCardType(value));
    } else if (field === 'expiryDate') {
      processedValue = formatExpiryDate(value);
    } else if (field === 'cvv') {
      processedValue = value.replace(/\D/g, '').slice(0, cardType === 'Amex' ? 4 : 3);
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue,
    }));

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleAddressChange = (field: keyof PaymentFormData['billingAddress'], value: string) => {
    setFormData(prev => ({
      ...prev,
      billingAddress: {
        ...prev.billingAddress,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    await onSubmit(formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Order Summary */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">{planName}</p>
              <p className="text-sm text-gray-600">Monthly subscription</p>
            </div>
            <p className="text-xl font-bold">${amount.toFixed(2)}/month</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </div>
            {isDevelopment && (
              <div className="flex items-center gap-2">
                {usingTestData && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    <TestTube className="h-3 w-3" />
                    Test Data Active
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={usingTestData ? clearTestData : fillTestData}
                  className="text-xs"
                >
                  {usingTestData ? 'Clear Test Data' : 'Use Test Data'}
                </Button>
              </div>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Lock className="h-4 w-4" />
            Your payment is secured with 256-bit SSL encryption
            {isDevelopment && usingTestData && (
              <span className="text-blue-600 ml-2">• Using test card data for development</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Card Number */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Card Number
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={formData.cardNumber}
                  onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                  className={validationErrors.cardNumber ? 'border-red-500' : ''}
                  maxLength={cardType === 'Amex' ? 17 : 19}
                />
                {cardType && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {cardType}
                    </span>
                  </div>
                )}
              </div>
              {validationErrors.cardNumber && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.cardNumber}</p>
              )}
            </div>

            {/* Expiry and CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Expiry Date
                </label>
                <Input
                  type="text"
                  placeholder="MM/YY"
                  value={formData.expiryDate}
                  onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                  className={validationErrors.expiryDate ? 'border-red-500' : ''}
                  maxLength={5}
                />
                {validationErrors.expiryDate && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.expiryDate}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  CVV
                </label>
                <Input
                  type="text"
                  placeholder={cardType === 'Amex' ? '1234' : '123'}
                  value={formData.cvv}
                  onChange={(e) => handleInputChange('cvv', e.target.value)}
                  className={validationErrors.cvv ? 'border-red-500' : ''}
                  maxLength={cardType === 'Amex' ? 4 : 3}
                />
                {validationErrors.cvv && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.cvv}</p>
                )}
              </div>
            </div>

            {/* Cardholder Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Cardholder Name
              </label>
              <Input
                type="text"
                placeholder="John Doe"
                value={formData.cardholderName}
                onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                className={validationErrors.cardholderName ? 'border-red-500' : ''}
              />
              {validationErrors.cardholderName && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.cardholderName}</p>
              )}
            </div>

            {/* Billing Address */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Billing Address</h4>
              
              <Input
                placeholder="Address Line 1"
                value={formData.billingAddress.line1}
                onChange={(e) => handleAddressChange('line1', e.target.value)}
              />
              
              <Input
                placeholder="Address Line 2 (Optional)"
                value={formData.billingAddress.line2}
                onChange={(e) => handleAddressChange('line2', e.target.value)}
              />
              
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="City"
                  value={formData.billingAddress.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                />
                <Input
                  placeholder="State"
                  value={formData.billingAddress.state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                />
              </div>
              
              <Input
                placeholder="ZIP Code"
                value={formData.billingAddress.postalCode}
                onChange={(e) => handleAddressChange('postalCode', e.target.value)}
              />
            </div>

            {/* Save Card Option */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="saveCard"
                checked={formData.saveCard}
                onChange={(e) => setFormData(prev => ({ ...prev, saveCard: e.target.checked }))}
                className="rounded"
              />
              <label htmlFor="saveCard" className="text-sm">
                Save this payment method for future use
              </label>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex items-center gap-2"
                disabled={processing}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Plans
              </Button>
              <Button
                type="submit"
                className="flex-1 min-h-[44px]"
                disabled={processing}
              >
                {processing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </div>
                ) : (
                  `Subscribe for $${amount.toFixed(2)}/month`
                )}
              </Button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-xs text-gray-500">
              This is a demo payment form. No actual charges will be made.
              <br />
              Use test card: 4242424242424242 for successful payment simulation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};