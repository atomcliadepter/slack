declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidSlackResponse(): R;
            toHaveExecutionTime(maxMs: number): R;
        }
    }
}
export {};
//# sourceMappingURL=setup.d.ts.map