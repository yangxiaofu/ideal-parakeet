import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { 
  ChevronDown, 
  ChevronUp, 
 
 
  Plus, 
  Trash2,
  HelpCircle
} from 'lucide-react';
import type { NAVInputs, AssetCategory, LiabilityCategory, AssetAdjustment, LiabilityAdjustment, LiquidationScenario } from '../../types/nav';
import type { BalanceSheet } from '../../types';

interface NAVInputFormProps {
  onSubmit: (inputs: NAVInputs) => void;
  loading?: boolean;
  balanceSheet: BalanceSheet;
  sharesOutstanding?: number;
  // historicalBookValues?: HistoricalValue[];
}

// Asset category information for UI
const ASSET_CATEGORIES: Record<AssetCategory, { 
  label: string; 
  description: string; 
  icon: string;
  tooltip: string;
  typical_percentage: number;
}> = {
  cash_and_equivalents: {
    label: 'Cash & Equivalents',
    description: 'Highly liquid assets',
    icon: '💰',
    tooltip: 'Cash, bank deposits, short-term investments. Usually valued at face value.',
    typical_percentage: 0.10
  },
  marketable_securities: {
    label: 'Marketable Securities',
    description: 'Traded investments',
    icon: '📊',
    tooltip: 'Stocks, bonds, ETFs that can be easily sold. May trade at discount to market.',
    typical_percentage: 0.05
  },
  accounts_receivable: {
    label: 'Accounts Receivable',
    description: 'Money owed by customers',
    icon: '📄',
    tooltip: 'Outstanding invoices. Consider collection risk and bad debt provisions.',
    typical_percentage: 0.15
  },
  inventory: {
    label: 'Inventory',
    description: 'Goods held for sale',
    icon: '📦',
    tooltip: 'Raw materials, work-in-process, finished goods. Consider obsolescence and turnover.',
    typical_percentage: 0.20
  },
  prepaid_expenses: {
    label: 'Prepaid Expenses',
    description: 'Expenses paid in advance',
    icon: '🧾',
    tooltip: 'Rent, insurance, subscriptions paid upfront. Limited recovery value in liquidation.',
    typical_percentage: 0.02
  },
  property_plant_equipment: {
    label: 'Property, Plant & Equipment',
    description: 'Fixed assets',
    icon: '🏭',
    tooltip: 'Buildings, machinery, equipment. Market value may differ significantly from book value.',
    typical_percentage: 0.35
  },
  intangible_assets: {
    label: 'Intangible Assets',
    description: 'Non-physical assets',
    icon: '⚡',
    tooltip: 'Patents, trademarks, software. Value depends on business context and transferability.',
    typical_percentage: 0.08
  },
  goodwill: {
    label: 'Goodwill',
    description: 'Acquisition premium',
    icon: '✨',
    tooltip: 'Premium paid in acquisitions. No liquidation value, but may indicate business quality.',
    typical_percentage: 0.03
  },
  investments: {
    label: 'Investments',
    description: 'Other investments',
    icon: '🎯',
    tooltip: 'Private investments, subsidiaries, joint ventures. Value depends on underlying assets.',
    typical_percentage: 0.02
  },
  other_assets: {
    label: 'Other Assets',
    description: 'Miscellaneous assets',
    icon: '📋',
    tooltip: 'Various other assets not categorized above.',
    typical_percentage: 0.00
  }
};

// Liability category information for UI
const LIABILITY_CATEGORIES: Record<LiabilityCategory, { 
  label: string; 
  description: string; 
  icon: string;
  tooltip: string;
  typical_percentage: number;
}> = {
  accounts_payable: {
    label: 'Accounts Payable',
    description: 'Money owed to suppliers',
    icon: '💳',
    tooltip: 'Outstanding invoices to suppliers. Usually paid at face value.',
    typical_percentage: 0.25
  },
  accrued_expenses: {
    label: 'Accrued Expenses',
    description: 'Expenses incurred but not paid',
    icon: '📊',
    tooltip: 'Salaries, utilities, taxes owed. Typically paid at full amount.',
    typical_percentage: 0.15
  },
  short_term_debt: {
    label: 'Short-term Debt',
    description: 'Debt due within one year',
    icon: '⏰',
    tooltip: 'Credit lines, short-term loans, current portion of long-term debt.',
    typical_percentage: 0.20
  },
  long_term_debt: {
    label: 'Long-term Debt',
    description: 'Debt due beyond one year',
    icon: '🏦',
    tooltip: 'Bonds, mortgages, term loans. Market value may differ from book value.',
    typical_percentage: 0.30
  },
  pension_obligations: {
    label: 'Pension Obligations',
    description: 'Retirement benefit liabilities',
    icon: '👴',
    tooltip: 'Defined benefit pension plans. Often understated on balance sheet.',
    typical_percentage: 0.05
  },
  deferred_tax_liabilities: {
    label: 'Deferred Tax Liabilities',
    description: 'Future tax payments',
    icon: '🗃️',
    tooltip: 'Taxes owed on timing differences. May never be paid if not realized.',
    typical_percentage: 0.03
  },
  contingent_liabilities: {
    label: 'Contingent Liabilities',
    description: 'Potential future obligations',
    icon: '⚖️',
    tooltip: 'Lawsuits, warranties, guarantees. Difficult to value precisely.',
    typical_percentage: 0.02
  },
  other_liabilities: {
    label: 'Other Liabilities',
    description: 'Miscellaneous liabilities',
    icon: '📋',
    tooltip: 'Various other liabilities not categorized above.',
    typical_percentage: 0.00
  }
};

