"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockInvalidArgs = exports.mockValidArgs = exports.generateTestId = exports.delay = exports.cleanupTestFile = exports.createTestFile = exports.testConfig = exports.skipIfIntegrationDisabled = exports.skipIntegration = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load test environment
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env.test') });
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
exports.skipIntegration = !process.env.SLACK_BOT_TOKEN || process.env.SKIP_INTEGRATION_TESTS === 'true';
const skipIfIntegrationDisabled = () => {
    if (exports.skipIntegration) {
        return true;
    }
    return false;
};
exports.skipIfIntegrationDisabled = skipIfIntegrationDisabled;
exports.testConfig = {
    // Test channel that should exist in your Slack workspace
    testChannel: process.env.TEST_CHANNEL || 'general',
    testChannelId: process.env.TEST_CHANNEL_ID || '',
    // Test user (can be your own user ID)
    testUserId: process.env.TEST_USER_ID || '',
    testUsername: process.env.TEST_USERNAME || '',
    // Test message content
    testMessage: 'Test message from Enhanced MCP Slack SDK integration tests',
    // File upload test
    testFilePath: path_1.default.join(__dirname, '../fixtures/test-file.txt'),
    // Status test
    testStatus: {
        text: 'Testing MCP SDK',
        emoji: ':test_tube:'
    }
};
const createTestFile = async () => {
    const fs = require('fs').promises;
    const testContent = 'This is a test file for MCP Slack SDK integration tests\nCreated at: ' + new Date().toISOString();
    // Ensure fixtures directory exists
    const fixturesDir = path_1.default.dirname(exports.testConfig.testFilePath);
    await fs.mkdir(fixturesDir, { recursive: true });
    await fs.writeFile(exports.testConfig.testFilePath, testContent);
    return exports.testConfig.testFilePath;
};
exports.createTestFile = createTestFile;
const cleanupTestFile = async () => {
    const fs = require('fs').promises;
    try {
        await fs.unlink(exports.testConfig.testFilePath);
    }
    catch (error) {
        // File might not exist, ignore error
    }
};
exports.cleanupTestFile = cleanupTestFile;
const delay = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.delay = delay;
// Helper to generate unique test identifiers
const generateTestId = () => {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
exports.generateTestId = generateTestId;
// Mock arguments for testing validation
exports.mockValidArgs = {
    sendMessage: {
        channel: exports.testConfig.testChannel,
        text: exports.testConfig.testMessage
    },
    createChannel: {
        name: `test-channel-${(0, exports.generateTestId)()}`,
        description: 'Test channel created by MCP SDK integration tests',
        isPrivate: false
    },
    getUserInfo: {
        userId: exports.testConfig.testUserId || 'U1234567890'
    },
    getChannelHistory: {
        channel: exports.testConfig.testChannel,
        limit: 10
    },
    searchMessages: {
        query: 'test',
        limit: 5
    },
    setStatus: {
        text: exports.testConfig.testStatus.text,
        emoji: exports.testConfig.testStatus.emoji
    },
    uploadFile: {
        channel: exports.testConfig.testChannel,
        filePath: exports.testConfig.testFilePath,
        title: 'Test File Upload',
        comment: 'Integration test file upload'
    },
    getWorkspaceInfo: {}
};
exports.mockInvalidArgs = {
    sendMessage: [
        {}, // Missing required fields
        { channel: '', text: exports.testConfig.testMessage }, // Empty channel
        { channel: exports.testConfig.testChannel, text: '' }, // Empty text
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
        { channel: exports.testConfig.testChannel, limit: -1 }, // Invalid limit
    ],
    searchMessages: [
        {}, // Missing query
        { query: '', limit: 5 }, // Empty query
        { query: 'test', limit: -1 }, // Invalid limit
    ],
    setStatus: [
        {}, // Missing text
        { text: '', emoji: exports.testConfig.testStatus.emoji }, // Empty text
    ],
    uploadFile: [
        {}, // Missing required fields
        { channel: '', filePath: exports.testConfig.testFilePath }, // Empty channel
        { channel: exports.testConfig.testChannel, filePath: '' }, // Empty filePath
        { channel: exports.testConfig.testChannel, filePath: '/nonexistent/file.txt' }, // Non-existent file
    ],
    getWorkspaceInfo: [] // No invalid args for this tool
};
//# sourceMappingURL=testUtils.js.map