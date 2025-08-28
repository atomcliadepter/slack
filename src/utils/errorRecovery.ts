/**
 * Error recovery utilities with intelligent retry logic
 */

import { exponentialBackoff } from './performance';
import { SlackAPIErrorHandler } from './slackErrors';
import { CircuitBreaker } from './circuitBreaker';

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

export class ErrorRecovery {
  private static circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create circuit breaker for a service
   */
  private static getCircuitBreaker(service: string): CircuitBreaker {
    if (!this.circuitBreakers.has(service)) {
      this.circuitBreakers.set(service, new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 30000, // 30 seconds
        monitoringPeriod: 120000, // 2 minutes
      }));
    }
    return this.circuitBreakers.get(service)!;
  }

  /**
   * Execute function with retry logic and circuit breaker
   */
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    service: string = 'default'
  ): Promise<T> {
    const config: RetryOptions = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryableErrors: [
        'rate_limited',
        'internal_error',
        'fatal_error',
        'timeout',
        'network_error',
      ],
      ...options,
    };

    const circuitBreaker = this.getCircuitBreaker(service);

    return circuitBreaker.execute(async () => {
      let lastError: any;

      for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
          return await fn();
        } catch (error: any) {
          lastError = error;

          // Don't retry on last attempt
          if (attempt === config.maxAttempts) {
            break;
          }

          // Check if error is retryable
          const isRetryable = this.isRetryableError(error, config.retryableErrors);
          if (!isRetryable) {
            break;
          }

          // Wait before retry
          await exponentialBackoff(attempt, config.baseDelay, config.maxDelay);
        }
      }

      throw lastError;
    });
  }

  /**
   * Check if error is retryable
   */
  private static isRetryableError(error: any, retryableErrors: string[]): boolean {
    // Check Slack API errors
    if (error?.code && SlackAPIErrorHandler.isRetryableError(error.code)) {
      return true;
    }

    // Check custom retryable errors
    if (error?.code && retryableErrors.includes(error.code)) {
      return true;
    }

    // Check error message for common retryable patterns
    const errorMessage = error?.message?.toLowerCase() || '';
    const retryablePatterns = [
      'timeout',
      'network',
      'connection',
      'temporary',
      'rate limit',
      'try again',
    ];

    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Graceful degradation - return fallback value on error
   */
  static async withFallback<T>(
    fn: () => Promise<T>,
    fallback: T,
    service: string = 'default'
  ): Promise<T> {
    try {
      return await this.executeWithRetry(fn, {}, service);
    } catch (error) {
      return fallback;
    }
  }

  /**
   * Execute with timeout
   */
  static async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
      ),
    ]);
  }

  /**
   * Get circuit breaker status for monitoring
   */
  static getCircuitBreakerStatus(service: string = 'default') {
    const circuitBreaker = this.circuitBreakers.get(service);
    return circuitBreaker?.getStatus() || null;
  }

  /**
   * Reset circuit breaker
   */
  static resetCircuitBreaker(service: string = 'default'): void {
    const circuitBreaker = this.circuitBreakers.get(service);
    circuitBreaker?.reset();
  }

  /**
   * Get all circuit breaker statuses
   */
  static getAllCircuitBreakerStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    for (const [service, breaker] of this.circuitBreakers) {
      statuses[service] = breaker.getStatus();
    }
    return statuses;
  }
}
