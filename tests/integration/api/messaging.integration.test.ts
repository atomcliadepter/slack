
import { slackSendMessageTool } from '../../../src/tools/slackSendMessage';
import { skipIntegration, mockValidArgs, mockInvalidArgs, delay } from './testUtils';

const describeOrSkip = skipIntegration ? describe.skip : describe;

describeOrSkip('Slack Send Message Integration Tests', () => {

  describe('Validation Tests', () => {
    test('should reject empty arguments', async () => {
      const result = await slackSendMessageTool.execute({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    test('should reject empty channel', async () => {
      const result = await slackSendMessageTool.execute(mockInvalidArgs.sendMessage[1]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Channel is required');
    });

    test('should reject empty text', async () => {
      const result = await slackSendMessageTool.execute(mockInvalidArgs.sendMessage[2]);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Message text is required');
    });
  });

  describe('Integration Tests', () => {
    test('should send message successfully', async () => {

      const result = await slackSendMessageTool.execute(mockValidArgs.sendMessage);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.messageId).toBeDefined();
      expect(result.data.channel).toBe(mockValidArgs.sendMessage.channel);
      expect(result.data.text).toBe(mockValidArgs.sendMessage.text);
    });

    test('should send message with thread reply', async () => {

      // First send a message to get a thread timestamp
      const parentResult = await slackSendMessageTool.execute(mockValidArgs.sendMessage);
      expect(parentResult.success).toBe(true);

      await delay(1000); // Wait a bit before sending thread reply

      // Send a thread reply
      const threadResult = await slackSendMessageTool.execute({
        ...mockValidArgs.sendMessage,
        text: 'This is a thread reply',
        threadTs: parentResult.data.messageId
      });

      expect(threadResult.success).toBe(true);
      expect(threadResult.data.threadTs).toBe(parentResult.data.messageId);
    });

    test('should handle non-existent channel gracefully', async () => {

      const result = await slackSendMessageTool.execute({
        channel: 'nonexistent-channel-12345',
        text: 'This should fail'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('channel_not_found');
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long messages', async () => {

      const longMessage = 'A'.repeat(4000); // Slack limit is ~4000 chars
      const result = await slackSendMessageTool.execute({
        channel: mockValidArgs.sendMessage.channel,
        text: longMessage
      });

      expect(result.success).toBe(true);
      expect(result.data.text).toBe(longMessage);
    });

    test('should handle messages with special characters', async () => {

      const specialMessage = 'Test with emojis 🚀 and special chars: @#$%^&*()';
      const result = await slackSendMessageTool.execute({
        channel: mockValidArgs.sendMessage.channel,
        text: specialMessage
      });

      expect(result.success).toBe(true);
      expect(result.data.text).toBe(specialMessage);
    });
  });
});
