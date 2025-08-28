/**
 * Circuit breaker pattern for handling repeated failures
 */

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number;  // Number of failures before opening
  resetTimeout: number;      // Time to wait before trying again (ms)
  monitoringPeriod: number;  // Time window for failure counting (ms)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private nextAttempt: number = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      ...options,
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
      }
      // Try to transition to half-open
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failures = 0;
    this.state = CircuitState.CLOSED;
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    const now = Date.now();
    
    // Reset failure count if last failure was outside monitoring period
    if (this.lastFailureTime > 0 && now - this.lastFailureTime > this.options.monitoringPeriod) {
      this.failures = 0;
    }
    
    this.failures++;
    this.lastFailureTime = now;

    if (this.failures >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = now + this.options.resetTimeout;
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
      isAvailable: this.state !== CircuitState.OPEN || Date.now() >= this.nextAttempt,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.lastFailureTime = 0;
    this.nextAttempt = 0;
  }
}
