import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { SelectableInput } from '../ui/selectable-input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { DCFInputs } from '../../types';

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

// Dynamic growth pattern generation with distribution controls
type DistributionType = 'front-loaded' | 'balanced';
type FrontLoadIntensity = 'light' | 'medium' | 'heavy' | 'extreme';

const generateDecayPattern = (
  start: number,
  end: number,
  years: number,
  distribution: DistributionType = 'balanced',
  frontLoadIntensity: FrontLoadIntensity = 'medium'
): number[] => {
  const rates: number[] = [];
  
  for (let i = 0; i < years; i++) {
    let progress = i / Math.max(years - 1, 1);
    
    // Apply distribution curve
    if (distribution === 'front-loaded') {
      // Apply front-loading based on intensity
      const intensity = {
        light: 1.5,    // 60/40 split
        medium: 2.0,   // 70/30 split
        heavy: 3.0,    // 80/20 split
        extreme: 5.0   // 90/10 split
      }[frontLoadIntensity];
      
      progress = Math.pow(progress, intensity);
    }
    // 'balanced' uses linear progress
    
    // Linear interpolation with distribution curve
    const rate = start - (start - end) * progress;
    rates.push(Math.round(rate * 1000) / 1000); // Round to 0.1%
  }
  
  return rates;
};

const generateGrowthPattern = (scenario: 'bull' | 'base' | 'bear', years: number): number[] => {
  switch(scenario) {
    case 'bull':
      // Start at 20%, decay to 5% over the period
      return generateDecayPattern(0.20, 0.05, years, 'balanced');
    case 'base':
      // Start at 10%, decay to 3% over the period
      return generateDecayPattern(0.10, 0.03, years, 'balanced');
    case 'bear':
      // Start at 5%, decay to 2% over the period
      return generateDecayPattern(0.05, 0.02, years, 'balanced');
    default:
      return generateDecayPattern(0.10, 0.03, years, 'balanced');
  }
};

