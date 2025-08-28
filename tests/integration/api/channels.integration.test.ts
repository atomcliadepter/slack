
import { slackGetChannelHistoryTool } from '../../../src/tools/slackGetChannelHistory';
import { skipIntegration, mockValidArgs, mockInvalidArgs } from './testUtils';

const describeOrSkip = skipIntegration ? describe.skip : describe;

describeOrSkip('Slack Get Channel History Integration Tests', () => {

  describe('Validation Tests', () => {
    test('should reject empty arguments', async () => {
      const result = await slackGetChannelHistoryTool.execute({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    test('should reject empty channel', async () => {
      const result = await slackGetChannelHistoryTool.execute(mockInvalidArgs.getChannelHistory[1]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Channel is required');
    });

    test('should reject negative limit', async () => {
      const result = await slackGetChannelHistoryTool.execute(mockInvalidArgs.getChannelHistory[2]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Limit must be positive');
    });
  });

  describe('Integration Tests', () => {
    test('should get channel history successfully', async () => {

      const result = await slackGetChannelHistoryTool.execute(mockValidArgs.getChannelHistory);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.messages).toBeDefined();
      expect(Array.isArray(result.data.messages)).toBe(true);
      expect(result.data.channel).toBe(mockValidArgs.getChannelHistory.channel);
    });

    test('should respect limit parameter', async () => {

      const limit = 3;
      const result = await slackGetChannelHistoryTool.execute({
        channel: mockValidArgs.getChannelHistory.channel,
        limit
      });
      
      expect(result.success).toBe(true);
      expect(result.data.messages.length).toBeLessThanOrEqual(limit);
    });

    test('should handle non-existent channel gracefully', async () => {

      const result = await slackGetChannelHistoryTool.execute({
        channel: 'nonexistent-channel-12345',
        limit: 10
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('channel_not_found');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very large limit', async () => {

      const result = await slackGetChannelHistoryTool.execute({
        channel: mockValidArgs.getChannelHistory.channel,
        limit: 1000 // Slack API will cap this
      });
      
      expect(result.success).toBe(true);
      expect(result.data.messages.length).toBeLessThanOrEqual(1000);
    });

    test('should handle channel with no messages', async () => {

      // This test might not be reliable as most channels have messages
      // But we test the structure is correct
      const result = await slackGetChannelHistoryTool.execute({
        channel: mockValidArgs.getChannelHistory.channel,
        limit: 1
      });
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data.messages)).toBe(true);
    });
  });
});
