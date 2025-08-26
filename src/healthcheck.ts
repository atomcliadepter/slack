
/**
 * Health check endpoint for Docker container
 */
import { slackClient } from './utils/slackClient';
import { logger } from './utils/logger';

async function healthCheck(): Promise<void> {
  try {
    // Test Slack connection
    const isConnected = await slackClient.testConnection();
    
    if (!isConnected) {
      logger.error('Health check failed: Slack connection test failed');
      process.exit(1);
    }
    
    logger.info('Health check passed: All systems operational');
    process.exit(0);
  } catch (error) {
    logger.error('Health check failed:', error);
    process.exit(1);
  }
}

// Run health check if this file is executed directly
if (require.main === module) {
  healthCheck();
}

export { healthCheck };
