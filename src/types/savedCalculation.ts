/**
 * Types for saved calculation functionality
 */

import type { DCFInputs, DDMInputs, EPVInputs, NAVInputs } from './index';
import type { RelativeValuationInputs } from './relativeValuation';

export type CalculatorType = 'DCF' | 'DDM' | 'EPV' | 'NAV' | 'RELATIVE';

export type CalculationInputs = 
  | DCFInputs 
  | DDMInputs 
  | EPVInputs 
  | NAVInputs
  | RelativeValuationInputs;

export interface SavedCalculation<T extends CalculationInputs = CalculationInputs> {
  id: string;
  userId: string;
  symbol: string;
  companyName?: string;
  type: CalculatorType;
  inputs: T;
  result: unknown; // Will be typed based on calculator type
  createdAt: Date;
  updatedAt: Date;
  dataSnapshot?: {
    marketPrice?: number;
    financialDataDate?: string;
    [key: string]: unknown;
  };
  notes?: string;
  tags?: string[];
}

export interface ListOptions {
  limit?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'symbol';
  orderDirection?: 'asc' | 'desc';
  startAfter?: string; // For pagination
}

export interface CalculationFilter {
  symbol?: string;
  type?: CalculatorType;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface SaveCalculationRequest<T extends CalculationInputs = CalculationInputs> {
  symbol: string;
  companyName?: string;
  type: CalculatorType;
  inputs: T;
  result: unknown;
  dataSnapshot?: Record<string, unknown>;
  notes?: string;
  tags?: string[];
}

// Freshness helper
export const CALCULATION_FRESHNESS_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function isCalculationFresh(
  calculation: SavedCalculation, 
  threshold: number = CALCULATION_FRESHNESS_THRESHOLD
): boolean {
  const now = new Date().getTime();
  const calculationTime = calculation.createdAt.getTime();
  return (now - calculationTime) < threshold;
}

export function getCalculationAge(calculation: SavedCalculation): string {
  const now = new Date().getTime();
  const calculationTime = calculation.createdAt.getTime();
  const diffMs = now - calculationTime;
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
}