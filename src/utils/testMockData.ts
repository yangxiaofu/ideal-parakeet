// Test file to validate mock data
import { getMockCompanyData, isDemo } from './mockData';

export const testMockData = () => {
  console.log('=== Testing Mock Data ===');
  
  // Test 1: Check isDemo function
  console.log('Test 1: isDemo function');
  console.log('isDemo("DEMO"):', isDemo('DEMO'));
  console.log('isDemo("demo"):', isDemo('demo'));
  console.log('isDemo("TEST"):', isDemo('TEST'));
  console.log('isDemo("AAPL"):', isDemo('AAPL'));
  
  // Test 2: Get mock data
  console.log('\nTest 2: Getting mock data');
  try {
    const mockData = getMockCompanyData('DEMO');
    console.log('Mock data retrieved successfully');
    console.log('Symbol:', mockData.symbol);
    console.log('Name:', mockData.name);
    console.log('Current Price:', mockData.currentPrice);
    console.log('Shares Outstanding:', mockData.sharesOutstanding);
    
    // Test 3: Validate data structure
    console.log('\nTest 3: Data structure validation');
    console.log('Has incomeStatement:', !!mockData.incomeStatement);
    console.log('Income statements count:', mockData.incomeStatement?.length);
    console.log('Has balanceSheet:', !!mockData.balanceSheet);
    console.log('Balance sheets count:', mockData.balanceSheet?.length);
    console.log('Has cashFlowStatement:', !!mockData.cashFlowStatement);
    console.log('Cash flow statements count:', mockData.cashFlowStatement?.length);
    
    // Test 4: Check first income statement
    if (mockData.incomeStatement && mockData.incomeStatement.length > 0) {
      const firstIS = mockData.incomeStatement[0];
      console.log('\nTest 4: First income statement');
      console.log('Date:', firstIS.date);
      console.log('Revenue:', firstIS.revenue);
      console.log('Net Income:', firstIS.netIncome);
      console.log('EPS:', firstIS.eps);
    }
    
    return mockData;
  } catch (error) {
    console.error('Error getting mock data:', error);
    return null;
  }
};

// Auto-test in development
if (import.meta.env.DEV) {
  (window as any).testMockData = testMockData;
  console.log('Mock data tester loaded. Run window.testMockData() to test.');
}