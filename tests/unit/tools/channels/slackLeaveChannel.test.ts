
import { slackLeaveChannelTool } from '@/tools/slackLeaveChannel';
import { slackClient } from '@/utils/slackClient';

// Mock the Slack client
jest.mock('@/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackLeaveChannelTool', () => {
  let mockConversationsLeave: jest.Mock;
  let mockConversationsInfo: jest.Mock;
  let mockConversationsList: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock functions
    mockConversationsLeave = jest.fn();
    mockConversationsInfo = jest.fn();
    mockConversationsList = jest.fn();
    
    // Mock the getClient method
    mockSlackClient.getClient = jest.fn().mockReturnValue({
      conversations: {
        leave: mockConversationsLeave,
        info: mockConversationsInfo,
        list: mockConversationsList,
      },
    });
  });

  describe('Input Validation', () => {
    it('should validate required channel parameter', async () => {
      const result = await slackLeaveChannelTool.execute({});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Required');
    });

    it('should validate channel format', async () => {
      const result = await slackLeaveChannelTool.execute({
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
          name: 'test-channel',
          is_private: false,
          is_archived: false,
          is_member: true,
          num_members: 5,
          created: 1234567890,
          purpose: { value: 'Test channel' },
          topic: { value: 'Testing' },
        },
      });

      // Mock successful leave
      mockConversationsLeave.mockResolvedValue({
        ok: true,
      });

      const result = await slackLeaveChannelTool.execute({
        channel: 'C1234567890',
      });

      expect(result.success).toBe(true);
      expect(result.left_channel).toBe(true);
      expect(mockConversationsLeave).toHaveBeenCalledWith({
        channel: 'C1234567890',
      });
    });

    it('should accept valid channel name format', async () => {
      // Mock channel list lookup
      mockConversationsList.mockResolvedValue({
        ok: true,
        channels: [
          {
            id: 'C1234567890',
            name: 'test-channel',
          },
        ],
      });

      // Mock successful channel info lookup
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'test-channel',
          is_private: false,
          is_archived: false,
          is_member: true,
          num_members: 5,
        },
      });

      // Mock successful leave
      mockConversationsLeave.mockResolvedValue({
        ok: true,
      });

      const result = await slackLeaveChannelTool.execute({
        channel: '#test-channel',
      });

      expect(result.success).toBe(true);
      expect(result.left_channel).toBe(true);
      expect(mockConversationsLeave).toHaveBeenCalledWith({
        channel: 'C1234567890',
      });
    });
  });

  describe('Membership Validation', () => {
    it('should return early if not a member and check_membership is true', async () => {
      // Mock channel info showing not a member
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'test-channel',
          is_private: false,
          is_archived: false,
          is_member: false,
          num_members: 10,
        },
      });

      const result = await slackLeaveChannelTool.execute({
        channel: 'C1234567890',
        check_membership: true,
      });

      expect(result.success).toBe(true);
      expect(result.not_member).toBe(true);
      expect(result.message).toContain('Not a member');
      expect(mockConversationsLeave).not.toHaveBeenCalled();
    });

    it('should proceed with leave if check_membership is false', async () => {
      // Mock channel info showing not a member
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'test-channel',
          is_private: false,
          is_archived: false,
          is_member: false,
          num_members: 10,
        },
      });

      // Mock successful leave (even though not a member)
      mockConversationsLeave.mockResolvedValue({
        ok: true,
      });

      const result = await slackLeaveChannelTool.execute({
        channel: 'C1234567890',
        check_membership: false,
      });

      expect(result.success).toBe(true);
      expect(result.left_channel).toBe(true);
      expect(mockConversationsLeave).toHaveBeenCalled();
    });
  });

  describe('General Channel Protection', () => {
    it('should prevent leaving general channel when prevent_general_leave is true', async () => {
      // Mock channel info for general channel
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_archived: false,
          is_member: true,
          is_general: true,
          num_members: 100,
        },
      });

      const result = await slackLeaveChannelTool.execute({
        channel: 'C1234567890',
        prevent_general_leave: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot leave #general channel');
      expect(mockConversationsLeave).not.toHaveBeenCalled();
    });

    it('should allow leaving general channel when prevent_general_leave is false', async () => {
      // Mock channel info for general channel
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_archived: false,
          is_member: true,
          is_general: true,
          num_members: 100,
        },
      });

      // Mock successful leave
      mockConversationsLeave.mockResolvedValue({
        ok: true,
      });

      const result = await slackLeaveChannelTool.execute({
        channel: 'C1234567890',
        prevent_general_leave: false,
      });

      expect(result.success).toBe(true);
      expect(result.left_channel).toBe(true);
      expect(mockConversationsLeave).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle channel not found error', async () => {
      mockConversationsInfo.mockRejectedValue(new Error('channel_not_found'));

      const result = await slackLeaveChannelTool.execute({
        channel: 'C1234567890',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Channel not found');
    });

    it('should handle not_in_channel error', async () => {
      // Mock successful channel info
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'test-channel',
          is_private: false,
          is_archived: false,
          is_member: true,
          num_members: 5,
        },
      });

      // Mock leave failure
      mockConversationsLeave.mockRejectedValue(new Error('not_in_channel'));

      const result = await slackLeaveChannelTool.execute({
        channel: 'C1234567890',
      });

      expect(result.success).toBe(false);
      expect(result.context.error_category).toBe('membership');
      expect(result.context.error_guidance).toContain('not a member');
    });

    it('should handle cant_leave_general error', async () => {
      // Mock successful channel info
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_archived: false,
          is_member: true,
          is_general: true,
          num_members: 100,
        },
      });

      // Mock leave failure
      mockConversationsLeave.mockRejectedValue(new Error('cant_leave_general'));

      const result = await slackLeaveChannelTool.execute({
        channel: 'C1234567890',
        prevent_general_leave: false,
      });

      expect(result.success).toBe(false);
      expect(result.context.error_category).toBe('general_channel');
      expect(result.context.error_guidance).toContain('Cannot leave the #general channel');
    });

    it('should handle authentication errors', async () => {
      mockConversationsInfo.mockRejectedValue(new Error('not_authed'));

      const result = await slackLeaveChannelTool.execute({
        channel: 'C1234567890',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      // Mock successful channel info
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'test-channel',
          is_private: false,
          is_archived: false,
          is_member: true,
          num_members: 5,
        },
      });

      // Mock first call fails, second succeeds
      mockConversationsLeave
        .mockRejectedValueOnce(new Error('rate_limited'))
        .mockResolvedValueOnce({ ok: true });

      const result = await slackLeaveChannelTool.execute({
        channel: 'C1234567890',
        auto_retry: true,
        retry_attempts: 2,
        retry_delay_ms: 100,
      });

      expect(result.success).toBe(true);
      expect(result.left_channel).toBe(true);
      expect(result.leave_analytics.retry_count).toBe(1);
      expect(mockConversationsLeave).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      // Mock successful channel info
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'test-channel',
          is_private: false,
          is_archived: false,
          is_member: true,
          num_members: 5,
        },
      });

      // Mock non-retryable error
      mockConversationsLeave.mockRejectedValue(new Error('not_in_channel'));

      const result = await slackLeaveChannelTool.execute({
        channel: 'C1234567890',
        auto_retry: true,
        retry_attempts: 3,
      });

      expect(result.success).toBe(false);
      expect(mockConversationsLeave).toHaveBeenCalledTimes(1);
    });
  });

  describe('Analytics and Metadata', () => {
    it('should include comprehensive analytics when requested', async () => {
      // Mock successful channel info
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'test-channel',
          is_private: false,
          is_archived: false,
          is_member: true,
          num_members: 25,
          created: 1234567890,
          purpose: { value: 'Test channel purpose' },
          topic: { value: 'Test topic' },
        },
      });

      // Mock successful leave
      mockConversationsLeave.mockResolvedValue({
        ok: true,
      });

      const result = await slackLeaveChannelTool.execute({
        channel: 'C1234567890',
        include_leave_analytics: true,
        include_channel_info: true,
        include_member_count: true,
      });

      expect(result.success).toBe(true);
      expect(result.leave_analytics).toBeDefined();
      expect(result.leave_analytics.leave_attempted).toBe(true);
      expect(result.leave_analytics.leave_successful).toBe(true);
      expect(result.leave_analytics.channel_type).toBe('public');
      expect(result.leave_analytics.member_count_estimate).toBe(25);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.pre_leave_checks).toBeDefined();
    });

    it('should handle large channel confirmation requirements', async () => {
      // Mock successful channel info for large channel
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'large-channel',
          is_private: false,
          is_archived: false,
          is_member: true,
          num_members: 150,
        },
      });

      // Mock successful leave
      mockConversationsLeave.mockResolvedValue({
        ok: true,
      });

      const result = await slackLeaveChannelTool.execute({
        channel: 'C1234567890',
        confirmation_required: true,
      });

      expect(result.success).toBe(true);
      expect(result.left_channel).toBe(true);
      // The tool should log a warning about leaving a large channel
    });
  });

  describe('Private Channel Handling', () => {
    it('should handle private channel leave successfully', async () => {
      // Mock successful channel info for private channel
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'private-channel',
          is_private: true,
          is_archived: false,
          is_member: true,
          num_members: 8,
        },
      });

      // Mock successful leave
      mockConversationsLeave.mockResolvedValue({
        ok: true,
      });

      const result = await slackLeaveChannelTool.execute({
        channel: 'C1234567890',
      });

      expect(result.success).toBe(true);
      expect(result.left_channel).toBe(true);
      expect(result.leave_analytics.channel_type).toBe('private');
    });

    it('should handle post-leave data collection failure for private channels', async () => {
      // Mock successful channel info for private channel
      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'private-channel',
          is_private: true,
          is_archived: false,
          is_member: true,
          num_members: 8,
        },
      });

      // Mock successful leave
      mockConversationsLeave.mockResolvedValue({
        ok: true,
      });

      const result = await slackLeaveChannelTool.execute({
        channel: 'C1234567890',
        include_channel_info: true,
      });

      expect(result.success).toBe(true);
      expect(result.left_channel).toBe(true);
      // Post-leave channel info might not be available for private channels
    });
  });
});
