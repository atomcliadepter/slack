import { logger, createLogger } from '@/utils/logger';

// Mock console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

describe('Logger utilities', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
    info: jest.SpyInstance;
  };

  beforeEach(() => {
    // Mock console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    // Restore console methods
    Object.keys(consoleSpy).forEach(key => {
      (consoleSpy as any)[key].mockRestore();
    });
  });

  describe('Logger Creation', () => {
    it('should create logger with default configuration', () => {
      const testLogger = createLogger('test');
      
      expect(testLogger).toBeDefined();
      expect(typeof testLogger.info).toBe('function');
      expect(typeof testLogger.error).toBe('function');
      expect(typeof testLogger.warn).toBe('function');
      expect(typeof testLogger.debug).toBe('function');
    });

    it('should create logger with custom configuration', () => {
      const testLogger = createLogger('test', { level: 'DEBUG' });
      
      expect(testLogger).toBeDefined();
    });
  });

  describe('Logging Methods', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      
      expect(consoleSpy.info).toHaveBeenCalled();
      const callArgs = consoleSpy.info.mock.calls[0][0];
      expect(callArgs).toContain('Test info message');
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      
      expect(consoleSpy.error).toHaveBeenCalled();
      const callArgs = consoleSpy.error.mock.calls[0][0];
      expect(callArgs).toContain('Test error message');
    });

    it('should log warning messages', () => {
      logger.warn('Test warning message');
      
      expect(consoleSpy.warn).toHaveBeenCalled();
      const callArgs = consoleSpy.warn.mock.calls[0][0];
      expect(callArgs).toContain('Test warning message');
    });

    it('should log debug messages when level allows', () => {
      const debugLogger = createLogger('debug', { level: 'DEBUG' });
      debugLogger.debug('Test debug message');
      
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should not log debug messages when level is higher', () => {
      const infoLogger = createLogger('info', { level: 'INFO' });
      infoLogger.debug('Test debug message');
      
      // Debug messages should not be logged when level is INFO
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should format messages with context', () => {
      logger.info('Test message', { key: 'value' });
      
      expect(consoleSpy.info).toHaveBeenCalled();
      const callArgs = consoleSpy.info.mock.calls[0][0];
      expect(callArgs).toContain('Test message');
      expect(callArgs).toContain('key');
    });

    it('should format error objects', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      
      expect(consoleSpy.error).toHaveBeenCalled();
      const callArgs = consoleSpy.error.mock.calls[0][0];
      expect(callArgs).toContain('Error occurred');
    });

    it('should handle circular references in context', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      expect(() => {
        logger.info('Circular test', circular);
      }).not.toThrow();
      
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should support structured logging format', () => {
      logger.info('Structured message', { 
        userId: 'U123',
        action: 'test',
        timestamp: Date.now()
      });
      
      expect(consoleSpy.info).toHaveBeenCalled();
      const callArgs = consoleSpy.info.mock.calls[0][0];
      
      // Should be valid JSON
      expect(() => JSON.parse(callArgs)).not.toThrow();
      
      const parsed = JSON.parse(callArgs);
      expect(parsed.message).toBe('Structured message');
      expect(parsed.userId).toBe('U123');
    });
  });

  describe('Tool Logging', () => {
    it('should log tool execution', () => {
      logger.logToolExecution('test_tool', { param: 'value' }, 100);
      
      expect(consoleSpy.info).toHaveBeenCalled();
      const callArgs = consoleSpy.info.mock.calls[0][0];
      expect(callArgs).toContain('test_tool');
      expect(callArgs).toContain('100ms');
    });

    it('should log tool errors', () => {
      logger.logToolError('test_tool', 'Test error', { param: 'value' });
      
      expect(consoleSpy.error).toHaveBeenCalled();
      const callArgs = consoleSpy.error.mock.calls[0][0];
      expect(callArgs).toContain('test_tool');
      expect(callArgs).toContain('Test error');
    });
  });
});
