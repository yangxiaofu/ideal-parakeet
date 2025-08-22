import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { SelectableInput } from '../ui/selectable-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import type { DCFInputs } from '../../types';
import { generateGrowthPattern, type ScenarioType } from '../../utils/growthPatternUtils';
import { GrowthRateEditor } from './GrowthRateEditor';

interface HistoricalValue {
  year: string;
  value: number;
}

interface DCFInputFormProps {
  onSubmit: (inputs: DCFInputs) => void;
  loading?: boolean;
  initialValues?: DCFInputs;
  historicalFCF?: HistoricalValue[];
  historicalShares?: HistoricalValue[];
}


export const DCFInputForm: React.FC<DCFInputFormProps> = ({
  onSubmit,
  loading = false,
  initialValues,
  historicalFCF,
  historicalShares
}) => {
  const [formData, setFormData] = useState<Partial<DCFInputs>>({
    baseFCF: initialValues?.baseFCF || 0,
    discountRate: initialValues?.discountRate || 0.15,
    terminalGrowthRate: initialValues?.terminalGrowthRate || 0.03,
    projectionYears: initialValues?.projectionYears || 10,
    sharesOutstanding: initialValues?.sharesOutstanding || 0,
    scenario: (initialValues?.scenario || 'base') as ScenarioType,
    fcfGrowthRates: initialValues?.fcfGrowthRates?.length 
      ? initialValues.fcfGrowthRates 
      : generateGrowthPattern('base', initialValues?.projectionYears || 10)
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update growth rates when projection years or scenario changes
  useEffect(() => {
    const years = formData.projectionYears || 10;
    const scenario = formData.scenario || 'base';
    
    // Generate pattern for the exact number of years
    const newRates = generateGrowthPattern(scenario, years);
    
    setFormData(prev => ({
      ...prev,
      fcfGrowthRates: newRates
    }));
  }, [formData.projectionYears, formData.scenario]);

  const handleInputChange = (field: keyof DCFInputs, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleGrowthRatesChange = (rates: number[]) => {
    setFormData(prev => ({ ...prev, fcfGrowthRates: rates }));
  };

  const handleScenarioChange = (scenario: ScenarioType) => {
    setFormData(prev => ({ ...prev, scenario }));
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
            <SelectableInput
              id="baseFCF"
              label="Base Free Cash Flow ($)"
              value={formData.baseFCF || ''}
              onChange={(value) => handleInputChange('baseFCF', value)}
              historicalValues={historicalFCF}
              placeholder="1000000000"
              disabled={loading}
              error={errors.baseFCF}
              formatType="currency"
              showGrowthRate={true}
            />

            <SelectableInput
              id="sharesOutstanding"
              label="Shares Outstanding"
              value={formData.sharesOutstanding || ''}
              onChange={(value) => handleInputChange('sharesOutstanding', value)}
              historicalValues={historicalShares}
              placeholder="100000000"
              disabled={loading}
              error={errors.sharesOutstanding}
              formatType="shares"
              showGrowthRate={false}
            />
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
                value={formData.discountRate ? (formData.discountRate * 100) : ''}
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
                value={formData.terminalGrowthRate ? (formData.terminalGrowthRate * 100) : ''}
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
                value={formData.projectionYears || 10}
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

          {/* Growth Rates Editor */}
          <GrowthRateEditor
            projectionYears={formData.projectionYears || 10}
            growthRates={formData.fcfGrowthRates || []}
            scenario={formData.scenario || 'base'}
            onGrowthRatesChange={handleGrowthRatesChange}
            onScenarioChange={handleScenarioChange}
            disabled={loading}
          />

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Calculating...' : 'Calculate DCF'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};