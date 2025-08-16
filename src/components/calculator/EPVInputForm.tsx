import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import type {
  EPVInputs,
  EarningsNormalizationMethod,
  CostOfCapitalMethod,
  EarningsQuality,
  EarningsAdjustment,
  MaintenanceCapexAnalysis,
  CostOfCapitalComponents
} from '../../types/epv';
import { DEFAULT_COST_OF_CAPITAL_PARAMS } from '../../types/epv';
import { validateEPVInputs } from '../../utils/epvCalculator';

interface EPVInputFormProps {
  onSubmit: (inputs: EPVInputs) => void;
  loading: boolean;
  initialValues?: Partial<EPVInputs>;
  historicalEarnings?: Array<{
    year: number;
    netIncome: number;
    operatingIncome: number;
    revenue: number;
    date: string;
  }>;
  symbol?: string;
  sharesOutstanding?: number;
}

export const EPVInputForm: React.FC<EPVInputFormProps> = ({
  onSubmit,
  loading,
  initialValues,
  historicalEarnings,
  symbol = '',
  sharesOutstanding = 0
}) => {
  // Form state
  const [normalizationMethod, setNormalizationMethod] = useState<EarningsNormalizationMethod>(
    initialValues?.normalizationMethod || 'average'
  );
  const [normalizationPeriod, setNormalizationPeriod] = useState(
    initialValues?.normalizationPeriod || Math.min(5, historicalEarnings?.length || 5)
  );
  const [manualNormalizedEarnings, setManualNormalizedEarnings] = useState(
    initialValues?.manualNormalizedEarnings?.toString() || ''
  );
  
  // Earnings adjustments
  const [earningsAdjustments, setEarningsAdjustments] = useState<EarningsAdjustment[]>(
    initialValues?.earningsAdjustments || []
  );
  const [newAdjustment, setNewAdjustment] = useState<Partial<EarningsAdjustment>>({
    description: '',
    amount: 0,
    reason: '',
    category: 'operational',
    confidence: 'medium'
  });
  
  // Cost of capital
  const [costOfCapitalMethod, setCostOfCapitalMethod] = useState<CostOfCapitalMethod>(
    initialValues?.costOfCapitalMethod || 'wacc'
  );
  const [manualCostOfCapital, setManualCostOfCapital] = useState(
    initialValues?.manualCostOfCapital?.toString() || ''
  );
  const [riskFreeRate, setRiskFreeRate] = useState(
    initialValues?.costOfCapitalComponents?.riskFreeRate?.toString() || 
    DEFAULT_COST_OF_CAPITAL_PARAMS.riskFreeRate.toString()
  );
  const [marketRiskPremium, setMarketRiskPremium] = useState(
    initialValues?.costOfCapitalComponents?.marketRiskPremium?.toString() || 
    DEFAULT_COST_OF_CAPITAL_PARAMS.marketRiskPremium.toString()
  );
  const [beta, setBeta] = useState(
    initialValues?.costOfCapitalComponents?.beta?.toString() || '1.0'
  );
  const [taxRate, setTaxRate] = useState(
    initialValues?.costOfCapitalComponents?.taxRate?.toString() || '0.21'
  );
  
  // Maintenance capex
  const [maintenanceCapexAmount, setMaintenanceCapexAmount] = useState(
    initialValues?.maintenanceCapex?.maintenanceCapex?.toString() || ''
  );
  const [includeMaintenanceCapex, setIncludeMaintenanceCapex] = useState(
    initialValues?.includeMaintenanceCapex ?? true
  );
  
  // Quality assessments
  const [earningsQuality, setEarningsQuality] = useState<EarningsQuality>(
    initialValues?.earningsQuality || 'good'
  );
  const [businessStability, setBusinessStability] = useState(
    initialValues?.businessStability || 'stable'
  );
  const [competitivePosition, setCompetitivePosition] = useState(
    initialValues?.competitivePosition || 'average'
  );
  
  // Form validation
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  
  // Calculate default maintenance capex based on historical data
  useEffect(() => {
    if (historicalEarnings && historicalEarnings.length > 0 && !maintenanceCapexAmount) {
      // Estimate as 3% of average revenue (conservative default)
      const avgRevenue = historicalEarnings
        .slice(0, normalizationPeriod)
        .reduce((sum, e) => sum + e.revenue, 0) / Math.min(normalizationPeriod, historicalEarnings.length);
      const estimatedCapex = avgRevenue * 0.03;
      setMaintenanceCapexAmount(estimatedCapex.toString());
    }
  }, [historicalEarnings, normalizationPeriod, maintenanceCapexAmount]);
  
  const addEarningsAdjustment = () => {
    if (newAdjustment.description && newAdjustment.amount !== undefined && newAdjustment.reason) {
      setEarningsAdjustments([...earningsAdjustments, newAdjustment as EarningsAdjustment]);
      setNewAdjustment({
        description: '',
        amount: 0,
        reason: '',
        category: 'operational',
        confidence: 'medium'
      });
    }
  };
  
  const removeEarningsAdjustment = (index: number) => {
    setEarningsAdjustments(earningsAdjustments.filter((_, i) => i !== index));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!historicalEarnings || historicalEarnings.length === 0) {
      setErrors(['Historical earnings data is required']);
      return;
    }
    
    // Build cost of capital components
    const costOfCapitalComponents: CostOfCapitalComponents = {
      riskFreeRate: parseFloat(riskFreeRate) || DEFAULT_COST_OF_CAPITAL_PARAMS.riskFreeRate,
      marketRiskPremium: parseFloat(marketRiskPremium) || DEFAULT_COST_OF_CAPITAL_PARAMS.marketRiskPremium,
      beta: parseFloat(beta) || 1.0,
      costOfEquity: 0, // Will be calculated
      costOfDebt: 0.05, // Default 5% - could be enhanced
      weightOfEquity: 0.8, // Default 80% equity - could be enhanced
      weightOfDebt: 0.2, // Default 20% debt - could be enhanced
      taxRate: parseFloat(taxRate) || 0.21,
      wacc: 0 // Will be calculated
    };
    
    // Build maintenance capex analysis
    const maintenanceCapexAnalysis: MaintenanceCapexAnalysis = {
      historicalCapex: [], // Would need capex data
      historicalDepreciation: [], // Would need depreciation data
      averageCapex: parseFloat(maintenanceCapexAmount) || 0,
      averageDepreciation: parseFloat(maintenanceCapexAmount) || 0,
      maintenanceCapex: parseFloat(maintenanceCapexAmount) || 0,
      growthCapex: 0, // Assuming no growth capex for EPV
      capexAsPercentOfSales: 0, // Will be calculated
      method: 'manual'
    };
    
    const inputs: EPVInputs = {
      symbol,
      historicalEarnings,
      normalizationMethod,
      normalizationPeriod,
      manualNormalizedEarnings: normalizationMethod === 'manual' ? parseFloat(manualNormalizedEarnings) : undefined,
      earningsAdjustments,
      maintenanceCapex: maintenanceCapexAnalysis,
      costOfCapitalMethod,
      manualCostOfCapital: costOfCapitalMethod === 'manual' ? parseFloat(manualCostOfCapital) : undefined,
      costOfCapitalComponents,
      sharesOutstanding,
      includeMaintenanceCapex,
      taxAdjustments: true,
      earningsQuality,
      businessStability,
      competitivePosition
    };
    
    // Validate inputs
    const validation = validateEPVInputs(inputs);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setWarnings(validation.warnings);
      return;
    }
    
    setErrors([]);
    setWarnings(validation.warnings);
    onSubmit(inputs);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Historical Data Summary */}
      {historicalEarnings && historicalEarnings.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Historical Earnings Data</h3>
          <div className="text-xs text-blue-700">
            {historicalEarnings.length} years available ({historicalEarnings[historicalEarnings.length - 1]?.year} - {historicalEarnings[0]?.year})
          </div>
          <div className="mt-2 space-y-1">
            {historicalEarnings.slice(0, 3).map((earning) => (
              <div key={earning.year} className="text-xs text-blue-600 flex justify-between">
                <span>{earning.year}</span>
                <span>${(earning.netIncome / 1000000).toFixed(1)}M</span>
              </div>
            ))}
            {historicalEarnings.length > 3 && (
              <div className="text-xs text-blue-500">...and {historicalEarnings.length - 3} more years</div>
            )}
          </div>
        </div>
      )}
      
      {/* Earnings Normalization */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Earnings Normalization</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="normalization-method">Normalization Method</Label>
            <select
              id="normalization-method"
              value={normalizationMethod}
              onChange={(e) => setNormalizationMethod(e.target.value as EarningsNormalizationMethod)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="average">Average Earnings</option>
              <option value="median">Median Earnings</option>
              <option value="latest">Latest Year</option>
              <option value="manual">Manual Entry</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="normalization-period">Normalization Period (Years)</Label>
            <Input
              id="normalization-period"
              type="number"
              min="1"
              max={historicalEarnings?.length || 10}
              value={normalizationPeriod}
              onChange={(e) => setNormalizationPeriod(parseInt(e.target.value) || 5)}
            />
          </div>
        </div>
        
        {normalizationMethod === 'manual' && (
          <div>
            <Label htmlFor="manual-earnings">Manual Normalized Earnings</Label>
            <Input
              id="manual-earnings"
              type="number"
              step="0.01"
              placeholder="Enter normalized earnings"
              value={manualNormalizedEarnings}
              onChange={(e) => setManualNormalizedEarnings(e.target.value)}
            />
          </div>
        )}
      </div>
      
      {/* Earnings Adjustments */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Earnings Adjustments</h3>
        
        {earningsAdjustments.length > 0 && (
          <div className="space-y-2">
            {earningsAdjustments.map((adjustment, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium">{adjustment.description}</div>
                  <div className="text-xs text-gray-600">{adjustment.reason}</div>
                  <Badge variant={adjustment.amount >= 0 ? 'default' : 'destructive'} className="mt-1">
                    {adjustment.amount >= 0 ? '+' : ''}${(adjustment.amount / 1000000).toFixed(1)}M
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeEarningsAdjustment(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label htmlFor="adjustment-description">Description</Label>
            <Input
              id="adjustment-description"
              placeholder="e.g., One-time charge"
              value={newAdjustment.description || ''}
              onChange={(e) => setNewAdjustment({...newAdjustment, description: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="adjustment-amount">Amount ($)</Label>
            <Input
              id="adjustment-amount"
              type="number"
              step="0.01"
              placeholder="Adjustment amount"
              value={newAdjustment.amount || ''}
              onChange={(e) => setNewAdjustment({...newAdjustment, amount: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div>
            <Label htmlFor="adjustment-reason">Reason</Label>
            <Input
              id="adjustment-reason"
              placeholder="Explanation"
              value={newAdjustment.reason || ''}
              onChange={(e) => setNewAdjustment({...newAdjustment, reason: e.target.value})}
            />
          </div>
          <div className="md:col-span-3">
            <Button type="button" variant="outline" onClick={addEarningsAdjustment}>
              Add Adjustment
            </Button>
          </div>
        </div>
      </div>
      
      {/* Cost of Capital */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Cost of Capital</h3>
        
        <div>
          <Label htmlFor="cost-method">Calculation Method</Label>
          <select
            id="cost-method"
            value={costOfCapitalMethod}
            onChange={(e) => setCostOfCapitalMethod(e.target.value as CostOfCapitalMethod)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="wacc">WACC (Recommended)</option>
            <option value="capm">CAPM Only</option>
            <option value="manual">Manual Entry</option>
          </select>
        </div>
        
        {costOfCapitalMethod === 'manual' ? (
          <div>
            <Label htmlFor="manual-cost">Manual Cost of Capital (%)</Label>
            <Input
              id="manual-cost"
              type="number"
              step="any"
              min="0"
              max="100"
              placeholder="e.g., 12"
              value={manualCostOfCapital}
              onChange={(e) => setManualCostOfCapital(e.target.value)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="risk-free-rate">Risk-Free Rate (%)</Label>
              <Input
                id="risk-free-rate"
                type="number"
                step="any"
                min="0"
                max="20"
                value={riskFreeRate}
                onChange={(e) => setRiskFreeRate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="market-risk-premium">Market Risk Premium (%)</Label>
              <Input
                id="market-risk-premium"
                type="number"
                step="any"
                min="0"
                max="20"
                value={marketRiskPremium}
                onChange={(e) => setMarketRiskPremium(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="beta">Beta</Label>
              <Input
                id="beta"
                type="number"
                step="any"
                min="0"
                max="5"
                value={beta}
                onChange={(e) => setBeta(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tax-rate">Tax Rate (%)</Label>
              <Input
                id="tax-rate"
                type="number"
                step="any"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Maintenance Capital Expenditure */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Maintenance Capital Expenditure</h3>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-capex"
            checked={includeMaintenanceCapex}
            onCheckedChange={setIncludeMaintenanceCapex}
          />
          <Label htmlFor="include-capex">Subtract maintenance capex from normalized earnings</Label>
        </div>
        
        {includeMaintenanceCapex && (
          <div>
            <Label htmlFor="maintenance-capex">Annual Maintenance Capex ($)</Label>
            <Input
              id="maintenance-capex"
              type="number"
              step="0.01"
              placeholder="Enter estimated annual maintenance capex"
              value={maintenanceCapexAmount}
              onChange={(e) => setMaintenanceCapexAmount(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Estimated as ~3% of revenue. This represents capex needed to maintain current earning power.
            </p>
          </div>
        )}
      </div>
      
      {/* Quality Assessments */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Business Quality Assessment</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="earnings-quality">Earnings Quality</Label>
            <select
              id="earnings-quality"
              value={earningsQuality}
              onChange={(e) => setEarningsQuality(e.target.value as EarningsQuality)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="very_poor">Very Poor</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="business-stability">Business Stability</Label>
            <select
              id="business-stability"
              value={businessStability}
              onChange={(e) => setBusinessStability(e.target.value as 'very_stable' | 'stable' | 'moderate' | 'volatile' | 'very_volatile')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="very_stable">Very Stable</option>
              <option value="stable">Stable</option>
              <option value="moderate">Moderate</option>
              <option value="volatile">Volatile</option>
              <option value="very_volatile">Very Volatile</option>
            </select>
          </div>
          
          <div>
            <Label htmlFor="competitive-position">Competitive Position</Label>
            <select
              id="competitive-position"
              value={competitivePosition}
              onChange={(e) => setCompetitivePosition(e.target.value as 'dominant' | 'strong' | 'average' | 'weak' | 'poor')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="dominant">Dominant</option>
              <option value="strong">Strong</option>
              <option value="average">Average</option>
              <option value="weak">Weak</option>
              <option value="poor">Poor</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Validation Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-900 mb-2">Errors:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">Warnings:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            {warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={loading} size="lg" className="min-w-48">
          {loading ? 'Calculating...' : 'Calculate EPV'}
        </Button>
      </div>
    </form>
  );
};