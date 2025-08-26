
import { slackListChannelsTool } from '@/tools/slackListChannels';
import { slackClient } from '@/utils/slackClient';

// Mock the Slack client
jest.mock('@/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackListChannelsTool', () => {
  let mockConversationsList: jest.Mock;
  let mockConversationsInfo: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock functions
    mockConversationsList = jest.fn();
    mockConversationsInfo = jest.fn();
    
    // Mock the getClient method
    mockSlackClient.getClient = jest.fn().mockReturnValue({
      conversations: {
        list: mockConversationsList,
        members: jest.fn(),
        info: mockConversationsInfo,
      },
    });
  });

  describe('Input Validation', () => {
    it('should accept valid input with defaults', async () => {
      const mockChannels = [
        {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_archived: false,
          is_member: true,
          created: 1234567890,
          purpose: { value: 'General discussion' },
          topic: { value: 'Welcome to the team' },
        },
      ];

      mockConversationsList.mockResolvedValue({
        channels: mockChannels,
        response_metadata: {},
      });

      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: { num_members: 5 },
      });

      const result = await slackListChannelsTool.execute({});

      expect(result.success).toBe(true);
      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].name).toBe('general');
    });

    it('should validate channel types parameter', async () => {
      const mockChannels = [
        {
          id: 'C1234567890',
          name: 'test-channel',
          is_private: true,
          is_archived: false,
        },
      ];

      mockConversationsList.mockResolvedValue({
        channels: mockChannels,
        response_metadata: {},
      });

      const result = await slackListChannelsTool.execute({
        types: 'private_channel',
      });

      expect(result.success).toBe(true);
      expect(mockConversationsList).toHaveBeenCalledWith({
        types: 'private_channel',
        exclude_archived: true,
        limit: 100,
        cursor: undefined,
      });
    });

    it('should validate limit parameter', async () => {
      const result = await slackListChannelsTool.execute({
        limit: 1500, // Invalid: exceeds maximum
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should validate sort_by parameter', async () => {
      const result = await slackListChannelsTool.execute({
        sort_by: 'invalid_sort', // Invalid sort field
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('Channel Listing', () => {
    it('should list channels with basic information', async () => {
      const mockChannels = [
        {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
          is_archived: false,
          is_member: true,
          created: 1234567890,
        },
        {
          id: 'C0987654321',
          name: 'random',
          is_private: false,
          is_archived: false,
          is_member: false,
          created: 1234567891,
        },
      ];

      mockConversationsList.mockResolvedValue({
        channels: mockChannels,
        response_metadata: {},
      });

      const result = await slackListChannelsTool.execute({
        include_member_count: false,
        include_purpose_topic: false,
      });

      expect(result.success).toBe(true);
      expect(result.channels).toHaveLength(2);
      expect(result.channels[0].analysis.is_public).toBe(true);
      expect(result.channels[0].analysis.is_member).toBe(true);
    });

    it('should filter channels by name', async () => {
      const mockChannels = [
        { id: 'C1', name: 'general', is_private: false },
        { id: 'C2', name: 'random', is_private: false },
        { id: 'C3', name: 'dev-team', is_private: false },
      ];

      mockConversationsList.mockResolvedValue({
        channels: mockChannels,
        response_metadata: {},
      });

      const result = await slackListChannelsTool.execute({
        name_filter: 'dev',
        include_member_count: false,
        include_purpose_topic: false,
      });

      expect(result.success).toBe(true);
      expect(result.channels).toHaveLength(1);
      expect(result.channels[0].name).toBe('dev-team');
    });

    it('should sort channels by name', async () => {
      const mockChannels = [
        { id: 'C1', name: 'zebra', is_private: false, created: 1234567890 },
        { id: 'C2', name: 'alpha', is_private: false, created: 1234567891 },
        { id: 'C3', name: 'beta', is_private: false, created: 1234567892 },
      ];

      mockConversationsList.mockResolvedValue({
        channels: mockChannels,
        response_metadata: {},
      });

      const result = await slackListChannelsTool.execute({
        sort_by: 'name',
        sort_direction: 'asc',
        include_member_count: false,
        include_purpose_topic: false,
      });

      expect(result.success).toBe(true);
      expect(result.channels[0].name).toBe('alpha');
      expect(result.channels[1].name).toBe('beta');
      expect(result.channels[2].name).toBe('zebra');
    });

    it('should include member count when requested', async () => {
      const mockChannels = [
        {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
        },
      ];

      mockConversationsList.mockResolvedValue({
        channels: mockChannels,
        response_metadata: {},
      });

      mockConversationsInfo.mockResolvedValue({
        ok: true,
        channel: { num_members: 10 },
      });

      const result = await slackListChannelsTool.execute({
        include_member_count: true,
        include_purpose_topic: false,
      });

      expect(result.success).toBe(true);
      expect(result.channels[0].member_count).toBe(10);
    });

    it('should generate summary statistics', async () => {
      const mockChannels = [
        { id: 'C1', name: 'general', is_private: false, is_archived: false },
        { id: 'C2', name: 'private', is_private: true, is_archived: false },
        { id: 'C3', name: 'archived', is_private: false, is_archived: true },
      ];

      mockConversationsList.mockResolvedValue({
        channels: mockChannels,
        response_metadata: {},
      });

      const result = await slackListChannelsTool.execute({
        exclude_archived: false,
        include_member_count: false,
        include_purpose_topic: false,
      });

      expect(result.success).toBe(true);
      expect(result.summary.total_channels).toBe(3);
      expect(result.summary.by_type.public_channel).toBe(2);
      expect(result.summary.by_type.private_channel).toBe(1);
      expect(result.summary.by_status.active).toBe(2);
      expect(result.summary.by_status.archived).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle Slack API errors gracefully', async () => {
      mockConversationsList.mockRejectedValue(
        new Error('Slack API error')
      );

      const result = await slackListChannelsTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Slack API error');
    });

    it('should handle member count API errors gracefully', async () => {
      const mockChannels = [
        {
          id: 'C1234567890',
          name: 'general',
          is_private: false,
        },
      ];

      mockConversationsList.mockResolvedValue({
        channels: mockChannels,
        response_metadata: {},
      });

      mockConversationsInfo.mockRejectedValue(
        new Error('Permission denied')
      );

      const result = await slackListChannelsTool.execute({
        include_member_count: true,
        include_purpose_topic: false,
      });

      expect(result.success).toBe(true);
      expect(result.channels[0].member_count).toBeNull();
    });
  });

  describe('Pagination', () => {
    it('should handle pagination correctly', async () => {
      const mockChannels = [
        { id: 'C1', name: 'channel1', is_private: false },
      ];

      mockConversationsList.mockResolvedValue({
        channels: mockChannels,
        response_metadata: {
          next_cursor: 'next_page_cursor',
        },
      });

      const result = await slackListChannelsTool.execute({
        include_member_count: false,
        include_purpose_topic: false,
      });

      expect(result.success).toBe(true);
      expect(result.pagination.has_more).toBe(true);
      expect(result.pagination.next_cursor).toBe('next_page_cursor');
    });
  });
});
