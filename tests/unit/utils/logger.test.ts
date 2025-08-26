
import { jest } from '@jest/globals';
import { TestHelpers } from '../../helpers/testUtils';

describe('logger utilities', () => {
  let logger: any;
  let consoleMock: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    consoleMock = TestHelpers.mockConsole();
    const module = await import('../../../src/utils/logger');
    logger = module;
  });

  afterEach(() => {
    consoleMock.restore();
  });

  describe('Logger Creation', () => {
    it('should create logger with default configuration', () => {
      const testLogger = logger.createLogger('test');
      
      expect(testLogger).toBeDefined();
      expect(typeof testLogger.info).toBe('function');
      expect(typeof testLogger.error).toBe('function');
      expect(typeof testLogger.warn).toBe('function');
      expect(typeof testLogger.debug).toBe('function');
    });

    it('should create logger with custom configuration', () => {
      const config = {
        level: 'debug',
        format: 'json',
        includeTimestamp: true
      };

      const testLogger = logger.createLogger('test', config);
      
      expect(testLogger).toBeDefined();
    });
  });

  describe('Log Levels', () => {
    let testLogger: any;

    beforeEach(() => {
      testLogger = logger.createLogger('test');
    });

    it('should log info messages', () => {
      testLogger.info('Test info message');
      
      expect(consoleMock.mocks.log).toHaveBeenCalledWith(
        expect.stringContaining('INFO'),
        expect.stringContaining('Test info message')
      );
    });

    it('should log error messages', () => {
      testLogger.error('Test error message');
      
      expect(consoleMock.mocks.error).toHaveBeenCalledWith(
        expect.stringContaining('ERROR'),
        expect.stringContaining('Test error message')
      );
    });

    it('should log warning messages', () => {
      testLogger.warn('Test warning message');
      
      expect(consoleMock.mocks.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARN'),
        expect.stringContaining('Test warning message')
      );
    });

    it('should log debug messages when level allows', () => {
      const debugLogger = logger.createLogger('test', { level: 'debug' });
      debugLogger.debug('Test debug message');
      
      expect(consoleMock.mocks.debug).toHaveBeenCalledWith(
        expect.stringContaining('DEBUG'),
        expect.stringContaining('Test debug message')
      );
    });

    it('should not log debug messages when level is higher', () => {
      const infoLogger = logger.createLogger('test', { level: 'info' });
      infoLogger.debug('Test debug message');
      
      expect(consoleMock.mocks.debug).not.toHaveBeenCalled();
    });
  });

  describe('Message Formatting', () => {
    let testLogger: any;

    beforeEach(() => {
      testLogger = logger.createLogger('test');
    });

    it('should format messages with context', () => {
      const context = { userId: 'U1234567890', channel: 'C1234567890' };
      testLogger.info('User action', context);
      
      expect(consoleMock.mocks.log).toHaveBeenCalledWith(
        expect.stringContaining('User action'),
        expect.stringContaining('U1234567890'),
        expect.stringContaining('C1234567890')
      );
    });

    it('should format error objects', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      testLogger.error('Error occurred', { error });
      
      expect(consoleMock.mocks.error).toHaveBeenCalledWith(
        expect.stringContaining('Error occurred'),
        expect.stringContaining('Test error')
      );
    });

    it('should handle circular references in context', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      expect(() => testLogger.info('Circular test', circular)).not.toThrow();
    });
  });

  describe('Structured Logging', () => {
    it('should support structured logging format', () => {
      const structuredLogger = logger.createLogger('test', { format: 'json' });
      structuredLogger.info('Structured message', { key: 'value' });
      
      expect(consoleMock.mocks.log).toHaveBeenCalledWith(
        expect.stringMatching(/^\{.*\}$/) // JSON format
      );
    });

    it('should include timestamp when configured', () => {
      const timestampLogger = logger.createLogger('test', { includeTimestamp: true });
      timestampLogger.info('Timestamped message');
      
      expect(consoleMock.mocks.log).toHaveBeenCalledWith(
        expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) // ISO timestamp
      );
    });

    it('should include logger name in output', () => {
      const namedLogger = logger.createLogger('MyService');
      namedLogger.info('Named logger message');
      
      expect(consoleMock.mocks.log).toHaveBeenCalledWith(
        expect.stringContaining('MyService')
      );
    });
  });

  describe('Performance Logging', () => {
    let testLogger: any;

    beforeEach(() => {
      testLogger = logger.createLogger('test');
    });

    it('should log performance metrics', () => {
      const metrics = {
        duration: 150,
        memory: 1024,
        operation: 'slack_api_call'
      };

      testLogger.performance('API call completed', metrics);
      
      expect(consoleMock.mocks.info).toHaveBeenCalledWith(
        expect.stringContaining('API call completed'),
        expect.stringContaining('150ms'),
        expect.stringContaining('1024')
      );
    });

    it('should create performance timer', () => {
      const timer = testLogger.startTimer('test_operation');
      
      expect(timer).toBeDefined();
      expect(typeof timer.end).toBe('function');
    });

    it('should log timer results when ended', async () => {
      const timer = testLogger.startTimer('test_operation');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));
      
      timer.end();
      
      expect(consoleMock.mocks.info).toHaveBeenCalledWith(
        expect.stringContaining('test_operation completed'),
        expect.stringContaining('ms')
      );
    });
  });

  describe('Error Handling', () => {
    let testLogger: any;

    beforeEach(() => {
      testLogger = logger.createLogger('test');
    });

    it('should handle logging errors gracefully', () => {
      // Mock console.log to throw an error
      consoleMock.mocks.log.mockImplementation(() => {
        throw new Error('Console error');
      });

      expect(() => testLogger.info('Test message')).not.toThrow();
    });

    it('should log to fallback when primary logging fails', () => {
      consoleMock.mocks.log.mockImplementation(() => {
        throw new Error('Console error');
      });

      testLogger.info('Test message');
      
      // Should fallback to console.error
      expect(consoleMock.mocks.error).toHaveBeenCalled();
    });
  });

  describe('Log Filtering', () => {
    it('should filter sensitive information', () => {
      const sensitiveLogger = logger.createLogger('test', { filterSensitive: true });
      
      const sensitiveData = {
        token: 'xoxb-secret-token',
        password: 'secret123',
        message: 'This is safe'
      };

      sensitiveLogger.info('Sensitive data test', sensitiveData);
      
      const logCall = consoleMock.mocks.log.mock.calls[0][0];
      expect(logCall).not.toContain('xoxb-secret-token');
      expect(logCall).not.toContain('secret123');
      expect(logCall).toContain('This is safe');
    });

    it('should filter tokens in URLs', () => {
      const sensitiveLogger = logger.createLogger('test', { filterSensitive: true });
      
      sensitiveLogger.info('API call', {
        url: 'https://slack.com/api/chat.postMessage?token=xoxb-secret-token'
      });
      
      const logCall = consoleMock.mocks.log.mock.calls[0][0];
      expect(logCall).not.toContain('xoxb-secret-token');
      expect(logCall).toContain('[FILTERED]');
    });
  });

  describe('Log Aggregation', () => {
    let testLogger: any;

    beforeEach(() => {
      testLogger = logger.createLogger('test');
    });

    it('should aggregate similar log messages', () => {
      const aggregatingLogger = logger.createLogger('test', { aggregate: true });
      
      // Log the same message multiple times
      for (let i = 0; i < 5; i++) {
        aggregatingLogger.info('Repeated message');
      }
      
      // Should only log once with count
      expect(consoleMock.mocks.log).toHaveBeenCalledWith(
        expect.stringContaining('Repeated message'),
        expect.stringContaining('(5 times)')
      );
    });

    it('should flush aggregated logs periodically', async () => {
      const aggregatingLogger = logger.createLogger('test', { 
        aggregate: true,
        aggregateInterval: 100 
      });
      
      aggregatingLogger.info('Periodic message');
      
      // Wait for flush interval
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(consoleMock.mocks.log).toHaveBeenCalled();
    });
  });

  describe('Context Preservation', () => {
    let testLogger: any;

    beforeEach(() => {
      testLogger = logger.createLogger('test');
    });

    it('should preserve context across async operations', async () => {
      const contextLogger = testLogger.withContext({ requestId: 'req-123' });
      
      await new Promise(resolve => {
        setTimeout(() => {
          contextLogger.info('Async operation completed');
          resolve(undefined);
        }, 10);
      });
      
      expect(consoleMock.mocks.log).toHaveBeenCalledWith(
        expect.stringContaining('req-123')
      );
    });

    it('should merge contexts correctly', () => {
      const baseLogger = testLogger.withContext({ service: 'slack-sdk' });
      const requestLogger = baseLogger.withContext({ requestId: 'req-456' });
      
      requestLogger.info('Request processed');
      
      expect(consoleMock.mocks.log).toHaveBeenCalledWith(
        expect.stringContaining('slack-sdk'),
        expect.stringContaining('req-456')
      );
    });
  });

  describe('Edge Cases', () => {
    let testLogger: any;

    beforeEach(() => {
      testLogger = logger.createLogger('test');
    });

    it('should handle undefined and null values', () => {
      expect(() => testLogger.info(undefined)).not.toThrow();
      expect(() => testLogger.info(null)).not.toThrow();
      expect(() => testLogger.info('Message', null)).not.toThrow();
    });

    it('should handle very large objects', () => {
      const largeObject = {
        data: 'x'.repeat(10000),
        nested: {
          deep: {
            value: 'test'
          }
        }
      };

      expect(() => testLogger.info('Large object', largeObject)).not.toThrow();
    });

    it('should handle special characters and unicode', () => {
      const specialMessage = 'Special chars: 🚀 ñáéíóú 中文 العربية';
      
      expect(() => testLogger.info(specialMessage)).not.toThrow();
      expect(consoleMock.mocks.log).toHaveBeenCalledWith(
        expect.stringContaining('🚀')
      );
    });
  });
});
