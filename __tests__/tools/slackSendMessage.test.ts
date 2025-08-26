
/**
 * Tests for Slack Send Message Tool
 */
import { slackSendMessageTool } from '../../src/tools/slackSendMessage';

describe('Slack Send Message Tool', () => {
  const skipIntegration = process.env.SKIP_INTEGRATION_TESTS === 'true';

  describe('Tool Definition', () => {
    test('should have correct tool metadata', () => {
      expect(slackSendMessageTool.name).toBe('slack_send_message');
      expect(slackSendMessageTool.description).toContain('enhanced message');
      expect(slackSendMessageTool.inputSchema.type).toBe('object');
      expect(slackSendMessageTool.inputSchema.required).toContain('channel');
      expect(slackSendMessageTool.inputSchema.required).toContain('text');
    });

    test('should have proper input schema structure', () => {
      const schema = slackSendMessageTool.inputSchema;
      expect(schema.properties).toHaveProperty('channel');
      expect(schema.properties).toHaveProperty('text');
      expect(schema.properties).toHaveProperty('thread_ts');
      expect(schema.properties).toHaveProperty('blocks');
      expect(schema.properties).toHaveProperty('attachments');
    });
  });

  describe('Input Validation', () => {
    test('should reject missing required parameters', async () => {
      const result = await slackSendMessageTool.execute({});
      
      expect(result).toBeValidSlackResponse();
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    test('should reject empty channel', async () => {
      const result = await slackSendMessageTool.execute({
        channel: '',
        text: 'Test message',
      });
      
      expect(result).toBeValidSlackResponse();
      expect(result.success).toBe(false);
    });

    test('should reject empty text', async () => {
      const result = await slackSendMessageTool.execute({
        channel: 'test-channel',
        text: '',
      });
      
      expect(result).toBeValidSlackResponse();
      expect(result.success).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    const testChannel = process.env.TEST_SLACK_CHANNEL || 'general';

    beforeEach(() => {
      if (skipIntegration) {
        pending('Integration tests are disabled');
      }
    });

    test('should send a basic message', async () => {
      const result = await slackSendMessageTool.execute({
        channel: testChannel,
        text: `Test message from Enhanced MCP Slack SDK - ${new Date().toISOString()}`,
      });

      expect(result).toBeValidSlackResponse();
      expect(result).toHaveExecutionTime(10000);
      
      if (result.success) {
        expect(result.message).toHaveProperty('ts');
        expect(result.message).toHaveProperty('channel');
        expect(result.message).toHaveProperty('permalink');
        expect(result.metadata).toHaveProperty('channel_id');
      }
    }, 15000);

    test('should send a message with blocks', async () => {
      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Enhanced MCP Slack SDK Test*\nThis is a test message with blocks.',
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: 'Block kit integration working correctly!',
          },
        },
      ];

      const result = await slackSendMessageTool.execute({
        channel: testChannel,
        text: 'Fallback text for blocks',
        blocks,
      });

      expect(result).toBeValidSlackResponse();
      
      if (result.success) {
        expect(result.metadata.has_blocks).toBe(true);
      }
    }, 15000);
  });

  describe('Performance Tests', () => {
    test('should complete validation quickly', async () => {
      const startTime = Date.now();
      
      await slackSendMessageTool.execute({
        channel: 'test',
        text: 'test',
      });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should validate in under 1 second
    });
  });
});
