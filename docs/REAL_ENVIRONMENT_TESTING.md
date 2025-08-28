# Real Environment Testing Guide

This guide explains how to run tests against a real Slack workspace using actual API credentials.

## Prerequisites

### 1. Slack App Setup

1. Create a Slack App at https://api.slack.com/apps
2. Configure the following OAuth scopes:

**Bot Token Scopes:**
```
channels:history
channels:read
channels:write
chat:write
files:read
files:write
groups:history
groups:read
groups:write
im:history
im:read
im:write
mpim:history
mpim:read
mpim:write
pins:read
pins:write
reactions:read
reactions:write
search:read
users:read
users:read.email
users.profile:read
team:read
bookmarks:read
```

3. Install the app to your workspace
4. Copy the tokens to your `.env` file

### 2. Environment Configuration

Create or update your `.env` file with real credentials:

```env
# Required for real environment tests
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_USER_TOKEN=xoxp-your-user-token  # Optional
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

# Optional test configuration
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_ID=U1234567890
USE_REAL_SLACK=true
LOG_SLACK_RESPONSES=false  # Set to true for debugging
```

## Running Real Environment Tests

### Basic Commands

```bash
# Run all real environment tests
npm run test:real

# Run with verbose output
npm run test:real:verbose

# Run in watch mode
npm run test:real:watch

# Run with debugging
npm run test:real:debug
```

### Test Categories

The real environment tests cover:

1. **Authentication & Workspace Info**
   - Token validation
   - Workspace details
   - Permission analysis

2. **Channel Management**
   - List channels
   - Create test channels
   - Get channel history

3. **User Management**
   - List users
   - Get user info
   - Presence information

4. **Messaging**
   - Send messages
   - Send messages with blocks
   - Thread replies

5. **File Operations**
   - Upload files
   - File analysis

6. **Reactions & Interactions**
   - Add reactions
   - Reaction analytics

7. **Search Operations**
   - Message search
   - Advanced filtering

8. **Performance & Rate Limiting**
   - Rate limit handling
   - Performance metrics

9. **Error Handling**
   - Invalid parameters
   - API error responses

## Safety Features

### Automatic Cleanup

The test suite includes automatic cleanup:

- Test channels are archived after tests
- Uploaded files are deleted
- Test messages are tracked for cleanup

### Rate Limiting

- Built-in rate limiting to respect Slack API limits
- Configurable delays between API calls
- Automatic retry on rate limit errors

### Test Isolation

- Unique test channel names with timestamps
- Isolated test data to avoid conflicts
- Safe test patterns that won't affect production data

## Configuration Options

### Rate Limiting

```typescript
rateLimiting: {
  enabled: true,
  defaultDelay: 1000,     // 1 second between calls
  burstDelay: 5000,       // 5 seconds after rate limit
  maxRetries: 3,
  backoffMultiplier: 2,
}
```

### Test Data

```typescript
testData: {
  testChannelPrefix: 'test-mcp-',
  testFileName: 'mcp-test-file.txt',
  testMessageText: 'Test message from MCP Slack SDK',
  cleanupPatterns: ['test-mcp-*', 'mcp-sdk-test-*']
}
```

### Validation

```typescript
validation: {
  validateResponses: true,
  validateSlackIds: true,
  validateTimestamps: true,
  validatePermissions: true,
}
```

## Troubleshooting

### Common Issues

1. **Missing Credentials**
   ```
   Error: Real Slack environment not available
   ```
   - Ensure `SLACK_BOT_TOKEN` is set in `.env`
   - Verify token has required scopes

2. **Rate Limiting**
   ```
   Error: ratelimited
   ```
   - Tests automatically handle rate limits
   - Increase delays in configuration if needed

3. **Permission Errors**
   ```
   Error: missing_scope
   ```
   - Check OAuth scopes in Slack app configuration
   - Reinstall app to workspace if scopes changed

4. **Channel Creation Failures**
   ```
   Error: name_taken
   ```
   - Test uses unique timestamps to avoid conflicts
   - Check for existing channels with similar names

### Debug Mode

Run tests in debug mode for detailed logging:

```bash
npm run test:real:debug
```

This will show:
- All API calls and responses
- Rate limiting delays
- Cleanup operations
- Performance metrics

### Environment Variables

```env
# Enable detailed logging
LOG_SLACK_RESPONSES=true

# Skip cleanup (for debugging)
CLEANUP_AFTER_TESTS=false

# Custom test timeout
TEST_TIMEOUT=120000

# Disable rate limiting (not recommended)
DISABLE_RATE_LIMITING=true
```

## Best Practices

1. **Use a Test Workspace**
   - Don't run tests in production workspaces
   - Create a dedicated test workspace

2. **Monitor API Usage**
   - Slack has API rate limits
   - Monitor your app's API usage in Slack dashboard

3. **Regular Cleanup**
   - Tests clean up automatically
   - Manually verify cleanup if tests fail

4. **Secure Credentials**
   - Never commit real tokens to version control
   - Use environment variables or secure vaults
   - Rotate tokens regularly

## Reporting

Test results are saved to:
- `tests/reports/real-environment/real-environment-report.html`
- `tests/reports/real-environment/real-environment-results.xml`

## Integration with CI/CD

For CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run Real Environment Tests
  env:
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
    SLACK_SIGNING_SECRET: ${{ secrets.SLACK_SIGNING_SECRET }}
  run: npm run test:real
```

Store credentials as encrypted secrets in your CI/CD platform.
