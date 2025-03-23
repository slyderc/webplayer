# WebPlayer Test Suite

This is a simple testing framework for the WebPlayer project. It provides browser-based tests for various components and services.

## Getting Started

To run the tests:

1. Start your development environment:
   ```
   ./manage.sh start
   ```

2. Open the test runner in your browser:
   ```
   ./manage.sh test
   ```

Alternatively, you can navigate to http://localhost:8080/webplayer/tests/runner.html in your browser.

## Test Structure

The test suite is organized by component:

- `storage-service-test.js` - Tests for the StorageService
- `metadata-service-test.js` - Tests for the MetadataService

## Writing Tests

To add new tests:

1. Create a new JavaScript file in the `/tests` directory, for example `my-component-test.js`
2. Follow the pattern in existing test files:
   - Use the `assert()` function for checking conditions
   - Group tests by functionality
   - Count passed/failed tests

Example:

```javascript
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

// Your test
try {
  // Test code here
  assert(true === true, 'True should equal true');
} catch (e) {
  assert(false, `Test failed: ${e.message}`);
}
```

3. Add your test to the `runner.html` file:
   - Add a script tag to load your component
   - Add a button to run your test
   - Add an event listener for your button

## Test Tips

- Keep tests simple and focused on one component
- Test both success and failure scenarios
- Clean up after tests (remove test data)
- Avoid tests that could affect production data

## Future Improvements

- Add automated CLI test runner
- Add code coverage reporting
- Add integration tests between components
- Create a more advanced test framework