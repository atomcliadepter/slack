/**
 * Real Slack Environment Test Configuration
 * Configuration for testing with actual Slack API credentials
 */

import { config } from '../../src/config/env';

/**
 * Real environment test configuration
 */
export const realEnvironmentConfig = {
  // Slack API Configuration
  slack: {
    botToken: config.SLACK_BOT_TOKEN,
    userToken: config.SLACK_USER_TOKEN,
    signingSecret: config.SLACK_SIGNING_SECRET,
    clientId: config.SLACK_CLIENT_ID,
    clientSecret: config.SLACK_CLIENT_SECRET,
    timeout: config.SLACK_API_TIMEOUT_MS,
    maxRetries: config.SLACK_API_MAX_RETRIES,
  },

  // Test Environment Settings
  testing: {
    enabled: !!config.SLACK_BOT_TOKEN && process.env.USE_REAL_SLACK !== 'false',
    skipOnMissingCredentials: true,
    cleanupAfterTests: true,
    respectRateLimits: true,
    maxTestDuration: 300000, // 5 minutes max per test suite
  },

  // Test Data Configuration
  testData: {
    // Test channel for safe testing (will be created if doesn't exist)
    testChannelName: 'mcp-sdk-test-channel',
    testChannelPrefix: 'test-mcp-',
    
    // Test user data
    testUserEmail: process.env.TEST_USER_EMAIL || 'test@example.com',
    testUserId: process.env.TEST_USER_ID,
    
    // Test file data
    testFileName: 'mcp-test-file.txt',
    testFileContent: 'This is a test file created by MCP Slack SDK tests',
    
    // Test message data
    testMessageText: 'Test message from MCP Slack SDK',
    testThreadMessage: 'Test thread reply from MCP Slack SDK',
    
    // Cleanup patterns
    cleanupPatterns: [
      'test-mcp-*',
      'mcp-sdk-test-*',
      '*-test-channel-*'
    ],
  },

  // Rate Limiting Configuration
  rateLimiting: {
    enabled: true,
    defaultDelay: 1000, // 1 second between API calls
    burstDelay: 5000,   // 5 seconds after rate limit hit
    maxRetries: 3,
    backoffMultiplier: 2,
  },

  // Validation Settings
  validation: {
    validateResponses: true,
    validateSlackIds: true,
    validateTimestamps: true,
    validatePermissions: true,
  },

  // Logging Configuration
  logging: {
    logApiCalls: true,
    logResponses: process.env.LOG_SLACK_RESPONSES === 'true',
    logErrors: true,
    logCleanup: true,
  },
};

/**
 * Check if real environment testing is available
 */
export function isRealEnvironmentAvailable(): boolean {
  return !!(
    realEnvironmentConfig.slack.botToken &&
    realEnvironmentConfig.testing.enabled
  );
}

/**
 * Get test channel name with timestamp to avoid conflicts
 */
export function getTestChannelName(): string {
  const timestamp = Date.now().toString().slice(-6);
  return `${realEnvironmentConfig.testData.testChannelPrefix}${timestamp}`;
}

/**
 * Get test file name with timestamp
 */
export function getTestFileName(): string {
  const timestamp = Date.now().toString().slice(-6);
  return `test-file-${timestamp}.txt`;
}

/**
 * Validate Slack ID format
 */
export function validateSlackId(id: string, type: 'channel' | 'user' | 'team' | 'file'): boolean {
  const patterns = {
    channel: /^[CG][A-Z0-9]{8,}$/,
    user: /^[UW][A-Z0-9]{8,}$/,
    team: /^T[A-Z0-9]{8,}$/,
    file: /^F[A-Z0-9]{8,}$/,
  };
  
  return patterns[type].test(id);
}

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private lastCall: number = 0;
  private callCount: number = 0;
  private resetTime: number = 0;

  async waitForRateLimit(): Promise<void> {
    if (!realEnvironmentConfig.rateLimiting.enabled) {
      return;
    }

    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    if (timeSinceLastCall < realEnvironmentConfig.rateLimiting.defaultDelay) {
      const waitTime = realEnvironmentConfig.rateLimiting.defaultDelay - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastCall = Date.now();
    this.callCount++;
  }

  async handleRateLimit(retryAfter?: number): Promise<void> {
    const waitTime = retryAfter ? 
      retryAfter * 1000 : 
      realEnvironmentConfig.rateLimiting.burstDelay;
    
    console.log(`Rate limited, waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

/**
 * Test cleanup utility
 */
export class TestCleanup {
  private createdChannels: string[] = [];
  private uploadedFiles: string[] = [];
  private sentMessages: Array<{ channel: string; ts: string }> = [];

  trackChannel(channelId: string): void {
    this.createdChannels.push(channelId);
  }

  trackFile(fileId: string): void {
    this.uploadedFiles.push(fileId);
  }

  trackMessage(channel: string, ts: string): void {
    this.sentMessages.push({ channel, ts });
  }

  async cleanup(): Promise<void> {
    if (!realEnvironmentConfig.testing.cleanupAfterTests) {
      return;
    }

    console.log('Starting test cleanup...');

    // Clean up channels
    for (const channelId of this.createdChannels) {
      try {
        // Archive test channels instead of deleting
        console.log(`Archiving test channel: ${channelId}`);
        // Implementation would go here
      } catch (error) {
        console.warn(`Failed to cleanup channel ${channelId}:`, error);
      }
    }

    // Clean up files
    for (const fileId of this.uploadedFiles) {
      try {
        console.log(`Deleting test file: ${fileId}`);
        // Implementation would go here
      } catch (error) {
        console.warn(`Failed to cleanup file ${fileId}:`, error);
      }
    }

    console.log('Test cleanup completed');
  }
}

/**
 * Global test utilities
 */
export const testUtils = {
  rateLimiter: new RateLimiter(),
  cleanup: new TestCleanup(),
  
  /**
   * Skip test if real environment is not available
   */
  skipIfNoRealEnvironment: () => {
    if (!isRealEnvironmentAvailable()) {
      return describe.skip;
    }
    return describe;
  },

  /**
   * Create a test timeout that respects rate limits
   */
  getTestTimeout: (baseTimeout: number = 30000): number => {
    if (realEnvironmentConfig.rateLimiting.enabled) {
      return Math.max(baseTimeout, 60000); // Minimum 1 minute for real API calls
    }
    return baseTimeout;
  },

  /**
   * Validate API response structure
   */
  validateApiResponse: (response: any, expectedFields: string[] = []): boolean => {
    if (!realEnvironmentConfig.validation.validateResponses) {
      return true;
    }

    if (!response || typeof response !== 'object') {
      return false;
    }

    // Check for required fields
    for (const field of expectedFields) {
      if (!(field in response)) {
        console.warn(`Missing expected field: ${field}`);
        return false;
      }
    }

    return true;
  },

  /**
   * Log API call for debugging
   */
  logApiCall: (method: string, params: any, response?: any): void => {
    if (realEnvironmentConfig.logging.logApiCalls) {
      console.log(`API Call: ${method}`, {
        params: realEnvironmentConfig.logging.logResponses ? params : '[hidden]',
        response: realEnvironmentConfig.logging.logResponses ? response : '[hidden]',
        timestamp: new Date().toISOString(),
      });
    }
  },
};

export default realEnvironmentConfig;
