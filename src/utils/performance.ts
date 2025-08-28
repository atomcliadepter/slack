/**
 * Performance monitoring and optimization utilities
 */

export interface PerformanceMetric {
  operation: string;
  duration: number;
  memory: number;
  timestamp: number;
  success: boolean;
  error?: any;
  errorCode?: string;
}

export interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  successRate: number;
  errorRate: number;
  memoryUsage: {
    average: number;
    peak: number;
  };
}

export interface TimeRange {
  start: number;
  end: number;
}

export interface PerformanceTimerInterface {
  end(options?: { error?: any }): PerformanceMetric;
}

/**
 * Performance monitoring class
 */
export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static readonly MAX_METRICS = 1000;

  /**
   * Start a performance timer
   */
  static startTimer(operation: string): PerformanceTimerInterface {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    return {
      end(options?: { error?: any }): PerformanceMetric {
        const endTime = Date.now();
        const endMemory = process.memoryUsage().heapUsed;
        
        const metric: PerformanceMetric = {
          operation,
          duration: endTime - startTime,
          memory: endMemory - startMemory,
          timestamp: startTime,
          success: !options?.error,
          error: options?.error,
          errorCode: options?.error?.code,
        };

        PerformanceMonitor.recordMetric(metric);
        return metric;
      }
    };
  }

  /**
   * Record a performance metric
   */
  static recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  /**
   * Get performance metrics
   */
  static getMetrics(operation?: string, timeRange?: TimeRange): PerformanceMetric[] {
    let filtered = this.metrics;

    if (operation) {
      filtered = filtered.filter(m => m.operation === operation);
    }

    if (timeRange) {
      filtered = filtered.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    return filtered;
  }

  /**
   * Get performance statistics
   */
  static getStats(operation: string): PerformanceStats {
    const metrics = this.getMetrics(operation);
    
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        successRate: 0,
        errorRate: 0,
        memoryUsage: {
          average: 0,
          peak: 0,
        },
      };
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const memoryUsages = metrics.map(m => Math.abs(m.memory));
    const successCount = metrics.filter(m => m.success).length;
    const errorCount = metrics.length - successCount;

    return {
      totalRequests: metrics.length,
      averageResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      minResponseTime: durations[0],
      maxResponseTime: durations[durations.length - 1],
      p95ResponseTime: durations[Math.floor(durations.length * 0.95)] || durations[durations.length - 1],
      p99ResponseTime: durations[Math.floor(durations.length * 0.99)] || durations[durations.length - 1],
      successRate: (successCount / metrics.length) * 100,
      errorRate: errorCount / metrics.length, // Return as decimal, not percentage
      memoryUsage: {
        average: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
        peak: Math.max(...memoryUsages),
      },
    };
  }

  /**
   * Generate performance report
   */
  static generateReport(operation: string, timeRange?: TimeRange): string {
    const stats = this.getStats(operation);
    const metrics = this.getMetrics(operation, timeRange);
    
    let report = `Performance Report for Operation: ${operation}\n`;
    report += `Total Requests: ${stats.totalRequests}\n`;
    report += `Average Response Time: ${stats.averageResponseTime.toFixed(2)}ms\n`;
    report += `95th Percentile: ${stats.p95ResponseTime.toFixed(2)}ms\n`;
    report += `Success Rate: ${stats.successRate.toFixed(2)}%\n`;
    
    if (timeRange) {
      report += `Time Range: ${new Date(timeRange.start).toISOString()} - ${new Date(timeRange.end).toISOString()}\n`;
    }
    
    return report;
  }

  /**
   * Detect performance anomalies
   */
  static detectAnomalies(operation: string): Array<{ metric: PerformanceMetric; reason: string }> {
    const metrics = this.getMetrics(operation);
    const anomalies: Array<{ metric: PerformanceMetric; reason: string }> = [];
    
    if (metrics.length === 0) return anomalies;

    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    const avgMemory = metrics.reduce((sum, m) => sum + Math.abs(m.memory), 0) / metrics.length;

    metrics.forEach(metric => {
      if (metric.duration > avgDuration * 3) {
        anomalies.push({ metric, reason: 'Slow operation detected' });
      }
      if (Math.abs(metric.memory) > avgMemory * 3) {
        anomalies.push({ metric, reason: 'High memory usage detected' });
      }
    });

    return anomalies;
  }

  /**
   * Get optimization recommendations
   */
  static getOptimizationRecommendations(operation: string): string[] {
    const stats = this.getStats(operation);
    const recommendations: string[] = [];

    if (stats.averageResponseTime > 1000) {
      recommendations.push('Consider implementing caching to reduce response times');
    }
    
    if (stats.errorRate > 10) {
      recommendations.push('Improve error handling to reduce failure rate');
    }
    
    if (stats.successRate > 95 && stats.averageResponseTime < 200) {
      recommendations.push('Performance looks good! Keep up the excellent work.');
    }

    return recommendations;
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
  }
}

/**
 * Performance monitoring decorator
 */
export function monitor(operation?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const timer = PerformanceMonitor.startTimer(operationName);
      
      try {
        const result = await method.apply(this, args);
        timer.end();
        return result;
      } catch (error) {
        timer.end({ error });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Monitor function performance
 */
export async function withPerformanceMonitoring<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const timer = PerformanceMonitor.startTimer(operation);
  
  try {
    const result = await fn();
    timer.end();
    return result;
  } catch (error) {
    timer.end({ error });
    throw error;
  }
}

/**
 * Simple performance timer utility
 */
export class PerformanceTimer {
  private marks: Map<string, number> = new Map();

  mark(name: string): void {
    this.marks.set(name, Date.now());
  }

  measure(name: string): number {
    const start = this.marks.get(name);
    if (!start) {
      throw new Error(`No mark found for: ${name}`);
    }
    return Date.now() - start;
  }

  clear(): void {
    this.marks.clear();
  }
}

/**
 * Exponential backoff utility
 */
export async function exponentialBackoff(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<void> {
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Batch process items with concurrency control
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  
  return results;
}
