"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockAIAnalytics = exports.mockPerformanceMonitor = exports.mockResponses = exports.mockSlackWebClient = void 0;
const globals_1 = require("@jest/globals");
// Comprehensive Slack API mocks
exports.mockSlackWebClient = {
    chat: {
        postMessage: globals_1.jest.fn(),
        update: globals_1.jest.fn(),
        delete: globals_1.jest.fn(),
        getPermalink: globals_1.jest.fn(),
        scheduleMessage: globals_1.jest.fn(),
        deleteScheduledMessage: globals_1.jest.fn()
    },
    conversations: {
        create: globals_1.jest.fn(),
        archive: globals_1.jest.fn(),
        unarchive: globals_1.jest.fn(),
        join: globals_1.jest.fn(),
        leave: globals_1.jest.fn(),
        list: globals_1.jest.fn(),
        history: globals_1.jest.fn(),
        members: globals_1.jest.fn(),
        info: globals_1.jest.fn(),
        mark: globals_1.jest.fn(),
        setTopic: globals_1.jest.fn(),
        setPurpose: globals_1.jest.fn()
    },
    users: {
        list: globals_1.jest.fn(),
        info: globals_1.jest.fn(),
        lookupByEmail: globals_1.jest.fn(),
        setPresence: globals_1.jest.fn(),
        profile: {
            set: globals_1.jest.fn(),
            get: globals_1.jest.fn()
        }
    },
    files: {
        upload: globals_1.jest.fn(),
        delete: globals_1.jest.fn(),
        info: globals_1.jest.fn(),
        list: globals_1.jest.fn()
    },
    reactions: {
        add: globals_1.jest.fn(),
        remove: globals_1.jest.fn(),
        get: globals_1.jest.fn(),
        list: globals_1.jest.fn()
    },
    pins: {
        add: globals_1.jest.fn(),
        remove: globals_1.jest.fn(),
        list: globals_1.jest.fn()
    },
    bookmarks: {
        add: globals_1.jest.fn(),
        edit: globals_1.jest.fn(),
        remove: globals_1.jest.fn(),
        list: globals_1.jest.fn()
    },
    search: {
        messages: globals_1.jest.fn(),
        files: globals_1.jest.fn(),
        all: globals_1.jest.fn()
    },
    team: {
        info: globals_1.jest.fn(),
        profile: {
            get: globals_1.jest.fn()
        }
    },
    views: {
        open: globals_1.jest.fn(),
        publish: globals_1.jest.fn(),
        push: globals_1.jest.fn(),
        update: globals_1.jest.fn()
    },
    rtm: {
        connect: globals_1.jest.fn(),
        disconnect: globals_1.jest.fn(),
        send: globals_1.jest.fn()
    },
    auth: {
        test: globals_1.jest.fn()
    }
};
// Mock responses for different scenarios
exports.mockResponses = {
    success: {
        chat: {
            postMessage: {
                ok: true,
                channel: 'C1234567890',
                ts: '1234567890.123456',
                message: {
                    text: 'Hello world',
                    user: 'U1234567890',
                    ts: '1234567890.123456'
                }
            }
        },
        conversations: {
            create: {
                ok: true,
                channel: {
                    id: 'C1234567890',
                    name: 'test-channel',
                    is_channel: true,
                    created: 1234567890,
                    creator: 'U1234567890'
                }
            },
            list: {
                ok: true,
                channels: [
                    {
                        id: 'C1234567890',
                        name: 'general',
                        is_channel: true,
                        is_member: true,
                        num_members: 10
                    }
                ],
                response_metadata: {
                    next_cursor: 'dXNlcjpVMDYxTkZUVDI='
                }
            }
        },
        users: {
            list: {
                ok: true,
                members: [
                    {
                        id: 'U1234567890',
                        name: 'testuser',
                        real_name: 'Test User',
                        profile: {
                            email: 'test@example.com',
                            display_name: 'Test User'
                        }
                    }
                ]
            }
        }
    },
    error: {
        generic: {
            ok: false,
            error: 'invalid_auth',
            message: 'Invalid authentication token'
        },
        rateLimit: {
            ok: false,
            error: 'rate_limited',
            message: 'Rate limit exceeded'
        },
        notFound: {
            ok: false,
            error: 'channel_not_found',
            message: 'Channel not found'
        }
    }
};
// Performance monitoring mock
exports.mockPerformanceMonitor = {
    startTimer: globals_1.jest.fn(() => ({
        end: globals_1.jest.fn(() => ({ duration: 100, memory: 1024 }))
    })),
    recordMetric: globals_1.jest.fn(),
    getMetrics: globals_1.jest.fn(() => ({
        totalRequests: 10,
        averageResponseTime: 150,
        errorRate: 0.1
    }))
};
// AI Analytics mock
exports.mockAIAnalytics = {
    analyzeSentiment: globals_1.jest.fn(() => ({
        score: 0.8,
        magnitude: 0.6,
        label: 'POSITIVE'
    })),
    predictEngagement: globals_1.jest.fn(() => ({
        score: 0.75,
        factors: ['time_of_day', 'content_length'],
        recommendation: 'Good time to post'
    })),
    analyzeContent: globals_1.jest.fn(() => ({
        topics: ['technology', 'productivity'],
        readability: 0.8,
        sentiment: 'positive'
    }))
};
//# sourceMappingURL=slackApiMocks.js.map