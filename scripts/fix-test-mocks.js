#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const testFiles = [
  'tests/unit/tools/slackSendMessage.test.ts',
  'tests/unit/tools/slackAuthTest.test.ts',
  'tests/unit/tools/slackGetChannelHistory.test.ts'
];

const replacements = [
  // Import replacements
  {
    from: /import { slackClient } from '\.\.\.\/\.\.\.\/src\/utils\/slackClient';/g,
    to: "import { mockSlackClient, mockWebClient } from '../../mocks/slackClientMock';"
  },
  {
    from: /jest\.mock\('\.\.\.\/\.\.\.\/src\/utils\/slackClient'\);/g,
    to: ''
  },
  {
    from: /const mockSlackClient = slackClient as jest\.Mocked<typeof slackClient>;/g,
    to: ''
  },
  
  // Mock usage replacements
  {
    from: /mockSlackClient\.auth\.test/g,
    to: 'mockWebClient.auth.test'
  },
  {
    from: /mockSlackClient\.chat\.postMessage/g,
    to: 'mockWebClient.chat.postMessage'
  },
  {
    from: /mockSlackClient\.conversations\.history/g,
    to: 'mockWebClient.conversations.history'
  },
  {
    from: /mockSlackClient\.conversations\.list/g,
    to: 'mockWebClient.conversations.list'
  },
  {
    from: /mockSlackClient\.users\.list/g,
    to: 'mockWebClient.users.list'
  },
];

function fixTestFile(filePath) {
  console.log(`Fixing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Apply all replacements
  replacements.forEach(({ from, to }) => {
    content = content.replace(from, to);
  });
  
  // Add mock import at the top if not present
  if (!content.includes("from '../../mocks/slackClientMock'")) {
    const importIndex = content.indexOf("import { logger }");
    if (importIndex !== -1) {
      const beforeImport = content.substring(0, importIndex);
      const afterImport = content.substring(importIndex);
      content = beforeImport + 
        "import { mockSlackClient, mockWebClient } from '../../mocks/slackClientMock';\n" +
        afterImport;
    }
  }
  
  // Clean up empty lines and duplicate imports
  content = content.replace(/\n\n\n+/g, '\n\n');
  content = content.replace(/jest\.mock\('\.\.\.\/\.\.\.\/src\/utils\/slackClient'\);\s*\n/g, '');
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${filePath}`);
}

// Fix all test files
testFiles.forEach(fixTestFile);

console.log('All test files have been updated with proper mocking!');
