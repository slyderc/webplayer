/**
 * Simple test for the StorageService
 * This tests basic functionality of the storage service
 */

// Import the StorageService class (browser-compatible way)
// The actual class will be loaded via the HTML test runner

console.log('🧪 Running StorageService tests...');

// Test counter for summary
let passedTests = 0;
let failedTests = 0;

// Simple assertion function
function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
    return true;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failedTests++;
    return false;
  }
}

// Only run tests if the StorageService is available
if (typeof StorageService !== 'undefined') {
  
  // Test 1: Create instance
  try {
    const storage = new StorageService();
    assert(storage instanceof StorageService, 'Should create StorageService instance');
  } catch (e) {
    assert(false, `Could not create StorageService instance: ${e.message}`);
  }

  // Test 2: Set and Get string value
  try {
    const storage = new StorageService();
    const testKey = 'test-string-key';
    const testValue = 'test-string-value';
    
    storage.setItem(testKey, testValue);
    const result = storage.getItem(testKey);
    
    assert(result === testValue, 'Should store and retrieve string values');
    
    // Clean up
    storage.removeItem(testKey);
  } catch (e) {
    assert(false, `String storage test failed: ${e.message}`);
  }

  // Test 3: Set and Get object value
  try {
    const storage = new StorageService();
    const testKey = 'test-object-key';
    const testObject = { name: 'Test Object', value: 42, nested: { foo: 'bar' } };
    
    storage.setItem(testKey, testObject);
    const result = storage.getItem(testKey);
    
    assert(
      result && result.name === testObject.name && 
      result.value === testObject.value && 
      result.nested && result.nested.foo === 'bar',
      'Should store and retrieve object values with proper serialization'
    );
    
    // Clean up
    storage.removeItem(testKey);
  } catch (e) {
    assert(false, `Object storage test failed: ${e.message}`);
  }

  // Test 4: Test removeItem
  try {
    const storage = new StorageService();
    const testKey = 'test-remove-key';
    
    storage.setItem(testKey, 'value-to-remove');
    storage.removeItem(testKey);
    const result = storage.getItem(testKey);
    
    assert(result === null, 'removeItem should delete values');
  } catch (e) {
    assert(false, `removeItem test failed: ${e.message}`);
  }

  // Test 5: Test clear
  try {
    const storage = new StorageService();
    const testKey1 = 'test-clear-key1';
    const testKey2 = 'test-clear-key2';
    
    // First set some values
    storage.setItem(testKey1, 'value1');
    storage.setItem(testKey2, 'value2');
    
    // Clear all values
    storage.clear();
    
    // Check that values are cleared
    const result1 = storage.getItem(testKey1);
    const result2 = storage.getItem(testKey2);
    
    assert(result1 === null && result2 === null, 'clear should remove all values');
  } catch (e) {
    assert(false, `clear test failed: ${e.message}`);
  }

} else {
  console.error('❌ StorageService is not available. Make sure it is included before running tests.');
  failedTests++;
}

// Print summary
console.log('\n📊 Test Summary:');
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Total: ${passedTests + failedTests}`);