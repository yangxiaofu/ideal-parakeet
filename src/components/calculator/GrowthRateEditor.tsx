import React from 'react';
import { Input } from '../ui/input';
import {
  generateGrowthPattern,
  generateCustomPattern,
  generateDecayPattern,
  formatPatternDescription,
  getScenarioInfo,
  type ScenarioType
} from '../../utils/growthPatternUtils';

interface GrowthRateEditorProps {
  projectionYears: number;
  growthRates: number[];
  scenario: ScenarioType;
  onGrowthRatesChange: (rates: number[]) => void;
  onScenarioChange: (scenario: ScenarioType) => void;
  disabled?: boolean;
}

export const GrowthRateEditor: React.FC<GrowthRateEditorProps> = ({
  projectionYears,
  growthRates,
  scenario,
  onGrowthRatesChange,
  onScenarioChange,
  disabled = false
}) => {

  const handleGrowthRateChange = (index: number, value: string) => {
    const numValue = parseFloat(value) / 100 || 0; // Convert percentage to decimal
    const newGrowthRates = [...growthRates];
    newGrowthRates[index] = numValue;
    onGrowthRatesChange(newGrowthRates);
  };

  const applyQuickPattern = (pattern: 'balanced' | 'front-loaded' | 'conservative') => {
    let newRates: number[];
    
    switch (pattern) {
      case 'front-loaded':
        newRates = generateCustomPattern({
          startRate: 0.12,
          endRate: 0.03,
          distribution: 'front-loaded',
          intensity: 'medium'
        }, projectionYears);
        break;
      case 'conservative':
        newRates = generateCustomPattern({
          startRate: 0.05,
          endRate: 0.03,
          distribution: 'balanced',
          intensity: 'medium'
        }, projectionYears);
        break;
      default: // balanced
        newRates = generateCustomPattern({
          startRate: 0.075,
          endRate: 0.05,
          distribution: 'balanced',
          intensity: 'medium'
        }, projectionYears);
    }
    
    onGrowthRatesChange(newRates);
  };

  const smoothAllRates = () => {
    if (growthRates.length > 1) {
      const firstRate = growthRates[0];
      const lastRate = growthRates[growthRates.length - 1];
      const newRates = generateDecayPattern(
        firstRate,
        lastRate,
        projectionYears,
        'balanced'
      );
      onGrowthRatesChange(newRates);
    }
  };

  const resetToScenario = () => {
    const newRates = generateGrowthPattern(scenario, projectionYears);
    onGrowthRatesChange(newRates);
  };

  const scenarioInfo = getScenarioInfo(scenario);

  return (
    <div className="space-y-4">
      {/* Scenario Selection */}
      <div className="space-y-2">
        <label htmlFor="scenario" className="text-sm font-medium">
          Growth Scenario
        </label>
        <select
          id="scenario"
          value={scenario}
          onChange={(e) => onScenarioChange(e.target.value as ScenarioType)}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <option value="bear">Bear Case (Conservative)</option>
          <option value="base">Base Case (Realistic)</option>
          <option value="bull">Bull Case (Optimistic)</option>
        </select>
        <p className="text-xs text-gray-600">{scenarioInfo.description}</p>
      </div>

      {/* Quick Pattern Selector */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Annual Growth Rates</h4>
          <div className="text-xs text-gray-600">
            Click rates below to edit directly
          </div>
        </div>
        
        {/* Quick Pattern Buttons */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600">Quick Patterns</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => applyQuickPattern('conservative')}
              disabled={disabled}
              className="px-3 py-2 text-xs rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Conservative (5%→3%)
            </button>
            <button
              type="button"
              onClick={() => applyQuickPattern('balanced')}
              disabled={disabled}
              className="px-3 py-2 text-xs rounded-md bg-blue-50 border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              Balanced (7.5%→5%)
            </button>
            <button
              type="button"
              onClick={() => applyQuickPattern('front-loaded')}
              disabled={disabled}
              className="px-3 py-2 text-xs rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Front-loaded (12%→3%)
            </button>
          </div>
        </div>
        
        {/* Growth Pattern Preview - Always Visible */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">Growth Pattern:</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                {scenarioInfo.name}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetToScenario}
                className="text-xs text-blue-600 hover:text-blue-700"
                disabled={disabled}
              >
                Reset to {scenarioInfo.name}
              </button>
              <button
                type="button"
                onClick={smoothAllRates}
                className="text-xs text-blue-600 hover:text-blue-700"
                disabled={disabled}
              >
                Smooth All
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {growthRates.map((rate, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Y{i + 1}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {(rate * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-gray-600">
            {formatPatternDescription(growthRates)}
          </div>
        </div>

        {/* Individual Rate Inputs - Always Visible and Prominent */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h5 className="text-sm font-medium text-gray-700">Individual Year Adjustments</h5>
            <button
              type="button"
              onClick={smoothAllRates}
              className="text-xs text-blue-600 hover:text-blue-700"
              disabled={disabled}
            >
              Smooth All
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: projectionYears }, (_, i) => (
              <div key={i} className="space-y-1">
                <label htmlFor={`growthRate${i}`} className="text-xs font-medium text-gray-600">
                  Year {i + 1}
                </label>
                <div className="relative">
                  <Input
                    id={`growthRate${i}`}
                    type="text"
                    placeholder="7.5"
                    value={growthRates[i] ? (growthRates[i] * 100).toFixed(1) : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.-]/g, '');
                      handleGrowthRateChange(i, value);
                    }}
                    onBlur={(e) => {
                      const numValue = parseFloat(e.target.value);
                      if (!isNaN(numValue)) {
                        handleGrowthRateChange(i, numValue.toFixed(1));
                      }
                    }}
                    disabled={disabled}
                    className="text-sm h-9 pr-6 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-gray-600">
            💡 Tip: Adjust any rate above to customize your growth assumptions. Use "Smooth All" to create a gradual decline from first to last year.
          </p>
        </div>
      </div>
    </div>
  );
};