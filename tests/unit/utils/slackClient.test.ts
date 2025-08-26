
/**
 * Tests for Slack Client Utility
 */
import { slackClient } from '../../../../src/utils/slackClient';

describe('Slack Client', () => {
  const skipIntegration = process.env.SKIP_INTEGRATION_TESTS === 'true';

  describe('Connection Tests', () => {
    const testFn = skipIntegration ? test.skip : test;

    testFn('should test connection successfully', async () => {
      const result = await slackClient.testConnection();
      expect(result).toBe(true);
    }, 10000);

    testFn('should get workspace info', async () => {
      const result = await slackClient.getWorkspaceInfo();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.workspace).toHaveProperty('id');
        expect(result.workspace).toHaveProperty('name');
        expect(result.workspace).toHaveProperty('bot');
      }
    }, 10000);
  });

  describe('Channel Resolution', () => {
    const testFn = skipIntegration ? test.skip : test;

    testFn('should resolve channel by name', async () => {
      const channelId = await slackClient.resolveChannelId('general');
      expect(channelId).toMatch(/^C[A-Z0-9]+$/);
    }, 10000);

    testFn('should return channel ID as-is if already an ID', async () => {
      const testId = 'C1234567890';
      const result = await slackClient.resolveChannelId(testId);
      expect(result).toBe(testId);
    });
  });

  describe('User Resolution', () => {
    const testFn = skipIntegration ? test.skip : test;

    testFn('should return user ID as-is if already an ID', async () => {
      const testId = 'U1234567890';
      const result = await slackClient.resolveUserId(testId);
      expect(result).toBe(testId);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid channel gracefully', async () => {
      try {
        await slackClient.resolveChannelId('nonexistent-channel-12345');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
