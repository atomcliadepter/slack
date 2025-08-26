
import { jest } from '@jest/globals';
import { TestHelpers } from '../../../helpers/testUtils';
import { testUsers, testErrors } from '../../../fixtures/testData';
import { mockSlackWebClient } from '../../../mocks/slackApi.mock';

// Mock the Slack client
jest.mock('../../../src/utils/slackClient', () => ({
  getSlackClient: jest.fn(() => mockSlackWebClient)
}));

describe('slackGetUserInfo', () => {
  let slackGetUserInfo: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../../../src/tools/slackGetUserInfo');
    slackGetUserInfo = module.default;
  });

  describe('Input Validation', () => {
    it('should validate required user parameter', async () => {
      const args = TestHelpers.createMockToolArgs({});
      delete args.arguments.user;

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('User ID or email is required');
    });

    it('should validate user ID format', async () => {
      const args = TestHelpers.createMockToolArgs({
        user: 'invalid-user-id'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid user ID format');
    });

    it('should validate email format', async () => {
      const args = TestHelpers.createMockToolArgs({
        user: 'invalid-email'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid email format');
    });

    it('should accept valid user IDs', async () => {
      TestHelpers.setupMockSlackClient({
        users: {
          info: { ok: true, user: testUsers.regular }
        }
      });

      const validUserIds = ['U1234567890', 'U0123456789', 'USLACKBOT'];

      for (const userId of validUserIds) {
        const args = TestHelpers.createMockToolArgs({ user: userId });
        const result = await slackGetUserInfo(args);
        expect(result.isError).toBe(false);
      }
    });

    it('should accept valid email addresses', async () => {
      TestHelpers.setupMockSlackClient({
        users: {
          lookupByEmail: { ok: true, user: testUsers.regular }
        }
      });

      const validEmails = ['test@example.com', 'user.name@domain.co.uk', 'test+tag@example.org'];

      for (const email of validEmails) {
        const args = TestHelpers.createMockToolArgs({ user: email });
        const result = await slackGetUserInfo(args);
        expect(result.isError).toBe(false);
      }
    });
  });

  describe('User Info Retrieval by ID', () => {
    it('should retrieve user info by ID successfully', async () => {
      TestHelpers.setupMockSlackClient({
        users: {
          info: { ok: true, user: testUsers.regular }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'U1234567890'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('User Information');
      expect(result.content[0].text).toContain(testUsers.regular.real_name);
      expect(result.content[0].text).toContain(testUsers.regular.profile.email);
      expect(mockSlackWebClient.users.info).toHaveBeenCalledWith({
        user: 'U1234567890'
      });
    });

    it('should retrieve bot user info successfully', async () => {
      TestHelpers.setupMockSlackClient({
        users: {
          info: { ok: true, user: testUsers.bot }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'B1234567890'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Bot User');
      expect(result.content[0].text).toContain(testUsers.bot.real_name);
    });

    it('should include locale information when available', async () => {
      const userWithLocale = {
        ...testUsers.regular,
        locale: 'en-US'
      };

      TestHelpers.setupMockSlackClient({
        users: {
          info: { ok: true, user: userWithLocale }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'U1234567890',
        include_locale: true
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Locale: en-US');
      expect(mockSlackWebClient.users.info).toHaveBeenCalledWith({
        user: 'U1234567890',
        include_locale: true
      });
    });
  });

  describe('User Info Retrieval by Email', () => {
    it('should retrieve user info by email successfully', async () => {
      TestHelpers.setupMockSlackClient({
        users: {
          lookupByEmail: { ok: true, user: testUsers.regular }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'test@example.com'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('User Information');
      expect(result.content[0].text).toContain(testUsers.regular.real_name);
      expect(mockSlackWebClient.users.lookupByEmail).toHaveBeenCalledWith({
        email: 'test@example.com'
      });
    });

    it('should handle email lookup with additional parameters', async () => {
      TestHelpers.setupMockSlackClient({
        users: {
          lookupByEmail: { ok: true, user: testUsers.regular }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'test@example.com',
        include_locale: true
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(false);
      expect(mockSlackWebClient.users.lookupByEmail).toHaveBeenCalledWith({
        email: 'test@example.com'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle user_not_found error', async () => {
      TestHelpers.setupMockSlackClient({
        users: {
          info: TestHelpers.createMockError('user_not_found', 'User not found')
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'U9999999999'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('User not found');
    });

    it('should handle users_not_found error for email lookup', async () => {
      TestHelpers.setupMockSlackClient({
        users: {
          lookupByEmail: TestHelpers.createMockError('users_not_found', 'No user found with this email')
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'nonexistent@example.com'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No user found with this email');
    });

    it('should handle invalid_auth error', async () => {
      TestHelpers.setupMockSlackClient({
        users: {
          info: TestHelpers.createMockError('invalid_auth', 'Invalid authentication token')
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'U1234567890'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid authentication token');
    });

    it('should handle rate limiting', async () => {
      TestHelpers.setupMockSlackClient({
        users: {
          info: TestHelpers.createMockError('rate_limited', 'Rate limit exceeded')
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'U1234567890'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      TestHelpers.setupMockSlackClient({
        users: {
          info: new Error('Network connection failed')
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'U1234567890'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network connection failed');
    });
  });

  describe('Response Formatting', () => {
    it('should format user information correctly', async () => {
      TestHelpers.setupMockSlackClient({
        users: {
          info: { ok: true, user: testUsers.regular }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'U1234567890'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(false);
      const content = result.content[0].text;
      
      // Check for key information
      expect(content).toContain(`ID: ${testUsers.regular.id}`);
      expect(content).toContain(`Name: ${testUsers.regular.name}`);
      expect(content).toContain(`Real Name: ${testUsers.regular.real_name}`);
      expect(content).toContain(`Email: ${testUsers.regular.profile.email}`);
      expect(content).toContain(`Display Name: ${testUsers.regular.profile.display_name}`);
      expect(content).toContain(`Time Zone: ${testUsers.regular.tz_label}`);
    });

    it('should handle missing profile information gracefully', async () => {
      const userWithoutProfile = {
        ...testUsers.regular,
        profile: {}
      };

      TestHelpers.setupMockSlackClient({
        users: {
          info: { ok: true, user: userWithoutProfile }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'U1234567890'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('User Information');
    });

    it('should indicate admin status when present', async () => {
      const adminUser = {
        ...testUsers.regular,
        is_admin: true,
        is_owner: true
      };

      TestHelpers.setupMockSlackClient({
        users: {
          info: { ok: true, user: adminUser }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'U1234567890'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Admin: Yes');
      expect(result.content[0].text).toContain('Owner: Yes');
    });
  });

  describe('Edge Cases', () => {
    it('should handle deleted users', async () => {
      const deletedUser = {
        ...testUsers.regular,
        deleted: true
      };

      TestHelpers.setupMockSlackClient({
        users: {
          info: { ok: true, user: deletedUser }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'U1234567890'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Status: Deleted');
    });

    it('should handle restricted users', async () => {
      const restrictedUser = {
        ...testUsers.regular,
        is_restricted: true,
        is_ultra_restricted: true
      };

      TestHelpers.setupMockSlackClient({
        users: {
          info: { ok: true, user: restrictedUser }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'U1234567890'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Restricted: Yes');
    });

    it('should handle empty response from Slack API', async () => {
      TestHelpers.setupMockSlackClient({
        users: {
          info: null
        }
      });

      const args = TestHelpers.createMockToolArgs({
        user: 'U1234567890'
      });

      const result = await slackGetUserInfo(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected response from Slack API');
    });
  });

  describe('Performance', () => {
    it('should handle concurrent user info requests', async () => {
      TestHelpers.setupMockSlackClient({
        users: {
          info: { ok: true, user: testUsers.regular }
        }
      });

      const promises = Array.from({ length: 10 }, (_, i) => {
        const args = TestHelpers.createMockToolArgs({
          user: `U${String(i).padStart(9, '0')}`
        });
        return slackGetUserInfo(args);
      });

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.isError).toBe(false);
      });

      expect(mockSlackWebClient.users.info).toHaveBeenCalledTimes(10);
    });
  });
});