// Generate custom pattern with user-defined parameters
const generateCustomPattern = (
  startRate: number,
  endRate: number,
  years: number,
  distribution: DistributionType,
  intensity: FrontLoadIntensity
): number[] => {
  return generateDecayPattern(startRate, endRate, years, distribution, intensity);
};

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
    scenario: initialValues?.scenario || 'base',
    fcfGrowthRates: initialValues?.fcfGrowthRates?.length 
      ? initialValues.fcfGrowthRates 
      : generateGrowthPattern('base', initialValues?.projectionYears || 10)
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showIndividualRates, setShowIndividualRates] = useState(false);
  const [showAdvancedPattern, setShowAdvancedPattern] = useState(false);
  const [patternConfig, setPatternConfig] = useState({
    startRate: 0.15,
    endRate: 0.03,
    distribution: 'balanced' as DistributionType,
    intensity: 'medium' as FrontLoadIntensity
  });

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

  const handleGrowthRateChange = (index: number, value: string) => {
    const numValue = parseFloat(value) / 100 || 0; // Convert percentage to decimal
    const newGrowthRates = [...(formData.fcfGrowthRates || [])];
    newGrowthRates[index] = numValue;
    
    setFormData(prev => ({ ...prev, fcfGrowthRates: newGrowthRates }));
  };

  const applyCustomPattern = () => {
    const years = formData.projectionYears || 10;
    const newRates = generateCustomPattern(
      patternConfig.startRate,
      patternConfig.endRate,
      years,
      patternConfig.distribution,
      patternConfig.intensity
    );
    
    setFormData(prev => ({ 
      ...prev, 
      fcfGrowthRates: newRates,
      scenario: 'base' // Reset scenario when using custom pattern
    }));
    
    setShowAdvancedPattern(false);
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

          {/* Growth Rates Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Annual Growth Rates</h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedPattern(!showAdvancedPattern)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  Advanced Pattern
                  {showAdvancedPattern ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowIndividualRates(!showIndividualRates)}
                  className="text-sm text-gray-600 hover:text-gray-700 flex items-center gap-1"
                >
                  Manual Edit
                  {showIndividualRates ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>
            </div>
            
            {/* Advanced Pattern Builder */}
            {showAdvancedPattern && (
              <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4 space-y-4">
                <h5 className="text-sm font-semibold text-gray-700">Growth Pattern Configuration</h5>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600">
                      Starting Rate (Year 1)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.5"
                        value={(patternConfig.startRate * 100)}
                        onChange={(e) => setPatternConfig(prev => ({ 
                          ...prev, 
                          startRate: (parseFloat(e.target.value) || 0) / 100 
                        }))}
                        className="h-8"
                      />
                      <span className="text-sm text-gray-600">%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600">
                      Ending Rate (Year {formData.projectionYears || 10})
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.5"
                        value={(patternConfig.endRate * 100)}
                        onChange={(e) => setPatternConfig(prev => ({ 
                          ...prev, 
                          endRate: (parseFloat(e.target.value) || 0) / 100 
                        }))}
                        className="h-8"
                      />
                      <span className="text-sm text-gray-600">%</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600">Distribution Pattern</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['front-loaded', 'balanced'] as DistributionType[]).map(dist => (
                      <button
                        key={dist}
                        type="button"
                        onClick={() => setPatternConfig(prev => ({ ...prev, distribution: dist }))}
                        className={`px-3 py-2 text-xs rounded-md transition-colors ${
                          patternConfig.distribution === dist
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {dist.charAt(0).toUpperCase() + dist.slice(1).replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                
                {patternConfig.distribution === 'front-loaded' && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600">
                      Front-loading Intensity
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="3"
                        value={['light', 'medium', 'heavy', 'extreme'].indexOf(patternConfig.intensity)}
                        onChange={(e) => {
                          const intensities: FrontLoadIntensity[] = ['light', 'medium', 'heavy', 'extreme'];
                          setPatternConfig(prev => ({ 
                            ...prev, 
                            intensity: intensities[parseInt(e.target.value)] 
                          }));
                        }}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium text-gray-700 w-20 text-right">
                        {patternConfig.intensity.charAt(0).toUpperCase() + patternConfig.intensity.slice(1)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {patternConfig.intensity === 'light' && '60% of growth in first 40% of years'}
                      {patternConfig.intensity === 'medium' && '70% of growth in first 30% of years'}
                      {patternConfig.intensity === 'heavy' && '80% of growth in first 20% of years'}
                      {patternConfig.intensity === 'extreme' && '90% of growth in first 10% of years'}
                    </div>
                  </div>
                )}
                
                <Button
                  type="button"
                  onClick={applyCustomPattern}
                  className="w-full h-8 text-sm"
                >
                  Apply Pattern
                </Button>
              </div>
            )}
            
            {/* Growth Pattern Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-600">Growth Pattern Preview:</span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  {formData.scenario === 'bull' ? 'Optimistic' : formData.scenario === 'bear' ? 'Conservative' : 'Realistic'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.fcfGrowthRates?.map((rate, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <span className="text-xs text-gray-500">Y{i + 1}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(rate * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-gray-600">
                Pattern: {formData.fcfGrowthRates?.[0] && formData.fcfGrowthRates?.[formData.fcfGrowthRates.length - 1] ? 
                  `Decaying from ${(formData.fcfGrowthRates[0] * 100).toFixed(1)}% to ${(formData.fcfGrowthRates[formData.fcfGrowthRates.length - 1] * 100).toFixed(1)}%` : 
                  'Custom'}
              </div>
            </div>

            {/* Individual Rate Inputs (Collapsible) */}
            {showIndividualRates && (
              <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
                <div className="flex justify-between items-start">
                  <p className="text-xs text-gray-600">
                    Fine-tune individual year growth rates. Changes here will override the selected scenario pattern.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      // Apply cascade: adjust all subsequent years proportionally
                      if (formData.fcfGrowthRates && formData.fcfGrowthRates.length > 1) {
                        const firstRate = formData.fcfGrowthRates[0];
                        const lastRate = formData.fcfGrowthRates[formData.fcfGrowthRates.length - 1];
                        const newRates = generateDecayPattern(
                          firstRate,
                          lastRate,
                          formData.projectionYears || 10,
                          'balanced'
                        );
                        setFormData(prev => ({ ...prev, fcfGrowthRates: newRates }));
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Smooth All
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Array.from({ length: formData.projectionYears || 10 }, (_, i) => (
                    <div key={i} className="space-y-1">
                      <label htmlFor={`growthRate${i}`} className="text-xs font-medium text-gray-600">
                        Year {i + 1}
                      </label>
                      <div className="relative">
                        <Input
                          id={`growthRate${i}`}
                          type="text"
                          placeholder="10"
                          value={formData.fcfGrowthRates?.[i] ? 
                            (formData.fcfGrowthRates[i] * 100).toFixed(1) : ''}
                          onChange={(e) => {
                            // Allow typing decimal values without formatting issues
                            const value = e.target.value.replace(/[^0-9.-]/g, '');
                            handleGrowthRateChange(i, value);
                          }}
                          onBlur={(e) => {
                            // Format on blur
                            const numValue = parseFloat(e.target.value);
                            if (!isNaN(numValue)) {
                              handleGrowthRateChange(i, numValue.toFixed(1));
                            }
                          }}
                          disabled={loading}
                          className="text-sm h-8 pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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