"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Jest test setup configuration
 */
const dotenv_1 = __importDefault(require("dotenv"));
// Load test environment variables
dotenv_1.default.config({ path: '.env.test' });
// Set test timeout
jest.setTimeout(30000);
// Mock console methods in test environment
if (process.env.NODE_ENV === 'test') {
    global.console = {
        ...console,
        // Uncomment to suppress logs during tests
        // log: jest.fn(),
        // debug: jest.fn(),
        // info: jest.fn(),
        // warn: jest.fn(),
        // error: jest.fn(),
    };
}
// Custom Jest matchers
expect.extend({
    toBeValidSlackResponse(received) {
        const pass = received &&
            typeof received === 'object' &&
            typeof received.success === 'boolean' &&
            received.metadata &&
            typeof received.metadata.execution_time_ms === 'number';
        if (pass) {
            return {
                message: () => `Expected ${received} not to be a valid Slack response`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `Expected ${received} to be a valid Slack response with success, metadata, and execution_time_ms`,
                pass: false,
            };
        }
    },
    toHaveExecutionTime(received, maxMs) {
        const executionTime = received?.metadata?.execution_time_ms;
        const pass = typeof executionTime === 'number' && executionTime <= maxMs;
        if (pass) {
            return {
                message: () => `Expected execution time ${executionTime}ms to be greater than ${maxMs}ms`,
                pass: true,
            };
        }
        else {
            return {
                message: () => `Expected execution time ${executionTime}ms to be less than or equal to ${maxMs}ms`,
                pass: false,
            };
        }
    },
});
//# sourceMappingURL=setup.js.map