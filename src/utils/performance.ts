/**
 * Performance optimization utilities
 */

/**
 * Exponential backoff delay
 */
export const exponentialBackoff = (attempt: number, baseDelay: number = 1000, maxDelay: number = 10000): Promise<void> => {
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * Batch process items with concurrency limit
 */
export const batchProcess = async <T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> => {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  
  return results;
};

/**
 * Debounce function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Performance timer for measuring execution time
 */
export class PerformanceTimer {
  private startTime: number;
  private marks: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  mark(label: string): void {
    this.marks.set(label, Date.now());
  }

  measure(label: string): number {
    const markTime = this.marks.get(label);
    if (!markTime) {
      throw new Error(`Mark '${label}' not found`);
    }
    return Date.now() - markTime;
  }

  elapsed(): number {
    return Date.now() - this.startTime;
  }

  getMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {
      total_elapsed: this.elapsed()
    };
    
    for (const [label, time] of this.marks) {
      metrics[`${label}_duration`] = Date.now() - time;
    }
    
    return metrics;
  }
}
