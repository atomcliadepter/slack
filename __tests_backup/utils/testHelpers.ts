
import { jest } from '@jest/globals';
import { mockSlackWebClient, mockPerformanceMonitor, mockAIAnalytics } from '../mocks/slackApiMocks';

// Test helper utilities
export class TestHelpers {
  static setupMockSlackClient(responses: any = {}) {
    // Reset all mocks
    Object.values(mockSlackWebClient).forEach(category => {
      if (typeof category === 'object') {
        Object.values(category).forEach(method => {
          if (jest.isMockFunction(method)) {
            method.mockReset();
          }
        });
      }
    });

    // Apply custom responses
    Object.entries(responses).forEach(([category, methods]) => {
      if (mockSlackWebClient[category as keyof typeof mockSlackWebClient]) {
        Object.entries(methods as any).forEach(([method, response]) => {
          const mockMethod = (mockSlackWebClient[category as keyof typeof mockSlackWebClient] as any)[method];
          if (jest.isMockFunction(mockMethod)) {
            if (response instanceof Error) {
              mockMethod.mockRejectedValue(response);
            } else {
              mockMethod.mockResolvedValue(response);
            }
          }
        });
      }
    });

    return mockSlackWebClient;
  }

  static createMockError(code: string, message: string) {
    const error = new Error(message);
    (error as any).code = code;
    (error as any).data = { ok: false, error: code };
    return error;
  }

  static createPerformanceTimer() {
    const start = Date.now();
    return {
      end: () => ({
        duration: Date.now() - start,
        memory: process.memoryUsage().heapUsed
      })
    };
  }

  static async waitForAsync(fn: () => Promise<any>, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        return await fn();
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    throw new Error(`Async operation timed out after ${timeout}ms`);
  }

  static generateRandomString(length: number = 10) {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  static generateRandomChannel() {
    const id = `C${this.generateRandomString(9).toUpperCase()}`;
    const name = `test-${this.generateRandomString(8)}`;
    return {
      id,
      name,
      is_channel: true,
      is_member: true,
      created: Date.now() / 1000,
      creator: 'U1234567890'
    };
  }

  static generateRandomUser() {
    const id = `U${this.generateRandomString(9).toUpperCase()}`;
    const name = `user${this.generateRandomString(6)}`;
    return {
      id,
      name,
      real_name: `Test ${name}`,
      profile: {
        email: `${name}@example.com`,
        display_name: `Test ${name}`
      }
    };
  }

  static setupPerformanceMonitoring() {
    return {
      startTimer: jest.fn(() => this.createPerformanceTimer()),
      recordMetric: jest.fn(),
      getMetrics: jest.fn(() => ({
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0
      }))
    };
  }

  static setupAIAnalytics() {
    return {
      analyzeSentiment: jest.fn(() => ({
        score: 0.5,
        magnitude: 0.5,
        label: 'NEUTRAL'
      })),
      predictEngagement: jest.fn(() => ({
        score: 0.5,
        factors: [],
        recommendation: 'Standard engagement expected'
      })),
      analyzeContent: jest.fn(() => ({
        topics: [],
        readability: 0.5,
        sentiment: 'neutral'
      }))
    };
  }

  static createMockToolArgs(overrides: any = {}) {
    return {
      name: 'test-tool',
      arguments: {
        channel: 'C1234567890',
        ...overrides
      }
    };
  }

  static validateSlackResponse(response: any) {
    expect(response).toBeDefined();
    expect(typeof response).toBe('object');
    expect(response).toHaveProperty('ok');
    
    if (response.ok) {
      expect(response.ok).toBe(true);
    } else {
      expect(response).toHaveProperty('error');
      expect(typeof response.error).toBe('string');
    }
  }

  static validatePerformanceMetrics(metrics: any) {
    expect(metrics).toBeDefined();
    expect(typeof metrics).toBe('object');
    expect(metrics).toHaveProperty('duration');
    expect(typeof metrics.duration).toBe('number');
    expect(metrics.duration).toBeGreaterThanOrEqual(0);
  }

  static validateAIAnalytics(analytics: any) {
    expect(analytics).toBeDefined();
    expect(typeof analytics).toBe('object');
    
    if (analytics.sentiment) {
      expect(analytics.sentiment).toHaveProperty('score');
      expect(typeof analytics.sentiment.score).toBe('number');
      expect(analytics.sentiment.score).toBeGreaterThanOrEqual(-1);
      expect(analytics.sentiment.score).toBeLessThanOrEqual(1);
    }
  }

  static async runWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 5000,
    errorMessage: string = 'Operation timed out'
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });

    return Promise.race([promise, timeout]);
  }

  static createBulkTestData(count: number, generator: () => any) {
    return Array.from({ length: count }, generator);
  }

  static mockConsole() {
    const originalConsole = { ...console };
    const mockConsole = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    };

    Object.assign(console, mockConsole);

    return {
      restore: () => Object.assign(console, originalConsole),
      mocks: mockConsole
    };
  }

  static createRateLimitedMock(callsPerSecond: number = 1) {
    let lastCall = 0;
    const interval = 1000 / callsPerSecond;

    return jest.fn().mockImplementation(async (...args) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;
      
      if (timeSinceLastCall < interval) {
        const waitTime = interval - timeSinceLastCall;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      lastCall = Date.now();
      return { ok: true, args };
    });
  }
}

// Custom Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidSlackResponse(): R;
      toHavePerformanceMetrics(): R;
      toHaveAIAnalytics(): R;
    }
  }
}

export const customMatchers = {
  toBeValidSlackResponse(received: any) {
    const pass = received && 
                 typeof received === 'object' && 
                 'ok' in received &&
                 (received.ok === true || (received.ok === false && 'error' in received));
    
    return {
      message: () => `expected ${JSON.stringify(received)} to be a valid Slack API response`,
      pass
    };
  },

  toHavePerformanceMetrics(received: any) {
    const pass = received &&
                 typeof received === 'object' &&
                 'duration' in received &&
                 typeof received.duration === 'number' &&
                 received.duration >= 0;
    
    return {
      message: () => `expected ${JSON.stringify(received)} to have valid performance metrics`,
      pass
    };
  },

  toHaveAIAnalytics(received: any) {
    const pass = received &&
                 typeof received === 'object' &&
                 (('sentiment' in received) || ('engagement' in received) || ('content' in received));
    
    return {
      message: () => `expected ${JSON.stringify(received)} to have AI analytics data`,
      pass
    };
  }
};
