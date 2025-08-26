export declare class TestHelpers {
    static setupMockSlackClient(responses?: any): {
        chat: {
            postMessage: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            update: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            delete: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            getPermalink: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            scheduleMessage: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            deleteScheduledMessage: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        };
        conversations: {
            create: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            archive: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            unarchive: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            join: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            leave: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            list: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            history: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            members: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            info: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            mark: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            setTopic: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            setPurpose: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        };
        users: {
            list: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            info: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            lookupByEmail: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            setPresence: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            profile: {
                set: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
                get: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            };
        };
        files: {
            upload: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            delete: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            info: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            list: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        };
        reactions: {
            add: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            remove: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            get: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            list: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        };
        pins: {
            add: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            remove: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            list: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        };
        bookmarks: {
            add: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            edit: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            remove: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            list: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        };
        search: {
            messages: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            files: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            all: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        };
        team: {
            info: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            profile: {
                get: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            };
        };
        views: {
            open: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            publish: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            push: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            update: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        };
        rtm: {
            connect: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            disconnect: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            send: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        };
        auth: {
            test: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        };
    };
    static createMockError(code: string, message: string): Error;
    static createPerformanceTimer(): {
        end: () => {
            duration: number;
            memory: number;
        };
    };
    static waitForAsync(fn: () => Promise<any>, timeout?: number): Promise<any>;
    static generateRandomString(length?: number): string;
    static generateRandomChannel(): {
        id: string;
        name: string;
        is_channel: boolean;
        is_member: boolean;
        created: number;
        creator: string;
    };
    static generateRandomUser(): {
        id: string;
        name: string;
        real_name: string;
        profile: {
            email: string;
            display_name: string;
        };
    };
    static setupPerformanceMonitoring(): {
        startTimer: import("jest-mock").Mock<() => {
            end: () => {
                duration: number;
                memory: number;
            };
        }>;
        recordMetric: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        getMetrics: import("jest-mock").Mock<() => {
            totalRequests: number;
            averageResponseTime: number;
            errorRate: number;
        }>;
    };
    static setupAIAnalytics(): {
        analyzeSentiment: import("jest-mock").Mock<() => {
            score: number;
            magnitude: number;
            label: string;
        }>;
        predictEngagement: import("jest-mock").Mock<() => {
            score: number;
            factors: never[];
            recommendation: string;
        }>;
        analyzeContent: import("jest-mock").Mock<() => {
            topics: never[];
            readability: number;
            sentiment: string;
        }>;
    };
    static createMockToolArgs(overrides?: any): {
        name: string;
        arguments: any;
    };
    static validateSlackResponse(response: any): void;
    static validatePerformanceMetrics(metrics: any): void;
    static validateAIAnalytics(analytics: any): void;
    static runWithTimeout<T>(promise: Promise<T>, timeoutMs?: number, errorMessage?: string): Promise<T>;
    static createBulkTestData(count: number, generator: () => any): any[];
    static mockConsole(): {
        restore: () => Console & {
            Console: console.ConsoleConstructor;
            assert(value: any, message?: string, ...optionalParams: any[]): void;
            clear(): void;
            count(label?: string): void;
            countReset(label?: string): void;
            debug(message?: any, ...optionalParams: any[]): void;
            dir(obj: any, options?: import("util").InspectOptions): void;
            dirxml(...data: any[]): void;
            error(message?: any, ...optionalParams: any[]): void;
            group(...label: any[]): void;
            groupCollapsed(...label: any[]): void;
            groupEnd(): void;
            info(message?: any, ...optionalParams: any[]): void;
            log(message?: any, ...optionalParams: any[]): void;
            table(tabularData: any, properties?: readonly string[]): void;
            time(label?: string): void;
            timeEnd(label?: string): void;
            timeLog(label?: string, ...data: any[]): void;
            trace(message?: any, ...optionalParams: any[]): void;
            warn(message?: any, ...optionalParams: any[]): void;
            profile(label?: string): void;
            profileEnd(label?: string): void;
            timeStamp(label?: string): void;
        };
        mocks: {
            log: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            error: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            warn: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            info: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
            debug: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        };
    };
    static createRateLimitedMock(callsPerSecond?: number): import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
}
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidSlackResponse(): R;
            toHavePerformanceMetrics(): R;
            toHaveAIAnalytics(): R;
        }
    }
}
export declare const customMatchers: {
    toBeValidSlackResponse(received: any): {
        message: () => string;
        pass: any;
    };
    toHavePerformanceMetrics(received: any): {
        message: () => string;
        pass: any;
    };
    toHaveAIAnalytics(received: any): {
        message: () => string;
        pass: any;
    };
};
//# sourceMappingURL=testHelpers.d.ts.map