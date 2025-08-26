declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidSlackResponse(): R;
            toHavePerformanceMetrics(): R;
            toHaveAIAnalytics(): R;
        }
    }
}
export {};
//# sourceMappingURL=customMatchers.d.ts.map