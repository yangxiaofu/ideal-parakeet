/**
 * BillingDashboard Component
 * Complete billing management interface with subscription controls
 */

import React, { useState } from 'react';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Settings,
  DollarSign
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useBilling, useSubscriptionStatus } from '../../hooks/useBilling';
import { usePayment } from '../../hooks/usePayment';
import { useAuth } from '../../contexts/AuthContext';
import { SUBSCRIPTION_PLANS } from '../../constants/subscription';
import type { SubscriptionTier } from '../../types/index';

interface BillingDashboardProps {
  onUpgrade?: () => void;
}

export const BillingDashboard: React.FC<BillingDashboardProps> = ({
  onUpgrade
}) => {
  const { userProfile } = useAuth();
  const { 
    billingData, 
    loading, 
    invoiceDownloading, 
    error, 
    loadBillingData, 
    downloadInvoice,
    clearError
  } = useBilling();
  
  const { 
    subscriptionState, 
    cancelSubscription, 
    reactivateSubscription 
  } = usePayment();
  
  const { 
    statusText, 
    statusColor, 
    daysUntilRenewal, 
    isActive, 
    isCanceling 
  } = useSubscriptionStatus();

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const currentTier = userProfile?.subscriptionTier || 'basic';
  const currentPlan = SUBSCRIPTION_PLANS[currentTier];

  const handleCancelSubscription = async () => {
    const success = await cancelSubscription(cancelReason, 'User initiated cancellation');
    if (success) {
      setShowCancelConfirm(false);
      setCancelReason('');
      loadBillingData(); // Refresh billing data
    }
  };

  const handleReactivate = async () => {
    const success = await reactivateSubscription();
    if (success) {
      loadBillingData(); // Refresh billing data
    }
  };

  const getStatusIcon = () => {
    switch (statusColor) {
      case 'green':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'yellow':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'red':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getUpgradeOptions = (): SubscriptionTier[] => {
    const tiers: SubscriptionTier[] = ['basic', 'pro', 'premium'];
    const currentIndex = tiers.indexOf(currentTier);
    return tiers.slice(currentIndex + 1);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600">Manage your BedRock Value subscription and billing</p>
        </div>
        <Button
          variant="outline"
          onClick={() => loadBillingData()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <p className="text-red-700">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Current Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{currentPlan.name}</h3>
                <p className="text-gray-600">{currentPlan.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  ${currentPlan.price.monthly}
                  <span className="text-sm font-normal text-gray-600">/mo</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className={`font-medium ${
                statusColor === 'green' ? 'text-green-700' :
                statusColor === 'yellow' ? 'text-yellow-700' :
                statusColor === 'red' ? 'text-red-700' :
                'text-gray-700'
              }`}>
                {statusText}
              </span>
            </div>

            {isActive && !isCanceling && daysUntilRenewal > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Renews in {daysUntilRenewal} days</span>
              </div>
            )}

            {isCanceling && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-yellow-800 text-sm">
                  Your subscription will be canceled at the end of your current billing period 
                  ({daysUntilRenewal} days remaining). You'll continue to have access until then.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {currentTier !== 'premium' && (
                <Button 
                  onClick={onUpgrade} 
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <DollarSign className="h-4 w-4" />
                  Upgrade Plan
                </Button>
              )}
              
              {isActive && !isCanceling ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCancelConfirm(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  Cancel Subscription
                </Button>
              ) : isCanceling ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleReactivate}
                  disabled={subscriptionState.processing}
                  className="text-green-600 hover:text-green-700"
                >
                  {subscriptionState.processing ? 'Reactivating...' : 'Reactivate'}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Billing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {billingData?.paymentMethods.length ? (
              <div className="space-y-3">
                {billingData.paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{method.brand.toUpperCase()} •••• {method.last4}</p>
                        {method.isDefault && (
                          <span className="text-xs text-green-600">Default</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No payment methods on file</p>
                <p className="text-sm">Add a payment method to upgrade</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Recent Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billingData?.recentInvoices.length ? (
            <div className="space-y-3">
              {billingData.recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{invoice.description}</p>
                      <p className="text-sm text-gray-600">
                        {invoice.created.toLocaleDateString()} • ${invoice.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {invoice.status}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadInvoice(invoice.id)}
                      disabled={invoiceDownloading === invoice.id}
                      className="flex items-center gap-2"
                    >
                      {invoiceDownloading === invoice.id ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Download className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No invoices yet</p>
              <p className="text-sm">Your invoices will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Cancel Subscription</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel your subscription? You'll continue to have access 
              until the end of your current billing period.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Why are you canceling? (Optional)
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Select a reason</option>
                <option value="too_expensive">Too expensive</option>
                <option value="not_using">Not using enough</option>
                <option value="missing_features">Missing features</option>
                <option value="switching_service">Switching to another service</option>
                <option value="temporary">Temporary cancellation</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1"
              >
                Keep Subscription
              </Button>
              <Button
                onClick={handleCancelSubscription}
                disabled={subscriptionState.processing}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {subscriptionState.processing ? 'Canceling...' : 'Cancel Subscription'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Options */}
      {currentTier !== 'premium' && (
        <Card>
          <CardHeader>
            <CardTitle>Available Upgrades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {getUpgradeOptions().map((tier) => {
                const plan = SUBSCRIPTION_PLANS[tier];
                return (
                  <div key={tier} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{plan.name}</h3>
                      <div className="text-xl font-bold">
                        ${plan.price.monthly}/mo
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{plan.description}</p>
                    <Button 
                      size="sm" 
                      onClick={onUpgrade}
                      className="w-full"
                    >
                      Upgrade to {plan.name}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};