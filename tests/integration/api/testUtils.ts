/**
 * Integration Test Utilities
 * Shared utilities for integration testing across the Enhanced MCP Slack SDK
 */

import { config } from '../../../src/config/env';

/**
 * Skip integration tests if not configured
 */
export const skipIntegration = !config.SLACK_BOT_TOKEN || process.env.SKIP_INTEGRATION === 'true';

/**
 * Common valid arguments for testing
 */
export const mockValidArgs = {
  channel: 'C1234567890',
  user: 'U1234567890',
  text: 'Test message',
  limit: 10,
  cursor: 'dXNlcjpVMDYxTkZUVDI=',
  ts: '1234567890.123456',
  thread_ts: '1234567890.123456',
  name: 'test-channel',
  purpose: 'Test channel purpose',
  topic: 'Test channel topic',
  file: 'test-file.txt',
  filename: 'test-file.txt',
  title: 'Test File',
  initial_comment: 'Test file upload',
  emoji: 'thumbsup',
  query: 'test search query',
  sort: 'timestamp',
  sort_dir: 'desc',
  count: 20,
  page: 1,
  highlight: true,
  include_context: true,
  context_size: 3,
  oldest: '1234567890',
  latest: '1234567891',
  inclusive: true,
  unreads: false,
  types: 'public_channel,private_channel',
  exclude_archived: true,
  exclude_members: false,
  private: false,
  is_private: false,
  team_id: 'T1234567890',
  include_locale: true,
  include_num_members: true,
  include_presence: true,
  include_deleted: false,
  include_bots: false,
  include_restricted: false,
  include_ultra_restricted: false,
  presence: 'active',
  status_text: 'Working on tests',
  status_emoji: ':computer:',
  status_expiration: 0,
  blocks: [],
  attachments: [],
  unfurl_links: true,
  unfurl_media: true,
  as_user: false,
  icon_emoji: ':robot_face:',
  icon_url: 'https://example.com/icon.png',
  username: 'Test Bot',
  link_names: true,
  parse: 'full',
  reply_broadcast: false,
  mrkdwn: true,
  metadata: {},
  template: 'general',
  invite_users: ['U1234567890'],
  send_welcome_message: true,
  welcome_message: 'Welcome to the test channel!',
  channels: ['C1234567890', 'C0987654321'],
  content: 'Test file content',
  filetype: 'text',
  snippet_type: 'text',
  channels_filter: ['general', 'random'],
  user_filter: ['john.doe'],
  date_range: {
    after: '2024-01-01',
    before: '2024-12-31'
  },
  has_files: false,
  has_links: false,
  from_user: 'U1234567890',
  in_channel: 'C1234567890',
  message_type: 'message',
  filter_by: 'all',
  sort_by: 'timestamp',
  order: 'desc',
  include_analytics: true,
  include_recommendations: true,
  include_metadata: true,
  include_member_count: true,
  include_activity_stats: true,
  include_health_score: true,
  include_usage_patterns: true,
  include_security_analysis: true,
  include_performance_metrics: true,
  sendMessage: {
    channel: 'C1234567890',
    text: 'Test message'
  }
};

/**
 * Delay function for tests
 */
export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Common invalid arguments for testing
 */
export const mockInvalidArgs = {
  invalidChannel: 'invalid-channel',
  invalidUser: 'invalid-user',
  invalidTs: 'invalid-timestamp',
  invalidLimit: -1,
  invalidCount: 0,
  invalidPage: 0,
  invalidSort: 'invalid-sort',
  invalidSortDir: 'invalid-direction',
  invalidEmoji: 'invalid emoji name',
  invalidTemplate: 'invalid-template',
  invalidFiletype: 'invalid-filetype',
  invalidPresence: 'invalid-presence',
  invalidStatusExpiration: -1,
  invalidDateRange: {
    after: 'invalid-date',
    before: 'invalid-date'
  },
  emptyString: '',
  nullValue: null,
  undefinedValue: undefined,
  emptyArray: [],
  emptyObject: {},
  invalidBoolean: 'not-a-boolean',
  invalidNumber: 'not-a-number',
  tooLongString: 'a'.repeat(10000),
  specialCharacters: '!@#$%^&*()[]{}|\\:";\'<>?,./`~',
  sqlInjection: "'; DROP TABLE users; --",
  xssAttempt: '<script>alert("xss")</script>',
  pathTraversal: '../../../etc/passwd',
  commandInjection: '$(rm -rf /)',
  oversizedLimit: 10000,
  negativeNumbers: -999,
  floatInsteadOfInt: 3.14159,
  arrayInsteadOfString: ['not', 'a', 'string'],
  objectInsteadOfString: { not: 'a string' },
  functionInsteadOfString: () => 'not a string',
  sendMessage: [
    { channel: '', text: 'Test message' }, // Empty channel
    { channel: 'invalid-channel', text: '' }, // Empty text
    { channel: 'invalid-channel' } // Missing text
  ]
};

/**
 * Mock Slack API responses for testing
 */
