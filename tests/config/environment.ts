
/**
 * Jest test setup configuration
 */
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

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

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidSlackResponse(): R;
      toHaveExecutionTime(maxMs: number): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidSlackResponse(received: any) {
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
    } else {
      return {
        message: () => `Expected ${received} to be a valid Slack response with success, metadata, and execution_time_ms`,
        pass: false,
      };
    }
  },

  toHaveExecutionTime(received: any, maxMs: number) {
    const executionTime = received?.metadata?.execution_time_ms;
    const pass = typeof executionTime === 'number' && executionTime <= maxMs;

    if (pass) {
      return {
        message: () => `Expected execution time ${executionTime}ms to be greater than ${maxMs}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected execution time ${executionTime}ms to be less than or equal to ${maxMs}ms`,
        pass: false,
      };
    }
  },
});
