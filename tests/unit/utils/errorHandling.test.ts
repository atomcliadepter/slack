import { SlackAPIErrorHandler } from '../../../src/utils/slackErrors';
import { Validator } from '../../../src/utils/validator';
import { CircuitBreaker, CircuitState } from '../../../src/utils/circuitBreaker';
import { ErrorRecovery } from '../../../src/utils/errorRecovery';

describe('Enhanced Error Handling', () => {
  describe('SlackAPIErrorHandler', () => {
    it('should handle known Slack API errors', () => {
      const result = {
        ok: false as const,
        error: 'channel_not_found',
      };

      const errorResponse = SlackAPIErrorHandler.createErrorResponse(result);

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toContain('Channel not found');
      expect(errorResponse.error_code).toBe('channel_not_found');
      expect(errorResponse.suggested_action).toContain('Check channel exists');
      expect(errorResponse.is_retryable).toBe(false);
    });

    it('should handle unknown Slack API errors', () => {
      const result = {
        ok: false as const,
        error: 'unknown_error',
      };

      const errorResponse = SlackAPIErrorHandler.createErrorResponse(result);

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toContain('unknown_error');
      expect(errorResponse.suggested_action).toContain('Check Slack API documentation');
    });

    it('should identify retryable errors', () => {
      expect(SlackAPIErrorHandler.isRetryableError('rate_limited')).toBe(true);
      expect(SlackAPIErrorHandler.isRetryableError('internal_error')).toBe(true);
      expect(SlackAPIErrorHandler.isRetryableError('channel_not_found')).toBe(false);
    });
  });

  describe('Validator assertions', () => {
    it('should validate user IDs correctly', () => {
      expect(() => Validator.assertUserId('U1234567890')).not.toThrow();
      expect(() => Validator.assertUserId('invalid')).toThrow('Invalid user ID format');
      expect(() => Validator.assertUserId('')).toThrow('User ID is required');
    });

    it('should validate channel IDs correctly', () => {
      expect(() => Validator.assertChannelId('C1234567890')).not.toThrow();
      expect(() => Validator.assertChannelId('G1234567890')).not.toThrow();
      expect(() => Validator.assertChannelId('D1234567890')).not.toThrow();
      expect(() => Validator.assertChannelId('invalid')).toThrow('Invalid channel ID format');
    });

    it('should validate timestamps correctly', () => {
      expect(() => Validator.assertTimestamp('1234567890.123456')).not.toThrow();
      expect(() => Validator.assertTimestamp('invalid')).toThrow('Invalid timestamp format');
    });

    it('should validate emails correctly', () => {
      expect(() => Validator.assertEmail('test@example.com')).not.toThrow();
      expect(() => Validator.assertEmail('invalid-email')).toThrow('Invalid email format');
    });

    it('should validate and sanitize text', () => {
      expect(Validator.assertText('  hello world  ')).toBe('hello world');
      expect(() => Validator.assertText('')).toThrow('Text cannot be empty');
      expect(() => Validator.assertText('a'.repeat(5000))).toThrow('Text is too long');
    });
  });

  describe('CircuitBreaker', () => {
    it('should start in CLOSED state', () => {
      const breaker = new CircuitBreaker();
      expect(breaker.getStatus().state).toBe(CircuitState.CLOSED);
    });

    it('should open after failure threshold', async () => {
      const breaker = new CircuitBreaker({ 
        failureThreshold: 2, 
        resetTimeout: 1000,
        monitoringPeriod: 60000 // 1 minute
      });
      
      // First failure
      try {
        await breaker.execute(() => Promise.reject(new Error('test error')));
      } catch {}
      
      expect(breaker.getStatus().state).toBe(CircuitState.CLOSED);
      expect(breaker.getStatus().failures).toBe(1);
      
      // Second failure - should open circuit
      try {
        await breaker.execute(() => Promise.reject(new Error('test error')));
      } catch {}
      
      expect(breaker.getStatus().state).toBe(CircuitState.OPEN);
      expect(breaker.getStatus().failures).toBe(2);
    });

    it('should reject requests when OPEN', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 1000 });
      
      // Cause failure to open circuit
      try {
        await breaker.execute(() => Promise.reject(new Error('test error')));
      } catch {}
      
      // Should reject immediately
      await expect(
        breaker.execute(() => Promise.resolve('success'))
      ).rejects.toThrow('Circuit breaker is OPEN');
    });
  });

  describe('ErrorRecovery', () => {
    it('should retry on retryable errors', async () => {
      let attempts = 0;
      const fn = () => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('rate_limited');
          (error as any).code = 'rate_limited';
          throw error;
        }
        return Promise.resolve('success');
      };

      const result = await ErrorRecovery.executeWithRetry(fn, { maxAttempts: 3 });
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should not retry on non-retryable errors', async () => {
      let attempts = 0;
      const fn = () => {
        attempts++;
        const error = new Error('channel_not_found');
        (error as any).code = 'channel_not_found';
        throw error;
      };

      await expect(
        ErrorRecovery.executeWithRetry(fn, { maxAttempts: 3 })
      ).rejects.toThrow('channel_not_found');
      
      expect(attempts).toBe(1); // Should not retry
    });

    it('should provide fallback value', async () => {
      const fn = () => Promise.reject(new Error('test error'));
      const result = await ErrorRecovery.withFallback(fn, 'fallback');
      
      expect(result).toBe('fallback');
    });
  });
});
