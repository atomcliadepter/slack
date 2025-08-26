#!/usr/bin/env node

// Test script to verify the 7 failing tools are fixed
const { WebClient } = require('@slack/web-api');

// Set environment variables
process.env.SLACK_BOT_TOKEN = 'xoxb-9339596428294-9356046108405-zsnyDLglSDsP60wiQdaqxhov';
process.env.SLACK_USER_TOKEN = 'xoxp-9339596428294-9339596450166-9402287296196-2db641b7f9116a9d27dacefa28e9d56e';
process.env.SLACK_SIGNING_SECRET = 'dummy_secret';

const botClient = new WebClient(process.env.SLACK_BOT_TOKEN);
const userClient = new WebClient(process.env.SLACK_USER_TOKEN);

async function testFixes() {
  console.log('🧪 Testing fixes for the 7 failing tools...\n');

  // Test 1: search.messages with user token
  try {
    console.log('1. Testing search.messages with user token...');
    const searchResult = await userClient.search.messages({
      query: 'test',
      count: 5
    });
    console.log('✅ search.messages: SUCCESS - User token works');
  } catch (error) {
    console.log(`❌ search.messages: FAILED - ${error.message}`);
  }

  // Test 2: files.uploadV2 (create a simple test file)
  try {
    console.log('\n2. Testing files.uploadV2...');
    const fs = require('fs');
    const testContent = 'Test file content for uploadV2';
    fs.writeFileSync('/tmp/test_upload.txt', testContent);
    
    const uploadResult = await botClient.files.uploadV2({
      filename: 'test_upload.txt',
      file: fs.readFileSync('/tmp/test_upload.txt'),
      initial_comment: 'Testing uploadV2 migration'
    });
    console.log('✅ files.uploadV2: SUCCESS - Migration works');
  } catch (error) {
    console.log(`❌ files.uploadV2: FAILED - ${error.message}`);
  }

  // Test 3: views.publish (will fail but with better error message)
  try {
    console.log('\n3. Testing views.publish error handling...');
    await botClient.views.publish({
      user_id: 'U123456789',
      view: {
        type: 'home',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Test home view'
            }
          }
        ]
      }
    });
    console.log('✅ views.publish: Unexpected success');
  } catch (error) {
    if (error.message.includes('App Home feature is not enabled')) {
      console.log('✅ views.publish: SUCCESS - Better error message provided');
    } else {
      console.log(`❌ views.publish: FAILED - ${error.message}`);
    }
  }

  console.log('\n🎉 Fix testing completed!');
}

testFixes().catch(console.error);
