

import { slackListUsersTool } from '@/tools/slackListUsers';
import { slackClient } from '@/utils/slackClient';

// Mock the Slack client
jest.mock('@/utils/slackClient');
const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;

describe('slackListUsersTool', () => {
  let mockUsersList: jest.Mock;
  let mockUsersGetPresence: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock functions
    mockUsersList = jest.fn();
    mockUsersGetPresence = jest.fn();
    
    // Mock the getClient method
    mockSlackClient.getClient = jest.fn().mockReturnValue({
      users: {
        list: mockUsersList,
        getPresence: mockUsersGetPresence,
      },
    });
  });

  describe('Input Validation', () => {
    it('should accept valid input with defaults', async () => {
      const mockUsers = [
        {
          id: 'U1234567890',
          name: 'john.doe',
          real_name: 'John Doe',
          profile: {
            display_name: 'Johnny',
            email: 'john@example.com',
            image_72: 'https://i.ytimg.com/vi/TBxj8osmfic/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLDQmY5LI4eceQjmCZjmMiModqPTCQ',
            status_text: 'Working',
            status_emoji: ':computer:',
          },
          is_bot: false,
          is_admin: false,
          is_owner: false,
          deleted: false,
          tz: 'America/New_York',
          tz_label: 'Eastern Standard Time',
          tz_offset: -18000,
        },
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      mockUsersGetPresence.mockResolvedValue({
        presence: 'active',
        auto_away: false,
        manual_away: false,
        connection_count: 1,
        last_activity: 1234567890,
      });

      const result = await slackListUsersTool.execute({});

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].name).toBe('john.doe');
      expect(result.summary.total_users).toBe(1);
    });

    it('should validate limit parameter', async () => {
      const result = await slackListUsersTool.execute({ limit: 2000 });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should validate sort_by parameter', async () => {
      const result = await slackListUsersTool.execute({ sort_by: 'invalid_field' });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should validate filter_by_status parameter', async () => {
      const result = await slackListUsersTool.execute({ filter_by_status: 'invalid_status' });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('should validate filter_by_role parameter', async () => {
      const result = await slackListUsersTool.execute({ filter_by_role: 'invalid_role' });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('User Filtering', () => {
    const createMockUser = (overrides: any = {}) => ({
      id: 'U1234567890',
      name: 'test.user',
      real_name: 'Test User',
      profile: {
        display_name: 'Tester',
        email: 'test@example.com',
        title: 'Developer',
      },
      is_bot: false,
      is_admin: false,
      is_owner: false,
      deleted: false,
      tz: 'America/New_York',
      ...overrides,
    });

    it('should filter by account type - regular users only', async () => {
      const mockUsers = [
        createMockUser({ name: 'regular.user' }),
        createMockUser({ name: 'bot.user', is_bot: true }),
        createMockUser({ name: 'app.user', is_app_user: true }),
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        filter_by_account_type: 'regular',
        include_presence: false,
      });

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].name).toBe('regular.user');
    });

    it('should filter by account type - bots only', async () => {
      const mockUsers = [
        createMockUser({ name: 'regular.user' }),
        createMockUser({ name: 'bot.user', is_bot: true }),
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        filter_by_account_type: 'bot',
        include_presence: false,
      });

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].name).toBe('bot.user');
    });

    it('should filter by role - admins only', async () => {
      const mockUsers = [
        createMockUser({ name: 'regular.user' }),
        createMockUser({ name: 'admin.user', is_admin: true }),
        createMockUser({ name: 'owner.user', is_owner: true }),
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        filter_by_role: 'admin',
        include_presence: false,
      });

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].name).toBe('admin.user');
    });

    it('should filter by name', async () => {
      const mockUsers = [
        createMockUser({ name: 'john.doe', real_name: 'John Doe' }),
        createMockUser({ name: 'jane.smith', real_name: 'Jane Smith' }),
        createMockUser({ name: 'bob.johnson', real_name: 'Bob Johnson' }),
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        name_filter: 'john',
        include_presence: false,
      });

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(2); // john.doe and bob.johnson (contains 'john')
    });

    it('should filter by timezone', async () => {
      const mockUsers = [
        createMockUser({ name: 'user.est', tz: 'America/New_York' }),
        createMockUser({ name: 'user.pst', tz: 'America/Los_Angeles' }),
        createMockUser({ name: 'user.utc', tz: 'UTC' }),
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        timezone_filter: 'America/New_York',
        include_presence: false,
      });

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].name).toBe('user.est');
    });

    it('should filter by department', async () => {
      const mockUsers = [
        createMockUser({ 
          name: 'dev.user', 
          profile: { title: 'Software Developer' }
        }),
        createMockUser({ 
          name: 'design.user', 
          profile: { title: 'UI Designer' }
        }),
        createMockUser({ 
          name: 'marketing.user', 
          profile: { title: 'Marketing Manager' }
        }),
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        department_filter: 'developer',
        include_presence: false,
      });

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].name).toBe('dev.user');
    });

    it('should exclude deleted users by default', async () => {
      const mockUsers = [
        createMockUser({ name: 'active.user' }),
        createMockUser({ name: 'deleted.user', deleted: true }),
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        include_presence: false,
      });

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].name).toBe('active.user');
    });

    it('should include deleted users when requested', async () => {
      const mockUsers = [
        createMockUser({ name: 'active.user' }),
        createMockUser({ name: 'deleted.user', deleted: true }),
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        include_deleted: true,
        include_presence: false,
      });

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(2);
    });
  });

  describe('Presence Integration', () => {
    it('should include presence data when requested', async () => {
      const mockUsers = [
        {
          id: 'U1234567890',
          name: 'test.user',
          is_bot: false,
        },
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      mockUsersGetPresence.mockResolvedValue({
        presence: 'active',
        auto_away: false,
        manual_away: false,
        connection_count: 2,
        last_activity: 1234567890,
      });

      const result = await slackListUsersTool.execute({
        include_presence: true,
      });

      expect(result.success).toBe(true);
      expect(result.users[0].presence).toBeDefined();
      expect(result.users[0].presence.status).toBe('active');
      expect(result.users[0].presence.connection_count).toBe(2);
    });

    it('should handle presence API errors gracefully', async () => {
      const mockUsers = [
        {
          id: 'U1234567890',
          name: 'test.user',
          is_bot: false,
        },
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      mockUsersGetPresence.mockRejectedValue(new Error('Presence API error'));

      const result = await slackListUsersTool.execute({
        include_presence: true,
      });

      expect(result.success).toBe(true);
      expect(result.users[0].presence).toBeNull();
    });

    it('should skip presence for bots', async () => {
      const mockUsers = [
        {
          id: 'B1234567890',
          name: 'test.bot',
          is_bot: true,
        },
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        include_presence: true,
      });

      expect(result.success).toBe(true);
      expect(mockUsersGetPresence).not.toHaveBeenCalled();
    });

    it('should filter by presence status', async () => {
      const mockUsers = [
        { id: 'U1', name: 'user1', is_bot: false },
        { id: 'U2', name: 'user2', is_bot: false },
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      mockUsersGetPresence
        .mockResolvedValueOnce({ presence: 'active' })
        .mockResolvedValueOnce({ presence: 'away' });

      const result = await slackListUsersTool.execute({
        filter_by_status: 'active',
        include_presence: true,
      });

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].name).toBe('user1');
    });
  });

  describe('Sorting', () => {
    const createMockUsers = () => [
      {
        id: 'U1',
        name: 'charlie',
        real_name: 'Charlie Brown',
        profile: { display_name: 'CB' },
        is_bot: false,
      },
      {
        id: 'U2',
        name: 'alice',
        real_name: 'Alice Smith',
        profile: { display_name: 'Alice' },
        is_bot: false,
      },
      {
        id: 'U3',
        name: 'bob',
        real_name: 'Bob Johnson',
        profile: { display_name: 'Bobby' },
        is_bot: false,
      },
    ];

    it('should sort by name ascending (default)', async () => {
      mockUsersList.mockResolvedValue({
        members: createMockUsers(),
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        include_presence: false,
      });

      expect(result.success).toBe(true);
      expect(result.users.map((u: any) => u.name)).toEqual(['alice', 'bob', 'charlie']);
    });

    it('should sort by name descending', async () => {
      mockUsersList.mockResolvedValue({
        members: createMockUsers(),
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        sort_by: 'name',
        sort_direction: 'desc',
        include_presence: false,
      });

      expect(result.success).toBe(true);
      expect(result.users.map((u: any) => u.name)).toEqual(['charlie', 'bob', 'alice']);
    });

    it('should sort by real_name', async () => {
      mockUsersList.mockResolvedValue({
        members: createMockUsers(),
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        sort_by: 'real_name',
        include_presence: false,
      });

      expect(result.success).toBe(true);
      expect(result.users.map((u: any) => u.real_name)).toEqual(['Alice Smith', 'Bob Johnson', 'Charlie Brown']);
    });

    it('should sort by display_name', async () => {
      mockUsersList.mockResolvedValue({
        members: createMockUsers(),
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        sort_by: 'display_name',
        include_presence: false,
      });

      expect(result.success).toBe(true);
      expect(result.users.map((u: any) => u.profile.display_name)).toEqual(['Alice', 'Bobby', 'CB']);
    });
  });

  describe('Analytics', () => {
    it('should include profile analytics when requested', async () => {
      const mockUsers = [
        {
          id: 'U1234567890',
          name: 'test.user',
          real_name: 'Test User',
          profile: {
            display_name: 'Tester',
            email: 'test@example.com',
            title: 'Developer',
            image_72: 'https://cdn3.iconfinder.com/data/icons/business-and-it-person/512/4-512.png',
            status_text: 'Working',
            status_emoji: ':computer:',
          },
          is_bot: false,
          tz: 'America/New_York',
        },
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        include_profile_analytics: true,
        include_presence: false,
      });

      expect(result.success).toBe(true);
      expect(result.users[0].profile_analytics).toBeDefined();
      expect(result.users[0].profile_analytics.completeness_score).toBeGreaterThan(0);
      expect(result.users[0].profile_analytics.has_custom_avatar).toBe(true);
      expect(result.users[0].profile_analytics.has_job_title).toBe(true);
    });

    it('should include activity analytics when requested', async () => {
      const mockUsers = [
        {
          id: 'U1234567890',
          name: 'test.user',
          is_bot: false,
        },
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      mockUsersGetPresence.mockResolvedValue({
        presence: 'active',
        connection_count: 1,
      });

      const result = await slackListUsersTool.execute({
        include_activity_analytics: true,
        include_presence: true,
      });

      expect(result.success).toBe(true);
      expect(result.users[0].activity_analytics).toBeDefined();
      expect(result.users[0].activity_analytics.estimated_activity_level).toBeDefined();
    });

    it('should sort by profile score', async () => {
      const mockUsers = [
        {
          id: 'U1',
          name: 'incomplete.user',
          profile: {},
          is_bot: false,
        },
        {
          id: 'U2',
          name: 'complete.user',
          real_name: 'Complete User',
          profile: {
            display_name: 'Complete',
            email: 'complete@example.com',
            title: 'Developer',
            image_72: 'https://images01.nicepagecdn.com/page/34/34/html-template-preview-343452.jpg',
            status_text: 'Working',
          },
          tz: 'America/New_York',
          is_bot: false,
        },
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        sort_by: 'profile_score',
        sort_direction: 'desc',
        include_profile_analytics: true,
        include_presence: false,
      });

      expect(result.success).toBe(true);
      expect(result.users[0].name).toBe('complete.user');
      expect(result.users[1].name).toBe('incomplete.user');
    });
  });

  describe('Summary Statistics', () => {
    it('should generate comprehensive summary statistics', async () => {
      const mockUsers = [
        {
          id: 'U1',
          name: 'regular.user',
          is_bot: false,
          is_admin: false,
          is_owner: false,
          profile: { status_text: 'Working' },
          tz: 'America/New_York',
        },
        {
          id: 'U2',
          name: 'admin.user',
          is_bot: false,
          is_admin: true,
          is_owner: false,
          profile: {},
        },
        {
          id: 'B1',
          name: 'bot.user',
          is_bot: true,
          profile: {},
        },
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {},
      });

      mockUsersGetPresence
        .mockResolvedValueOnce({ presence: 'active' })
        .mockResolvedValueOnce({ presence: 'away' });

      const result = await slackListUsersTool.execute({
        include_presence: true,
        include_profile_analytics: true,
      });

      expect(result.success).toBe(true);
      expect(result.summary.total_users).toBe(3);
      expect(result.summary.by_type.regular).toBe(2);
      expect(result.summary.by_type.bot).toBe(1);
      expect(result.summary.by_role.admin).toBe(1);
      expect(result.summary.by_role.member).toBe(1);
      expect(result.summary.by_status.active).toBe(1);
      expect(result.summary.by_status.away).toBe(1);
      expect(result.summary.profile_stats.users_with_status).toBe(1);
      expect(result.summary.profile_stats.users_with_timezone).toBe(1);
    });
  });

  describe('Pagination', () => {
    it('should handle pagination correctly', async () => {
      const mockUsers = [
        { id: 'U1', name: 'user1', is_bot: false },
        { id: 'U2', name: 'user2', is_bot: false },
      ];

      mockUsersList.mockResolvedValue({
        members: mockUsers,
        response_metadata: {
          next_cursor: 'next_page_cursor',
        },
      });

      const result = await slackListUsersTool.execute({
        include_presence: false,
      });

      expect(result.success).toBe(true);
      expect(result.pagination.has_more).toBe(true);
      expect(result.pagination.next_cursor).toBe('next_page_cursor');
      expect(result.pagination.total_returned).toBe(2);
    });

    it('should pass cursor to API', async () => {
      mockUsersList.mockResolvedValue({
        members: [],
        response_metadata: {},
      });

      await slackListUsersTool.execute({
        cursor: 'test_cursor',
        include_presence: false,
      });

      expect(mockUsersList).toHaveBeenCalledWith({
        limit: 100,
        cursor: 'test_cursor',
        include_locale: false,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockUsersList.mockRejectedValue(new Error('API Error'));

      const result = await slackListUsersTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('API Error');
    });

    it('should handle missing members in response', async () => {
      mockUsersList.mockResolvedValue({
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to retrieve users');
    });
  });

  describe('Metadata', () => {
    it('should include comprehensive metadata', async () => {
      mockUsersList.mockResolvedValue({
        members: [],
        response_metadata: {},
      });

      const result = await slackListUsersTool.execute({
        filter_by_status: 'active',
        filter_by_role: 'admin',
        sort_by: 'real_name',
        sort_direction: 'desc',
        include_presence: true,
        include_profile_analytics: true,
      });

      expect(result.success).toBe(true);
      expect(result.metadata.filters_applied.status).toBe('active');
      expect(result.metadata.filters_applied.role).toBe('admin');
      expect(result.metadata.sorting.sort_by).toBe('real_name');
      expect(result.metadata.sorting.sort_direction).toBe('desc');
      expect(result.metadata.data_included.presence).toBe(true);
      expect(result.metadata.data_included.profile_analytics).toBe(true);
      expect(result.metadata.execution_time_ms).toBeGreaterThanOrEqual(0);
    });
  });
});

