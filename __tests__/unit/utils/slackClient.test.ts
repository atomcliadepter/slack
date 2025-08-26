
import { jest } from '@jest/globals';
import { TestHelpers } from '../../utils/testHelpers';

// Mock the WebClient
const mockWebClient = {
  auth: {
    test: jest.fn()
  }
};

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn(() => mockWebClient)
}));

describe('slackClient', () => {
  let slackClient: any;
  let WebClient: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../../../src/utils/slackClient');
    slackClient = module;
    const webApiModule = await import('@slack/web-api');
    WebClient = webApiModule.WebClient;
  });

  describe('getSlackClient', () => {
    it('should create bot client with bot token', async () => {
      process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
      
      const client = slackClient.getSlackClient('bot');
      
      expect(WebClient).toHaveBeenCalledWith({
        token: 'xoxb-test-token',
        retryConfig: expect.any(Object)
      });
    });

    it('should create user client with user token', async () => {
      process.env.SLACK_USER_TOKEN = 'xoxp-test-token';
      
      const client = slackClient.getSlackClient('user');
      
      expect(WebClient).toHaveBeenCalledWith({
        token: 'xoxp-test-token',
        retryConfig: expect.any(Object)
      });
    });

    it('should default to bot client when no type specified', async () => {
      process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
      
      const client = slackClient.getSlackClient();
      
      expect(WebClient).toHaveBeenCalledWith({
        token: 'xoxb-test-token',
        retryConfig: expect.any(Object)
      });
    });

    it('should throw error when bot token is missing', async () => {
      delete process.env.SLACK_BOT_TOKEN;
      
      expect(() => slackClient.getSlackClient('bot')).toThrow('SLACK_BOT_TOKEN environment variable is required');
    });

    it('should throw error when user token is missing', async () => {
      delete process.env.SLACK_USER_TOKEN;
      
      expect(() => slackClient.getSlackClient('user')).toThrow('SLACK_USER_TOKEN environment variable is required');
    });

    it('should configure retry settings correctly', async () => {
      process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
      
      slackClient.getSlackClient('bot');
      
      const retryConfig = (WebClient as jest.Mock).mock.calls[0][0].retryConfig;
      expect(retryConfig).toEqual({
        retries: 3,
        factor: 2,
        randomize: true
      });
    });
  });

  describe('validateConnection', () => {
    it('should validate successful connection', async () => {
      mockWebClient.auth.test.mockResolvedValue({
        ok: true,
        user: 'testuser',
        team: 'testteam'
      });

      const result = await slackClient.validateConnection(mockWebClient);

      expect(result.isValid).toBe(true);
      expect(result.user).toBe('testuser');
      expect(result.team).toBe('testteam');
    });

    it('should handle invalid token', async () => {
      mockWebClient.auth.test.mockResolvedValue({
        ok: false,
        error: 'invalid_auth'
      });

      const result = await slackClient.validateConnection(mockWebClient);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalid_auth');
    });

    it('should handle network errors', async () => {
      mockWebClient.auth.test.mockRejectedValue(new Error('Network error'));

      const result = await slackClient.validateConnection(mockWebClient);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Client Caching', () => {
    it('should cache bot client instances', async () => {
      process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
      
      const client1 = slackClient.getSlackClient('bot');
      const client2 = slackClient.getSlackClient('bot');
      
      expect(client1).toBe(client2);
      expect(WebClient).toHaveBeenCalledTimes(1);
    });

    it('should cache user client instances', async () => {
      process.env.SLACK_USER_TOKEN = 'xoxp-test-token';
      
      const client1 = slackClient.getSlackClient('user');
      const client2 = slackClient.getSlackClient('user');
      
      expect(client1).toBe(client2);
      expect(WebClient).toHaveBeenCalledTimes(1);
    });

    it('should maintain separate caches for bot and user clients', async () => {
      process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
      process.env.SLACK_USER_TOKEN = 'xoxp-test-token';
      
      const botClient = slackClient.getSlackClient('bot');
      const userClient = slackClient.getSlackClient('user');
      
      expect(botClient).not.toBe(userClient);
      expect(WebClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid client type', async () => {
      expect(() => slackClient.getSlackClient('invalid' as any)).toThrow('Invalid client type');
    });

    it('should handle malformed tokens', async () => {
      process.env.SLACK_BOT_TOKEN = 'invalid-token-format';
      
      expect(() => slackClient.getSlackClient('bot')).toThrow('Invalid bot token format');
    });

    it('should validate bot token format', async () => {
      const validBotTokens = ['xoxb-123-456-789', 'xoxb-1234567890-1234567890-abcdefghijklmnopqrstuvwx'];
      const invalidBotTokens = ['xoxp-123-456-789', 'invalid', ''];

      for (const token of validBotTokens) {
        process.env.SLACK_BOT_TOKEN = token;
        expect(() => slackClient.getSlackClient('bot')).not.toThrow();
      }

      for (const token of invalidBotTokens) {
        process.env.SLACK_BOT_TOKEN = token;
        expect(() => slackClient.getSlackClient('bot')).toThrow();
      }
    });

    it('should validate user token format', async () => {
      const validUserTokens = ['xoxp-123-456-789-abc', 'xoxp-1234567890-1234567890-1234567890-abcdefghijklmnopqrstuvwxyz123456'];
      const invalidUserTokens = ['xoxb-123-456-789', 'invalid', ''];

      for (const token of validUserTokens) {
        process.env.SLACK_USER_TOKEN = token;
        expect(() => slackClient.getSlackClient('user')).not.toThrow();
      }

      for (const token of invalidUserTokens) {
        process.env.SLACK_USER_TOKEN = token;
        expect(() => slackClient.getSlackClient('user')).toThrow();
      }
    });
  });
});
