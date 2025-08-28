import { jest } from '@jest/globals';

// Standardized mock WebClient interface
export const mockWebClient = {
  auth: {
    test: jest.fn(),
  },
  chat: {
    postMessage: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  conversations: {
    list: jest.fn(),
    info: jest.fn(),
    history: jest.fn(),
    members: jest.fn(),
    replies: jest.fn(),
    mark: jest.fn(),
    create: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    archive: jest.fn(),
  },
  users: {
    list: jest.fn(),
    info: jest.fn(),
    lookupByEmail: jest.fn(),
    getPresence: jest.fn(),
    setPresence: jest.fn(),
  },
  files: {
    upload: jest.fn(),
  },
  reactions: {
    add: jest.fn(),
    remove: jest.fn(),
    get: jest.fn(),
  },
  pins: {
    add: jest.fn(),
    remove: jest.fn(),
    list: jest.fn(),
  },
  search: {
    messages: jest.fn(),
  },
  views: {
    publish: jest.fn(),
  },
  bookmarks: {
    list: jest.fn(),
  },
  team: {
    info: jest.fn(),
  },
};

// Standardized mock slackClient
export const mockSlackClient = {
  getClient: jest.fn(() => mockWebClient),
  resolveChannelId: jest.fn(),
};

// Mock the slackClient module
jest.mock('../../src/utils/slackClient', () => ({
  slackClient: mockSlackClient,
}));
