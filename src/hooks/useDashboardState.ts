/**
 * Custom hook for managing Dashboard calculator state
 * Extracts calculator result and tab management following SoC principles
 */

import { useState } from 'react';
import type { CalculatorModel } from '../components/calculator/CalculatorTabs';

// Enhanced calculator result with metadata
interface CalculatorResultMetadata {
  value: number;
  timestamp: Date;
  confidence?: 'high' | 'medium' | 'low';
  fromCache?: boolean;
  cacheAge?: string;
}

interface UseDashboardStateResult {
  activeTab: CalculatorModel;
  setActiveTab: (tab: CalculatorModel) => void;
  completedCalculators: Set<CalculatorModel>;
  calculatorResults: Partial<Record<CalculatorModel, CalculatorResultMetadata>>;
  addCalculatorResult: (
    calculator: CalculatorModel, 
    value: number, 
    metadata?: Partial<CalculatorResultMetadata>
  ) => void;
  clearResults: () => void;
  isCalculatorCompleted: (calculator: CalculatorModel) => boolean;
  getCalculatorResult: (calculator: CalculatorModel) => CalculatorResultMetadata | undefined;
}

export function useDashboardState(initialTab: CalculatorModel = 'DCF'): UseDashboardStateResult {
  const [activeTab, setActiveTab] = useState<CalculatorModel>(initialTab);
  const [completedCalculators, setCompletedCalculators] = useState<Set<CalculatorModel>>(new Set());
  const [calculatorResults, setCalculatorResults] = useState<Partial<Record<CalculatorModel, CalculatorResultMetadata>>>({});

  const addCalculatorResult = (
    calculator: CalculatorModel, 
    value: number, 
    metadata: Partial<CalculatorResultMetadata> = {}
  ) => {
    const resultMetadata: CalculatorResultMetadata = {
      value,
      timestamp: new Date(),
      confidence: metadata.confidence || 'medium',
      fromCache: metadata.fromCache || false,
      cacheAge: metadata.cacheAge,
      ...metadata
    };

    setCalculatorResults(prev => ({
      ...prev,
      [calculator]: resultMetadata
    }));

    setCompletedCalculators(prev => new Set([...prev, calculator]));
  };

  const clearResults = () => {
    setCompletedCalculators(new Set());
    setCalculatorResults({});
    setActiveTab('DCF'); // Reset to default tab
  };

  const isCalculatorCompleted = (calculator: CalculatorModel): boolean => {
    return completedCalculators.has(calculator);
  };

  const getCalculatorResult = (calculator: CalculatorModel): CalculatorResultMetadata | undefined => {
    return calculatorResults[calculator];
  };

  return {
    activeTab,
    setActiveTab,
    completedCalculators,
    calculatorResults,
    addCalculatorResult,
    clearResults,
    isCalculatorCompleted,
    getCalculatorResult,
  };
}