export const mockSlackResponses = {
  success: {
    ok: true,
    channel: {
      id: 'C1234567890',
      name: 'test-channel',
      is_channel: true,
      is_group: false,
      is_im: false,
      created: 1234567890,
      creator: 'U1234567890',
      is_archived: false,
      is_general: false,
      unlinked: 0,
      name_normalized: 'test-channel',
      is_shared: false,
      is_ext_shared: false,
      is_org_shared: false,
      pending_shared: [],
      is_pending_ext_shared: false,
      is_member: true,
      is_private: false,
      is_mpim: false,
      topic: {
        value: 'Test channel topic',
        creator: 'U1234567890',
        last_set: 1234567890
      },
      purpose: {
        value: 'Test channel purpose',
        creator: 'U1234567890',
        last_set: 1234567890
      },
      previous_names: [],
      num_members: 5
    },
    user: {
      id: 'U1234567890',
      team_id: 'T1234567890',
      name: 'testuser',
      deleted: false,
      color: '9f69e7',
      real_name: 'Test User',
      tz: 'America/New_York',
      tz_label: 'Eastern Standard Time',
      tz_offset: -18000,
      profile: {
        avatar_hash: 'abc123',
        status_text: 'Working on tests',
        status_emoji: ':computer:',
        real_name: 'Test User',
        display_name: 'Test User',
        real_name_normalized: 'Test User',
        display_name_normalized: 'Test User',
        email: 'test@example.com',
        image_24: 'https://example.com/avatar_24.jpg',
        image_32: 'https://example.com/avatar_32.jpg',
        image_48: 'https://example.com/avatar_48.jpg',
        image_72: 'https://example.com/avatar_72.jpg',
        image_192: 'https://example.com/avatar_192.jpg',
        image_512: 'https://example.com/avatar_512.jpg',
        team: 'T1234567890'
      },
      is_admin: false,
      is_owner: false,
      is_primary_owner: false,
      is_restricted: false,
      is_ultra_restricted: false,
      is_bot: false,
      updated: 1234567890,
      is_app_user: false,
      has_2fa: true
    },
    message: {
      type: 'message',
      ts: '1234567890.123456',
      user: 'U1234567890',
      text: 'Test message',
      team: 'T1234567890',
      channel: 'C1234567890',
      event_ts: '1234567890.123456'
    },
    file: {
      id: 'F1234567890',
      created: 1234567890,
      timestamp: 1234567890,
      name: 'test-file.txt',
      title: 'Test File',
      mimetype: 'text/plain',
      filetype: 'text',
      pretty_type: 'Plain Text',
      user: 'U1234567890',
      editable: false,
      size: 1024,
      mode: 'hosted',
      is_external: false,
      external_type: '',
      is_public: true,
      public_url_shared: false,
      display_as_bot: false,
      username: '',
      url_private: 'https://files.slack.com/files-pri/T1234567890-F1234567890/test-file.txt',
      url_private_download: 'https://files.slack.com/files-pri/T1234567890-F1234567890/download/test-file.txt',
      permalink: 'https://example.slack.com/files/U1234567890/F1234567890/test-file.txt',
      permalink_public: 'https://slack-files.com/T1234567890-F1234567890-abc123',
      channels: ['C1234567890'],
      groups: [],
      ims: [],
      comments_count: 0
    },
    team: {
      id: 'T1234567890',
      name: 'Test Workspace',
      domain: 'test-workspace',
      email_domain: 'example.com',
      icon: {
        image_34: 'https://example.com/team_icon_34.png',
        image_44: 'https://example.com/team_icon_44.png',
        image_68: 'https://example.com/team_icon_68.png',
        image_88: 'https://example.com/team_icon_88.png',
        image_102: 'https://example.com/team_icon_102.png',
        image_132: 'https://example.com/team_icon_132.png',
        image_default: true
      },
      enterprise_id: 'E1234567890',
      enterprise_name: 'Test Enterprise'
    }
  },
  error: {
    ok: false,
    error: 'channel_not_found',
    needed: 'channels:read',
    provided: 'identify,bot:basic'
  },
  rateLimited: {
    ok: false,
    error: 'ratelimited',
    retry_after: 60
  },
  invalidAuth: {
    ok: false,
    error: 'invalid_auth'
  }
};

/**
 * Test environment configuration
 */
export const testConfig = {
  timeout: 30000,
  retries: 3,
  skipSlowTests: process.env.SKIP_SLOW_TESTS === 'true',
  skipIntegrationTests: skipIntegration,
  mockSlackApi: process.env.MOCK_SLACK_API !== 'false',
  testWorkspaceId: process.env.TEST_WORKSPACE_ID || 'T1234567890',
  testChannelId: process.env.TEST_CHANNEL_ID || 'C1234567890',
  testUserId: process.env.TEST_USER_ID || 'U1234567890',
  testBotToken: process.env.TEST_BOT_TOKEN || config.SLACK_BOT_TOKEN,
  testUserToken: process.env.TEST_USER_TOKEN || config.SLACK_USER_TOKEN
};

/**
 * Utility functions for test setup and teardown
 */
export const testUtils = {
  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate a random test string
   */
  randomString: (length: number = 10): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Generate a random channel name
   */
  randomChannelName: (): string => `test-channel-${testUtils.randomString(8)}`,

  /**
   * Generate a random user name
   */
  randomUserName: (): string => `test-user-${testUtils.randomString(8)}`,

  /**
   * Generate a random file name
   */
  randomFileName: (): string => `test-file-${testUtils.randomString(8)}.txt`,

  /**
   * Create a test timestamp
   */
  testTimestamp: (): string => (Date.now() / 1000).toString(),

  /**
   * Validate test response structure
   */
  validateResponse: (response: any): boolean => {
    return response && 
           typeof response === 'object' && 
           'success' in response &&
           'data' in response;
  },

  /**
   * Validate error response structure
   */
  validateErrorResponse: (response: any): boolean => {
    return response && 
           typeof response === 'object' && 
           response.success === false &&
           'error' in response;
  },

  /**
   * Clean up test data (placeholder for future implementation)
   */
  cleanup: async (): Promise<void> => {
    // Future: Implement cleanup of test channels, files, etc.
    console.log('Test cleanup completed');
  }
};

/**
 * Export all utilities
 */
export default {
  skipIntegration,
  mockValidArgs,
  mockInvalidArgs,
  mockSlackResponses,
  testConfig,
  testUtils
};
