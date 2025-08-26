export declare const mockSlackWebClient: {
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
export declare const mockResponses: {
    success: {
        chat: {
            postMessage: {
                ok: boolean;
                channel: string;
                ts: string;
                message: {
                    text: string;
                    user: string;
                    ts: string;
                };
            };
        };
        conversations: {
            create: {
                ok: boolean;
                channel: {
                    id: string;
                    name: string;
                    is_channel: boolean;
                    created: number;
                    creator: string;
                };
            };
            list: {
                ok: boolean;
                channels: {
                    id: string;
                    name: string;
                    is_channel: boolean;
                    is_member: boolean;
                    num_members: number;
                }[];
                response_metadata: {
                    next_cursor: string;
                };
            };
        };
        users: {
            list: {
                ok: boolean;
                members: {
                    id: string;
                    name: string;
                    real_name: string;
                    profile: {
                        email: string;
                        display_name: string;
                    };
                }[];
            };
        };
    };
    error: {
        generic: {
            ok: boolean;
            error: string;
            message: string;
        };
        rateLimit: {
            ok: boolean;
            error: string;
            message: string;
        };
        notFound: {
            ok: boolean;
            error: string;
            message: string;
        };
    };
};
export declare const mockPerformanceMonitor: {
    startTimer: import("jest-mock").Mock<() => {
        end: import("jest-mock").Mock<() => {
            duration: number;
            memory: number;
        }>;
    }>;
    recordMetric: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    getMetrics: import("jest-mock").Mock<() => {
        totalRequests: number;
        averageResponseTime: number;
        errorRate: number;
    }>;
};
export declare const mockAIAnalytics: {
    analyzeSentiment: import("jest-mock").Mock<() => {
        score: number;
        magnitude: number;
        label: string;
    }>;
    predictEngagement: import("jest-mock").Mock<() => {
        score: number;
        factors: string[];
        recommendation: string;
    }>;
    analyzeContent: import("jest-mock").Mock<() => {
        topics: string[];
        readability: number;
        sentiment: string;
    }>;
};
//# sourceMappingURL=slackApiMocks.d.ts.map