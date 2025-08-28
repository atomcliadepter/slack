/**
 * Enhanced Slack API mocks for comprehensive testing
 */

import { TestDataFactory } from '../factories/testDataFactory';

export class SlackAPIMocks {
  private static responses: Map<string, any> = new Map();

  /**
   * Set mock response for a specific API method
   */
  static setResponse(method: string, response: any) {
    this.responses.set(method, response);
  }

  /**
   * Get mock response for API method
   */
  static getResponse(method: string): any {
    return this.responses.get(method);
  }

  /**
   * Clear all mock responses
   */
  static clear() {
    this.responses.clear();
  }

  /**
   * Setup default successful responses
   */
  static setupSuccessfulResponses() {
    // Auth test
    this.setResponse('auth.test', {
      ok: true,
      user: 'testbot',
      team: 'Test Team',
      user_id: 'U1234567890',
      team_id: 'T1234567890',
      url: 'https://test.slack.com/',
    });

    // Users list
    this.setResponse('users.list', TestDataFactory.createUserList(10));

    // Channels list
    this.setResponse('conversations.list', TestDataFactory.createChannelList(5));

    // User info
    this.setResponse('users.info', {
      ok: true,
      user: TestDataFactory.createUser(),
    });

    // Channel info
    this.setResponse('conversations.info', {
      ok: true,
      channel: TestDataFactory.createChannel(),
    });

    // Send message
    this.setResponse('chat.postMessage', {
      ok: true,
      channel: 'C1234567890',
      ts: TestDataFactory.generateTimestamp(),
      message: TestDataFactory.createMessage(),
    });

    // Conversation history
    this.setResponse('conversations.history', TestDataFactory.createConversationHistory(10));
  }

  /**
   * Setup error responses for testing error handling
   */
  static setupErrorResponses() {
    this.setResponse('auth.test', {
      ok: false,
      error: 'invalid_auth',
    });

    this.setResponse('users.info', {
      ok: false,
      error: 'user_not_found',
    });

    this.setResponse('conversations.info', {
      ok: false,
      error: 'channel_not_found',
    });

    this.setResponse('chat.postMessage', {
      ok: false,
      error: 'channel_not_found',
    });
  }

  /**
   * Setup rate limit responses
   */
  static setupRateLimitResponses() {
    this.setResponse('chat.postMessage', {
      ok: false,
      error: 'rate_limited',
      response_metadata: {
        retry_after: 30,
      },
    });
  }

  /**
   * Create mock WebClient
   */
  static createMockWebClient() {
    const mockClient = {
      auth: {
        test: jest.fn().mockResolvedValue(this.getResponse('auth.test')),
      },
      users: {
        list: jest.fn().mockResolvedValue(this.getResponse('users.list')),
        info: jest.fn().mockResolvedValue(this.getResponse('users.info')),
        getPresence: jest.fn().mockResolvedValue({
          ok: true,
          presence: 'active',
        }),
        lookupByEmail: jest.fn().mockResolvedValue({
          ok: true,
          user: TestDataFactory.createUser(),
        }),
      },
      conversations: {
        list: jest.fn().mockResolvedValue(this.getResponse('conversations.list')),
        info: jest.fn().mockResolvedValue(this.getResponse('conversations.info')),
        history: jest.fn().mockResolvedValue(this.getResponse('conversations.history')),
        members: jest.fn().mockResolvedValue({
          ok: true,
          members: ['U1234567890', 'U1234567891', 'U1234567892'],
        }),
        create: jest.fn().mockResolvedValue({
          ok: true,
          channel: TestDataFactory.createChannel(),
        }),
        join: jest.fn().mockResolvedValue({
          ok: true,
          channel: TestDataFactory.createChannel(),
        }),
        leave: jest.fn().mockResolvedValue({
          ok: true,
        }),
        archive: jest.fn().mockResolvedValue({
          ok: true,
        }),
        open: jest.fn().mockResolvedValue({
          ok: true,
          channel: TestDataFactory.createChannel({ is_im: true }),
        }),
        mark: jest.fn().mockResolvedValue({
          ok: true,
        }),
        replies: jest.fn().mockResolvedValue({
          ok: true,
          messages: [TestDataFactory.createMessage()],
        }),
      },
      chat: {
        postMessage: jest.fn().mockResolvedValue(this.getResponse('chat.postMessage')),
        update: jest.fn().mockResolvedValue({
          ok: true,
          channel: 'C1234567890',
          ts: TestDataFactory.generateTimestamp(),
        }),
        delete: jest.fn().mockResolvedValue({
          ok: true,
          channel: 'C1234567890',
          ts: TestDataFactory.generateTimestamp(),
        }),
      },
      reactions: {
        add: jest.fn().mockResolvedValue({ ok: true }),
        remove: jest.fn().mockResolvedValue({ ok: true }),
        get: jest.fn().mockResolvedValue({
          ok: true,
          message: {
            reactions: [
              {
                name: 'thumbsup',
                count: 1,
                users: ['U1234567890'],
              },
            ],
          },
        }),
      },
      pins: {
        add: jest.fn().mockResolvedValue({ ok: true }),
        remove: jest.fn().mockResolvedValue({ ok: true }),
        list: jest.fn().mockResolvedValue({
          ok: true,
          items: [
            {
              type: 'message',
              message: TestDataFactory.createMessage(),
            },
          ],
        }),
      },
      files: {
        upload: jest.fn().mockResolvedValue({
          ok: true,
          file: {
            id: 'F1234567890',
            name: 'test.txt',
            title: 'Test File',
          },
        }),
      },
      search: {
        messages: jest.fn().mockResolvedValue({
          ok: true,
          messages: {
            matches: [TestDataFactory.createMessage()],
            total: 1,
          },
        }),
      },
      team: {
        info: jest.fn().mockResolvedValue({
          ok: true,
          team: {
            id: 'T1234567890',
            name: 'Test Team',
            domain: 'test',
          },
        }),
      },
      views: {
        publish: jest.fn().mockResolvedValue({
          ok: true,
          view: {
            id: 'V1234567890',
            type: 'home',
          },
        }),
      },
    };

    return mockClient;
  }
}
