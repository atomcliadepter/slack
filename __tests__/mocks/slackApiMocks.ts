
import { jest } from '@jest/globals';

// Comprehensive Slack API mocks
export const mockSlackWebClient = {
  chat: {
    postMessage: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getPermalink: jest.fn(),
    scheduleMessage: jest.fn(),
    deleteScheduledMessage: jest.fn()
  },
  conversations: {
    create: jest.fn(),
    archive: jest.fn(),
    unarchive: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    list: jest.fn(),
    history: jest.fn(),
    members: jest.fn(),
    info: jest.fn(),
    mark: jest.fn(),
    setTopic: jest.fn(),
    setPurpose: jest.fn()
  },
  users: {
    list: jest.fn(),
    info: jest.fn(),
    lookupByEmail: jest.fn(),
    setPresence: jest.fn(),
    profile: {
      set: jest.fn(),
      get: jest.fn()
    }
  },
  files: {
    upload: jest.fn(),
    delete: jest.fn(),
    info: jest.fn(),
    list: jest.fn()
  },
  reactions: {
    add: jest.fn(),
    remove: jest.fn(),
    get: jest.fn(),
    list: jest.fn()
  },
  pins: {
    add: jest.fn(),
    remove: jest.fn(),
    list: jest.fn()
  },
  bookmarks: {
    add: jest.fn(),
    edit: jest.fn(),
    remove: jest.fn(),
    list: jest.fn()
  },
  search: {
    messages: jest.fn(),
    files: jest.fn(),
    all: jest.fn()
  },
  team: {
    info: jest.fn(),
    profile: {
      get: jest.fn()
    }
  },
  views: {
    open: jest.fn(),
    publish: jest.fn(),
    push: jest.fn(),
    update: jest.fn()
  },
  rtm: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    send: jest.fn()
  },
  auth: {
    test: jest.fn()
  }
};

// Mock responses for different scenarios
export const mockResponses = {
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
export const mockPerformanceMonitor = {
  startTimer: jest.fn(() => ({
    end: jest.fn(() => ({ duration: 100, memory: 1024 }))
  })),
  recordMetric: jest.fn(),
  getMetrics: jest.fn(() => ({
    totalRequests: 10,
    averageResponseTime: 150,
    errorRate: 0.1
  }))
};

// AI Analytics mock
export const mockAIAnalytics = {
  analyzeSentiment: jest.fn(() => ({
    score: 0.8,
    magnitude: 0.6,
    label: 'POSITIVE'
  })),
  predictEngagement: jest.fn(() => ({
    score: 0.75,
    factors: ['time_of_day', 'content_length'],
    recommendation: 'Good time to post'
  })),
  analyzeContent: jest.fn(() => ({
    topics: ['technology', 'productivity'],
    readability: 0.8,
    sentiment: 'positive'
  }))
};
