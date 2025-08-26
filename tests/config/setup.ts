
/**
 * Global test setup - runs once before all tests
 */
import dotenv from 'dotenv';

export default async function globalSetup() {
  // Load environment variables
  dotenv.config();
  
  // Skip integration tests in CI environment
  if (process.env.CI === 'true') {
    console.log('🚀 Running in CI environment - integration tests will be skipped');
    process.env.SKIP_INTEGRATION_TESTS = 'true';
  }
  
  // Validate required environment variables for integration tests
  if (process.env.SKIP_INTEGRATION_TESTS !== 'true') {
    const requiredEnvVars = [
      'SLACK_BOT_TOKEN',
      'SLACK_SIGNING_SECRET',
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
      console.warn('Integration tests will be skipped. Set SKIP_INTEGRATION_TESTS=true to suppress this warning.');
      process.env.SKIP_INTEGRATION_TESTS = 'true';
    } else {
      console.log('✅ Environment variables validated - integration tests enabled');
    }
  }
  
  console.log('🧪 Global test setup completed');
}
