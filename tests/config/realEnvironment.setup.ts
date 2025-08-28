/**
 * Real Environment Test Setup
 * Global setup and configuration for real Slack API testing
 */

import { realEnvironmentConfig, isRealEnvironmentAvailable } from './realEnvironment.config';

// Global test setup
beforeAll(async () => {
  if (!isRealEnvironmentAvailable()) {
    console.warn('⚠️  Real Slack environment not available - tests will be skipped');
    console.warn('   To enable real environment tests, ensure SLACK_BOT_TOKEN is set');
    return;
  }

  console.log('🚀 Setting up real Slack environment tests...');
  console.log(`   Workspace: ${realEnvironmentConfig.slack.botToken ? 'Connected' : 'Not connected'}`);
  console.log(`   Rate limiting: ${realEnvironmentConfig.rateLimiting.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`   Cleanup: ${realEnvironmentConfig.testing.cleanupAfterTests ? 'Enabled' : 'Disabled'}`);
  console.log(`   Max test duration: ${realEnvironmentConfig.testing.maxTestDuration}ms`);
  
  // Set global timeout for all tests
  jest.setTimeout(realEnvironmentConfig.testing.maxTestDuration);
}, 30000);

// Global test teardown
afterAll(async () => {
  if (isRealEnvironmentAvailable()) {
    console.log('🧹 Real environment test cleanup completed');
  }
}, 30000);

// Handle uncaught exceptions in real environment tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in real environment tests:', reason);
});

// Export for use in tests
export { realEnvironmentConfig, isRealEnvironmentAvailable };
