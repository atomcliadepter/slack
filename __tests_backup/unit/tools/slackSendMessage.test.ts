
import { jest } from '@jest/globals';
import { TestHelpers } from '../../utils/testHelpers';
import { testChannels, testUsers, testMessages } from '../../fixtures/testData';
import { mockSlackWebClient } from '../../mocks/slackApiMocks';

// Mock the Slack client
jest.mock('../../../src/utils/slackClient', () => ({
  getSlackClient: jest.fn(() => mockSlackWebClient)
}));

describe('slackSendMessage', () => {
  let slackSendMessage: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../../../src/tools/slackSendMessage');
    slackSendMessage = module.default;
  });

  describe('Input Validation', () => {
    it('should validate required channel parameter', async () => {
      const args = TestHelpers.createMockToolArgs({
        text: 'Hello world'
      });
      delete args.arguments.channel;

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Channel is required');
    });

    it('should validate required text parameter', async () => {
      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890'
      });
      delete args.arguments.text;

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Message text is required');
    });

    it('should validate channel ID format', async () => {
      const args = TestHelpers.createMockToolArgs({
        channel: 'invalid-channel',
        text: 'Hello world'
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid channel ID format');
    });

    it('should validate message length', async () => {
      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'a'.repeat(40001) // Too long
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Message text must be 40,000 characters or less');
    });

    it('should accept valid channel formats', async () => {
      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: {
            ok: true,
            channel: 'C1234567890',
            ts: '1234567890.123456',
            message: testMessages.simple
          }
        }
      });

      const validChannels = ['C1234567890', 'G1234567890', 'D1234567890', '#general', '@username'];

      for (const channel of validChannels) {
        const args = TestHelpers.createMockToolArgs({
          channel,
          text: 'Hello world'
        });
        const result = await slackSendMessage(args);
        expect(result.isError).toBe(false);
      }
    });
  });

  describe('Basic Message Sending', () => {
    it('should send simple message successfully', async () => {
      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: {
            ok: true,
            channel: 'C1234567890',
            ts: '1234567890.123456',
            message: testMessages.simple
          }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'Hello world!'
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Message sent successfully');
      expect(result.content[0].text).toContain('1234567890.123456');
      expect(mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C1234567890',
        text: 'Hello world!'
      });
    });

    it('should send message with blocks', async () => {
      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Hello *world*!'
          }
        }
      ];

      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: {
            ok: true,
            channel: 'C1234567890',
            ts: '1234567890.123456',
            message: { ...testMessages.simple, blocks }
          }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'Hello world!',
        blocks: JSON.stringify(blocks)
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(false);
      expect(mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C1234567890',
        text: 'Hello world!',
        blocks
      });
    });

    it('should send message with attachments', async () => {
      const attachments = [
        {
          color: 'good',
          text: 'This is an attachment',
          fields: [
            {
              title: 'Field Title',
              value: 'Field Value',
              short: true
            }
          ]
        }
      ];

      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: {
            ok: true,
            channel: 'C1234567890',
            ts: '1234567890.123456',
            message: { ...testMessages.simple, attachments }
          }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'Hello world!',
        attachments: JSON.stringify(attachments)
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(false);
      expect(mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C1234567890',
        text: 'Hello world!',
        attachments
      });
    });
  });

  describe('Advanced Message Features', () => {
    it('should send message as thread reply', async () => {
      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: {
            ok: true,
            channel: 'C1234567890',
            ts: '1234567890.123457',
            message: testMessages.thread
          }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'This is a thread reply',
        thread_ts: '1234567890.123456'
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(false);
      expect(mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C1234567890',
        text: 'This is a thread reply',
        thread_ts: '1234567890.123456'
      });
    });

    it('should send message with custom username and icon', async () => {
      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: {
            ok: true,
            channel: 'C1234567890',
            ts: '1234567890.123456',
            message: testMessages.simple
          }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'Hello world!',
        username: 'Custom Bot',
        icon_emoji: ':robot_face:'
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(false);
      expect(mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C1234567890',
        text: 'Hello world!',
        username: 'Custom Bot',
        icon_emoji: ':robot_face:'
      });
    });

    it('should send message with link names enabled', async () => {
      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: {
            ok: true,
            channel: 'C1234567890',
            ts: '1234567890.123456',
            message: testMessages.simple
          }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'Hello @channel!',
        link_names: true
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(false);
      expect(mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C1234567890',
        text: 'Hello @channel!',
        link_names: true
      });
    });

    it('should send unfurled message', async () => {
      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: {
            ok: true,
            channel: 'C1234567890',
            ts: '1234567890.123456',
            message: testMessages.simple
          }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'Check out https://example.com',
        unfurl_links: true,
        unfurl_media: true
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(false);
      expect(mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C1234567890',
        text: 'Check out https://example.com',
        unfurl_links: true,
        unfurl_media: true
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle channel_not_found error', async () => {
      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: TestHelpers.createMockError('channel_not_found', 'Channel not found')
        }
      });

      const args = TestHelpers.createMockToolArgs({
        channel: 'C9999999999',
        text: 'Hello world!'
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Channel not found');
    });

    it('should handle not_in_channel error', async () => {
      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: TestHelpers.createMockError('not_in_channel', 'Cannot post to channel')
        }
      });

      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'Hello world!'
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Cannot post to channel');
    });

    it('should handle msg_too_long error', async () => {
      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: TestHelpers.createMockError('msg_too_long', 'Message text is too long')
        }
      });

      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'Very long message...'
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Message text is too long');
    });

    it('should handle rate limiting', async () => {
      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: TestHelpers.createMockError('rate_limited', 'Rate limit exceeded')
        }
      });

      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'Hello world!'
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Rate limit exceeded');
    });

    it('should handle invalid JSON in blocks', async () => {
      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'Hello world!',
        blocks: 'invalid json'
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid JSON format for blocks');
    });

    it('should handle invalid JSON in attachments', async () => {
      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'Hello world!',
        attachments: 'invalid json'
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid JSON format for attachments');
    });
  });

  describe('Message Formatting', () => {
    it('should handle markdown formatting', async () => {
      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: {
            ok: true,
            channel: 'C1234567890',
            ts: '1234567890.123456',
            message: testMessages.simple
          }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: '*Bold* _italic_ `code` ```code block```',
        mrkdwn: true
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(false);
      expect(mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C1234567890',
        text: '*Bold* _italic_ `code` ```code block```',
        mrkdwn: true
      });
    });

    it('should handle mentions and channel references', async () => {
      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: {
            ok: true,
            channel: 'C1234567890',
            ts: '1234567890.123456',
            message: testMessages.simple
          }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'Hello <@U1234567890> and <#C1234567890>!',
        parse: 'full'
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(false);
      expect(mockSlackWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: 'C1234567890',
        text: 'Hello <@U1234567890> and <#C1234567890>!',
        parse: 'full'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message text', async () => {
      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: ''
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Message text cannot be empty');
    });

    it('should handle whitespace-only message text', async () => {
      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: '   \n\t   '
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Message text cannot be empty');
    });

    it('should handle null response from Slack API', async () => {
      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: null
        }
      });

      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'Hello world!'
      });

      const result = await slackSendMessage(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected response from Slack API');
    });
  });

  describe('Performance', () => {
    it('should handle concurrent message sending', async () => {
      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: {
            ok: true,
            channel: 'C1234567890',
            ts: '1234567890.123456',
            message: testMessages.simple
          }
        }
      });

      const promises = Array.from({ length: 5 }, (_, i) => {
        const args = TestHelpers.createMockToolArgs({
          channel: 'C1234567890',
          text: `Message ${i}`
        });
        return slackSendMessage(args);
      });

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.isError).toBe(false);
      });

      expect(mockSlackWebClient.chat.postMessage).toHaveBeenCalledTimes(5);
    });

    it('should handle large message with blocks efficiently', async () => {
      const largeBlocks = Array.from({ length: 50 }, (_, i) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Section ${i}: ${'a'.repeat(100)}`
        }
      }));

      TestHelpers.setupMockSlackClient({
        chat: {
          postMessage: {
            ok: true,
            channel: 'C1234567890',
            ts: '1234567890.123456',
            message: testMessages.simple
          }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        channel: 'C1234567890',
        text: 'Large message with many blocks',
        blocks: JSON.stringify(largeBlocks)
      });

      const startTime = Date.now();
      const result = await slackSendMessage(args);
      const duration = Date.now() - startTime;

      expect(result.isError).toBe(false);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
