import { jest } from '@jest/globals';

// Global test setup
beforeAll(() => {
  console.log('🧪 Global test setup completed');
});

afterAll(() => {
  console.log('🧹 Global test teardown completed');
});

// Mock environment variables
process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
process.env.NODE_ENV = 'test';
