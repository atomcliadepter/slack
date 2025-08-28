
import { jest } from '@jest/globals';
import { TestHelpers } from '../../helpers/testUtils';

describe('performance utilities', () => {
  let performance: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('../../../src/utils/performance');
    performance = module;
    performance.PerformanceMonitor.clearMetrics();
  });

  describe('PerformanceMonitor', () => {
    describe('startTimer', () => {
      it('should create a timer for an operation', () => {
        const timer = performance.PerformanceMonitor.startTimer('test_operation');
        
        expect(timer).toBeDefined();
        expect(typeof timer.end).toBe('function');
      });

      it('should measure operation duration', async () => {
        const timer = performance.PerformanceMonitor.startTimer('test_operation');
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const metrics = timer.end();
        
        expect(metrics.duration).toBeGreaterThanOrEqual(50);
        expect(metrics.operation).toBe('test_operation');
        expect(metrics.success).toBe(true);
      });

      it('should measure memory usage', () => {
        const timer = performance.PerformanceMonitor.startTimer('test_operation');
        
        // Allocate some memory
        const largeArray = new Array(1000).fill('test');
        
        const metrics = timer.end();
        
        expect(typeof metrics.memory).toBe('number');
        expect(metrics.timestamp).toBeGreaterThan(0);
      });

      it('should handle operation errors', () => {
        const timer = performance.PerformanceMonitor.startTimer('test_operation');
        
        const error = new Error('Test error');
        const metrics = timer.end({ error });
        
        expect(metrics.success).toBe(false);
        expect(metrics.errorCode).toBeUndefined(); // Error without code
      });

      it('should record error codes', () => {
        const timer = performance.PerformanceMonitor.startTimer('test_operation');
        
        const error = { code: 'TEST_ERROR' };
        const metrics = timer.end({ error });
        
        expect(metrics.success).toBe(false);
        expect(metrics.errorCode).toBe('TEST_ERROR');
      });
    });

    describe('recordMetric', () => {
      it('should record performance metrics', () => {
        const metric = {
          duration: 100,
          memory: 1024,
          timestamp: Date.now(),
          operation: 'test_operation',
          success: true
        };

        performance.PerformanceMonitor.recordMetric(metric);
        
        const metrics = performance.PerformanceMonitor.getMetrics();
        expect(metrics).toContain(metric);
      });

      it('should limit stored metrics to prevent memory leaks', () => {
        const maxMetrics = 10000;
        
        // Add more than max metrics
        for (let i = 0; i < maxMetrics + 100; i++) {
          performance.PerformanceMonitor.recordMetric({
            duration: i,
            memory: 1024,
            timestamp: Date.now(),
            operation: `test_operation_${i}`,
            success: true
          });
        }
        
        const metrics = performance.PerformanceMonitor.getMetrics();
        expect(metrics.length).toBeLessThanOrEqual(maxMetrics);
      });
    });

    describe('getMetrics', () => {
      beforeEach(() => {
        // Add test metrics
        const baseTime = Date.now();
        const testMetrics = [
          {
            duration: 100,
            memory: 1024,
            timestamp: baseTime,
            operation: 'operation_a',
            success: true
          },
          {
            duration: 200,
            memory: 2048,
            timestamp: baseTime + 1000,
            operation: 'operation_b',
            success: false
          },
          {
            duration: 150,
            memory: 1536,
            timestamp: baseTime + 2000,
            operation: 'operation_a',
            success: true
          }
        ];

        testMetrics.forEach(metric => {
          performance.PerformanceMonitor.recordMetric(metric);
        });
      });

      it('should return all metrics when no filter applied', () => {
        const metrics = performance.PerformanceMonitor.getMetrics();
        expect(metrics.length).toBe(3);
      });

      it('should filter metrics by operation', () => {
        const metrics = performance.PerformanceMonitor.getMetrics('operation_a');
        expect(metrics.length).toBe(2);
        expect(metrics.every((m: any) => m.operation === 'operation_a')).toBe(true);
      });

      it('should filter metrics by time range', () => {
        const baseTime = Date.now();
        const timeRange = {
          start: baseTime + 500,
          end: baseTime + 1500
        };
        
        const metrics = performance.PerformanceMonitor.getMetrics(undefined, timeRange);
        expect(metrics.length).toBe(1);
        expect(metrics[0].operation).toBe('operation_b');
      });

      it('should filter by both operation and time range', () => {
        const baseTime = Date.now();
        const timeRange = {
          start: baseTime + 1500,
          end: baseTime + 2500
        };
        
        const metrics = performance.PerformanceMonitor.getMetrics('operation_a', timeRange);
        expect(metrics.length).toBe(1);
        expect(metrics[0].duration).toBe(150);
      });
    });

    describe('getStats', () => {
      beforeEach(() => {
        // Add test metrics with known values
        const testMetrics = [
          { duration: 100, memory: 1000, timestamp: Date.now(), operation: 'test', success: true },
          { duration: 200, memory: 2000, timestamp: Date.now(), operation: 'test', success: true },
          { duration: 300, memory: 3000, timestamp: Date.now(), operation: 'test', success: false },
          { duration: 400, memory: 4000, timestamp: Date.now(), operation: 'test', success: true },
          { duration: 500, memory: 5000, timestamp: Date.now(), operation: 'test', success: true }
        ];

        testMetrics.forEach(metric => {
          performance.PerformanceMonitor.recordMetric(metric);
        });
      });

      it('should calculate correct statistics', () => {
        const stats = performance.PerformanceMonitor.getStats('test');
        
        expect(stats.totalRequests).toBe(5);
        expect(stats.averageResponseTime).toBe(300); // (100+200+300+400+500)/5
        expect(stats.errorRate).toBe(0.2); // 1 error out of 5
        expect(stats.memoryUsage.average).toBe(3000); // (1000+2000+3000+4000+5000)/5
        expect(stats.memoryUsage.peak).toBe(5000);
      });

      it('should calculate percentiles correctly', () => {
        const stats = performance.PerformanceMonitor.getStats('test');
        
        // For sorted array [100, 200, 300, 400, 500]
        expect(stats.p95ResponseTime).toBe(500); // 95th percentile
        expect(stats.p99ResponseTime).toBe(500); // 99th percentile
      });

      it('should return zero stats for empty metrics', () => {
        const stats = performance.PerformanceMonitor.getStats('nonexistent');
        
        expect(stats.totalRequests).toBe(0);
        expect(stats.averageResponseTime).toBe(0);
        expect(stats.errorRate).toBe(0);
        expect(stats.p95ResponseTime).toBe(0);
        expect(stats.p99ResponseTime).toBe(0);
        expect(stats.memoryUsage.average).toBe(0);
        expect(stats.memoryUsage.peak).toBe(0);
      });
    });

    describe('generateReport', () => {
      beforeEach(() => {
        const testMetrics = [
          { duration: 100, memory: 1000, timestamp: Date.now(), operation: 'test', success: true },
          { duration: 200, memory: 2000, timestamp: Date.now(), operation: 'test', success: false }
        ];

        testMetrics.forEach(metric => {
          performance.PerformanceMonitor.recordMetric(metric);
        });
      });

      it('should generate comprehensive performance report', () => {
        const report = performance.PerformanceMonitor.generateReport('test');
        
        expect(report).toContain('Performance Report');
        expect(report).toContain('Operation: test');
        expect(report).toContain('Total Requests: 2');
        expect(report).toContain('Average Response Time: 150.00ms');
        expect(report).toContain('Error Rate: 50.00%');
        expect(report).toContain('Recent Operations:');
      });

      it('should handle time range in report', () => {
        const now = Date.now();
        const timeRange = { start: now - 1000, end: now + 1000 };
        
        const report = performance.PerformanceMonitor.generateReport('test', timeRange);
        
        expect(report).toContain('Time Range:');
        expect(report).toContain(new Date(timeRange.start).toISOString());
      });
    });

    describe('detectAnomalies', () => {
      beforeEach(() => {
        // Add normal metrics
        for (let i = 0; i < 10; i++) {
          performance.PerformanceMonitor.recordMetric({
            duration: 100 + Math.random() * 20, // 100-120ms
            memory: 1000 + Math.random() * 200, // 1000-1200 bytes
            timestamp: Date.now(),
            operation: 'normal',
            success: true
          });
        }

        // Add anomalous metrics
        performance.PerformanceMonitor.recordMetric({
          duration: 1000, // Very slow
          memory: 1100,
          timestamp: Date.now(),
          operation: 'normal',
          success: true
        });

        performance.PerformanceMonitor.recordMetric({
          duration: 110,
          memory: 10000, // High memory usage
          timestamp: Date.now(),
          operation: 'normal',
          success: true
        });
      });

      it('should detect slow operations', () => {
        const anomalies = performance.PerformanceMonitor.detectAnomalies('normal');
        
        const slowAnomalies = anomalies.filter((a: any) => a.reason.includes('Slow operation'));
        expect(slowAnomalies.length).toBeGreaterThan(0);
      });

      it('should detect high memory usage', () => {
        const anomalies = performance.PerformanceMonitor.detectAnomalies('normal');
        
        const memoryAnomalies = anomalies.filter((a: any) => a.reason.includes('High memory usage'));
        expect(memoryAnomalies.length).toBeGreaterThan(0);
      });
    });

    describe('getOptimizationRecommendations', () => {
      it('should recommend caching for slow operations', () => {
        // Add slow metrics
        for (let i = 0; i < 5; i++) {
          performance.PerformanceMonitor.recordMetric({
            duration: 2000, // 2 seconds
            memory: 1000,
            timestamp: Date.now(),
            operation: 'slow',
            success: true
          });
        }

        const recommendations = performance.PerformanceMonitor.getOptimizationRecommendations('slow');
        
        expect(recommendations.some((r: any) => r.includes('caching'))).toBe(true);
      });

      it('should recommend error handling for high error rates', () => {
        // Add metrics with high error rate
        for (let i = 0; i < 10; i++) {
          performance.PerformanceMonitor.recordMetric({
            duration: 100,
            memory: 1000,
            timestamp: Date.now(),
            operation: 'error_prone',
            success: i < 3 // 70% error rate
          });
        }

        const recommendations = performance.PerformanceMonitor.getOptimizationRecommendations('error_prone');
        
        expect(recommendations.some((r: any) => r.includes('error handling'))).toBe(true);
      });

      it('should provide positive feedback for good performance', () => {
        // Add good metrics
        for (let i = 0; i < 5; i++) {
          performance.PerformanceMonitor.recordMetric({
            duration: 50, // Fast
            memory: 500, // Low memory
            timestamp: Date.now(),
            operation: 'good',
            success: true
          });
        }

        const recommendations = performance.PerformanceMonitor.getOptimizationRecommendations('good');
        
        expect(recommendations.some((r: any) => r.includes('looks good'))).toBe(true);
      });
    });
  });

  describe('monitor decorator', () => {
    it('should automatically monitor decorated methods', async () => {
      class TestClass {
        @performance.monitor('test_method')
        async testMethod(delay: number = 10) {
          await new Promise(resolve => setTimeout(resolve, delay));
          return 'success';
        }
      }

      const instance = new TestClass();
      const result = await instance.testMethod(20);
      
      expect(result).toBe('success');
      
      const metrics = performance.PerformanceMonitor.getMetrics('test_method');
      expect(metrics.length).toBe(1);
      expect(metrics[0].duration).toBeGreaterThanOrEqual(20);
      expect(metrics[0].success).toBe(true);
    });

    it('should monitor method errors', async () => {
      class TestClass {
        @performance.monitor('error_method')
        async errorMethod() {
          throw new Error('Test error');
        }
      }

      const instance = new TestClass();
      
      await expect(instance.errorMethod()).rejects.toThrow('Test error');
      
      const metrics = performance.PerformanceMonitor.getMetrics('error_method');
      expect(metrics.length).toBe(1);
      expect(metrics[0].success).toBe(false);
    });
  });

  describe('withPerformanceMonitoring', () => {
    it('should monitor async functions', async () => {
      const result = await performance.withPerformanceMonitoring(
        'test_function',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 30));
          return 'completed';
        }
      );

      expect(result).toBe('completed');
      
      const metrics = performance.PerformanceMonitor.getMetrics('test_function');
      expect(metrics.length).toBe(1);
      expect(metrics[0].duration).toBeGreaterThanOrEqual(30);
      expect(metrics[0].success).toBe(true);
    });

    it('should handle function errors', async () => {
      await expect(
        performance.withPerformanceMonitoring(
          'error_function',
          async () => {
            throw new Error('Function error');
          }
        )
      ).rejects.toThrow('Function error');
      
      const metrics = performance.PerformanceMonitor.getMetrics('error_function');
      expect(metrics.length).toBe(1);
      expect(metrics[0].success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short operations', () => {
      const timer = performance.PerformanceMonitor.startTimer('instant');
      const metrics = timer.end();
      
      expect(metrics.duration).toBeGreaterThanOrEqual(0);
      expect(metrics.operation).toBe('instant');
    });

    it('should handle operations with zero memory change', () => {
      const timer = performance.PerformanceMonitor.startTimer('no_memory');
      const metrics = timer.end();
      
      expect(typeof metrics.memory).toBe('number');
      expect(metrics.timestamp).toBeGreaterThan(0);
    });

    it('should handle concurrent timers', async () => {
      const timer1 = performance.PerformanceMonitor.startTimer('concurrent_1');
      const timer2 = performance.PerformanceMonitor.startTimer('concurrent_2');
      
      await Promise.all([
        new Promise(resolve => setTimeout(() => {
          timer1.end();
          resolve(undefined);
        }, 20)),
        new Promise(resolve => setTimeout(() => {
          timer2.end();
          resolve(undefined);
        }, 30))
      ]);
      
      const metrics = performance.PerformanceMonitor.getMetrics();
      expect(metrics.length).toBe(2);
      expect(metrics.some((m: any) => m.operation === 'concurrent_1')).toBe(true);
      expect(metrics.some((m: any) => m.operation === 'concurrent_2')).toBe(true);
    });
  });
});
