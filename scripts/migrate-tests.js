#!/usr/bin/env node

/**
 * Test Migration Script
 * Migrates existing tests from __tests__ to the new tests/ structure
 */

const fs = require('fs');
const path = require('path');

const OLD_TEST_DIR = path.join(__dirname, '../__tests__');
const NEW_TEST_DIR = path.join(__dirname, '../tests');

// Migration mapping
const MIGRATION_MAP = {
  // Unit tests
  'unit/tools/slackSendMessage.test.ts': 'unit/tools/messaging/slackSendMessage.test.ts',
  'unit/tools/slackCreateChannel.test.ts': 'unit/tools/channels/slackCreateChannel.test.ts',
  'unit/tools/slackGetUserInfo.test.ts': 'unit/tools/users/slackGetUserInfo.test.ts',
  'unit/utils/logger.test.ts': 'unit/utils/logger.test.ts',
  'unit/utils/error.test.ts': 'unit/utils/error.test.ts',
  'unit/utils/slackClient.test.ts': 'unit/utils/slackClient.test.ts',
  'unit/utils/aiAnalytics.test.ts': 'unit/utils/aiAnalytics.test.ts',
  'unit/utils/performance.test.ts': 'unit/utils/performance.test.ts',
  'unit/utils/validator.test.ts': 'unit/utils/validator.test.ts',
  
  // Integration tests
  'integration/slackSendMessage.integration.test.ts': 'integration/api/messaging.integration.test.ts',
  'integration/slackGetChannelHistory.integration.test.ts': 'integration/api/channels.integration.test.ts',
  'integration/slackGetUserInfo.integration.test.ts': 'integration/api/users.integration.test.ts',
  'integration/slackGetWorkspaceInfo.integration.test.ts': 'integration/api/auth.integration.test.ts',
  'integration/slackUploadFile.integration.test.ts': 'integration/api/files.integration.test.ts',
  'integration/slackSearchMessages.integration.test.ts': 'integration/api/search.integration.test.ts',
  'integration/slackCreateChannel.integration.test.ts': 'integration/workflows/channelManagement.test.ts',
  'integration/slackSetStatus.integration.test.ts': 'integration/api/users.integration.test.ts',
  
  // Tool tests (categorized)
  'tools/slackSendMessage.test.ts': 'unit/tools/messaging/slackSendMessage.test.ts',
  'tools/slackListChannels.test.ts': 'unit/tools/channels/slackListChannels.test.ts',
  'tools/slackJoinChannel.test.ts': 'unit/tools/channels/slackJoinChannel.test.ts',
  'tools/slackLeaveChannel.test.ts': 'unit/tools/channels/slackLeaveChannel.test.ts',
  'tools/slackArchiveChannel.test.ts': 'unit/tools/channels/slackArchiveChannel.test.ts',
  'tools/slackListUsers.test.ts': 'unit/tools/users/slackListUsers.test.ts',
  
  // Registry tests
  'registry/toolRegistry.test.ts': 'unit/registry/toolRegistry.test.ts',
  
  // Fixtures and helpers
  'fixtures/testData.ts': 'fixtures/testData.ts',
  'mocks/slackApiMocks.ts': 'mocks/slackApi.mock.ts',
  'utils/testHelpers.ts': 'helpers/testUtils.ts',
  'utils/customMatchers.ts': 'helpers/customMatchers.ts',
  'utils/slackClient.test.ts': 'unit/utils/slackClient.test.ts',
  
  // Setup files
  'setup.ts': 'config/environment.ts',
  'globalSetup.ts': 'config/setup.ts',
  'globalTeardown.ts': 'config/teardown.ts',
  'setup/testSetup.ts': 'helpers/testSetup.ts'
};

