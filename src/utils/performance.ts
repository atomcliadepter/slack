
// Simple console logger for performance monitoring
const logger = {
  createLogger: (name: string) => ({
    performance: (message: string, data?: any) => {
      console.log(`[${name}] ${message}`, data ? JSON.stringify(data) : '');
    },
    info: (message: string, data?: any) => {
      console.log(`[${name}] INFO: ${message}`, data ? JSON.stringify(data) : '');
    }
  })
};

export interface PerformanceMetrics {
  duration: number;
  memory: number;
  timestamp: number;
  operation: string;
  success: boolean;
  errorCode?: string;
}

export interface PerformanceTimer {
  end: (metadata?: any) => PerformanceMetrics;
}

export interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  memoryUsage: {
    average: number;
    peak: number;
  };
}

class PerformanceMonitorClass {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 10000;
  private readonly logger = logger.createLogger('PerformanceMonitor');

  startTimer(operation: string): PerformanceTimer {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    return {
      end: (metadata?: any) => {
        const endTime = Date.now();
        const endMemory = process.memoryUsage().heapUsed;
        
        const metrics: PerformanceMetrics = {
          duration: endTime - startTime,
          memory: endMemory - startMemory,
          timestamp: endTime,
          operation,
          success: !metadata?.error,
          errorCode: metadata?.error?.code
        };

        this.recordMetric(metrics);
        
        this.logger.performance(`${operation} completed`, {
          duration: `${metrics.duration}ms`,
          memory: `${metrics.memory} bytes`,
          success: metrics.success
        });

        return metrics;
      }
    };
  }

  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(operation?: string, timeRange?: { start: number; end: number }): PerformanceMetrics[] {
    let filteredMetrics = this.metrics;

    if (operation) {
      filteredMetrics = filteredMetrics.filter(m => m.operation === operation);
    }

    if (timeRange) {
      filteredMetrics = filteredMetrics.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    return filteredMetrics;
  }

  getStats(operation?: string, timeRange?: { start: number; end: number }): PerformanceStats {
    const metrics = this.getMetrics(operation, timeRange);
    
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        memoryUsage: { average: 0, peak: 0 }
      };
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const memoryUsages = metrics.map(m => Math.abs(m.memory));
    const errors = metrics.filter(m => !m.success);

    return {
      totalRequests: metrics.length,
      averageResponseTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      errorRate: errors.length / metrics.length,
      p95ResponseTime: this.getPercentile(durations, 95),
      p99ResponseTime: this.getPercentile(durations, 99),
      memoryUsage: {
        average: memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length,
        peak: Math.max(...memoryUsages)
      }
    };
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  generateReport(operation?: string, timeRange?: { start: number; end: number }): string {
    const stats = this.getStats(operation, timeRange);
    const metrics = this.getMetrics(operation, timeRange);
    
    const report = [
      '=== Performance Report ===',
      `Operation: ${operation || 'All'}`,
      `Time Range: ${timeRange ? `${new Date(timeRange.start).toISOString()} - ${new Date(timeRange.end).toISOString()}` : 'All time'}`,
      '',
      `Total Requests: ${stats.totalRequests}`,
      `Average Response Time: ${stats.averageResponseTime.toFixed(2)}ms`,
      `95th Percentile: ${stats.p95ResponseTime.toFixed(2)}ms`,
      `99th Percentile: ${stats.p99ResponseTime.toFixed(2)}ms`,
      `Error Rate: ${(stats.errorRate * 100).toFixed(2)}%`,
      '',
      `Average Memory Usage: ${(stats.memoryUsage.average / 1024 / 1024).toFixed(2)}MB`,
      `Peak Memory Usage: ${(stats.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB`,
      ''
    ];

    if (metrics.length > 0) {
      const recentMetrics = metrics.slice(-10);
      report.push('Recent Operations:');
      recentMetrics.forEach(metric => {
        report.push(
          `  ${new Date(metric.timestamp).toISOString()} - ${metric.operation}: ${metric.duration}ms ${metric.success ? '✓' : '✗'}`
        );
      });
    }

    return report.join('\n');
  }

  clearMetrics(): void {
    this.metrics = [];
    this.logger.info('Performance metrics cleared');
  }

  // Advanced analytics
  detectAnomalies(operation?: string): Array<{ metric: PerformanceMetrics; reason: string }> {
    const metrics = this.getMetrics(operation);
    const stats = this.getStats(operation);
    const anomalies: Array<{ metric: PerformanceMetrics; reason: string }> = [];

    metrics.forEach(metric => {
      // Detect slow operations (3x average)
      if (metric.duration > stats.averageResponseTime * 3) {
        anomalies.push({
          metric,
          reason: `Slow operation: ${metric.duration}ms (avg: ${stats.averageResponseTime.toFixed(2)}ms)`
        });
      }

      // Detect high memory usage (2x average)
      if (Math.abs(metric.memory) > stats.memoryUsage.average * 2) {
        anomalies.push({
          metric,
          reason: `High memory usage: ${(Math.abs(metric.memory) / 1024 / 1024).toFixed(2)}MB`
        });
      }
    });

    return anomalies;
  }

  getOptimizationRecommendations(operation?: string): string[] {
    const stats = this.getStats(operation);
    const recommendations: string[] = [];

    if (stats.averageResponseTime > 1000) {
      recommendations.push('Consider implementing caching to reduce response times');
    }

    if (stats.errorRate > 0.05) {
      recommendations.push('High error rate detected - review error handling and retry logic');
    }

    if (stats.p99ResponseTime > stats.averageResponseTime * 5) {
      recommendations.push('High response time variance - investigate outliers and bottlenecks');
    }

    if (stats.memoryUsage.peak > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage detected - review memory management and potential leaks');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! No immediate optimizations needed.');
    }

    return recommendations;
  }
}

export const PerformanceMonitor = new PerformanceMonitorClass();

// Decorator for automatic performance monitoring
export function monitor(operation?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const operationName = operation || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const timer = PerformanceMonitor.startTimer(operationName);
      
      try {
        const result = await method.apply(this, args);
        timer.end({ success: true });
        return result;
      } catch (error) {
        timer.end({ error });
        throw error;
      }
    };

    return descriptor;
  };
}

// Utility function for manual monitoring
export function withPerformanceMonitoring<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const timer = PerformanceMonitor.startTimer(operation);
  
  return fn()
    .then(result => {
      timer.end({ success: true });
      return result;
    })
    .catch(error => {
      timer.end({ error });
      throw error;
    });
}
