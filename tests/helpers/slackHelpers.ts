/**
 * Slack-Specific Test Helpers
 * Utilities for testing Slack API interactions
 */

import { WebClient } from '@slack/web-api';
import { TestUtils } from './testUtils';

export class SlackTestHelpers {
  private static client: WebClient | null = null;

  /**
   * Get or create Slack client for testing
   */
  static getTestClient(): WebClient {
    if (!this.client && process.env.SLACK_BOT_TOKEN) {
      this.client = new WebClient(process.env.SLACK_BOT_TOKEN, {
        logLevel: 'error', // Reduce noise in tests
        retryConfig: {
          retries: 1, // Faster failures in tests
        }
      });
    }
    
    if (!this.client) {
      throw new Error('Slack client not available - check SLACK_BOT_TOKEN environment variable');
    }
    
    return this.client;
  }

  /**
   * Test if Slack API is available
   */
  static async isSlackApiAvailable(): Promise<boolean> {
    try {
      const client = this.getTestClient();
      const result = await client.auth.test();
      return result.ok === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get test workspace information
   */
  static async getTestWorkspaceInfo(): Promise<any> {
    const client = this.getTestClient();
    const [authResult, teamResult] = await Promise.all([
      client.auth.test(),
      client.team.info()
    ]);
    
    return {
      auth: authResult,
      team: teamResult.team,
      botUserId: authResult.user_id,
      teamId: authResult.team_id
    };
  }

  /**
   * Find or create a test channel
   */
  static async getOrCreateTestChannel(name?: string): Promise<string> {
    const client = this.getTestClient();
    const channelName = name || TestUtils.generateTestChannelName();
    
    try {
      // Try to find existing channel
      const channels = await client.conversations.list({
        types: 'public_channel,private_channel'
      });
      
      const existingChannel = channels.channels?.find(c => c.name === channelName);
      if (existingChannel) {
        return existingChannel.id!;
      }
      
      // Create new channel
      const result = await client.conversations.create({
        name: channelName,
        is_private: false
      });
      
      if (!result.ok || !result.channel?.id) {
        throw new Error(`Failed to create test channel: ${result.error}`);
      }
      
      return result.channel.id;
    } catch (error) {
      throw new Error(`Failed to get or create test channel: ${(error as Error).message}`);
    }
  }

  /**
   * Clean up test channel
   */
  static async cleanupTestChannel(channelId: string): Promise<void> {
    try {
      const client = this.getTestClient();
      await client.conversations.archive({ channel: channelId });
    } catch (error) {
      console.warn(`Failed to cleanup test channel ${channelId}:`, (error as Error).message);
    }
  }

  /**
   * Send a test message and return message info
   */
  static async sendTestMessage(
    channel: string,
    text?: string,
    options: any = {}
  ): Promise<{ ts: string; channel: string; text: string }> {
    const client = this.getTestClient();
    const messageText = text || `Test message ${TestUtils.generateTestId()}`;
    
    const result = await client.chat.postMessage({
      channel,
      text: messageText,
      ...options
    });
    
    if (!result.ok || !result.ts) {
      throw new Error(`Failed to send test message: ${result.error}`);
    }
    
    return {
      ts: result.ts,
      channel: result.channel!,
      text: messageText
    };
  }

  /**
   * Delete a test message
   */
  static async deleteTestMessage(channel: string, ts: string): Promise<void> {
    try {
      const client = this.getTestClient();
      await client.chat.delete({ channel, ts });
    } catch (error) {
      console.warn(`Failed to delete test message ${ts}:`, (error as Error).message);
    }
  }

  /**
   * Get channel history for testing
   */
  static async getChannelHistory(
    channel: string,
    limit: number = 10
  ): Promise<any[]> {
    const client = this.getTestClient();
    const result = await client.conversations.history({
      channel,
      limit
    });
    
    if (!result.ok) {
      throw new Error(`Failed to get channel history: ${result.error}`);
    }
    
    return result.messages || [];
  }

  /**
   * Wait for message to appear in channel
   */
  static async waitForMessage(
    channel: string,
    predicate: (message: any) => boolean,
    timeout: number = 10000
  ): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const messages = await this.getChannelHistory(channel, 50);
      const foundMessage = messages.find(predicate);
      
      if (foundMessage) {
        return foundMessage;
      }
      
      await TestUtils.delay(500);
    }
    
    throw new Error(`Message not found within ${timeout}ms`);
  }

  /**
   * Create mock Slack API response
   */
  static createMockSlackResponse(data: any = {}, ok: boolean = true): any {
    return {
      ok,
      ...data,
      response_metadata: {
        next_cursor: '',
        scopes: ['chat:write', 'channels:read'],
        acceptedScopes: ['chat:write'],
        ...data.response_metadata
      }
    };
  }

  /**
   * Create mock Slack error response
   */
  static createMockSlackError(error: string, details?: any): any {
    return {
      ok: false,
      error,
      ...details
    };
  }

  /**
   * Validate Slack API response structure
   */
  static validateSlackResponse(response: any): void {
    expect(response).toBeDefined();
    expect(response).toHaveProperty('ok');
    expect(typeof response.ok).toBe('boolean');
    
    if (!response.ok) {
      expect(response).toHaveProperty('error');
      expect(typeof response.error).toBe('string');
    }
  }

