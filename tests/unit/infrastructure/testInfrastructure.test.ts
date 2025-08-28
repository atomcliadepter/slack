import { TestDataFactory } from '../../factories/testDataFactory';
import { SlackAPIMocks } from '../../mocks/slackApiMocks';
import { TestRunner, TestPerformance } from '../../utils/testRunner';

describe('Test Infrastructure', () => {
  beforeEach(() => {
    TestDataFactory.reset();
    SlackAPIMocks.clear();
  });

  describe('TestDataFactory', () => {
    it('should generate unique user IDs', () => {
      const user1 = TestDataFactory.createUser();
      const user2 = TestDataFactory.createUser();
      
      expect(user1.id).not.toBe(user2.id);
      expect(user1.id).toMatch(/^U\d{9}$/);
      expect(user2.id).toMatch(/^U\d{9}$/);
    });

    it('should generate unique channel IDs', () => {
      const channel1 = TestDataFactory.createChannel();
      const channel2 = TestDataFactory.createChannel();
      
      expect(channel1.id).not.toBe(channel2.id);
      expect(channel1.id).toMatch(/^C\d{9}$/);
      expect(channel2.id).toMatch(/^C\d{9}$/);
    });

    it('should generate unique timestamps', () => {
      const ts1 = TestDataFactory.generateTimestamp();
      const ts2 = TestDataFactory.generateTimestamp();
      
      expect(ts1).not.toBe(ts2);
      expect(ts1).toMatch(/^\d{10}\.\d{6}$/);
      expect(ts2).toMatch(/^\d{10}\.\d{6}$/);
    });

    it('should create realistic user data', () => {
      const user = TestDataFactory.createUser();
      
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('real_name');
      expect(user).toHaveProperty('profile');
      expect(user.profile).toHaveProperty('email');
      expect(user.is_bot).toBe(false);
      expect(user.deleted).toBe(false);
    });

    it('should create realistic channel data', () => {
      const channel = TestDataFactory.createChannel();
      
      expect(channel).toHaveProperty('id');
      expect(channel).toHaveProperty('name');
      expect(channel).toHaveProperty('is_channel');
      expect(channel).toHaveProperty('topic');
      expect(channel).toHaveProperty('purpose');
      expect(channel.is_archived).toBe(false);
    });

    it('should support overrides', () => {
      const user = TestDataFactory.createUser({ is_admin: true, name: 'custom-user' });
      
      expect(user.is_admin).toBe(true);
      expect(user.name).toBe('custom-user');
    });

    it('should create conversation history', () => {
      const history = TestDataFactory.createConversationHistory(3);
      
      expect(history.ok).toBe(true);
      expect(history.messages).toHaveLength(3);
      expect(history.has_more).toBe(false);
    });

    it('should reset counters', () => {
      TestDataFactory.createUser();
      TestDataFactory.createChannel();
      TestDataFactory.reset();
      
      const user = TestDataFactory.createUser();
      const channel = TestDataFactory.createChannel();
      
      expect(user.id).toBe('U000000001');
      expect(channel.id).toBe('C000000001');
    });
  });

  describe('SlackAPIMocks', () => {
    it('should set and get mock responses', () => {
      const mockResponse = { ok: true, user: 'test' };
      SlackAPIMocks.setResponse('users.info', mockResponse);
      
      const response = SlackAPIMocks.getResponse('users.info');
      expect(response).toEqual(mockResponse);
    });

    it('should setup successful responses', () => {
      SlackAPIMocks.setupSuccessfulResponses();
      
      const authResponse = SlackAPIMocks.getResponse('auth.test');
      const usersResponse = SlackAPIMocks.getResponse('users.list');
      
      expect(authResponse.ok).toBe(true);
      expect(usersResponse.ok).toBe(true);
      expect(usersResponse.members).toBeDefined();
    });

    it('should setup error responses', () => {
      SlackAPIMocks.setupErrorResponses();
      
      const authResponse = SlackAPIMocks.getResponse('auth.test');
      const userResponse = SlackAPIMocks.getResponse('users.info');
      
      expect(authResponse.ok).toBe(false);
      expect(authResponse.error).toBe('invalid_auth');
      expect(userResponse.ok).toBe(false);
      expect(userResponse.error).toBe('user_not_found');
    });

    it('should create mock WebClient', () => {
      SlackAPIMocks.setupSuccessfulResponses();
      const mockClient = SlackAPIMocks.createMockWebClient();
      
      expect(mockClient.auth.test).toBeDefined();
      expect(mockClient.users.info).toBeDefined();
      expect(mockClient.conversations.list).toBeDefined();
      expect(mockClient.chat.postMessage).toBeDefined();
    });

    it('should clear responses', () => {
      SlackAPIMocks.setResponse('test', { ok: true });
      SlackAPIMocks.clear();
      
      const response = SlackAPIMocks.getResponse('test');
      expect(response).toBeUndefined();
    });
  });

  describe('TestRunner', () => {
    it('should handle timeout operations', async () => {
      const fastOperation = () => Promise.resolve('success');
      
      const result = await TestRunner.withTimeout(fastOperation, 1000);
      expect(result).toBe('success');
    });

    it('should handle retry operations', async () => {
      let attempts = 0;
      const flakyOperation = () => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject(new Error('temporary failure'));
        }
        return Promise.resolve('success');
      };
      
      const result = await TestRunner.withRetry(flakyOperation, 3);
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });
  });

  describe('TestPerformance', () => {
    beforeEach(() => {
      TestPerformance.clear();
    });

    it('should measure execution time', async () => {
      const operation = () => new Promise(resolve => setTimeout(resolve, 10));
      
      const { result, duration } = await TestPerformance.measure('test-op', operation);
      
      expect(result).toBeUndefined();
      expect(duration).toBeGreaterThan(5);
    });

    it('should collect performance statistics', async () => {
      const operation = () => Promise.resolve('test');
      
      // Run multiple measurements
      await TestPerformance.measure('stats-test', operation);
      await TestPerformance.measure('stats-test', operation);
      await TestPerformance.measure('stats-test', operation);
      
      const stats = TestPerformance.getStats('stats-test');
      
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(3);
      expect(stats!.min).toBeGreaterThanOrEqual(0);
      expect(stats!.max).toBeGreaterThanOrEqual(stats!.min);
      expect(stats!.avg).toBeGreaterThanOrEqual(0);
    });

    it('should return null for non-existent measurements', () => {
      const stats = TestPerformance.getStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should clear measurements', async () => {
      const operation = () => Promise.resolve('test');
      await TestPerformance.measure('clear-test', operation);
      
      TestPerformance.clear();
      
      const stats = TestPerformance.getStats('clear-test');
      expect(stats).toBeNull();
    });
  });
});
