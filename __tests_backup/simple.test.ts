import { PerformanceMonitor } from '../src/utils/performance';
import { AIAnalytics } from '../src/utils/aiAnalytics';

describe('Simple Utility Tests', () => {
  describe('PerformanceMonitor', () => {
    it('should create and end a timer', () => {
      const timer = PerformanceMonitor.startTimer('test');
      const metrics = timer.end();
      
      expect(metrics.operation).toBe('test');
      expect(metrics.duration).toBeGreaterThanOrEqual(0);
      expect(typeof metrics.memory).toBe('number');
      expect(metrics.success).toBe(true);
    });

    it('should record metrics', () => {
      const metric = {
        duration: 100,
        memory: 1024,
        timestamp: Date.now(),
        operation: 'test',
        success: true
      };

      PerformanceMonitor.recordMetric(metric);
      const metrics = PerformanceMonitor.getMetrics('test');
      
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[metrics.length - 1]).toEqual(metric);
    });
  });

  describe('AIAnalytics', () => {
    it('should analyze sentiment', () => {
      const result = AIAnalytics.analyzeSentiment('This is a great day!');
      
      expect(result.label).toBe('POSITIVE');
      expect(result.score).toBeGreaterThan(0);
      expect(result.magnitude).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should predict engagement', () => {
      const result = AIAnalytics.predictEngagement('What do you think about this?');
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.factors)).toBe(true);
      expect(typeof result.recommendation).toBe('string');
    });

    it('should analyze content', () => {
      const result = AIAnalytics.analyzeContent('This is a test message for content analysis.');
      
      expect(result.wordCount).toBe(8);
      expect(result.readability).toBeGreaterThanOrEqual(0);
      expect(result.readability).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.topics)).toBe(true);
      expect(Array.isArray(result.keyPhrases)).toBe(true);
    });
  });
});
