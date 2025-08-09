// Debug helper for testing API connectivity
export const testAPIConnection = async () => {
  const API_KEY = import.meta.env.VITE_FMP_API_KEY;
  const API_URL = import.meta.env.VITE_FMP_API_URL;
  
  console.log('=== API Configuration Test ===');
  console.log('API_KEY exists:', !!API_KEY);
  console.log('API_URL:', API_URL);
  
  if (!API_KEY) {
    console.error('❌ API Key is missing!');
    return false;
  }
  
  if (!API_URL) {
    console.error('❌ API URL is missing!');
    return false;
  }
  
  // Test with a known ticker
  const testTicker = 'AAPL';
  const testUrl = `${API_URL}/profile/${testTicker}?apikey=${API_KEY}`;
  
  try {
    console.log(`Testing API with ticker: ${testTicker}`);
    const response = await fetch(testUrl);
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API connection successful!');
      console.log('Sample response:', data);
      return true;
    } else {
      console.error('❌ API request failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    return false;
  }
};

// Extend Window interface for debug function
declare global {
  interface Window {
    testAPI?: typeof testAPIConnection;
  }
}

// Auto-run test in development
if (import.meta.env.DEV) {
  window.testAPI = testAPIConnection;
  console.log('Debug helper loaded. Run window.testAPI() in console to test API connection.');
}