export const NAVInputForm: React.FC<NAVInputFormProps> = ({
  onSubmit,
  loading = false,
  balanceSheet,
  sharesOutstanding,
  // historicalBookValues
}) => {
  // Initialize asset adjustments with estimated values
  const [assetAdjustments, setAssetAdjustments] = useState<Record<AssetCategory, AssetAdjustment[]>>(() => {
    const initialAdjustments: Record<AssetCategory, AssetAdjustment[]> = {} as Record<AssetCategory, AssetAdjustment[]>;
    
    Object.entries(ASSET_CATEGORIES).forEach(([categoryKey, categoryInfo]) => {
      const category = categoryKey as AssetCategory;
      const estimatedValue = balanceSheet.totalAssets * categoryInfo.typical_percentage;
      
      initialAdjustments[category] = estimatedValue > 1000 ? [{
        category,
        description: `Estimated ${categoryInfo.label}`,
        bookValue: estimatedValue,
        adjustedValue: estimatedValue,
        adjustmentReason: 'No adjustment - book value assumed fair',
        confidenceLevel: 'medium'
      }] : [];
    });
    
    return initialAdjustments;
  });

  // Initialize liability adjustments with estimated values
  const [liabilityAdjustments, setLiabilityAdjustments] = useState<Record<LiabilityCategory, LiabilityAdjustment[]>>(() => {
    const initialAdjustments: Record<LiabilityCategory, LiabilityAdjustment[]> = {} as Record<LiabilityCategory, LiabilityAdjustment[]>;
    
    Object.entries(LIABILITY_CATEGORIES).forEach(([categoryKey, categoryInfo]) => {
      const category = categoryKey as LiabilityCategory;
      const estimatedValue = balanceSheet.totalLiabilities * categoryInfo.typical_percentage;
      
      initialAdjustments[category] = estimatedValue > 1000 ? [{
        category,
        description: `Estimated ${categoryInfo.label}`,
        bookValue: estimatedValue,
        adjustedValue: estimatedValue,
        adjustmentReason: 'No adjustment - book value assumed fair',
        confidenceLevel: 'medium'
      }] : [];
    });
    
    return initialAdjustments;
  });

  const [sharesOutstandingState, setSharesOutstanding] = useState<number>(sharesOutstanding || 100_000_000);
  const [includeIntangibles, setIncludeIntangibles] = useState(true);
  const [includeGoodwill, setIncludeGoodwill] = useState(false);
  const [useMarketValues, setUseMarketValues] = useState(true);
  const [liquidationScenario, setLiquidationScenario] = useState<LiquidationScenario>('orderly');
  const [customLiquidationDiscount, setCustomLiquidationDiscount] = useState<number>(0.3);
  
  const [expandedAssetCategories, setExpandedAssetCategories] = useState<Set<AssetCategory>>(new Set());
  const [expandedLiabilityCategories, setExpandedLiabilityCategories] = useState<Set<LiabilityCategory>>(new Set());
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(1)}B`;
    } else if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    } else {
      return `$${Math.round(value).toLocaleString()}`;
    }
  };

  const toggleAssetCategory = (category: AssetCategory) => {
    const newExpanded = new Set(expandedAssetCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedAssetCategories(newExpanded);
  };

  const toggleLiabilityCategory = (category: LiabilityCategory) => {
    const newExpanded = new Set(expandedLiabilityCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedLiabilityCategories(newExpanded);
  };

  const addAssetAdjustment = (category: AssetCategory) => {
    const categoryInfo = ASSET_CATEGORIES[category];
    const estimatedValue = balanceSheet.totalAssets * categoryInfo.typical_percentage;
    
    const newAdjustment: AssetAdjustment = {
      category,
      description: `New ${categoryInfo.label} adjustment`,
      bookValue: estimatedValue,
      adjustedValue: estimatedValue,
      adjustmentReason: 'Manual adjustment',
      confidenceLevel: 'medium'
    };
    
    setAssetAdjustments(prev => ({
      ...prev,
      [category]: [...prev[category], newAdjustment]
    }));
  };

  const removeAssetAdjustment = (category: AssetCategory, index: number) => {
    setAssetAdjustments(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const updateAssetAdjustment = (
    category: AssetCategory, 
    index: number, 
    field: keyof AssetAdjustment, 
    value: string | number
  ) => {
    setAssetAdjustments(prev => ({
      ...prev,
      [category]: prev[category].map((adj, i) => 
        i === index ? { ...adj, [field]: value } : adj
      )
    }));
  };

  const addLiabilityAdjustment = (category: LiabilityCategory) => {
    const categoryInfo = LIABILITY_CATEGORIES[category];
    const estimatedValue = balanceSheet.totalLiabilities * categoryInfo.typical_percentage;
    
    const newAdjustment: LiabilityAdjustment = {
      category,
      description: `New ${categoryInfo.label} adjustment`,
      bookValue: estimatedValue,
      adjustedValue: estimatedValue,
      adjustmentReason: 'Manual adjustment',
      confidenceLevel: 'medium'
    };
    
    setLiabilityAdjustments(prev => ({
      ...prev,
      [category]: [...prev[category], newAdjustment]
    }));
  };

  const removeLiabilityAdjustment = (category: LiabilityCategory, index: number) => {
    setLiabilityAdjustments(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const updateLiabilityAdjustment = (
    category: LiabilityCategory, 
    index: number, 
    field: keyof LiabilityAdjustment, 
    value: string | number
  ) => {
    setLiabilityAdjustments(prev => ({
      ...prev,
      [category]: prev[category].map((adj, i) => 
        i === index ? { ...adj, [field]: value } : adj
      )
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (sharesOutstandingState <= 0) {
      newErrors.sharesOutstanding = 'Shares outstanding must be positive';
    }

    if (customLiquidationDiscount < 0 || customLiquidationDiscount > 1) {
      newErrors.customLiquidationDiscount = 'Liquidation discount must be between 0% and 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const navInputs: NAVInputs = {
      assetAdjustments,
      liabilityAdjustments,
      liquidationScenario,
      customLiquidationDiscount,
      includeIntangibles,
      includeGoodwill,
      useMarketValues,
      sharesOutstanding: sharesOutstandingState
    };

    onSubmit(navInputs);
  };

  // Calculate summary statistics
  const totalAdjustedAssets = Object.values(assetAdjustments)
    .flat()
    .reduce((sum, adj) => sum + adj.adjustedValue, 0);
  
  const totalAdjustedLiabilities = Object.values(liabilityAdjustments)
    .flat()
    .reduce((sum, adj) => sum + adj.adjustedValue, 0);
  
  const adjustedBookValue = totalAdjustedAssets - totalAdjustedLiabilities;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        {/* Basic Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Parameters</CardTitle>
            <CardDescription>
              Essential inputs for NAV calculation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="sharesOutstanding" className="text-sm font-medium">
                    Shares Outstanding
                  </label>
                  <Input
                    id="sharesOutstanding"
                    type="number"
                    placeholder="100000000"
                    value={sharesOutstandingState}
                    onChange={(e) => setSharesOutstanding(Number(e.target.value) || 0)}
                    disabled={loading}
                  />
                  {errors.sharesOutstanding && (
                    <p className="text-sm text-red-600">{errors.sharesOutstanding}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="liquidationScenario" className="text-sm font-medium">
                    Liquidation Scenario
                  </label>
                  <select
                    id="liquidationScenario"
                    value={liquidationScenario}
                    onChange={(e) => setLiquidationScenario(e.target.value as LiquidationScenario)}
                    disabled={loading}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <option value="orderly">Orderly Liquidation (12-24 months)</option>
                    <option value="quick">Quick Liquidation (3-6 months)</option>
                    <option value="forced">Forced Liquidation (1-3 months)</option>
                  </select>
                </div>
              </div>

              {/* Analysis Options */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Analysis Options</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeIntangibles"
                      checked={includeIntangibles}
                      onCheckedChange={(checked) => setIncludeIntangibles(!!checked)}
                    />
                    <label htmlFor="includeIntangibles" className="text-sm">
                      Include Intangible Assets
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeGoodwill"
                      checked={includeGoodwill}
                      onCheckedChange={(checked) => setIncludeGoodwill(!!checked)}
                    />
                    <label htmlFor="includeGoodwill" className="text-sm">
                      Include Goodwill
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="useMarketValues"
                      checked={useMarketValues}
                      onCheckedChange={(checked) => setUseMarketValues(!!checked)}
                    />
                    <label htmlFor="useMarketValues" className="text-sm">
                      Use Market Values When Available
                    </label>
                  </div>
                </div>
              </div>

              {/* Advanced Options Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Advanced Options
                {showAdvancedOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showAdvancedOptions && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="space-y-2">
                    <label htmlFor="customLiquidationDiscount" className="text-sm font-medium">
                      Custom Liquidation Discount (%)
                    </label>
                    <Input
                      id="customLiquidationDiscount"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={customLiquidationDiscount * 100}
                      onChange={(e) => setCustomLiquidationDiscount((Number(e.target.value) || 0) / 100)}
                      disabled={loading}
                    />
                    {errors.customLiquidationDiscount && (
                      <p className="text-sm text-red-600">{errors.customLiquidationDiscount}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Asset Adjustments */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Adjustments</CardTitle>
            <CardDescription>
              Adjust book values to reflect fair market values for each asset category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(ASSET_CATEGORIES).map(([categoryKey, categoryInfo]) => {
                const category = categoryKey as AssetCategory;
                const adjustments = assetAdjustments[category] || [];
                const isExpanded = expandedAssetCategories.has(category);
                const totalBookValue = adjustments.reduce((sum, adj) => sum + adj.bookValue, 0);
                const totalAdjustedValue = adjustments.reduce((sum, adj) => sum + adj.adjustedValue, 0);
                const adjustmentAmount = totalAdjustedValue - totalBookValue;
                const adjustmentPercent = totalBookValue > 0 ? (adjustmentAmount / totalBookValue) * 100 : 0;

                return (
                  <div key={category} className="border border-gray-200 rounded-lg">
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleAssetCategory(category)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{categoryInfo.icon}</span>
                          <div>
                            <h4 className="font-medium">{categoryInfo.label}</h4>
                            <p className="text-sm text-gray-600">{categoryInfo.description}</p>
                          </div>
                          <button
                            type="button"
                            className="p-1 hover:bg-gray-200 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTooltip(showTooltip === category ? null : category);
                            }}
                          >
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </button>
                          {showTooltip === category && (
                            <div className="absolute z-10 p-2 bg-gray-900 text-white text-xs rounded shadow-lg max-w-xs">
                              {categoryInfo.tooltip}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">{formatCurrency(totalAdjustedValue)}</div>
                            {Math.abs(adjustmentPercent) > 0.1 && (
                              <div className={`text-xs ${adjustmentPercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {adjustmentPercent > 0 ? '+' : ''}{adjustmentPercent.toFixed(1)}%
                              </div>
                            )}
                          </div>
                          {adjustments.length > 0 && (
                            <Badge variant={totalAdjustedValue > totalBookValue ? 'default' : 'secondary'}>
                              {adjustments.length} adjustment{adjustments.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="space-y-3">
                          {adjustments.map((adjustment, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded p-3">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <Input
                                    placeholder="Description"
                                    value={adjustment.description}
                                    onChange={(e) => updateAssetAdjustment(category, index, 'description', e.target.value)}
                                    className="flex-1 mr-2"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeAssetAdjustment(category, index)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs text-gray-600">Book Value</label>
                                    <Input
                                      type="number"
                                      value={adjustment.bookValue}
                                      onChange={(e) => updateAssetAdjustment(category, index, 'bookValue', Number(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600">Adjusted Value</label>
                                    <Input
                                      type="number"
                                      value={adjustment.adjustedValue}
                                      onChange={(e) => updateAssetAdjustment(category, index, 'adjustedValue', Number(e.target.value) || 0)}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs text-gray-600">Adjustment Reason</label>
                                    <Input
                                      placeholder="Reason for adjustment"
                                      value={adjustment.adjustmentReason}
                                      onChange={(e) => updateAssetAdjustment(category, index, 'adjustmentReason', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600">Confidence Level</label>
                                    <select
                                      value={adjustment.confidenceLevel}
                                      onChange={(e) => updateAssetAdjustment(category, index, 'confidenceLevel', e.target.value as 'high' | 'medium' | 'low')}
                                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                    >
                                      <option value="high">High</option>
                                      <option value="medium">Medium</option>
                                      <option value="low">Low</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addAssetAdjustment(category)}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <Plus className="h-4 w-4" />
                            Add Adjustment
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Liability Adjustments */}
        <Card>
          <CardHeader>
            <CardTitle>Liability Adjustments</CardTitle>
            <CardDescription>
              Adjust liability values to reflect actual obligations and fair values
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(LIABILITY_CATEGORIES).map(([categoryKey, categoryInfo]) => {
                const category = categoryKey as LiabilityCategory;
                const adjustments = liabilityAdjustments[category] || [];
                const isExpanded = expandedLiabilityCategories.has(category);
                const totalBookValue = adjustments.reduce((sum, adj) => sum + adj.bookValue, 0);
                const totalAdjustedValue = adjustments.reduce((sum, adj) => sum + adj.adjustedValue, 0);
                const adjustmentAmount = totalAdjustedValue - totalBookValue;
                const adjustmentPercent = totalBookValue > 0 ? (adjustmentAmount / totalBookValue) * 100 : 0;

                return (
                  <div key={category} className="border border-gray-200 rounded-lg">
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleLiabilityCategory(category)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{categoryInfo.icon}</span>
                          <div>
                            <h4 className="font-medium">{categoryInfo.label}</h4>
                            <p className="text-sm text-gray-600">{categoryInfo.description}</p>
                          </div>
                          <button
                            type="button"
                            className="p-1 hover:bg-gray-200 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTooltip(showTooltip === category ? null : category);
                            }}
                          >
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </button>
                          {showTooltip === category && (
                            <div className="absolute z-10 p-2 bg-gray-900 text-white text-xs rounded shadow-lg max-w-xs">
                              {categoryInfo.tooltip}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">{formatCurrency(totalAdjustedValue)}</div>
                            {Math.abs(adjustmentPercent) > 0.1 && (
                              <div className={`text-xs ${adjustmentPercent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {adjustmentPercent > 0 ? '+' : ''}{adjustmentPercent.toFixed(1)}%
                              </div>
                            )}
                          </div>
                          {adjustments.length > 0 && (
                            <Badge variant={totalAdjustedValue > totalBookValue ? 'default' : 'secondary'}>
                              {adjustments.length} adjustment{adjustments.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="space-y-3">
                          {adjustments.map((adjustment, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded p-3">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <Input
                                    placeholder="Description"
                                    value={adjustment.description}
                                    onChange={(e) => updateLiabilityAdjustment(category, index, 'description', e.target.value)}
                                    className="flex-1 mr-2"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeLiabilityAdjustment(category, index)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs text-gray-600">Book Value</label>
                                    <Input
                                      type="number"
                                      value={adjustment.bookValue}
                                      onChange={(e) => updateLiabilityAdjustment(category, index, 'bookValue', Number(e.target.value) || 0)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600">Adjusted Value</label>
                                    <Input
                                      type="number"
                                      value={adjustment.adjustedValue}
                                      onChange={(e) => updateLiabilityAdjustment(category, index, 'adjustedValue', Number(e.target.value) || 0)}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs text-gray-600">Adjustment Reason</label>
                                    <Input
                                      placeholder="Reason for adjustment"
                                      value={adjustment.adjustmentReason}
                                      onChange={(e) => updateLiabilityAdjustment(category, index, 'adjustmentReason', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600">Confidence Level</label>
                                    <select
                                      value={adjustment.confidenceLevel}
                                      onChange={(e) => updateLiabilityAdjustment(category, index, 'confidenceLevel', e.target.value as 'high' | 'medium' | 'low')}
                                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                    >
                                      <option value="high">High</option>
                                      <option value="medium">Medium</option>
                                      <option value="low">Low</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addLiabilityAdjustment(category)}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <Plus className="h-4 w-4" />
                            Add Adjustment
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Adjustment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalAdjustedAssets)}</div>
                <div className="text-sm text-gray-600">Adjusted Assets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalAdjustedLiabilities)}</div>
                <div className="text-sm text-gray-600">Adjusted Liabilities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(adjustedBookValue)}</div>
                <div className="text-sm text-gray-600">Adjusted Book Value</div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatCurrency(adjustedBookValue / sharesOutstandingState)} per share
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Calculating NAV...' : 'Calculate Net Asset Value'}
        </Button>
      </form>
    </div>
  );
};