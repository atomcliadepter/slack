import { jest } from '@jest/globals';

// Standardized mock client factory
export const createMockSlackClient = () => ({
  auth: { test: jest.fn() },
  conversations: {
    list: jest.fn(),
    info: jest.fn(),
    create: jest.fn(),
    history: jest.fn(),
    members: jest.fn(),
    replies: jest.fn(),
    mark: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    archive: jest.fn(),
  },
  users: {
    list: jest.fn(),
    info: jest.fn(),
    lookupByEmail: jest.fn(),
    getPresence: jest.fn(),
  },
  chat: {
    postMessage: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  files: { upload: jest.fn() },
  reactions: { add: jest.fn(), remove: jest.fn(), get: jest.fn() },
  pins: { add: jest.fn(), remove: jest.fn(), list: jest.fn() },
  search: { messages: jest.fn() },
  views: { publish: jest.fn() },
  bookmarks: { list: jest.fn() },
  team: { info: jest.fn() },
});

// Standard test cleanup
export const setupTest = () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
};