  /**
   * Validate Slack channel object
   */
  static validateSlackChannel(channel: any): void {
    expect(channel).toBeDefined();
    expect(channel).toHaveProperty('id');
    expect(channel).toHaveProperty('name');
    expect(typeof channel.id).toBe('string');
    expect(typeof channel.name).toBe('string');
    expect(channel.id).toMatch(/^[CG][A-Z0-9]{8,}$/);
  }

  /**
   * Validate Slack user object
   */
  static validateSlackUser(user: any): void {
    expect(user).toBeDefined();
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
    expect(typeof user.id).toBe('string');
    expect(typeof user.name).toBe('string');
    expect(user.id).toMatch(/^[UW][A-Z0-9]{8,}$/);
  }

  /**
   * Validate Slack message object
   */
  static validateSlackMessage(message: any): void {
    expect(message).toBeDefined();
    expect(message).toHaveProperty('ts');
    expect(message).toHaveProperty('type');
    expect(typeof message.ts).toBe('string');
    expect(typeof message.type).toBe('string');
    expect(message.ts).toMatch(/^\d{10}\.\d{6}$/);
  }

  /**
   * Generate test data for different Slack objects
   */
  static generateTestData = {
    channel: (overrides: any = {}) => ({
      id: `C${TestUtils.randomString(9).toUpperCase()}`,
      name: TestUtils.generateTestChannelName(),
      is_channel: true,
      is_group: false,
      is_im: false,
      is_private: false,
      created: Math.floor(Date.now() / 1000),
      is_archived: false,
      is_member: true,
      ...overrides
    }),
    
    user: (overrides: any = {}) => ({
      id: `U${TestUtils.randomString(9).toUpperCase()}`,
      name: `testuser${TestUtils.randomString(4)}`,
      real_name: 'Test User',
      email: `test${Date.now()}@example.com`,
      is_bot: false,
      deleted: false,
      ...overrides
    }),
    
    message: (overrides: any = {}) => ({
      type: 'message',
      ts: `${Math.floor(Date.now() / 1000)}.${TestUtils.randomString(6)}`,
      user: `U${TestUtils.randomString(9).toUpperCase()}`,
      text: `Test message ${TestUtils.generateTestId()}`,
      ...overrides
    }),
    
    reaction: (overrides: any = {}) => ({
      name: TestUtils.randomItem(['thumbsup', 'heart', 'smile', 'tada']),
      count: TestUtils.randomNumber(1, 5),
      users: [`U${TestUtils.randomString(9).toUpperCase()}`],
      ...overrides
    })
  };

  /**
   * Create a test environment for Slack operations
   */
  static async createTestEnvironment(): Promise<{
    channelId: string;
    cleanup: () => Promise<void>;
  }> {
    const channelId = await this.getOrCreateTestChannel();
    const createdMessages: Array<{ channel: string; ts: string }> = [];
    
    const cleanup = async () => {
      // Clean up messages
      for (const message of createdMessages) {
        await this.deleteTestMessage(message.channel, message.ts);
      }
      
      // Clean up channel
      await this.cleanupTestChannel(channelId);
    };
    
    return { channelId, cleanup };
  }

  /**
   * Mock Slack client methods for unit testing
   */
  static mockSlackClient(): jest.Mocked<WebClient> {
    const mockClient = {
      auth: {
        test: jest.fn().mockResolvedValue(this.createMockSlackResponse({
          user_id: 'U1234567890',
          team_id: 'T1234567890',
          user: 'testbot',
          team: 'Test Team'
        }))
      },
      chat: {
        postMessage: jest.fn().mockResolvedValue(this.createMockSlackResponse({
          ts: `${Math.floor(Date.now() / 1000)}.000001`,
          channel: 'C1234567890'
        })),
        delete: jest.fn().mockResolvedValue(this.createMockSlackResponse()),
        update: jest.fn().mockResolvedValue(this.createMockSlackResponse())
      },
      conversations: {
        list: jest.fn().mockResolvedValue(this.createMockSlackResponse({
          channels: [this.generateTestData.channel()]
        })),
        create: jest.fn().mockResolvedValue(this.createMockSlackResponse({
          channel: this.generateTestData.channel()
        })),
        history: jest.fn().mockResolvedValue(this.createMockSlackResponse({
          messages: [this.generateTestData.message()]
        })),
        info: jest.fn().mockResolvedValue(this.createMockSlackResponse({
          channel: this.generateTestData.channel()
        }))
      },
      users: {
        list: jest.fn().mockResolvedValue(this.createMockSlackResponse({
          members: [this.generateTestData.user()]
        })),
        info: jest.fn().mockResolvedValue(this.createMockSlackResponse({
          user: this.generateTestData.user()
        }))
      },
      team: {
        info: jest.fn().mockResolvedValue(this.createMockSlackResponse({
          team: {
            id: 'T1234567890',
            name: 'Test Team',
            domain: 'test-team'
          }
        }))
      }
    } as any;
    
    return mockClient;
  }
}
