/**
 * Earnings Detection Utility Module
 * 
 * Pure utility functions for detecting quarterly earnings patterns,
 * estimating next earnings dates, and validating cache freshness
 * based on earnings schedules.
 */

import type { EarningsDetectionResult } from '../types/financialCache';

/**
 * Standard quarterly reporting periods (reserved for future use)
 */
// const QUARTERS = {
//   Q1: { months: [1, 2, 3], name: 'Q1' },
//   Q2: { months: [4, 5, 6], name: 'Q2' },
//   Q3: { months: [7, 8, 9], name: 'Q3' },
//   Q4: { months: [10, 11, 12], name: 'Q4' }
// } as const;

/**
 * Typical earnings report delays after quarter end (in days)
 */
const EARNINGS_REPORT_DELAYS = {
  Q1: 45, // Mid-May for Q1 ending March
  Q2: 45, // Mid-August for Q2 ending June
  Q3: 45, // Mid-November for Q3 ending September
  Q4: 90, // Late March/April for Q4 ending December (annual report)
} as const;

/**
 * Get the quarter (1-4) from a given date
 */
export function getQuarterFromDate(date: Date): 1 | 2 | 3 | 4 {
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  
  if (month >= 1 && month <= 3) return 1;
  if (month >= 4 && month <= 6) return 2;
  if (month >= 7 && month <= 9) return 3;
  return 4;
}

/**
 * Get the quarter end date for a given quarter and year
 */
function getQuarterEndDate(quarter: 1 | 2 | 3 | 4, year: number): Date {
  const quarterEndMonths = { 1: 2, 2: 5, 3: 8, 4: 11 }; // 0-indexed months
  const month = quarterEndMonths[quarter];
  
  // Get last day of the quarter end month
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, lastDay);
}

/**
 * Calculate the expected earnings report date based on quarter end
 */
function getExpectedEarningsDate(quarterEndDate: Date, quarter: 1 | 2 | 3 | 4): Date {
  const delay = EARNINGS_REPORT_DELAYS[`Q${quarter}` as keyof typeof EARNINGS_REPORT_DELAYS];
  const earningsDate = new Date(quarterEndDate);
  earningsDate.setDate(earningsDate.getDate() + delay);
  return earningsDate;
}

/**
 * Parse date string to Date object with error handling
 */
function parseDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Calculate intervals between consecutive dates in days
 */
function calculateIntervals(dates: Date[]): number[] {
  const intervals: number[] = [];
  
  for (let i = 1; i < dates.length; i++) {
    const intervalMs = dates[i].getTime() - dates[i - 1].getTime();
    const intervalDays = Math.round(intervalMs / (1000 * 60 * 60 * 24));
    intervals.push(intervalDays);
  }
  
  return intervals;
}

/**
 * Check if intervals suggest quarterly reporting (roughly 90-day intervals)
 */
function isQuarterlyPattern(intervals: number[]): boolean {
  if (intervals.length < 2) return false;
  
  // Quarterly reporting should have intervals between 80-100 days typically
  const quarterlyIntervals = intervals.filter(interval => 
    interval >= 80 && interval <= 100
  );
  
  // At least 75% of intervals should be quarterly
  return quarterlyIntervals.length / intervals.length >= 0.75;
}

/**
 * Calculate confidence level based on data quality and pattern consistency
 */
