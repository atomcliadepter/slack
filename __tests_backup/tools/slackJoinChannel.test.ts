import { slackJoinChannelTool } from '@/tools/slackJoinChannel';
import { slackClient } from '@/utils/slackClient';

// Mock the Slack client
jest.mock('@/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackJoinChannelTool', () => {
  let mockConversationsJoin: jest.Mock;
  let mockConversationsInfo: jest.Mock;
  let mockConversationsList: jest.Mock;
  let mockConversationsMembers: jest.Mock;
  let mockConversationsHistory: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock functions
    mockConversationsJoin = jest.fn();
    mockConversationsInfo = jest.fn();
    mockConversationsList = jest.fn();
    mockConversationsMembers = jest.fn();
    mockConversationsHistory = jest.fn();
    
    // Mock the getClient method
    mockSlackClient.getClient = jest.fn().mockReturnValue({
      conversations: {
        join: mockConversationsJoin,
        info: mockConversationsInfo,
        list: mockConversationsList,
        members: mockConversationsMembers,
        history: mockConversationsHistory,
      },
    });

    // Default mock for history (to prevent errors in analytics)
    mockConversationsHistory.mockResolvedValue({
      ok: true,
      messages: [],
    });
  });

  describe('Input Validation', () => {
    it('should validate required channel parameter', async () => {
      const result = await slackJoinChannelTool.execute({});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Required');
    });

    it('should validate channel format', async () => {
      const result = await slackJoinChannelTool.execute({
        channel: 'invalid-channel-format!',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid channel format');
    });

    it('should accept valid channel ID format', async () => {
      // Mock successful channel info lookup
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_archived: false,
          is_member: false,
          num_members: 10,
          created: 1234567890,
          purpose: { value: 'General discussion' },
          topic: { value: 'Welcome to the team' },
        },
      });

      // Mock successful join
      mockConversationsJoin.mockResolvedValue({
        ok: true,
        channel: { id: 'C1234567890' },
      });

      const result = await slackJoinChannelTool.execute({
        channel: 'C1234567890',
      });
      
      expect(result.success).toBe(true);
      expect(mockConversationsJoin).toHaveBeenCalledWith({
        channel: 'C1234567890',
      });
    });
  });

  describe('Channel Resolution', () => {
    it('should resolve channel name to ID', async () => {
      mockConversationsList.mockResolvedValue({
        ok: true,
        channels: [
          { id: 'C1234567890', name: 'general' },
          { id: 'C0987654321', name: 'random' },
        ],
      });

      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_archived: false,
          is_member: false,
        },
      });

      mockConversationsJoin.mockResolvedValue({
        ok: true,
        channel: { id: 'C1234567890' },
      });

      const result = await slackJoinChannelTool.execute({
        channel: 'general',
      });
      
      expect(result.success).toBe(true);
      expect(result.channel_id).toBe('C1234567890');
    });

    it('should handle channel not found during resolution', async () => {
      mockConversationsList.mockResolvedValue({
        ok: true,
        channels: [
          { id: 'C1234567890', name: 'general' },
        ],
      });

      const result = await slackJoinChannelTool.execute({
        channel: 'nonexistent',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Channel not found');
    });
  });

  describe('Pre-join Analysis', () => {
    it('should detect already member status', async () => {
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_archived: false,
          is_member: true, // Already a member
          num_members: 10,
        },
      });

      const result = await slackJoinChannelTool.execute({
        channel: 'C1234567890',
        check_membership: true,
      });
      
      expect(result.success).toBe(true);
      expect(result.already_member).toBe(true);
      expect(result.message).toContain('Already a member');
      expect(mockConversationsJoin).not.toHaveBeenCalled();
    });

    it('should detect archived channel', async () => {
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'archived-channel',
          is_private: false,
          is_archived: true, // Archived
          is_member: false,
        },
      });

      const result = await slackJoinChannelTool.execute({
        channel: 'C1234567890',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot join archived channel');
    });
  });

  describe('Join Operation', () => {
    it('should successfully join a public channel', async () => {
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_archived: false,
          is_member: false,
          num_members: 10,
        },
      });

      mockConversationsJoin.mockResolvedValue({
        ok: true,
        channel: { id: 'C1234567890' },
      });

      const result = await slackJoinChannelTool.execute({
        channel: 'C1234567890',
      });
      
      expect(result.success).toBe(true);
      expect(result.already_member).toBe(false);
      expect(result.channel_id).toBe('C1234567890');
      expect(mockConversationsJoin).toHaveBeenCalledWith({
        channel: 'C1234567890',
      });
    });

    it('should handle already_in_channel warning', async () => {
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_archived: false,
          is_member: false, // Pre-join check shows not member
        },
      });

      mockConversationsJoin.mockResolvedValue({
        ok: true,
        channel: { id: 'C1234567890' },
        warning: 'already_in_channel', // But join returns warning
      });

      const result = await slackJoinChannelTool.execute({
        channel: 'C1234567890',
        check_membership: false, // Skip pre-check
      });
      
      expect(result.success).toBe(true);
      expect(result.already_member).toBe(true);
      expect(result.metadata.warnings).toContain('Was already a member of the channel');
    });
  });

  describe('Error Handling', () => {
    it('should handle private channel access error', async () => {
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'private-channel',
          is_private: true,
          is_archived: false,
          is_member: false,
        },
      });

      mockConversationsJoin.mockRejectedValue(
        new Error('method_not_supported_for_channel_type')
      );

      const result = await slackJoinChannelTool.execute({
        channel: 'C1234567890',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('method_not_supported_for_channel_type');
    });

    it('should handle rate limiting with retry', async () => {
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          is_private: false,
          is_archived: false,
          is_member: false,
        },
      });

      // First call fails with rate limit, second succeeds
      mockConversationsJoin
        .mockRejectedValueOnce(new Error('rate_limited'))
        .mockResolvedValueOnce({
          ok: true,
          channel: { id: 'C1234567890' },
        });

      const result = await slackJoinChannelTool.execute({
        channel: 'C1234567890',
        auto_retry: true,
        retry_attempts: 2,
        retry_delay_ms: 100,
      });
      
      expect(result.success).toBe(true);
      expect(result.join_analytics.retry_count).toBe(1);
      expect(result.metadata.warnings[0]).toContain('Retry attempt 1');
      expect(mockConversationsJoin).toHaveBeenCalledTimes(2);
    });
  });

  describe('Tool Metadata', () => {
    it('should have correct tool metadata', () => {
      expect(slackJoinChannelTool.name).toBe('slack_join_channel');
      expect(slackJoinChannelTool.description).toContain('Join a Slack channel');
      expect(slackJoinChannelTool.inputSchema.type).toBe('object');
      expect(slackJoinChannelTool.inputSchema.required).toContain('channel');
    });

    it('should include execution time in response', async () => {
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          is_private: false,
          is_archived: false,
          is_member: false,
        },
      });

      mockConversationsJoin.mockResolvedValue({
        ok: true,
        channel: { id: 'C1234567890' },
      });

      const result = await slackJoinChannelTool.execute({
        channel: 'C1234567890',
      });
      
      expect(result.success).toBe(true);
      expect(result.metadata.execution_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.join_analytics.execution_time_ms).toBeGreaterThanOrEqual(0);
    });
  });
});
