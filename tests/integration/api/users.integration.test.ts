
import { slackSetStatusTool } from '../../../../src/tools/slackSetStatus';
import { skipIntegration, mockValidArgs, mockInvalidArgs, delay } from './testUtils';

const describeOrSkip = skipIntegration ? describe.skip : describe;

describeOrSkip('Slack Set Status Integration Tests', () => {

  afterAll(async () => {
    // Clear status after tests
    if (!skipIntegration) {
      await delay(1000);
      await slackSetStatusTool.execute({
        text: '',
        emoji: ''
      });
    }
  });

  describe('Validation Tests', () => {
    test('should reject empty arguments', async () => {
      const result = await slackSetStatusTool.execute({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    test('should reject empty text', async () => {
      const result = await slackSetStatusTool.execute(mockInvalidArgs.setStatus[1]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Status text is required');
    });
  });

  describe('Integration Tests', () => {
    test('should set status successfully', async () => {

      const result = await slackSetStatusTool.execute(mockValidArgs.setStatus);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.status).toBeDefined();
      expect(result.data.status.text).toBe(mockValidArgs.setStatus.text);
      expect(result.data.status.emoji).toBe(mockValidArgs.setStatus.emoji);
    });

    test('should set status with expiration', async () => {

      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const result = await slackSetStatusTool.execute({
        text: 'Status with expiration',
        emoji: ':clock1:',
        expiration: futureTime
      });
      
      expect(result.success).toBe(true);
      expect(result.data.status.expiration).toBe(futureTime);
    });

    test('should clear status', async () => {

      // First set a status
      await slackSetStatusTool.execute(mockValidArgs.setStatus);
      await delay(1000);

      // Then clear it
      const result = await slackSetStatusTool.execute({
        text: '',
        emoji: ''
      });
      
      expect(result.success).toBe(true);
      expect(result.data.status.text).toBe('');
      expect(result.data.status.emoji).toBe('');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long status text', async () => {

      const longText = 'A'.repeat(100); // Test long status
      const result = await slackSetStatusTool.execute({
        text: longText,
        emoji: ':test_tube:'
      });
      
      expect(result.success).toBe(true);
      expect(result.data.status.text).toBe(longText);
    });

    test('should handle custom emoji', async () => {

      const result = await slackSetStatusTool.execute({
        text: 'Testing custom emoji',
        emoji: ':custom_emoji:'
      });
      
      // This might fail if custom emoji doesn't exist, but should handle gracefully
      expect(result.success).toBe(true);
    });

    test('should handle past expiration time', async () => {

      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const result = await slackSetStatusTool.execute({
        text: 'Status with past expiration',
        emoji: ':warning:',
        expiration: pastTime
      });
      
      // Slack should handle this gracefully
      expect(result.success).toBe(true);
    });
  });
});
