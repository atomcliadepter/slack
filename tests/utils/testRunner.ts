/**
 * Test runner utilities for better test organization
 */

/**
 * Enhanced test runner with utilities
 */
export class TestRunner {
  /**
   * Run async tests with timeout
   */
  static async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number = 5000
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Test timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Retry flaky tests
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts) {
          break;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    }

    throw lastError;
  }
}

/**
 * Test performance measurement
 */
export class TestPerformance {
  private static measurements: Map<string, number[]> = new Map();

  /**
   * Measure test execution time
   */
  static async measure<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;

    // Store measurement
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);

    return { result, duration };
  }

  /**
   * Get performance statistics
   */
  static getStats(name: string) {
    const measurements = this.measurements.get(name) || [];
    if (measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((a, b) => a + b, 0);

    return {
      count: measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / measurements.length,
      median: sorted[Math.floor(sorted.length / 2)],
    };
  }

  /**
   * Clear measurements
   */
  static clear() {
    this.measurements.clear();
  }
}
