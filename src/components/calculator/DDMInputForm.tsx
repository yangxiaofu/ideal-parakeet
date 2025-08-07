import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { SelectableInput } from '../ui/selectable-input';
import { Info, Plus, Trash2 } from 'lucide-react';
import type { DDMInputs, DDMModelType, GrowthPhase, DDMValidation } from '../../types/ddm';
import { validateDDMInputs, calculateHistoricalDividendGrowth } from '../../utils/ddmCalculator';

interface DDMInputFormProps {
  onCalculate: (inputs: DDMInputs) => void;
  defaultDividend?: number;
  defaultShares?: number;
  historicalDividends?: Array<{ year: string; value: number }>;
  historicalShares?: Array<{ year: string; value: number }>;
}

export const DDMInputForm: React.FC<DDMInputFormProps> = ({
  onCalculate,
  defaultDividend = 0,
  defaultShares = 0,
  historicalDividends = [],
  historicalShares = []
}) => {
  // Core inputs
  const [modelType, setModelType] = useState<DDMModelType>('gordon');
  const [currentDividend, setCurrentDividend] = useState(defaultDividend);
  const [sharesOutstanding, setSharesOutstanding] = useState(defaultShares);
  const [requiredReturn, setRequiredReturn] = useState(0.10); // Default 10%
  
  // Gordon model inputs
  const [gordonGrowthRate, setGordonGrowthRate] = useState(0.03); // Default 3%
  
  // Two-stage model inputs
  const [highGrowthRate, setHighGrowthRate] = useState(0.10); // Default 10%
  const [highGrowthYears, setHighGrowthYears] = useState(5);
  const [stableGrowthRate, setStableGrowthRate] = useState(0.03); // Default 3%
  
  // Multi-stage model inputs
  const [growthPhases, setGrowthPhases] = useState<GrowthPhase[]>([
    { growthRate: 0.15, years: 3, description: 'High Growth' },
    { growthRate: 0.08, years: 3, description: 'Transition' },
    { growthRate: 0.03, years: 0, description: 'Terminal Growth' }
  ]);
  
  // Validation state
  const [validation, setValidation] = useState<DDMValidation>({ isValid: true, errors: [], warnings: [] });
  
  // Historical growth rate for reference
  const [historicalGrowth, setHistoricalGrowth] = useState<number | null>(null);
  
  // Update defaults when props change
  useEffect(() => {
    if (defaultDividend > 0) setCurrentDividend(defaultDividend);
    if (defaultShares > 0) setSharesOutstanding(defaultShares);
  }, [defaultDividend, defaultShares]);
  
  // Calculate historical growth rate
  useEffect(() => {
    if (historicalDividends.length >= 2) {
      const growth = calculateHistoricalDividendGrowth(historicalDividends);
      setHistoricalGrowth(growth);
      
      // Suggest growth rates based on historical data
      if (growth > 0 && growth < 0.30) { // Reasonable growth rate
        setGordonGrowthRate(Math.min(growth * 0.8, requiredReturn - 0.01)); // Conservative estimate
        setStableGrowthRate(Math.min(growth * 0.6, 0.05)); // Even more conservative for stable phase
      }
    }
  }, [historicalDividends, requiredReturn]);
  
  // Validate inputs on change
  useEffect(() => {
    const inputs: DDMInputs = {
      currentDividend,
      sharesOutstanding,
      requiredReturn,
      modelType,
      gordonGrowthRate: modelType === 'gordon' ? gordonGrowthRate : undefined,
      highGrowthRate: modelType === 'two-stage' ? highGrowthRate : undefined,
      highGrowthYears: modelType === 'two-stage' ? highGrowthYears : undefined,
      stableGrowthRate: modelType === 'two-stage' ? stableGrowthRate : undefined,
      growthPhases: modelType === 'multi-stage' ? growthPhases : undefined
    };
    
    const result = validateDDMInputs(inputs);
    setValidation(result);
  }, [modelType, currentDividend, sharesOutstanding, requiredReturn, 
      gordonGrowthRate, highGrowthRate, highGrowthYears, stableGrowthRate, growthPhases]);
  
  const handleCalculate = () => {
    if (!validation.isValid) return;
    
    const inputs: DDMInputs = {
      currentDividend,
      sharesOutstanding,
      requiredReturn,
      modelType,
      gordonGrowthRate: modelType === 'gordon' ? gordonGrowthRate : undefined,
      highGrowthRate: modelType === 'two-stage' ? highGrowthRate : undefined,
      highGrowthYears: modelType === 'two-stage' ? highGrowthYears : undefined,
      stableGrowthRate: modelType === 'two-stage' ? stableGrowthRate : undefined,
      growthPhases: modelType === 'multi-stage' ? growthPhases : undefined
    };
    
    onCalculate(inputs);
  };
  
  const addGrowthPhase = () => {
    // Insert before the terminal phase
    const newPhases = [...growthPhases];
    newPhases.splice(newPhases.length - 1, 0, {
      growthRate: 0.05,
      years: 2,
      description: `Phase ${newPhases.length}`
    });
    setGrowthPhases(newPhases);
  };
  
  const removeGrowthPhase = (index: number) => {
    if (growthPhases.length <= 2) return; // Need at least 2 phases
    const newPhases = growthPhases.filter((_, i) => i !== index);
    setGrowthPhases(newPhases);
  };
  
  const updateGrowthPhase = (index: number, field: keyof GrowthPhase, value: any) => {
    const newPhases = [...growthPhases];
    newPhases[index] = { ...newPhases[index], [field]: value };
    setGrowthPhases(newPhases);
  };
  
  return (
    <div className="space-y-6">
      {/* Model Type Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Dividend Discount Model Type</label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {(['gordon', 'zero', 'two-stage', 'multi-stage'] as DDMModelType[]).map(type => (
            <button
              key={type}
              onClick={() => setModelType(type)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                modelType === type
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium">
                {type === 'gordon' && 'Gordon Growth'}
                {type === 'zero' && 'Zero Growth'}
                {type === 'two-stage' && 'Two-Stage'}
                {type === 'multi-stage' && 'Multi-Stage'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {type === 'gordon' && 'Constant growth'}
                {type === 'zero' && 'No growth'}
                {type === 'two-stage' && 'High → Stable'}
                {type === 'multi-stage' && '3+ phases'}
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Historical Growth Rate Reference */}
      {historicalGrowth !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-900">
              Historical dividend growth rate: <strong>{(historicalGrowth * 100).toFixed(2)}%</strong> per year
            </span>
          </div>
        </div>
      )}
      
      {/* Common Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectableInput
          id="current-dividend"
          label="Current Annual Dividend per Share ($)"
          value={currentDividend}
          onChange={setCurrentDividend}
          historicalValues={historicalDividends}
          formatType="currency"
          placeholder="e.g., 2.50"
        />
        
        <SelectableInput
          id="shares-outstanding"
          label="Shares Outstanding"
          value={sharesOutstanding}
          onChange={setSharesOutstanding}
          historicalValues={historicalShares}
          formatType="shares"
          placeholder="e.g., 1000000"
        />
        
        <div className="space-y-2">
          <label htmlFor="required-return" className="text-sm font-medium">
            Required Rate of Return (%)
          </label>
          <Input
            id="required-return"
            type="number"
            value={(requiredReturn * 100).toFixed(1)}
            onChange={(e) => setRequiredReturn(parseFloat(e.target.value) / 100 || 0)}
            placeholder="e.g., 10"
            step="0.1"
          />
          <p className="text-xs text-gray-500">Your minimum acceptable return</p>
        </div>
      </div>
      
      {/* Model-Specific Inputs */}
      {modelType === 'gordon' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Gordon Growth Model Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="gordon-growth" className="text-sm font-medium">
                Constant Growth Rate (%)
              </label>
              <Input
                id="gordon-growth"
                type="number"
                value={(gordonGrowthRate * 100).toFixed(2)}
                onChange={(e) => setGordonGrowthRate(parseFloat(e.target.value) / 100 || 0)}
                placeholder="e.g., 3"
                step="0.1"
              />
              <p className="text-xs text-gray-500">Expected perpetual dividend growth rate</p>
            </div>
          </div>
        </div>
      )}
      
      {modelType === 'zero' && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Zero growth model assumes dividends remain constant forever.
            Suitable for preferred stocks or very mature companies.
          </p>
        </div>
      )}
      
      {modelType === 'two-stage' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Two-Stage Model Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="high-growth" className="text-sm font-medium">
                High Growth Rate (%)
              </label>
              <Input
                id="high-growth"
                type="number"
                value={(highGrowthRate * 100).toFixed(2)}
                onChange={(e) => setHighGrowthRate(parseFloat(e.target.value) / 100 || 0)}
                placeholder="e.g., 10"
                step="0.1"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="high-growth-years" className="text-sm font-medium">
                High Growth Years
              </label>
              <Input
                id="high-growth-years"
                type="number"
                value={highGrowthYears}
                onChange={(e) => setHighGrowthYears(parseInt(e.target.value) || 0)}
                placeholder="e.g., 5"
                min="1"
                max="20"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="stable-growth" className="text-sm font-medium">
                Stable Growth Rate (%)
              </label>
              <Input
                id="stable-growth"
                type="number"
                value={(stableGrowthRate * 100).toFixed(2)}
                onChange={(e) => setStableGrowthRate(parseFloat(e.target.value) / 100 || 0)}
                placeholder="e.g., 3"
                step="0.1"
              />
              <p className="text-xs text-gray-500">Terminal growth rate (must be {'<'} required return)</p>
            </div>
          </div>
        </div>
      )}
      
      {modelType === 'multi-stage' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Multi-Stage Growth Phases</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addGrowthPhase}
              disabled={growthPhases.length >= 5}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Phase
            </Button>
          </div>
          
          <div className="space-y-3">
            {growthPhases.map((phase, index) => {
              const isTerminal = index === growthPhases.length - 1;
              
              return (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-sm font-medium">
                      {phase.description || `Phase ${index + 1}`}
                      {isTerminal && ' (Terminal)'}
                    </h4>
                    {!isTerminal && growthPhases.length > 2 && (
                      <button
                        onClick={() => removeGrowthPhase(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Description</label>
                      <Input
                        value={phase.description || ''}
                        onChange={(e) => updateGrowthPhase(index, 'description', e.target.value)}
                        placeholder="e.g., High Growth"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Growth Rate (%)</label>
                      <Input
                        type="number"
                        value={(phase.growthRate * 100).toFixed(2)}
                        onChange={(e) => updateGrowthPhase(index, 'growthRate', parseFloat(e.target.value) / 100 || 0)}
                        placeholder="e.g., 10"
                        step="0.1"
                      />
                    </div>
                    
                    {!isTerminal && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Years</label>
                        <Input
                          type="number"
                          value={phase.years}
                          onChange={(e) => updateGrowthPhase(index, 'years', parseInt(e.target.value) || 0)}
                          placeholder="e.g., 3"
                          min="1"
                          max="10"
                        />
                      </div>
                    )}
                    
                    {isTerminal && (
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500">Perpetual growth</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Validation Messages */}
      {validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-sm text-red-800">
            <strong>Errors:</strong>
            <ul className="list-disc list-inside mt-1">
              {validation.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {validation.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="text-sm text-yellow-800">
            <strong>Warnings:</strong>
            <ul className="list-disc list-inside mt-1">
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Calculate Button */}
      <Button
        onClick={handleCalculate}
        disabled={!validation.isValid || currentDividend <= 0 || sharesOutstanding <= 0}
        className="w-full"
      >
        Calculate Dividend Discount Value
      </Button>
    </div>
  );
};