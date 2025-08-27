/**
 * Comprehensive tests for slackSendMessage tool
 */

import { slackSendMessageTool } from '../../../../src/tools/slackSendMessage';
import { slackClient } from '../../../../src/utils/slackClient';
import { logger } from '../../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../../src/utils/slackClient');
jest.mock('../../../../src/utils/logger');

const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('slackSendMessage Tool - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockSlackClient.resolveChannelId.mockResolvedValue('C1234567890');
    mockSlackClient.getClient.mockReturnValue({
      chat: {
        postMessage: jest.fn().mockResolvedValue({
          ok: true,
          ts: '1234567890.123456',
          channel: 'C1234567890',
          message: {
            text: 'Test message',
            user: 'U1234567890',
            ts: '1234567890.123456',
          },
        }),
      },
    } as any);
  });

  describe('Basic Functionality', () => {
    it('should send a simple message successfully', async () => {
      const args = {
        channel: 'general',
        text: 'Hello, World!',
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('message_sent');
      expect(result.data.message_sent).toBe(true);
      expect(result.data).toHaveProperty('timestamp');
      expect(result.data).toHaveProperty('channel_id', 'C1234567890');
      expect(result.metadata).toHaveProperty('execution_time_ms');
    });

    it('should handle channel ID resolution', async () => {
      const args = {
        channel: '#general',
        text: 'Test message',
      };

      await slackSendMessageTool.execute(args);

      expect(mockSlackClient.resolveChannelId).toHaveBeenCalledWith('#general');
    });

    it('should handle direct messages to users', async () => {
      mockSlackClient.resolveChannelId.mockResolvedValue('D1234567890');
      
      const args = {
        channel: '@john.doe',
        text: 'Direct message test',
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data.channel_id).toBe('D1234567890');
    });
  });

  describe('Advanced Features', () => {
    it('should send message with Block Kit blocks', async () => {
      const args = {
        channel: 'general',
        text: 'Fallback text',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Hello* from Block Kit!',
            },
          },
        ],
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(true);
      expect(mockSlackClient.getClient().chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          blocks: args.blocks,
        })
      );
    });

    it('should send threaded message', async () => {
      const args = {
        channel: 'general',
        text: 'Thread reply',
        thread_ts: '1234567890.123456',
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(true);
      expect(mockSlackClient.getClient().chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          thread_ts: '1234567890.123456',
        })
      );
    });

    it('should handle message with attachments', async () => {
      const args = {
        channel: 'general',
        text: 'Message with attachment',
        attachments: [
          {
            color: 'good',
            title: 'Test Attachment',
            text: 'This is a test attachment',
          },
        ],
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(true);
      expect(mockSlackClient.getClient().chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: args.attachments,
        })
      );
    });

    it('should handle unfurl settings', async () => {
      const args = {
        channel: 'general',
        text: 'Check out https://example.com',
        unfurl_links: false,
        unfurl_media: false,
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(true);
      expect(mockSlackClient.getClient().chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          unfurl_links: false,
          unfurl_media: false,
        })
      );
    });

    it('should handle reply broadcast', async () => {
      const args = {
        channel: 'general',
        text: 'Broadcasted thread reply',
        thread_ts: '1234567890.123456',
        reply_broadcast: true,
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(true);
      expect(mockSlackClient.getClient().chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          thread_ts: '1234567890.123456',
          reply_broadcast: true,
        })
      );
    });
  });

  describe('Input Validation', () => {
    it('should require channel parameter', async () => {
      const args = {
        text: 'Message without channel',
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(false);
      expect(result.error).toContain('channel');
    });

    it('should require text parameter', async () => {
      const args = {
        channel: 'general',
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(false);
      expect(result.error).toContain('text');
    });

    it('should validate empty text', async () => {
      const args = {
        channel: 'general',
        text: '',
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(false);
      expect(result.error).toContain('text');
    });

    it('should handle invalid channel format', async () => {
      mockSlackClient.resolveChannelId.mockRejectedValue(new Error('Channel not found'));
      
      const args = {
        channel: 'invalid-channel',
        text: 'Test message',
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Channel not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle Slack API errors', async () => {
      mockSlackClient.getClient.mockReturnValue({
        chat: {
          postMessage: jest.fn().mockRejectedValue(new Error('channel_not_found')),
        },
      } as any);

      const args = {
        channel: 'nonexistent',
        text: 'Test message',
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(false);
      expect(result.error).toContain('channel_not_found');
      expect(result.metadata).toHaveProperty('execution_time_ms');
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = new Error('ratelimited');
      (rateLimitError as any).code = 'slack_webapi_rate_limited';
      
      mockSlackClient.getClient.mockReturnValue({
        chat: {
          postMessage: jest.fn().mockRejectedValue(rateLimitError),
        },
      } as any);

      const args = {
        channel: 'general',
        text: 'Test message',
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate');
    });

    it('should handle network errors', async () => {
      mockSlackClient.getClient.mockReturnValue({
        chat: {
          postMessage: jest.fn().mockRejectedValue(new Error('Network error')),
        },
      } as any);

      const args = {
        channel: 'general',
        text: 'Test message',
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('Performance and Analytics', () => {
    it('should track execution time', async () => {
      const args = {
        channel: 'general',
        text: 'Performance test',
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.metadata.execution_time_ms).toBeGreaterThan(0);
      expect(typeof result.metadata.execution_time_ms).toBe('number');
    });

    it('should log tool execution', async () => {
      const args = {
        channel: 'general',
        text: 'Logging test',
      };

      await slackSendMessageTool.execute(args);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Tool executed successfully'),
        expect.any(Object)
      );
    });

    it('should include message analytics', async () => {
      const args = {
        channel: 'general',
        text: 'Analytics test with @mention and #channel',
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('message_analytics');
      expect(result.data.message_analytics).toHaveProperty('character_count');
      expect(result.data.message_analytics).toHaveProperty('word_count');
      expect(result.data.message_analytics).toHaveProperty('has_mentions');
      expect(result.data.message_analytics).toHaveProperty('has_channels');
    });
  });

  describe('Tool Metadata', () => {
    it('should have correct tool name', () => {
      expect(slackSendMessageTool.name).toBe('slack_send_message');
    });

    it('should have comprehensive description', () => {
      expect(slackSendMessageTool.description).toContain('Send');
      expect(slackSendMessageTool.description).toContain('message');
      expect(slackSendMessageTool.description).toContain('blocks');
    });

    it('should have proper input schema', () => {
      expect(slackSendMessageTool.inputSchema).toHaveProperty('type', 'object');
      expect(slackSendMessageTool.inputSchema).toHaveProperty('properties');
      expect(slackSendMessageTool.inputSchema.properties).toHaveProperty('channel');
      expect(slackSendMessageTool.inputSchema.properties).toHaveProperty('text');
      expect(slackSendMessageTool.inputSchema).toHaveProperty('required');
      expect(slackSendMessageTool.inputSchema.required).toContain('channel');
      expect(slackSendMessageTool.inputSchema.required).toContain('text');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complex message with all features', async () => {
      const args = {
        channel: 'general',
        text: 'Complex message with all features',
        thread_ts: '1234567890.123456',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Complex* message',
            },
          },
        ],
        attachments: [
          {
            color: 'warning',
            title: 'Warning',
            text: 'This is a warning',
          },
        ],
        unfurl_links: true,
        unfurl_media: true,
        reply_broadcast: false,
        link_names: true,
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(true);
      expect(mockSlackClient.getClient().chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'C1234567890',
          text: args.text,
          thread_ts: args.thread_ts,
          blocks: args.blocks,
          attachments: args.attachments,
          unfurl_links: args.unfurl_links,
          unfurl_media: args.unfurl_media,
          reply_broadcast: args.reply_broadcast,
          link_names: args.link_names,
        })
      );
    });

    it('should handle message to multiple channel types', async () => {
      const testCases = [
        { channel: 'general', expected: 'C1234567890' },
        { channel: '#general', expected: 'C1234567890' },
        { channel: 'C1234567890', expected: 'C1234567890' },
        { channel: '@john.doe', expected: 'D1234567890' },
        { channel: 'U1234567890', expected: 'D1234567890' },
      ];

      for (const testCase of testCases) {
        mockSlackClient.resolveChannelId.mockResolvedValue(testCase.expected);
        
        const args = {
          channel: testCase.channel,
          text: `Test message to ${testCase.channel}`,
        };

        const result = await slackSendMessageTool.execute(args);

        expect(result.success).toBe(true);
        expect(result.data.channel_id).toBe(testCase.expected);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', async () => {
      const longText = 'A'.repeat(4000); // Slack has a 4000 character limit
      
      const args = {
        channel: 'general',
        text: longText,
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data.message_analytics.character_count).toBe(4000);
    });

    it('should handle messages with special characters', async () => {
      const args = {
        channel: 'general',
        text: 'Special chars: 🚀 @here #general <@U123> <#C123> `code` *bold* _italic_',
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data.message_analytics.has_mentions).toBe(true);
      expect(result.data.message_analytics.has_channels).toBe(true);
      expect(result.data.message_analytics.has_formatting).toBe(true);
    });

    it('should handle empty blocks array', async () => {
      const args = {
        channel: 'general',
        text: 'Message with empty blocks',
        blocks: [],
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(true);
    });

    it('should handle null/undefined optional parameters', async () => {
      const args = {
        channel: 'general',
        text: 'Test message',
        thread_ts: undefined,
        blocks: null,
        attachments: undefined,
      };

      const result = await slackSendMessageTool.execute(args);

      expect(result.success).toBe(true);
    });
  });
});
