/**
 * Jest Configuration for Real Environment Tests
 * Specialized configuration for testing with real Slack API
 */

import type { Config } from 'jest';

const realEnvironmentConfig: Config = {
  // Display name for this test configuration
  displayName: 'Real Environment Tests',
  
  // Preset and transform
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Root directory
  rootDir: '../../',
  
  // Test match patterns - only real environment tests
  testMatch: [
    '<rootDir>/tests/integration/realEnvironment/**/*.test.ts',
  ],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Longer timeouts for real API calls
  testTimeout: 60000, // 1 minute default timeout
  
  // Setup files specific to real environment
  setupFilesAfterEnv: [
    '<rootDir>/tests/config/realEnvironment.setup.ts'
  ],
  
  // Global configuration
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
    USE_REAL_SLACK: true,
    REAL_ENVIRONMENT_TESTS: true,
  },
  
  // Coverage settings - exclude from coverage since these are integration tests
  collectCoverage: false,
  
  // Verbose output for debugging
  verbose: true,
  
  // Detect open handles (important for real API connections)
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Maximum number of concurrent tests (lower for API rate limiting)
  maxConcurrency: 2,
  
  // Run tests serially to avoid rate limiting issues
  maxWorkers: 1,
  
  // Custom reporters for real environment tests
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: '<rootDir>/tests/reports/real-environment',
        filename: 'real-environment-report.html',
        pageTitle: 'MCP Slack SDK - Real Environment Test Report',
        logoImgPath: undefined,
        hideIcon: false,
        expand: true,
        openReport: false,
        includeFailureMsg: true,
        includeSuiteFailure: true,
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/tests/reports/real-environment',
        outputName: 'real-environment-results.xml',
        suiteName: 'Real Environment Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],
};

export default realEnvironmentConfig;
