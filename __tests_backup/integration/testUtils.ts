
import dotenv from 'dotenv';
import path from 'path';

// Load test environment
dotenv.config({ path: path.join(__dirname, '../../.env.test') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const skipIntegration = !process.env.SLACK_BOT_TOKEN || process.env.SKIP_INTEGRATION_TESTS === 'true';

export const skipIfIntegrationDisabled = () => {
  if (skipIntegration) {
    return true;
  }
  return false;
};

export const testConfig = {
  // Test channel that should exist in your Slack workspace
  testChannel: process.env.TEST_CHANNEL || 'general',
  testChannelId: process.env.TEST_CHANNEL_ID || '',
  
  // Test user (can be your own user ID)
  testUserId: process.env.TEST_USER_ID || '',
  testUsername: process.env.TEST_USERNAME || '',
  
  // Test message content
  testMessage: 'Test message from Enhanced MCP Slack SDK integration tests',
  
  // File upload test
  testFilePath: path.join(__dirname, '../fixtures/test-file.txt'),
  
  // Status test
  testStatus: {
    text: 'Testing MCP SDK',
    emoji: ':test_tube:'
  }
};

export const createTestFile = async (): Promise<string> => {
  const fs = require('fs').promises;
  const testContent = 'This is a test file for MCP Slack SDK integration tests\nCreated at: ' + new Date().toISOString();
  
  // Ensure fixtures directory exists
  const fixturesDir = path.dirname(testConfig.testFilePath);
  await fs.mkdir(fixturesDir, { recursive: true });
  
  await fs.writeFile(testConfig.testFilePath, testContent);
  return testConfig.testFilePath;
};

export const cleanupTestFile = async (): Promise<void> => {
  const fs = require('fs').promises;
  try {
    await fs.unlink(testConfig.testFilePath);
  } catch (error) {
    // File might not exist, ignore error
  }
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Helper to generate unique test identifiers
export const generateTestId = (): string => {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Mock arguments for testing validation
export const mockValidArgs = {
  sendMessage: {
    channel: testConfig.testChannel,
    text: testConfig.testMessage
  },
  createChannel: {
    name: `test-channel-${generateTestId()}`,
    description: 'Test channel created by MCP SDK integration tests',
    isPrivate: false
  },
  getUserInfo: {
    userId: testConfig.testUserId || 'U1234567890'
  },
  getChannelHistory: {
    channel: testConfig.testChannel,
    limit: 10
  },
  searchMessages: {
    query: 'test',
    limit: 5
  },
  setStatus: {
    text: testConfig.testStatus.text,
    emoji: testConfig.testStatus.emoji
  },
  uploadFile: {
    channel: testConfig.testChannel,
    filePath: testConfig.testFilePath,
    title: 'Test File Upload',
    comment: 'Integration test file upload'
  },
  getWorkspaceInfo: {}
};

export const mockInvalidArgs = {
  sendMessage: [
    {}, // Missing required fields
    { channel: '', text: testConfig.testMessage }, // Empty channel
    { channel: testConfig.testChannel, text: '' }, // Empty text
  ],
  createChannel: [
    {}, // Missing name
    { name: '' }, // Empty name
    { name: 'invalid channel name with spaces and special chars!' }, // Invalid name format
  ],
  getUserInfo: [
    {}, // Missing userId
    { userId: '' }, // Empty userId
  ],
  getChannelHistory: [
    {}, // Missing channel
    { channel: '', limit: 10 }, // Empty channel
    { channel: testConfig.testChannel, limit: -1 }, // Invalid limit
  ],
  searchMessages: [
    {}, // Missing query
    { query: '', limit: 5 }, // Empty query
    { query: 'test', limit: -1 }, // Invalid limit
  ],
  setStatus: [
    {}, // Missing text
    { text: '', emoji: testConfig.testStatus.emoji }, // Empty text
  ],
  uploadFile: [
    {}, // Missing required fields
    { channel: '', filePath: testConfig.testFilePath }, // Empty channel
    { channel: testConfig.testChannel, filePath: '' }, // Empty filePath
    { channel: testConfig.testChannel, filePath: '/nonexistent/file.txt' }, // Non-existent file
  ],
  getWorkspaceInfo: [] // No invalid args for this tool
};
