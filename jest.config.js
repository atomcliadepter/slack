
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/tools/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/utils/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup/testSetup.ts'
  ],
  globalSetup: '<rootDir>/__tests__/globalSetup.ts',
  globalTeardown: '<rootDir>/__tests__/globalTeardown.ts',
  testTimeout: 30000,
  maxWorkers: '50%',
  verbose: true,
  collectCoverage: true,
  forceExit: true,
  detectOpenHandles: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/__tests__/$1'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/__tests__/',
    '/src/types/',
    '/src/config/env.ts'
  ],

  // Performance and memory settings
  workerIdleMemoryLimit: '1GB',

  // Reporter configuration
  reporters: [
    'default'
  ],
  // Error handling
  errorOnDeprecated: true,
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(@slack/web-api)/)'
  ]
};