export function calculateConfidenceLevel(dates: string[]): number {
  if (dates.length === 0) return 0;
  if (dates.length === 1) return 0.3; // Low confidence with single data point
  
  const parsedDates = dates
    .map(parseDate)
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  
  if (parsedDates.length < 2) return 0.2;
  
  const intervals = calculateIntervals(parsedDates);
  const isQuarterly = isQuarterlyPattern(intervals);
  
  let confidence = 0.5; // Base confidence
  
  // Increase confidence based on data points
  if (parsedDates.length >= 4) confidence += 0.2;
  if (parsedDates.length >= 8) confidence += 0.1;
  
  // Increase confidence for quarterly pattern
  if (isQuarterly) confidence += 0.2;
  
  // Decrease confidence for inconsistent intervals
  if (intervals.length > 0) {
    const intervalStdDev = Math.sqrt(
      intervals.reduce((sum, interval) => {
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        return sum + Math.pow(interval - avg, 2);
      }, 0) / intervals.length
    );
    
    // High variability reduces confidence
    if (intervalStdDev > 30) confidence -= 0.2;
  }
  
  // Boost confidence for recent data
  const mostRecentDate = parsedDates[parsedDates.length - 1];
  const daysSinceRecent = (Date.now() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSinceRecent <= 120) confidence += 0.1; // Recent data within 4 months
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Detect quarterly reporting pattern from historical financial data dates
 */
export function detectQuarterlyPattern(dates: string[]): EarningsDetectionResult {
  if (dates.length === 0) {
    return {
      confidence: 0,
      method: 'unknown'
    };
  }
  
  const parsedDates = dates
    .map(parseDate)
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  
  if (parsedDates.length === 0) {
    return {
      confidence: 0,
      method: 'unknown'
    };
  }
  
  const lastDate = parsedDates[parsedDates.length - 1];
  const confidence = calculateConfidenceLevel(dates);
  
  // Single date - low confidence estimation
  if (parsedDates.length === 1) {
    return {
      lastEarningsDate: lastDate,
      confidence,
      method: 'pattern',
      quarterlyPattern: false
    };
  }
  
  const intervals = calculateIntervals(parsedDates);
  const quarterlyPattern = isQuarterlyPattern(intervals);
  
  return {
    lastEarningsDate: lastDate,
    confidence,
    method: 'pattern',
    quarterlyPattern
  };
}

/**
 * Estimate the next earnings date based on the last known date and pattern
 */
export function estimateNextEarningsDate(lastDate: string, pattern?: boolean): Date | null {
  const parsedDate = parseDate(lastDate);
  if (!parsedDate) return null;
  
  const lastQuarter = getQuarterFromDate(parsedDate);
  const lastYear = parsedDate.getFullYear();
  
  // Determine next quarter and year
  let nextQuarter: 1 | 2 | 3 | 4;
  let nextYear = lastYear;
  
  if (lastQuarter === 4) {
    nextQuarter = 1;
    nextYear += 1;
  } else {
    nextQuarter = (lastQuarter + 1) as 1 | 2 | 3 | 4;
  }
  
  // Get quarter end date for the next quarter
  const nextQuarterEnd = getQuarterEndDate(nextQuarter, nextYear);
  
  // Calculate expected earnings report date
  const expectedEarningsDate = getExpectedEarningsDate(nextQuarterEnd, nextQuarter);
  
  // If we have pattern confirmation, use the calculated date
  // Otherwise, add some uncertainty by using a range
  if (pattern === true) {
    return expectedEarningsDate;
  }
  
  // For uncertain patterns, estimate 3 months from last date as fallback
  const fallbackDate = new Date(parsedDate);
  fallbackDate.setMonth(fallbackDate.getMonth() + 3);
  
  return fallbackDate;
}

/**
 * Determine if cached financial data is stale based on estimated earnings dates
 */
export function isCacheStaleBasedOnEarnings(
  cachedDate: Date, 
  estimatedEarnings?: Date
): boolean {
  const now = new Date();
  
  // If no estimated earnings date, use standard 90-day rule
  if (!estimatedEarnings) {
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return cachedDate < ninetyDaysAgo;
  }
  
  // If we have an estimated earnings date
  // Check if we're past the estimated earnings date and cache is older than earnings
  if (now > estimatedEarnings && cachedDate < estimatedEarnings) {
    return true;
  }
  
  // If estimated earnings is in the future, use longer cache duration
  // Allow cache to be fresh until 1 week after estimated earnings
  const oneWeekAfterEarnings = new Date(estimatedEarnings);
  oneWeekAfterEarnings.setDate(oneWeekAfterEarnings.getDate() + 7);
  
  if (now > oneWeekAfterEarnings && cachedDate < estimatedEarnings) {
    return true;
  }
  
  // Standard staleness check - 120 days max age regardless of earnings
  const maxAge = new Date(now);
  maxAge.setDate(maxAge.getDate() - 120);
  
  return cachedDate < maxAge;
}

/**
 * Analyze filing dates and return comprehensive earnings detection
 */
export function analyzeFilingDates(dates: string[]): EarningsDetectionResult {
  const patternResult = detectQuarterlyPattern(dates);
  
  if (!patternResult.lastEarningsDate) {
    return patternResult;
  }
  
  const nextEarningsDate = estimateNextEarningsDate(
    patternResult.lastEarningsDate.toISOString(),
    patternResult.quarterlyPattern
  );
  
  return {
    ...patternResult,
    nextEarningsDate: nextEarningsDate || undefined
  };
}

/**
 * Get the current quarter and year
 */
export function getCurrentQuarter(): { quarter: 1 | 2 | 3 | 4; year: number } {
  const now = new Date();
  return {
    quarter: getQuarterFromDate(now),
    year: now.getFullYear()
  };
}

/**
 * Check if a date falls within earnings season (typically 6 weeks after quarter end)
 */
export function isEarningsSeason(date: Date = new Date()): boolean {
  const quarter = getQuarterFromDate(date);
  const year = date.getFullYear();
  
  const quarterEnd = getQuarterEndDate(quarter, year);
  const earningsSeasonStart = new Date(quarterEnd);
  earningsSeasonStart.setDate(earningsSeasonStart.getDate() + 15); // 2 weeks after quarter end
  
  const earningsSeasonEnd = new Date(quarterEnd);
  earningsSeasonEnd.setDate(earningsSeasonEnd.getDate() + 60); // 8 weeks after quarter end
  
  return date >= earningsSeasonStart && date <= earningsSeasonEnd;
}