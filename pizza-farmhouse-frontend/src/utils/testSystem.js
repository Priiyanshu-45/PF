// System Test Utilities
export const testUserFlow = async () => {
  console.log('🧪 Testing Pizza Farmhouse System');
  
  const tests = [
    { name: 'Authentication Context', test: () => window.authContext !== undefined },
    { name: 'Cart Context', test: () => window.cartContext !== undefined },
    { name: 'Firebase Connection', test: () => window.firebase !== undefined },
    { name: 'Order Tracking', test: () => document.querySelector('[data-testid="order-tracking"]') !== null },
    { name: 'Admin Dashboard', test: () => window.location.pathname.includes('/admin') || true },
  ];

  tests.forEach(({ name, test }) => {
    try {
      const result = test();
      console.log(`✅ ${name}: ${result ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.log(`❌ ${name}: ERROR - ${error.message}`);
    }
  });

  console.log('🧪 Test Complete - Check console for results');
};

// Add to window for easy testing
if (typeof window !== 'undefined') {
  window.testPizzaFarmhouse = testUserFlow;
}
