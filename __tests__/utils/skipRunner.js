
// Custom Jest runner that skips tests when SLACK_LIVE is not set
const { default: DefaultRunner } = require('jest-runner');

class SkipRunner extends DefaultRunner {
  async runTests(tests, watcher, onStart, onResult, onFailure, options) {
    // Skip all tests and mark them as skipped
    for (const test of tests) {
      const result = {
        console: null,
        failureMessage: null,
        numFailingTests: 0,
        numPassingTests: 0,
        numPendingTests: 1,
        numTodoTests: 0,
        perfStats: {
          end: Date.now(),
          runtime: 0,
          slow: false,
          start: Date.now(),
        },
        skipped: true,
        snapshot: {
          added: 0,
          fileDeleted: false,
          matched: 0,
          unchecked: 0,
          uncheckedKeys: [],
          unmatched: 0,
          updated: 0,
        },
        sourceMaps: {},
        testExecError: null,
        testFilePath: test.path,
        testResults: [
          {
            ancestorTitles: [],
            duration: 0,
            failureMessages: [],
            fullName: 'Integration tests skipped (SLACK_LIVE not set)',
            location: null,
            numPassingAsserts: 0,
            status: 'pending',
            title: 'Integration tests skipped (SLACK_LIVE not set)',
          },
        ],
      };

      await onResult(test, result);
    }

    return { numTotalTestSuites: tests.length, numTotalTests: tests.length };
  }
}

module.exports = SkipRunner;
