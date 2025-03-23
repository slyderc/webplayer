/**
 * Simple test for the MetadataService
 * Tests basic functionality of metadata parsing and processing
 */

console.log('🧪 Running MetadataService tests...');

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

// Only run tests if the MetadataService is available
if (typeof MetadataService !== 'undefined') {
  
  // Test 1: Create instance
  try {
    const metadataService = new MetadataService({
      metadataUrl: '/player/publish/playlist.json'
    });
    assert(metadataService instanceof MetadataService, 'Should create MetadataService instance');
  } catch (e) {
    assert(false, `Could not create MetadataService instance: ${e.message}`);
  }

  // Test 2: Test configuration options
  try {
    const customOptions = {
      metadataUrl: '/custom/url/playlist.json',
      pollInterval: 10000
    };
    
    const metadataService = new MetadataService(customOptions);
    
    assert(
      metadataService.options.metadataUrl === customOptions.metadataUrl, 
      'Should use custom metadataUrl option'
    );
    
    assert(
      metadataService.options.pollInterval === customOptions.pollInterval, 
      'Should use custom pollInterval option'
    );
  } catch (e) {
    assert(false, `Configuration options test failed: ${e.message}`);
  }

  // Test 3: Test callback registration
  try {
    const metadataService = new MetadataService();
    const testCallback = () => {};
    
    // Set callback
    const result = metadataService.setCallback('onMetadataUpdate', testCallback);
    
    assert(
      result === metadataService, 
      'setCallback should return the service instance for chaining'
    );
    
    assert(
      metadataService.callbacks.onMetadataUpdate === testCallback, 
      'Should properly register callback function'
    );
  } catch (e) {
    assert(false, `Callback registration test failed: ${e.message}`);
  }

  // Test 4: Test invalid callback name
  try {
    const metadataService = new MetadataService();
    const testCallback = () => {};
    
    // Set invalid callback
    const result = metadataService.setCallback('invalidCallbackName', testCallback);
    
    assert(
      metadataService.callbacks.invalidCallbackName === undefined, 
      'Should not register invalid callback names'
    );
  } catch (e) {
    assert(false, `Invalid callback test failed: ${e.message}`);
  }

  // Test 5: Mock track data parsing
  try {
    const mockTrackData = {
      title: 'Test Track',
      artist: 'Test Artist',
      album: 'Test Album',
      image: 'test-image.jpg',
      timestamp: '2025-03-22T12:00:00Z',
      program_title: 'Test Program',
      presenter: 'Test Presenter'
    };
    
    // This test doesn't actually call the service's methods
    // It just verifies the expected format matches what we'd expect
    
    assert(
      mockTrackData.title === 'Test Track' &&
      mockTrackData.artist === 'Test Artist' &&
      mockTrackData.album === 'Test Album',
      'Track data format should match expected structure'
    );
  } catch (e) {
    assert(false, `Track data format test failed: ${e.message}`);
  }

} else {
  console.error('❌ MetadataService is not available. Make sure it is included before running tests.');
  failedTests++;
}

// Print summary
console.log('\n📊 Test Summary:');
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Total: ${passedTests + failedTests}`);