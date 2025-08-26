"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Global test setup
beforeEach(() => {
    globals_1.jest.clearAllMocks();
    globals_1.jest.resetModules();
});
// Mock environment variables
process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
process.env.SLACK_USER_TOKEN = 'xoxp-test-token';
process.env.SLACK_SIGNING_SECRET = 'test-signing-secret';
process.env.NODE_ENV = 'test';
// Global test utilities
global.testUtils = {
    createMockSlackResponse: (data, ok = true) => ({
        ok,
        ...data,
        response_metadata: {
            next_cursor: ok ? 'next-cursor' : undefined
        }
    }),
    createMockError: (message, code = 'test_error') => ({
        ok: false,
        error: code,
        message
    }),
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
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
//# sourceMappingURL=testSetup.js.map