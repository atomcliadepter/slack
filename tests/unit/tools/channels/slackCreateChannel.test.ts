
import { jest } from '@jest/globals';
import { TestHelpers } from '../../../helpers/testUtils';
import { testChannels, testErrors } from '../../../fixtures/testData';
import { mockSlackWebClient } from '../../../mocks/slackApi.mock';

// Mock the Slack client
jest.mock('../../../src/utils/slackClient', () => ({
  getSlackClient: jest.fn(() => mockSlackWebClient)
}));

// Mock performance monitoring
jest.mock('../../../src/utils/performance', () => ({
  PerformanceMonitor: {
    startTimer: jest.fn(() => ({
      end: jest.fn(() => ({ duration: 100, memory: 1024 }))
    })),
    recordMetric: jest.fn()
  }
}));

// Mock AI analytics
jest.mock('../../../src/utils/aiAnalytics', () => ({
  AIAnalytics: {
    analyzeChannelName: jest.fn(() => ({
      appropriateness: 0.9,
      suggestions: [],
      sentiment: 'neutral'
    }))
  }
}));

describe('slackCreateChannel', () => {
  let slackCreateChannel: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../../../src/tools/slackCreateChannel');
    slackCreateChannel = module.default;
  });

  describe('Input Validation', () => {
    it('should validate required channel name', async () => {
      const args = TestHelpers.createMockToolArgs({});
      delete args.arguments.name;

      const result = await slackCreateChannel(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Channel name is required');
    });

    it('should validate channel name format', async () => {
      const args = TestHelpers.createMockToolArgs({
        name: 'Invalid Channel Name!'
      });

      const result = await slackCreateChannel(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid channel name format');
    });

    it('should validate channel name length', async () => {
      const args = TestHelpers.createMockToolArgs({
        name: 'a'.repeat(22) // Too long
      });

      const result = await slackCreateChannel(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Channel name must be between 1 and 21 characters');
    });

    it('should accept valid channel names', async () => {
      TestHelpers.setupMockSlackClient({
        conversations: {
          create: testChannels.public
        }
      });

      const validNames = ['test', 'test-channel', 'test_channel', 'test123'];

      for (const name of validNames) {
        const args = TestHelpers.createMockToolArgs({ name });
        const result = await slackCreateChannel(args);
        expect(result.isError).toBe(false);
      }
    });
  });

  describe('Channel Creation', () => {
    it('should create public channel successfully', async () => {
      TestHelpers.setupMockSlackClient({
        conversations: {
          create: { ok: true, channel: testChannels.public }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        name: 'test-channel',
        is_private: false
      });

      const result = await slackCreateChannel(args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Channel created successfully');
      expect(mockSlackWebClient.conversations.create).toHaveBeenCalledWith({
        name: 'test-channel',
        is_private: false
      });
    });

    it('should create private channel successfully', async () => {
      TestHelpers.setupMockSlackClient({
        conversations: {
          create: { ok: true, channel: testChannels.private }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        name: 'private-channel',
        is_private: true
      });

      const result = await slackCreateChannel(args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Channel created successfully');
      expect(mockSlackWebClient.conversations.create).toHaveBeenCalledWith({
        name: 'private-channel',
        is_private: true
      });
    });

    it('should handle channel creation with team_id', async () => {
      TestHelpers.setupMockSlackClient({
        conversations: {
          create: { ok: true, channel: testChannels.public }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        name: 'test-channel',
        team_id: 'T1234567890'
      });

      const result = await slackCreateChannel(args);

      expect(result.isError).toBe(false);
      expect(mockSlackWebClient.conversations.create).toHaveBeenCalledWith({
        name: 'test-channel',
        team_id: 'T1234567890'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle name_taken error', async () => {
      TestHelpers.setupMockSlackClient({
        conversations: {
          create: TestHelpers.createMockError('name_taken', 'A channel with this name already exists')
        }
      });

      const args = TestHelpers.createMockToolArgs({
        name: 'existing-channel'
      });

      const result = await slackCreateChannel(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('A channel with this name already exists');
    });

    it('should handle invalid_name error', async () => {
      TestHelpers.setupMockSlackClient({
        conversations: {
          create: TestHelpers.createMockError('invalid_name', 'Invalid channel name')
        }
      });

      const args = TestHelpers.createMockToolArgs({
        name: 'invalid-name'
      });

      const result = await slackCreateChannel(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid channel name');
    });

    it('should handle rate limiting', async () => {
      TestHelpers.setupMockSlackClient({
        conversations: {
          create: TestHelpers.createMockError('rate_limited', 'Rate limit exceeded')
        }
      });

      const args = TestHelpers.createMockToolArgs({
        name: 'test-channel'
      });

      const result = await slackCreateChannel(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      TestHelpers.setupMockSlackClient({
        conversations: {
          create: new Error('Network error')
        }
      });

      const args = TestHelpers.createMockToolArgs({
        name: 'test-channel'
      });

      const result = await slackCreateChannel(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Network error');
    });
  });

  describe('Performance Monitoring', () => {
    it('should record performance metrics', async () => {
      TestHelpers.setupMockSlackClient({
        conversations: {
          create: { ok: true, channel: testChannels.public }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        name: 'test-channel'
      });

      await slackCreateChannel(args);

      // Verify performance monitoring was called
      const { PerformanceMonitor } = await import('../../../src/utils/performance');
      expect(PerformanceMonitor.startTimer).toHaveBeenCalled();
    });
  });

  describe('AI Analytics', () => {
    it('should analyze channel name appropriateness', async () => {
      TestHelpers.setupMockSlackClient({
        conversations: {
          create: { ok: true, channel: testChannels.public }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        name: 'test-channel'
      });

      await slackCreateChannel(args);

      // Verify AI analytics was called
      const { AIAnalytics } = await import('../../../src/utils/aiAnalytics');
      expect(AIAnalytics.analyzeChannelName).toHaveBeenCalledWith('test-channel');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response from Slack API', async () => {
      TestHelpers.setupMockSlackClient({
        conversations: {
          create: null
        }
      });

      const args = TestHelpers.createMockToolArgs({
        name: 'test-channel'
      });

      const result = await slackCreateChannel(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unexpected response from Slack API');
    });

    it('should handle malformed response', async () => {
      TestHelpers.setupMockSlackClient({
        conversations: {
          create: { ok: true } // Missing channel data
        }
      });

      const args = TestHelpers.createMockToolArgs({
        name: 'test-channel'
      });

      const result = await slackCreateChannel(args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid response format');
    });

    it('should handle very long channel names at boundary', async () => {
      TestHelpers.setupMockSlackClient({
        conversations: {
          create: { ok: true, channel: testChannels.public }
        }
      });

      const args = TestHelpers.createMockToolArgs({
        name: 'a'.repeat(21) // Exactly at limit
      });

      const result = await slackCreateChannel(args);

      expect(result.isError).toBe(false);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent channel creations', async () => {
      TestHelpers.setupMockSlackClient({
        conversations: {
          create: { ok: true, channel: testChannels.public }
        }
      });

      const promises = Array.from({ length: 5 }, (_, i) => {
        const args = TestHelpers.createMockToolArgs({
          name: `test-channel-${i}`
        });
        return slackCreateChannel(args);
      });

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.isError).toBe(false);
      });

      expect(mockSlackWebClient.conversations.create).toHaveBeenCalledTimes(5);
    });
  });
});
