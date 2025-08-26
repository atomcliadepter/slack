
import { jest } from '@jest/globals';
import { TestHelpers } from '../../helpers/testUtils';

describe('error utilities', () => {
  let errorUtils: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../../../src/utils/error');
    errorUtils = module;
  });

  describe('SlackError', () => {
    it('should create SlackError with code and message', () => {
      const error = new errorUtils.SlackError('test_error', 'Test error message');
      
      expect(error.code).toBe('test_error');
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('SlackError');
      expect(error instanceof Error).toBe(true);
    });

    it('should create SlackError with additional data', () => {
      const data = { channel: 'C1234567890', user: 'U1234567890' };
      const error = new errorUtils.SlackError('test_error', 'Test error message', data);
      
      expect(error.code).toBe('test_error');
      expect(error.message).toBe('Test error message');
      expect(error.data).toEqual(data);
    });

    it('should have proper stack trace', () => {
      const error = new errorUtils.SlackError('test_error', 'Test error message');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('SlackError');
    });
  });

  describe('ValidationError', () => {
    it('should create ValidationError with field and message', () => {
      const error = new errorUtils.ValidationError('channel', 'Channel is required');
      
      expect(error.field).toBe('channel');
      expect(error.message).toBe('Channel is required');
      expect(error.name).toBe('ValidationError');
      expect(error instanceof errorUtils.SlackError).toBe(true);
    });

    it('should create ValidationError with value', () => {
      const error = new errorUtils.ValidationError('channel', 'Invalid channel format', 'invalid-channel');
      
      expect(error.field).toBe('channel');
      expect(error.message).toBe('Invalid channel format');
      expect(error.value).toBe('invalid-channel');
    });
  });

  describe('RateLimitError', () => {
    it('should create RateLimitError with retry after', () => {
      const error = new errorUtils.RateLimitError('Rate limit exceeded', 60);
      
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.retryAfter).toBe(60);
      expect(error.name).toBe('RateLimitError');
      expect(error.code).toBe('rate_limited');
    });

    it('should default retry after to 60 seconds', () => {
      const error = new errorUtils.RateLimitError('Rate limit exceeded');
      
      expect(error.retryAfter).toBe(60);
    });
  });

  describe('handleSlackError', () => {
    it('should handle known Slack API errors', () => {
      const slackResponse = {
        ok: false,
        error: 'channel_not_found',
        message: 'Channel not found'
      };

      const error = errorUtils.handleSlackError(slackResponse);

      expect(error).toBeInstanceOf(errorUtils.SlackError);
      expect(error.code).toBe('channel_not_found');
      expect(error.message).toContain('Channel not found');
    });

    it('should handle rate limit errors specifically', () => {
      const slackResponse = {
        ok: false,
        error: 'rate_limited',
        message: 'Rate limit exceeded'
      };

      const error = errorUtils.handleSlackError(slackResponse);

      expect(error).toBeInstanceOf(errorUtils.RateLimitError);
      expect(error.code).toBe('rate_limited');
      expect(error.retryAfter).toBe(60);
    });

    it('should handle errors with retry-after header', () => {
      const slackResponse = {
        ok: false,
        error: 'rate_limited',
        message: 'Rate limit exceeded'
      };

      const error = errorUtils.handleSlackError(slackResponse, { 'retry-after': '120' });

      expect(error).toBeInstanceOf(errorUtils.RateLimitError);
      expect(error.retryAfter).toBe(120);
    });

    it('should handle generic errors', () => {
      const slackResponse = {
        ok: false,
        error: 'unknown_error',
        message: 'Something went wrong'
      };

      const error = errorUtils.handleSlackError(slackResponse);

      expect(error).toBeInstanceOf(errorUtils.SlackError);
      expect(error.code).toBe('unknown_error');
      expect(error.message).toContain('Something went wrong');
    });

    it('should handle errors without message', () => {
      const slackResponse = {
        ok: false,
        error: 'test_error'
      };

      const error = errorUtils.handleSlackError(slackResponse);

      expect(error).toBeInstanceOf(errorUtils.SlackError);
      expect(error.code).toBe('test_error');
      expect(error.message).toContain('test_error');
    });
  });

  describe('formatErrorForUser', () => {
    it('should format SlackError for user display', () => {
      const error = new errorUtils.SlackError('channel_not_found', 'Channel not found');
      
      const formatted = errorUtils.formatErrorForUser(error);

      expect(formatted).toContain('Channel not found');
      expect(formatted).toContain('Error Code: channel_not_found');
    });

    it('should format ValidationError for user display', () => {
      const error = new errorUtils.ValidationError('channel', 'Channel is required');
      
      const formatted = errorUtils.formatErrorForUser(error);

      expect(formatted).toContain('Validation Error');
      expect(formatted).toContain('Field: channel');
      expect(formatted).toContain('Channel is required');
    });

    it('should format RateLimitError for user display', () => {
      const error = new errorUtils.RateLimitError('Rate limit exceeded', 120);
      
      const formatted = errorUtils.formatErrorForUser(error);

      expect(formatted).toContain('Rate limit exceeded');
      expect(formatted).toContain('Please try again in 120 seconds');
    });

    it('should format generic errors for user display', () => {
      const error = new Error('Generic error message');
      
      const formatted = errorUtils.formatErrorForUser(error);

      expect(formatted).toContain('Generic error message');
    });

    it('should handle errors without message', () => {
      const error = new Error();
      
      const formatted = errorUtils.formatErrorForUser(error);

      expect(formatted).toContain('An unknown error occurred');
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      const retryableErrors = [
        new errorUtils.RateLimitError('Rate limited'),
        new errorUtils.SlackError('internal_error', 'Internal error'),
        new errorUtils.SlackError('service_unavailable', 'Service unavailable'),
        new Error('Network error')
      ];

      retryableErrors.forEach(error => {
        expect(errorUtils.isRetryableError(error)).toBe(true);
      });
    });

    it('should identify non-retryable errors', () => {
      const nonRetryableErrors = [
        new errorUtils.SlackError('invalid_auth', 'Invalid token'),
        new errorUtils.SlackError('channel_not_found', 'Channel not found'),
        new errorUtils.ValidationError('channel', 'Invalid channel'),
        new errorUtils.SlackError('not_authed', 'Not authenticated')
      ];

      nonRetryableErrors.forEach(error => {
        expect(errorUtils.isRetryableError(error)).toBe(false);
      });
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff delay', () => {
      const delays = [
        errorUtils.getRetryDelay(0),
        errorUtils.getRetryDelay(1),
        errorUtils.getRetryDelay(2),
        errorUtils.getRetryDelay(3)
      ];

      expect(delays[0]).toBe(1000); // 1 second
      expect(delays[1]).toBe(2000); // 2 seconds
      expect(delays[2]).toBe(4000); // 4 seconds
      expect(delays[3]).toBe(8000); // 8 seconds
    });

    it('should respect maximum delay', () => {
      const delay = errorUtils.getRetryDelay(10);
      expect(delay).toBeLessThanOrEqual(30000); // Max 30 seconds
    });

    it('should handle rate limit errors with retry-after', () => {
      const error = new errorUtils.RateLimitError('Rate limited', 120);
      const delay = errorUtils.getRetryDelay(1, error);
      
      expect(delay).toBe(120000); // 120 seconds in milliseconds
    });
  });

  describe('Error Recovery', () => {
    it('should provide recovery suggestions for common errors', () => {
      const suggestions = errorUtils.getRecoverySuggestions('channel_not_found');
      
      expect(suggestions).toContain('Verify the channel ID or name');
      expect(suggestions).toContain('Check if the channel exists');
    });

    it('should provide generic suggestions for unknown errors', () => {
      const suggestions = errorUtils.getRecoverySuggestions('unknown_error');
      
      expect(suggestions).toContain('Check your network connection');
      expect(suggestions).toContain('Verify your Slack token');
    });

    it('should handle null or undefined error codes', () => {
      const suggestions = errorUtils.getRecoverySuggestions(null);
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Error Aggregation', () => {
    it('should aggregate multiple errors', () => {
      const errors = [
        new errorUtils.ValidationError('channel', 'Channel required'),
        new errorUtils.ValidationError('text', 'Text required'),
        new errorUtils.SlackError('invalid_auth', 'Invalid token')
      ];

      const aggregated = errorUtils.aggregateErrors(errors);

      expect(aggregated).toBeInstanceOf(errorUtils.SlackError);
      expect(aggregated.message).toContain('Multiple errors occurred');
      expect(aggregated.data.errors).toHaveLength(3);
    });

    it('should handle empty error array', () => {
      const aggregated = errorUtils.aggregateErrors([]);
      
      expect(aggregated).toBeNull();
    });

    it('should return single error when only one provided', () => {
      const error = new errorUtils.ValidationError('channel', 'Channel required');
      const aggregated = errorUtils.aggregateErrors([error]);
      
      expect(aggregated).toBe(error);
    });
  });
});
