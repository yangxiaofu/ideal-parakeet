import { useMemo } from 'react';
import type { CompanyFinancials } from '../types';
import {
  getLatestFinancialEntry,
  sortFinancialDataByDate,
  prepareHistoricalData,
  getLatestValue,
  hasDividends
} from '../utils/financialDataHelpers';

/**
 * Custom hook to process and prepare financial data
 * Handles sorting, latest value extraction, and historical data preparation
 */
export function useFinancialData(companyData: CompanyFinancials | null) {
  return useMemo(() => {
    if (!companyData) {
      return {
        latestFCF: 0,
        latestShares: 0,
        latestDividend: 0,
        latestNetIncome: 0,
        latestTotalAssets: 0,
        latestTotalEquity: 0,
        sortedIncomeStatements: [],
        sortedBalanceSheets: [],
        sortedCashFlowStatements: [],
        historicalFCF: [],
        historicalShares: [],
        hasDividends: false,
        latestIncomeStatement: null,
        latestBalanceSheet: null,
        latestCashFlowStatement: null
      };
    }

    // Get sorted statements (newest first)
    const sortedIncomeStatements = sortFinancialDataByDate(companyData.incomeStatement);
    const sortedBalanceSheets = sortFinancialDataByDate(companyData.balanceSheet);
    const sortedCashFlowStatements = sortFinancialDataByDate(companyData.cashFlowStatement);

    // Get latest statements
    const latestIncomeStatement = getLatestFinancialEntry(companyData.incomeStatement);
    const latestBalanceSheet = getLatestFinancialEntry(companyData.balanceSheet);
    const latestCashFlowStatement = getLatestFinancialEntry(companyData.cashFlowStatement);

    // Extract latest values
    const latestFCF = getLatestValue(
      companyData.cashFlowStatement,
      cf => cf.freeCashFlow,
      0
    );

    const latestShares = getLatestValue(
      companyData.incomeStatement,
      stmt => stmt.sharesOutstanding,
      0
    );

    // Calculate dividend per share for the latest period
    const latestCashFlow = latestCashFlowStatement;
    const latestIncome = latestIncomeStatement;
    const latestDividendTotal = latestCashFlow ? Math.abs(latestCashFlow.dividendsPaid || 0) : 0;
    const latestSharesForDividend = latestIncome ? latestIncome.sharesOutstanding : 1;
    const latestDividend = latestSharesForDividend > 0 ? latestDividendTotal / latestSharesForDividend : 0;

    const latestNetIncome = getLatestValue(
      companyData.incomeStatement,
      stmt => stmt.netIncome,
      0
    );

    const latestTotalAssets = getLatestValue(
      companyData.balanceSheet,
      bs => bs.totalAssets,
      0
    );

    const latestTotalEquity = getLatestValue(
      companyData.balanceSheet,
      bs => bs.totalEquity,
      0
    );

    // Prepare historical data for SelectableInput components
    // Take only the 5 most recent years, sorted newest first
    const historicalFCF = prepareHistoricalData(
      sortedCashFlowStatements.slice(0, 5),
      cf => cf.freeCashFlow
    );

    const historicalShares = prepareHistoricalData(
      sortedIncomeStatements.slice(0, 5),
      stmt => stmt.sharesOutstanding
    );

    // Check if company pays dividends
    const companyHasDividends = hasDividends(companyData.cashFlowStatement);

    return {
      // Latest values
      latestFCF,
      latestShares,
      latestDividend,
      latestNetIncome,
      latestTotalAssets,
      latestTotalEquity,
      
      // Sorted statements (newest first)
      sortedIncomeStatements,
      sortedBalanceSheets,
      sortedCashFlowStatements,
      
      // Historical data for dropdowns
      historicalFCF,
      historicalShares,
      
      // Flags
      hasDividends: companyHasDividends,
      
      // Latest complete statements
      latestIncomeStatement,
      latestBalanceSheet,
      latestCashFlowStatement
    };
  }, [companyData]);
}