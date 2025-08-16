// Simple browser test to diagnose issues
export const runBrowserTest = () => {
  console.log('=== Browser Test Started ===');
  
  // Test 1: Check if imports work
  console.log('Test 1: Checking imports...');
  try {
    const { getMockCompanyData, isDemo } = require('./mockData');
    console.log('✅ Mock data module loaded');
    
    // Test 2: Check isDemo function
    console.log('\nTest 2: Testing isDemo function...');
    console.log('isDemo("DEMO"):', isDemo('DEMO'));
    console.log('isDemo("demo"):', isDemo('demo'));
    console.log('isDemo("AAPL"):', isDemo('AAPL'));
    
    // Test 3: Get mock data
    console.log('\nTest 3: Getting mock data...');
    const data = getMockCompanyData('DEMO');
    console.log('Mock data loaded:', !!data);
    if (data) {
      console.log('Symbol:', data.symbol);
      console.log('Name:', data.name);
      console.log('Price:', data.currentPrice);
    }
    
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
  
  // Test 4: Check Dashboard state
  console.log('\nTest 4: Checking Dashboard state...');
  const dashboardElement = document.querySelector('[data-testid="dashboard"]');
  console.log('Dashboard element found:', !!dashboardElement);
  
  // Test 5: Check for error messages
  const errorElements = document.querySelectorAll('.text-red-700');
  console.log('Error messages found:', errorElements.length);
  errorElements.forEach((el, i) => {
    console.log(`Error ${i + 1}:`, el.textContent);
  });
  
  console.log('\n=== Browser Test Complete ===');
};

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).runBrowserTest = runBrowserTest;
  console.log('Browser test ready. Run window.runBrowserTest() to test.');
}