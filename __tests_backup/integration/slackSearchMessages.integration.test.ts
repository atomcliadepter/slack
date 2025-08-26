
import { slackSearchMessagesTool } from '../../src/tools/slackSearchMessages';
import { skipIntegration, mockValidArgs, mockInvalidArgs } from './testUtils';

const describeOrSkip = skipIntegration ? describe.skip : describe;

describeOrSkip('Slack Search Messages Integration Tests', () => {

  describe('Validation Tests', () => {
    test('should reject empty arguments', async () => {
      const result = await slackSearchMessagesTool.execute({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    test('should reject empty query', async () => {
      const result = await slackSearchMessagesTool.execute(mockInvalidArgs.searchMessages[1]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Search query is required');
    });

    test('should reject negative limit', async () => {
      const result = await slackSearchMessagesTool.execute(mockInvalidArgs.searchMessages[2]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Limit must be positive');
    });
  });

  describe('Integration Tests', () => {
    test('should search messages successfully', async () => {

      const result = await slackSearchMessagesTool.execute(mockValidArgs.searchMessages);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.messages).toBeDefined();
      expect(Array.isArray(result.data.messages)).toBe(true);
      expect(result.data.query).toBe(mockValidArgs.searchMessages.query);
    });

    test('should respect limit parameter', async () => {

      const limit = 2;
      const result = await slackSearchMessagesTool.execute({
        query: 'test',
        limit
      });
      
      expect(result.success).toBe(true);
      expect(result.data.messages.length).toBeLessThanOrEqual(limit);
    });

    test('should handle search with no results', async () => {

      const result = await slackSearchMessagesTool.execute({
        query: 'veryrarequerythatshouldhavenoResults12345',
        limit: 5
      });
      
      expect(result.success).toBe(true);
      expect(result.data.messages).toBeDefined();
      expect(Array.isArray(result.data.messages)).toBe(true);
      // Could be empty array, which is fine
    });
  });

  describe('Edge Cases', () => {
    test('should handle special characters in query', async () => {

      const result = await slackSearchMessagesTool.execute({
        query: '@#$%^&*()',
        limit: 5
      });
      
      expect(result.success).toBe(true);
      expect(result.data.messages).toBeDefined();
    });

    test('should handle very long query', async () => {

      const longQuery = 'test '.repeat(50); // Very long query
      const result = await slackSearchMessagesTool.execute({
        query: longQuery.trim(),
        limit: 5
      });
      
      expect(result.success).toBe(true);
      expect(result.data.messages).toBeDefined();
    });
  });
});
