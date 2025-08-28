import { slackConversationsOpenTool } from '../../../src/tools/slackConversationsOpen';
import { slackClient } from '../../../src/utils/slackClient';

jest.mock('../../../src/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackConversationsOpenTool', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      conversations: {
        open: jest.fn(),
      },
    };
    mockSlackClient.getClient.mockReturnValue(mockClient);
  });

  it('should have correct tool metadata', () => {
    expect(slackConversationsOpenTool.name).toBe('slack_conversations_open');
    expect(slackConversationsOpenTool.description).toBeDefined();
    expect(slackConversationsOpenTool.inputSchema).toBeDefined();
  });

  describe('Input Validation', () => {
    it('should reject empty users', async () => {
      const result = await slackConversationsOpenTool.execute({
        users: '',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least one user ID must be provided');
    });

    it('should accept valid user IDs', async () => {
      mockClient.conversations.open.mockResolvedValue({
        ok: true,
        channel: {
          id: 'D1234567890',
          is_im: true,
          user: 'U1234567890',
          created: 1234567890,
        },
      });

      const result = await slackConversationsOpenTool.execute({
        users: 'U1234567890',
      });

      expect(result.success).toBe(true);
      expect(result.data.conversation.id).toBe('D1234567890');
    });
  });

  describe('Conversation Opening', () => {
    it('should open DM conversation', async () => {
      mockClient.conversations.open.mockResolvedValue({
        ok: true,
        channel: {
          id: 'D1234567890',
          is_im: true,
          user: 'U1234567890',
          created: 1234567890,
        },
      });

      const result = await slackConversationsOpenTool.execute({
        users: 'U1234567890',
        include_analytics: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.conversation.is_im).toBe(true);
      expect(result.data.analytics.conversation_type).toBe('dm');
      expect(result.data.analytics.participant_count).toBe(1);
    });

    it('should open group DM conversation', async () => {
      mockClient.conversations.open.mockResolvedValue({
        ok: true,
        channel: {
          id: 'G1234567890',
          is_im: false,
          members: ['U1234567890', 'U0987654321'],
          created: 1234567890,
        },
      });

      const result = await slackConversationsOpenTool.execute({
        users: 'U1234567890,U0987654321',
        include_analytics: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.conversation.is_im).toBe(false);
      expect(result.data.analytics.conversation_type).toBe('group_dm');
      expect(result.data.analytics.participant_count).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle Slack API errors', async () => {
      mockClient.conversations.open.mockResolvedValue({
        ok: false,
        error: 'users_not_found',
      });

      const result = await slackConversationsOpenTool.execute({
        users: 'U1234567890',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('users_not_found');
    });
  });
});
