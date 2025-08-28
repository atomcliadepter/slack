/**
 * Test data factory for generating consistent test data
 */

export class TestDataFactory {
  private static userIdCounter = 1;
  private static channelIdCounter = 1;
  private static messageIdCounter = 1;

  /**
   * Generate unique user ID
   */
  static generateUserId(): string {
    return `U${String(this.userIdCounter++).padStart(9, '0')}`;
  }

  /**
   * Generate unique channel ID
   */
  static generateChannelId(): string {
    return `C${String(this.channelIdCounter++).padStart(9, '0')}`;
  }

  /**
   * Generate unique message timestamp
   */
  static generateTimestamp(): string {
    const base = 1640995200; // Base timestamp
    const increment = this.messageIdCounter++;
    return `${base + increment}.${String(increment).padStart(6, '0')}`;
  }

  /**
   * Create mock Slack API response
   */
  static createSlackAPIResponse<T>(data: T, ok: boolean = true): any {
    return {
      ok,
      ...(ok ? data : { error: 'test_error' }),
    };
  }

  /**
   * Create mock user with realistic data
   */
  static createUser(overrides: Partial<any> = {}) {
    const userId = this.generateUserId();
    return {
      id: userId,
      name: `user${userId.slice(1)}`,
      real_name: `Test User ${userId.slice(1)}`,
      profile: {
        email: `user${userId.slice(1)}@example.com`,
        title: 'Software Engineer',
        phone: '+1234567890',
        image_24: `https://example.com/avatar${userId.slice(1)}.jpg`,
        display_name: `User ${userId.slice(1)}`,
      },
      is_admin: false,
      is_owner: false,
      is_bot: false,
      is_restricted: false,
      is_ultra_restricted: false,
      deleted: false,
      has_2fa: true,
      team_id: 'T1234567890',
      tz: 'America/New_York',
      tz_label: 'Eastern Standard Time',
      tz_offset: -18000,
      ...overrides,
    };
  }

  /**
   * Create mock channel with realistic data
   */
  static createChannel(overrides: Partial<any> = {}) {
    const channelId = this.generateChannelId();
    return {
      id: channelId,
      name: `test-channel-${channelId.slice(1)}`,
      is_channel: true,
      is_group: false,
      is_im: false,
      is_private: false,
      is_archived: false,
      is_general: false,
      creator: this.generateUserId(),
      created: 1640995200,
      num_members: Math.floor(Math.random() * 50) + 1,
      topic: {
        value: `Topic for ${channelId}`,
        creator: this.generateUserId(),
        last_set: 1640995200,
      },
      purpose: {
        value: `Purpose for ${channelId}`,
        creator: this.generateUserId(),
        last_set: 1640995200,
      },
      ...overrides,
    };
  }

  /**
   * Create mock message with realistic data
   */
  static createMessage(overrides: Partial<any> = {}) {
    return {
      type: 'message',
      user: this.generateUserId(),
      text: 'Test message content',
      ts: this.generateTimestamp(),
      channel: this.generateChannelId(),
      ...overrides,
    };
  }

  /**
   * Create mock conversation history
   */
  static createConversationHistory(messageCount: number = 5) {
    const messages = [];
    for (let i = 0; i < messageCount; i++) {
      messages.push(this.createMessage({
        text: `Message ${i + 1}`,
      }));
    }
    return {
      ok: true,
      messages,
      has_more: false,
    };
  }

  /**
   * Create mock user list
   */
  static createUserList(userCount: number = 5) {
    const members = [];
    for (let i = 0; i < userCount; i++) {
      members.push(this.createUser());
    }
    return {
      ok: true,
      members,
      cache_ts: Date.now(),
    };
  }

  /**
   * Create mock channel list
   */
  static createChannelList(channelCount: number = 5) {
    const channels = [];
    for (let i = 0; i < channelCount; i++) {
      channels.push(this.createChannel());
    }
    return {
      ok: true,
      channels,
    };
  }

  /**
   * Reset counters for consistent testing
   */
  static reset() {
    this.userIdCounter = 1;
    this.channelIdCounter = 1;
    this.messageIdCounter = 1;
  }
}
