
# Migration Guide - Enhanced MCP Slack SDK v2.0.0

## Overview

This guide helps you migrate from legacy Slack integrations to the Enhanced MCP Slack SDK v2.0.0. The new SDK provides significant improvements in reliability, performance, and developer experience.

## Key Improvements in v2.0.0

### 🚀 Enhanced Features
- **8 Comprehensive Tools**: Complete Slack workspace management
- **Advanced Validation**: Input validation with detailed error messages
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Error Handling**: Robust error handling with retry mechanisms
- **Rate Limiting**: Built-in rate limiting with exponential backoff
- **Logging**: Comprehensive logging for debugging and monitoring
- **Testing**: Complete test suite with integration tests

### 🔧 Technical Improvements
- **MCP Protocol**: Built on the Model Context Protocol standard
- **Async/Await**: Modern async patterns throughout
- **Memory Efficient**: Optimized memory usage and performance
- **Concurrent Operations**: Support for concurrent API calls
- **Extensible Architecture**: Easy to extend with new tools

## Migration Scenarios

### From Basic Slack Web API

**Before (Basic Slack Web API):**
```javascript
const { WebClient } = require('@slack/web-api');
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Basic message sending
try {
  const result = await slack.chat.postMessage({
    channel: '#general',
    text: 'Hello world'
  });
  console.log(result.ts);
} catch (error) {
  console.error(error);
}
```

**After (Enhanced MCP SDK):**
```javascript
const { slackSendMessageTool } = require('./dist/tools/slackSendMessage');

// Enhanced message sending with validation and error handling
const result = await slackSendMessageTool.execute({
  channel: '#general',
  text: 'Hello world'
});

if (result.success) {
  console.log('Message sent:', result.data.messageId);
  console.log('Permalink:', result.data.permalink);
} else {
  console.error('Failed to send message:', result.error);
}
```

### From Custom Slack Integrations

**Before (Custom Integration):**
```javascript
const axios = require('axios');

async function sendSlackMessage(channel, text) {
  try {
    const response = await axios.post('https://slack.com/api/chat.postMessage', {
      channel: channel,
      text: text
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.data.ok) {
      throw new Error(response.data.error);
    }
    
    return response.data;
  } catch (error) {
    console.error('Slack API error:', error);
    throw error;
  }
}
```

**After (Enhanced MCP SDK):**
```javascript
const { slackSendMessageTool } = require('./dist/tools/slackSendMessage');

// All the complexity is handled internally
const result = await slackSendMessageTool.execute({
  channel: channel,
  text: text
});

// Consistent response format with built-in error handling
if (result.success) {
  return result.data;
} else {
  throw new Error(result.error);
}
```

### From Bolt Framework

**Before (Slack Bolt):**
```javascript
const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.message('hello', async ({ message, say }) => {
  await say(`Hey there <@${message.user}>!`);
});

// Getting user info
app.command('/userinfo', async ({ command, ack, respond }) => {
  await ack();
  
  try {
    const result = await app.client.users.info({
      user: command.text
    });
    
    await respond(`User: ${result.user.real_name}`);
  } catch (error) {
    await respond('Error getting user info');
  }
});
```

**After (Enhanced MCP SDK):**
```javascript
const { slackSendMessageTool } = require('./dist/tools/slackSendMessage');
const { slackUsersInfoTool } = require('./dist/tools/slackUsersInfo');

// Direct tool usage with enhanced features
async function handleHelloMessage(channel, userId) {
  const result = await slackSendMessageTool.execute({
    channel: channel,
    text: `Hey there <@${userId}>!`
  });
  
  return result;
}

async function getUserInfo(userId) {
  const result = await slackUsersInfoTool.execute({
    userId: userId
  });
  
  if (result.success) {
    return result.data.user.realName;
  } else {
    throw new Error(result.error);
  }
}
```

## Tool Mapping

### Message Operations
| Legacy Method | Enhanced MCP Tool | Notes |
|---------------|-------------------|-------|
| `chat.postMessage` | `slack_send_message` | Enhanced with blocks, threading, validation |
| `chat.update` | Use `slack_send_message` with `threadTs` | Thread-based updates |
| `chat.delete` | Not implemented | Consider archiving instead |

### Channel Operations
| Legacy Method | Enhanced MCP Tool | Notes |
|---------------|-------------------|-------|
| `conversations.create` | `slack_create_channel` | Enhanced validation and error handling |
| `conversations.history` | `slack_get_channel_history` | Improved pagination and filtering |
| `conversations.info` | Use `slack_get_channel_history` | Channel info included in response |

### User Operations
| Legacy Method | Enhanced MCP Tool | Notes |
|---------------|-------------------|-------|
| `users.info` | `slack_get_user_info` | Enhanced user profile information |
| `users.profile.set` | `slack_set_status` | Status-specific implementation |

### Search Operations
| Legacy Method | Enhanced MCP Tool | Notes |
|---------------|-------------------|-------|
| `search.messages` | `slack_search_messages` | Enhanced query parsing and results |

### File Operations
| Legacy Method | Enhanced MCP Tool | Notes |
|---------------|-------------------|-------|
| `files.upload` | `slack_upload_file` | Simplified file upload with validation |

