export declare const skipIntegration: boolean;
export declare const skipIfIntegrationDisabled: () => boolean;
export declare const testConfig: {
    testChannel: string;
    testChannelId: string;
    testUserId: string;
    testUsername: string;
    testMessage: string;
    testFilePath: string;
    testStatus: {
        text: string;
        emoji: string;
    };
};
export declare const createTestFile: () => Promise<string>;
export declare const cleanupTestFile: () => Promise<void>;
export declare const delay: (ms: number) => Promise<void>;
export declare const generateTestId: () => string;
export declare const mockValidArgs: {
    sendMessage: {
        channel: string;
        text: string;
    };
    createChannel: {
        name: string;
        description: string;
        isPrivate: boolean;
    };
    getUserInfo: {
        userId: string;
    };
    getChannelHistory: {
        channel: string;
        limit: number;
    };
    searchMessages: {
        query: string;
        limit: number;
    };
    setStatus: {
        text: string;
        emoji: string;
    };
    uploadFile: {
        channel: string;
        filePath: string;
        title: string;
        comment: string;
    };
    getWorkspaceInfo: {};
};
export declare const mockInvalidArgs: {
    sendMessage: ({
        channel?: undefined;
        text?: undefined;
    } | {
        channel: string;
        text: string;
    })[];
    createChannel: ({
        name?: undefined;
    } | {
        name: string;
    })[];
    getUserInfo: ({
        userId?: undefined;
    } | {
        userId: string;
    })[];
    getChannelHistory: ({
        channel?: undefined;
        limit?: undefined;
    } | {
        channel: string;
        limit: number;
    })[];
    searchMessages: ({
        query?: undefined;
        limit?: undefined;
    } | {
        query: string;
        limit: number;
    })[];
    setStatus: ({
        text?: undefined;
        emoji?: undefined;
    } | {
        text: string;
        emoji: string;
    })[];
    uploadFile: ({
        channel?: undefined;
        filePath?: undefined;
    } | {
        channel: string;
        filePath: string;
    })[];
    getWorkspaceInfo: never[];
};
//# sourceMappingURL=testUtils.d.ts.map