async function migrateTests() {
  console.log('🚀 Starting test migration...');
  
  try {
    // Check if old test directory exists
    if (!fs.existsSync(OLD_TEST_DIR)) {
      console.log('❌ Old test directory not found:', OLD_TEST_DIR);
      return;
    }
    
    // Create new test directory structure if it doesn't exist
    if (!fs.existsSync(NEW_TEST_DIR)) {
      console.log('📁 Creating new test directory structure...');
      await createTestDirectoryStructure();
    }
    
    // Migrate files
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const [oldPath, newPath] of Object.entries(MIGRATION_MAP)) {
      const oldFullPath = path.join(OLD_TEST_DIR, oldPath);
      const newFullPath = path.join(NEW_TEST_DIR, newPath);
      
      if (fs.existsSync(oldFullPath)) {
        try {
          // Ensure target directory exists
          const targetDir = path.dirname(newFullPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          // Read and potentially transform the file content
          let content = fs.readFileSync(oldFullPath, 'utf8');
          content = transformTestContent(content, oldPath, newPath);
          
          // Write to new location
          fs.writeFileSync(newFullPath, content);
          
          console.log(`✅ Migrated: ${oldPath} → ${newPath}`);
          migratedCount++;
        } catch (error) {
          console.error(`❌ Failed to migrate ${oldPath}:`, error.message);
        }
      } else {
        console.log(`⚠️  File not found: ${oldPath}`);
        skippedCount++;
      }
    }
    
    // Copy any remaining files that weren't explicitly mapped
    await copyRemainingFiles();
    
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migratedCount} files`);
    console.log(`   ⚠️  Skipped: ${skippedCount} files`);
    console.log(`   📁 New structure: ${NEW_TEST_DIR}`);
    
    console.log('\n🎉 Test migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Review migrated files for any import path updates needed');
    console.log('   2. Run: npm test to verify everything works');
    console.log('   3. Update any remaining import paths in test files');
    console.log('   4. Consider removing the old __tests__ directory after verification');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function createTestDirectoryStructure() {
  const directories = [
    'config',
    'unit/tools/messaging',
    'unit/tools/channels', 
    'unit/tools/users',
    'unit/tools/reactions',
    'unit/tools/files',
    'unit/tools/analytics',
    'unit/utils',
    'unit/registry',
    'integration/api',
    'integration/workflows',
    'integration/performance',
    'mocks',
    'fixtures/slack',
    'fixtures/api',
    'fixtures/files',
    'helpers',
    'e2e/scenarios',
    'e2e/config',
    'performance/benchmarks',
    'performance/load',
    'security',
    'reports/coverage',
    'reports/junit',
    'reports/html'
  ];
  
  for (const dir of directories) {
    const fullPath = path.join(NEW_TEST_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
}

function transformTestContent(content, oldPath, newPath) {
  // Update import paths based on new structure
  let transformedContent = content;
  
  // Update relative imports to source files
  const depthDiff = newPath.split('/').length - oldPath.split('/').length;
  const additionalDots = '../'.repeat(Math.max(0, depthDiff));
  
  // Common import transformations
  transformedContent = transformedContent.replace(
    /from ['"]\.\.\/\.\.\/src\//g,
    `from '${additionalDots}../../src/`
  );
  
  transformedContent = transformedContent.replace(
    /from ['"]\.\.\/\.\.\/\.\.\/src\//g,
    `from '${additionalDots}../../../src/`
  );
  
  // Update test helper imports
  transformedContent = transformedContent.replace(
    /from ['"]\.\.\/utils\/testHelpers['"]/g,
    "from '../../helpers/testUtils'"
  );
  
  transformedContent = transformedContent.replace(
    /from ['"]\.\.\/helpers\/testHelpers['"]/g,
    "from '../../helpers/testUtils'"
  );
  
  // Update mock imports
  transformedContent = transformedContent.replace(
    /from ['"]\.\.\/mocks\/slackApiMocks['"]/g,
    "from '../../mocks/slackApi.mock'"
  );
  
  // Update fixture imports
  transformedContent = transformedContent.replace(
    /from ['"]\.\.\/fixtures\/testData['"]/g,
    "from '../../fixtures/testData'"
  );
  
  // Add new helper imports if needed
  if (transformedContent.includes('SlackTestHelpers') && !transformedContent.includes("from '../../helpers/slackHelpers'")) {
    const importSection = transformedContent.match(/^(import.*\n)+/m);
    if (importSection) {
      transformedContent = transformedContent.replace(
        importSection[0],
        importSection[0] + "import { SlackTestHelpers } from '../../helpers/slackHelpers';\n"
      );
    }
  }
  
  return transformedContent;
}

async function copyRemainingFiles() {
  // Copy any files that weren't explicitly mapped
  const copyFile = (src, dest) => {
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(src, dest);
      console.log(`📋 Copied: ${path.relative(OLD_TEST_DIR, src)} → ${path.relative(NEW_TEST_DIR, dest)}`);
    }
  };
  
  // Copy simple.test.ts as an example
  copyFile(
    path.join(OLD_TEST_DIR, 'simple.test.ts'),
    path.join(NEW_TEST_DIR, 'unit/simple.test.ts')
  );
}

// Run migration if called directly
if (require.main === module) {
  migrateTests().catch(console.error);
}

module.exports = { migrateTests };
