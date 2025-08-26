
import { jest } from '@jest/globals';

// Global test setup
beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});

// Mock environment variables
process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
process.env.SLACK_USER_TOKEN = 'xoxp-test-token';
process.env.SLACK_SIGNING_SECRET = 'test-signing-secret';
process.env.NODE_ENV = 'test';

// Global test utilities
(global as any).testUtils = {
  createMockSlackResponse: (data: any, ok = true) => ({
    ok,
    ...data,
    response_metadata: {
      next_cursor: ok ? 'next-cursor' : undefined
    }
  }),
  
  createMockError: (message: string, code = 'test_error') => ({
    ok: false,
    error: code,
    message
  }),

  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

// Extend Jest matchers
expect.extend({
  toBeValidSlackResponse(received) {
    const pass = received && typeof received === 'object' && 'ok' in received;
    return {
      message: () => `expected ${received} to be a valid Slack API response`,
      pass
    };
  }
});
