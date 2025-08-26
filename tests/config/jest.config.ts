import type { Config } from 'jest';

const config: Config = {
  // Basic Configuration
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/../../src', '<rootDir>/..'],
  
  // Test Discovery
  testMatch: [
    '<rootDir>/../**/*.test.ts',
    '<rootDir>/../**/*.spec.ts'
  ],
  
  // TypeScript Configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/../../tsconfig.json'
    }]
  },
  
  // Module Resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../src/$1',
    '^@tests/(.*)$': '<rootDir>/../$1'
  },
  
  // Setup and Teardown
  globalSetup: '<rootDir>/setup.ts',
  globalTeardown: '<rootDir>/teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/environment.ts', '<rootDir>/../helpers/customMatchers.ts'],
  
  // Coverage Configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/../../src/**/*.ts',
    '!<rootDir>/../../src/**/*.d.ts',
    '!<rootDir>/../../src/index.ts',
    '!<rootDir>/../../src/**/*.test.ts',
    '!<rootDir>/../../src/**/*.spec.ts'
  ],
  
  coverageDirectory: '<rootDir>/../reports/coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json',
    'clover'
  ],
  
  // Coverage Thresholds
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    '<rootDir>/../../src/tools/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    '<rootDir>/../../src/utils/': {
      branches: 92,
      functions: 92,
      lines: 92,
      statements: 92
    }
  },
  
  // Test Execution
  testTimeout: 30000,
  maxWorkers: '50%',
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  
  // Reporting
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/../reports/junit',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }],
    ['jest-html-reporters', {
      publicPath: '<rootDir>/../reports/html',
      filename: 'test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Enhanced MCP Slack SDK Test Report'
    }]
  ],
  
  // File Patterns to Ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/__tests_backup/'
  ],
  
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/__tests_backup/',
    '/tests/',
    '/src/types/',
    '/src/config/env.ts'
  ],
  
  // Performance Settings
  workerIdleMemoryLimit: '1GB',
  cache: true,
  cacheDirectory: '<rootDir>/../../node_modules/.cache/jest',
  
  // Module Extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Transform Ignore Patterns
  transformIgnorePatterns: [
    'node_modules/(?!(@slack/web-api)/)'
  ],
  
  // Error Handling
  errorOnDeprecated: true
};

export default config;
