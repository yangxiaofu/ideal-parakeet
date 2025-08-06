import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import type { DCFInputs } from '../../types';

interface DCFInputFormProps {
  onSubmit: (inputs: DCFInputs) => void;
  loading?: boolean;
  initialValues?: DCFInputs;
}

// Scenario presets for growth rates
const SCENARIO_PRESETS = {
  bull: [0.20, 0.15, 0.12, 0.10, 0.08],
  base: [0.10, 0.08, 0.06, 0.05, 0.04],
  bear: [0.05, 0.03, 0.02, 0.02, 0.02]
};

export const DCFInputForm: React.FC<DCFInputFormProps> = ({
  onSubmit,
  loading = false,
  initialValues
}) => {
  const [formData, setFormData] = useState<Partial<DCFInputs>>({
    baseFCF: initialValues?.baseFCF || 0,
    discountRate: initialValues?.discountRate || 0.10,
    terminalGrowthRate: initialValues?.terminalGrowthRate || 0.03,
    projectionYears: initialValues?.projectionYears || 5,
    sharesOutstanding: initialValues?.sharesOutstanding || 0,
    scenario: initialValues?.scenario || 'base',
    fcfGrowthRates: initialValues?.fcfGrowthRates || SCENARIO_PRESETS.base.slice(0, 5)
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update growth rates when projection years or scenario changes
  useEffect(() => {
    const years = formData.projectionYears || 5;
    const scenario = formData.scenario || 'base';
    const presetRates = SCENARIO_PRESETS[scenario];
    
    setFormData(prev => ({
      ...prev,
      fcfGrowthRates: presetRates.slice(0, years)
    }));
  }, [formData.projectionYears, formData.scenario]);

  const handleInputChange = (field: keyof DCFInputs, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleGrowthRateChange = (index: number, value: string) => {
    const numValue = parseFloat(value) / 100 || 0; // Convert percentage to decimal
    const newGrowthRates = [...(formData.fcfGrowthRates || [])];
    newGrowthRates[index] = numValue;
    
    setFormData(prev => ({ ...prev, fcfGrowthRates: newGrowthRates }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.baseFCF || formData.baseFCF <= 0) {
      newErrors.baseFCF = 'Base Free Cash Flow is required';
    }

    if (!formData.discountRate || formData.discountRate <= 0) {
      newErrors.discountRate = 'Discount Rate is required';
    }

    if (!formData.sharesOutstanding || formData.sharesOutstanding <= 0) {
      newErrors.sharesOutstanding = 'Shares Outstanding is required';
    }

    if (formData.terminalGrowthRate && formData.discountRate && 
        formData.terminalGrowthRate >= formData.discountRate) {
      newErrors.terminalGrowthRate = 'Terminal growth rate must be less than discount rate';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const dcfInputs: DCFInputs = {
      baseFCF: formData.baseFCF!,
      discountRate: formData.discountRate!,
      terminalGrowthRate: formData.terminalGrowthRate!,
      projectionYears: formData.projectionYears!,
      fcfGrowthRates: formData.fcfGrowthRates!,
      sharesOutstanding: formData.sharesOutstanding!,
      scenario: formData.scenario!
    };

    onSubmit(dcfInputs);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>DCF Valuation Inputs</CardTitle>
        <CardDescription>
          Enter the parameters for Discounted Cash Flow analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Inputs */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="baseFCF" className="text-sm font-medium">
                Base Free Cash Flow ($)
              </label>
              <Input
                id="baseFCF"
                type="number"
                placeholder="1000000000"
                value={formData.baseFCF || ''}
                onChange={(e) => handleInputChange('baseFCF', parseFloat(e.target.value) || 0)}
                disabled={loading}
              />
              {errors.baseFCF && <p className="text-sm text-red-600">{errors.baseFCF}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="sharesOutstanding" className="text-sm font-medium">
                Shares Outstanding
              </label>
              <Input
                id="sharesOutstanding"
                type="number"
                placeholder="100000000"
                value={formData.sharesOutstanding || ''}
                onChange={(e) => handleInputChange('sharesOutstanding', parseFloat(e.target.value) || 0)}
                disabled={loading}
              />
              {errors.sharesOutstanding && <p className="text-sm text-red-600">{errors.sharesOutstanding}</p>}
            </div>
          </div>

          {/* Rates */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="discountRate" className="text-sm font-medium">
                Discount Rate (%)
              </label>
              <Input
                id="discountRate"
                type="number"
                step="0.1"
                placeholder="10"
                value={formData.discountRate ? (formData.discountRate * 100).toFixed(1) : ''}
                onChange={(e) => handleInputChange('discountRate', (parseFloat(e.target.value) || 0) / 100)}
                disabled={loading}
              />
              {errors.discountRate && <p className="text-sm text-red-600">{errors.discountRate}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="terminalGrowthRate" className="text-sm font-medium">
                Terminal Growth Rate (%)
              </label>
              <Input
                id="terminalGrowthRate"
                type="number"
                step="0.1"
                placeholder="3"
                value={formData.terminalGrowthRate ? (formData.terminalGrowthRate * 100).toFixed(1) : ''}
                onChange={(e) => handleInputChange('terminalGrowthRate', (parseFloat(e.target.value) || 0) / 100)}
                disabled={loading}
              />
              {errors.terminalGrowthRate && <p className="text-sm text-red-600">{errors.terminalGrowthRate}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="projectionYears" className="text-sm font-medium">
                Projection Years
              </label>
              <select
                id="projectionYears"
                value={formData.projectionYears || 5}
                onChange={(e) => handleInputChange('projectionYears', parseInt(e.target.value))}
                disabled={loading}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map(year => (
                  <option key={year} value={year}>{year} years</option>
                ))}
              </select>
            </div>
          </div>

          {/* Scenario Selection */}
          <div className="space-y-2">
            <label htmlFor="scenario" className="text-sm font-medium">
              Scenario
            </label>
            <select
              id="scenario"
              value={formData.scenario || 'base'}
              onChange={(e) => handleInputChange('scenario', e.target.value as 'bull' | 'base' | 'bear')}
              disabled={loading}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="bear">Bear Case (Conservative)</option>
              <option value="base">Base Case (Realistic)</option>
              <option value="bull">Bull Case (Optimistic)</option>
            </select>
          </div>

          {/* Growth Rates by Year */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Annual Growth Rates (%)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: formData.projectionYears || 5 }, (_, i) => (
                <div key={i} className="space-y-2">
                  <label htmlFor={`growthRate${i}`} className="text-sm font-medium">
                    Year {i + 1} Growth Rate
                  </label>
                  <Input
                    id={`growthRate${i}`}
                    type="number"
                    step="0.1"
                    placeholder="10"
                    value={formData.fcfGrowthRates?.[i] ? (formData.fcfGrowthRates[i] * 100).toFixed(1) : ''}
                    onChange={(e) => handleGrowthRateChange(i, e.target.value)}
                    disabled={loading}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Calculating...' : 'Calculate DCF'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};