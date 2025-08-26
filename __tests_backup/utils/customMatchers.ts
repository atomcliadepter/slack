
import { customMatchers } from './testHelpers';

// Extend Jest with custom matchers
expect.extend(customMatchers);

// Type declarations for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidSlackResponse(): R;
      toHavePerformanceMetrics(): R;
      toHaveAIAnalytics(): R;
    }
  }
}