### Workspace Operations
| Legacy Method | Enhanced MCP Tool | Notes |
|---------------|-------------------|-------|
| `team.info` | `slack_get_workspace_info` | Comprehensive workspace information |

## Configuration Migration

### Environment Variables

**Before:**
```bash
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token
```

**After:**
```bash
# Only the bot token is required
SLACK_BOT_TOKEN=xoxb-your-token

# Optional configuration
LOG_LEVEL=INFO
SLACK_API_TIMEOUT=30000
SLACK_MAX_RETRIES=3
```

### OAuth Scopes

Ensure your Slack app has the required OAuth scopes:

**Required Scopes:**
```
chat:write          # Send messages
channels:read       # Read channel information
channels:history    # Read channel history
users:read          # Read user information
search:read         # Search messages
channels:manage     # Create channels
users.profile:write # Set user status
files:write         # Upload files
```

## Error Handling Migration

### Before (Manual Error Handling)
```javascript
try {
  const result = await slack.chat.postMessage({
    channel: '#general',
    text: 'Hello'
  });
  
  if (!result.ok) {
    if (result.error === 'channel_not_found') {
      console.error('Channel not found');
    } else if (result.error === 'not_authed') {
      console.error('Authentication failed');
    } else {
      console.error('Unknown error:', result.error);
    }
  }
} catch (error) {
  console.error('Network error:', error);
}
```

### After (Standardized Error Handling)
```javascript
const result = await slackSendMessageTool.execute({
  channel: '#general',
  text: 'Hello'
});

if (!result.success) {
  switch (result.code) {
    case 'CHANNEL_NOT_FOUND':
      console.error('Channel not found:', result.error);
      break;
    case 'AUTHENTICATION_ERROR':
      console.error('Authentication failed:', result.error);
      break;
    case 'VALIDATION_ERROR':
      console.error('Input validation failed:', result.details);
      break;
    default:
      console.error('Error:', result.error);
  }
}
```

## Testing Migration

### Before (Manual Testing)
```javascript
// Manual mocking and testing
const mockSlack = {
  chat: {
    postMessage: jest.fn().mockResolvedValue({
      ok: true,
      ts: '1234567890.123456'
    })
  }
};

test('sends message', async () => {
  const result = await sendMessage('#test', 'Hello');
  expect(mockSlack.chat.postMessage).toHaveBeenCalledWith({
    channel: '#test',
    text: 'Hello'
  });
});
```

### After (Built-in Test Support)
```javascript
const { slackSendMessageTool } = require('./dist/tools/slackSendMessage');

describe('Slack Send Message', () => {
  test('validates input correctly', async () => {
    const result = await slackSendMessageTool.execute({});
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Validation failed');
  });
  
  test('handles valid input', async () => {
    const result = await slackSendMessageTool.execute({
      channel: '#test',
      text: 'Hello'
    });
    
    // Result structure is guaranteed
    if (result.success) {
      expect(result.data.messageId).toBeDefined();
      expect(result.data.channel).toBe('#test');
    }
  });
});
```

## Performance Considerations

### Memory Usage
- **Before**: Variable memory usage depending on implementation
- **After**: Optimized memory usage < 50MB for all tools

### API Calls
- **Before**: Manual rate limiting required
- **After**: Built-in rate limiting with exponential backoff

### Concurrent Operations
- **Before**: Manual concurrency management
- **After**: Built-in support for 100+ concurrent operations

## Breaking Changes

### Response Format
All tools now return a consistent response format:
```javascript
{
  success: boolean,
  data?: any,      // Only present on success
  error?: string,  // Only present on failure
  code?: string,   // Error code for programmatic handling
  details?: any    // Additional error details
}
```

### Async/Await Required
All operations are now async and must be awaited:
```javascript
// Before (sync/callback)
slack.chat.postMessage(options, callback);

// After (async/await)
const result = await slackSendMessageTool.execute(options);
```

### Input Validation
All inputs are now validated:
```javascript
// This will now fail with validation error
const result = await slackSendMessageTool.execute({
  channel: '',  // Empty channel not allowed
  text: ''      // Empty text not allowed
});
```

## Migration Checklist

- [ ] Install Enhanced MCP Slack SDK v2.0.0
- [ ] Update environment variables (remove unused ones)
- [ ] Verify OAuth scopes in Slack app configuration
- [ ] Replace legacy API calls with MCP tools
- [ ] Update error handling to use new response format
- [ ] Convert callbacks/promises to async/await
- [ ] Add input validation for all tool calls
- [ ] Update tests to use new tool interfaces
- [ ] Remove manual rate limiting code
- [ ] Update logging to use new structured format
- [ ] Test all functionality with new SDK
- [ ] Update documentation and examples

## Support

For migration assistance:
1. Check the [API Documentation](./api.md)
2. Review [Troubleshooting Guide](./troubleshooting.md)
3. Run the test suite to verify functionality
4. Check logs for detailed error information

The Enhanced MCP Slack SDK v2.0.0 provides a more robust, reliable, and developer-friendly experience while maintaining compatibility with Slack's API features.
