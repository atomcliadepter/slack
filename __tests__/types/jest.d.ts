/**
 * Custom Jest matchers type declarations
 */

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidSlackResponse(): R;
      toHaveExecutionTime(maxMs: number): R;
    }
  }
}

export {};
