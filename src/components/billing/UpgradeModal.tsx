/**
 * UpgradeModal Component
 * Professional upgrade modal with pricing plans and payment processing
 */

import React, { useState, useEffect } from 'react';
import { X, Check, Lock, Zap, Star, TestTube } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { usePayment } from '../../hooks/usePayment';
import { useAuth } from '../../contexts/AuthContext';
import { PaymentForm } from './PaymentForm';
import { SUBSCRIPTION_PLANS } from '../../constants/subscription';
import type { SubscriptionTier } from '../../types/index';
import type { PaymentFormData } from '../../types/payment';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestedTier?: SubscriptionTier;
  reason?: string;
}

const TIER_ICONS = {
  basic: <Lock className="h-5 w-5" />,
  pro: <Zap className="h-5 w-5" />,
  premium: <Star className="h-5 w-5" />,
};

const TIER_COLORS = {
  basic: 'border-gray-200',
  pro: 'border-blue-500 ring-2 ring-blue-200',
  premium: 'border-purple-500 ring-2 ring-purple-200',
};

// Check if running in development mode
const isDevelopment = import.meta.env.DEV;

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  suggestedTier = 'pro',
  reason,
}) => {
  const { userProfile } = useAuth();
  const { subscriptionState, processUpgrade, getChangePreview, resetSubscriptionState } = usePayment();
  
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(suggestedTier);
  const [step, setStep] = useState<'plans' | 'payment' | 'processing' | 'success'>('plans');
  
  const currentTier = userProfile?.subscriptionTier || 'basic';

  // Load preview when tier changes
  useEffect(() => {
    if (isOpen && selectedTier !== currentTier) {
      getChangePreview(selectedTier);
    }
  }, [selectedTier, currentTier, isOpen, getChangePreview]);

  // Handle successful upgrade
  useEffect(() => {
    if (subscriptionState.success && step === 'processing') {
      setStep('success');
      setTimeout(() => {
        handleClose();
      }, 3000);
    }
  }, [subscriptionState.success, step]);

  // Handle processing state
  useEffect(() => {
    if (subscriptionState.processing) {
      setStep('processing');
    }
  }, [subscriptionState.processing]);

  const handleClose = () => {
    resetSubscriptionState();
    setStep('plans');
    onClose();
  };

  const handleTierSelect = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
  };

  const handleContinue = () => {
    if (selectedTier === 'basic' || selectedTier === currentTier) {
      // No payment needed for basic or same tier
      handleUpgrade();
    } else {
      setStep('payment');
    }
  };

  const handleUpgrade = async (paymentData?: PaymentFormData) => {
    const success = await processUpgrade(selectedTier, paymentData);
    if (!success && subscriptionState.requiresPayment) {
      setStep('payment');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">
                {step === 'success' ? 'Welcome to BedRock Pro!' : 'Upgrade Your Plan'}
              </h2>
              {isDevelopment && (
                <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  <TestTube className="h-3 w-3" />
                  Test Mode
                </div>
              )}
            </div>
            {reason && step === 'plans' && (
              <p className="text-gray-600 mt-1">{reason}</p>
            )}
            {isDevelopment && (
              <p className="text-xs text-blue-600 mt-1">
                Development mode: Fast processing & auto-populated payment forms
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'plans' && (
            <div className="space-y-6">
              {/* Current Status */}
              {currentTier !== 'basic' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-900">
                    <Check className="h-5 w-5" />
                    <span className="font-medium">
                      You're currently on {SUBSCRIPTION_PLANS[currentTier].name}
                    </span>
                  </div>
                </div>
              )}

              {/* Pricing Plans */}
              <div className="grid md:grid-cols-3 gap-6">
                {(Object.entries(SUBSCRIPTION_PLANS) as [SubscriptionTier, typeof SUBSCRIPTION_PLANS[SubscriptionTier]][]).map(([tier, plan]) => (
                  <Card 
                    key={tier}
                    className={`relative cursor-pointer transition-all duration-200 ${
                      selectedTier === tier 
                        ? TIER_COLORS[tier]
                        : 'border-gray-200 hover:border-gray-300'
                    } ${currentTier === tier ? 'opacity-60' : ''}`}
                    onClick={() => currentTier !== tier && handleTierSelect(tier)}
                  >
                    {/* Popular Badge */}
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                          Most Popular
                        </span>
                      </div>
                    )}

                    {/* Current Plan Badge */}
                    {currentTier === tier && (
                      <div className="absolute top-4 right-4">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          Current Plan
                        </span>
                      </div>
                    )}

                    <CardHeader className="text-center pb-4">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-gray-600">
                          {TIER_ICONS[tier]}
                        </span>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                      </div>
                      <p className="text-gray-600 text-sm">{plan.description}</p>
                      <div className="mt-4">
                        <div className="text-3xl font-bold">
                          ${plan.price.monthly}
                          <span className="text-base font-normal text-gray-600">/month</span>
                        </div>
                        {tier !== 'basic' && plan.price.annual && (
                          <div className="text-sm text-green-600 mt-1">
                            Save ${(plan.price.monthly * 12 - plan.price.annual) / 12}/mo with annual
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <ul className="space-y-3">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Selection indicator */}
                      {selectedTier === tier && currentTier !== tier && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                            <Check className="h-4 w-4" />
                            Selected for upgrade
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Preview */}
              {subscriptionState.preview && selectedTier !== currentTier && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Billing Preview</h3>
                  <div className="space-y-2 text-sm">
                    {subscriptionState.preview.immediateCharge && subscriptionState.preview.immediateCharge > 0 && (
                      <div className="flex justify-between">
                        <span>Prorated charge:</span>
                        <span className="font-medium">${subscriptionState.preview.immediateCharge.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Next billing date:</span>
                      <span>{subscriptionState.preview.nextInvoiceDate.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Next invoice amount:</span>
                      <span className="font-medium">${subscriptionState.preview.nextInvoiceAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleContinue}
                  disabled={selectedTier === currentTier}
                  className="min-w-[120px]"
                >
                  {selectedTier === 'basic' 
                    ? 'Downgrade to Basic'
                    : selectedTier === currentTier
                      ? 'Current Plan'
                      : `Upgrade to ${SUBSCRIPTION_PLANS[selectedTier].name}`
                  }
                </Button>
              </div>

              {/* Error */}
              {subscriptionState.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm">{subscriptionState.error}</p>
                </div>
              )}
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">
                  Complete Your Upgrade to {SUBSCRIPTION_PLANS[selectedTier].name}
                </h3>
                <p className="text-gray-600">
                  Secure payment processing with industry-standard encryption
                </p>
              </div>

              <PaymentForm
                onSubmit={handleUpgrade}
                onBack={() => setStep('plans')}
                processing={subscriptionState.processing}
                error={subscriptionState.error}
                planName={SUBSCRIPTION_PLANS[selectedTier].name}
                amount={SUBSCRIPTION_PLANS[selectedTier].price.monthly}
              />
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <h3 className="text-xl font-semibold mb-2">Processing Your Upgrade</h3>
              <p className="text-gray-600">
                Please wait while we set up your new subscription...
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Upgrade Complete!</h3>
              <p className="text-gray-600 mb-4">
                Welcome to {SUBSCRIPTION_PLANS[selectedTier].name}! You now have access to all premium features.
              </p>
              <Button onClick={handleClose}>
                Start Exploring
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};