import { PerformanceTimer, batchProcess, exponentialBackoff } from '../../src/utils/performance';

describe('Performance Optimizations', () => {
  describe('PerformanceTimer', () => {
    it('should measure execution time accurately', async () => {
      const timer = new PerformanceTimer();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      timer.mark('operation1');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      timer.mark('operation2');
      
      const elapsed = timer.elapsed();
      const op1Duration = timer.measure('operation1');
      const op2Duration = timer.measure('operation2');
      
      expect(elapsed).toBeGreaterThan(140); // ~150ms total
      expect(op1Duration).toBeLessThan(100); // operation1 finished ~100ms ago
      expect(op2Duration).toBeLessThan(60);  // operation2 finished ~50ms ago
    });
  });

  describe('batchProcess', () => {
    it('should process items in batches with concurrency limit', async () => {
      const items = Array.from({ length: 10 }, (_, i) => i);
      const processedOrder: number[] = [];
      
      const processor = async (item: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        processedOrder.push(item);
        return item * 2;
      };
      
      const results = await batchProcess(items, processor, 3);
      
      expect(results).toHaveLength(10);
      expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
      // First 3 items should be processed first (in any order within the batch)
      expect(processedOrder.slice(0, 3).sort()).toEqual([0, 1, 2]);
    });
  });

  describe('exponentialBackoff', () => {
    it('should implement exponential backoff correctly', async () => {
      const start = Date.now();
      
      // First attempt: ~1000ms
      await exponentialBackoff(1);
      const first = Date.now() - start;
      
      // Second attempt: ~2000ms  
      await exponentialBackoff(2);
      const second = Date.now() - start;
      
      expect(first).toBeGreaterThan(900);
      expect(first).toBeLessThan(1200);
      expect(second).toBeGreaterThan(2900);
      expect(second).toBeLessThan(3500);
    });

    it('should respect max delay', async () => {
      const start = Date.now();
      
      // Large attempt number with small max delay
      await exponentialBackoff(10, 1000, 500);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThan(400);
      expect(elapsed).toBeLessThan(700); // Should be capped at 500ms
    });
  });
});
