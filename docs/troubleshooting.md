
# Troubleshooting Guide - Enhanced MCP Slack SDK v2.0.0

## Common Issues and Solutions

### Authentication Issues

#### Issue: "Authentication failed" or "invalid_auth" errors

**Symptoms:**
```json
{
  "success": false,
  "error": "Authentication failed: invalid_auth",
  "code": "AUTHENTICATION_ERROR"
}
```

**Solutions:**
1. **Verify Bot Token Format**
   ```bash
   # Bot tokens should start with 'xoxb-'
   echo $SLACK_BOT_TOKEN
   # Should output: xoxb-1234567890-1234567890123-abcdefghijklmnopqrstuvwx
   ```

2. **Check Token Permissions**
   - Go to your Slack app settings at https://api.slack.com/apps
   - Navigate to "OAuth & Permissions"
   - Ensure required scopes are added:
     ```
     chat:write
     channels:read
     channels:history
     users:read
     search:read
     channels:manage
     users.profile:write
     files:write
     ```

3. **Reinstall App to Workspace**
   - In your Slack app settings, go to "Install App"
   - Click "Reinstall to Workspace"
   - Copy the new bot token

4. **Environment Variable Issues**
   ```bash
   # Check if environment variable is set
   printenv | grep SLACK_BOT_TOKEN
   
   # Set environment variable properly
   export SLACK_BOT_TOKEN=xoxb-your-actual-token
   
   # For persistent setting, add to ~/.bashrc or ~/.zshrc
   echo 'export SLACK_BOT_TOKEN=xoxb-your-actual-token' >> ~/.bashrc
   ```

### Channel and User Resolution Issues

#### Issue: "Channel not found" errors

**Symptoms:**
```json
{
  "success": false,
  "error": "Channel 'my-channel' not found",
  "code": "CHANNEL_NOT_FOUND"
}
```

**Solutions:**
1. **Use Correct Channel Format**
   ```javascript
   // ✅ Correct formats
   await slackSendMessageTool.execute({
     channel: "#general",           // Channel name with #
     channel: "general",            // Channel name without #
     channel: "C1234567890",        // Channel ID
   });
   
   // ❌ Incorrect formats
   await slackSendMessageTool.execute({
     channel: "##general",          // Double #
     channel: "#General",           // Wrong case
     channel: "non-existent",       // Channel doesn't exist
   });
   ```

2. **Verify Channel Exists**
   ```javascript
   // Get workspace info to see available channels
   const workspaceInfo = await slackGetWorkspaceInfoTool.execute({});
   console.log('Available channels:', workspaceInfo.data);
   ```

3. **Check Bot Permissions**
   - Ensure the bot is added to the channel
   - For private channels, the bot must be explicitly invited

#### Issue: "User not found" errors

**Solutions:**
1. **Use Correct User ID Format**
   ```javascript
   // ✅ Correct format
   await slackGetUserInfoTool.execute({
     userId: "U1234567890"  // Slack user ID format
   });
   
   // ❌ Incorrect formats
   await slackGetUserInfoTool.execute({
     userId: "@john.doe",    // Username format not supported
     userId: "john.doe",     // Plain username not supported
   });
   ```

2. **Find User ID**
   ```javascript
   // Search for user in messages to find their ID
   const searchResult = await slackSearchMessagesTool.execute({
     query: "from:@john.doe",
     limit: 1
   });
   
   if (searchResult.success && searchResult.data.messages.matches.length > 0) {
     const userId = searchResult.data.messages.matches[0].user;
     console.log('User ID:', userId);
   }
   ```

### Validation Errors

#### Issue: Input validation failures

**Symptoms:**
```json
{
  "success": false,
  "error": "Validation failed: channel: Channel is required, text: Message text is required",
  "code": "VALIDATION_ERROR",
  "details": {
    "channel": "Channel is required",
    "text": "Message text is required"
  }
}
```

**Solutions:**
1. **Check Required Fields**
   ```javascript
   // Each tool has specific required fields
   
   // slack_send_message requires:
   await slackSendMessageTool.execute({
     channel: "#general",  // Required
     text: "Hello world"   // Required
   });
   
   // slack_get_user_info requires:
   await slackGetUserInfoTool.execute({
     userId: "U1234567890"  // Required
   });
   
   // slack_create_channel requires:
   await slackCreateChannelTool.execute({
     name: "new-channel"    // Required
   });
   ```

2. **Validate Input Types**
   ```javascript
   // ✅ Correct types
   await slackGetChannelHistoryTool.execute({
     channel: "general",    // string
     limit: 50             // number
   });
   
   // ❌ Incorrect types
   await slackGetChannelHistoryTool.execute({
     channel: 123,         // should be string
     limit: "50"           // should be number
   });
   ```

3. **Check String Length Limits**
   ```javascript
   // Channel names must be <= 21 characters
   await slackCreateChannelTool.execute({
     name: "very-long-channel-name-that-exceeds-limit"  // ❌ Too long
   });
   
   await slackCreateChannelTool.execute({
     name: "short-name"  // ✅ Correct length
   });
   ```

### Rate Limiting Issues

#### Issue: "Rate limit exceeded" errors

**Symptoms:**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Retry after 60 seconds",
  "code": "RATE_LIMIT_ERROR"
}
```

**Solutions:**
1. **Built-in Retry Logic**
   The SDK automatically handles rate limiting with exponential backoff. Wait for the operation to complete.

2. **Reduce Concurrent Requests**
   ```javascript
   // ❌ Too many concurrent requests
   const promises = Array.from({ length: 1000 }, () => 
     slackSendMessageTool.execute({ channel: "#test", text: "Hello" })
   );
   await Promise.all(promises);
   
   // ✅ Batch requests appropriately
   const batchSize = 10;
   for (let i = 0; i < requests.length; i += batchSize) {
     const batch = requests.slice(i, i + batchSize);
     await Promise.all(batch.map(req => slackSendMessageTool.execute(req)));
     await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between batches
   }
   ```

3. **Monitor Rate Limits**
   ```javascript
   // Check response headers for rate limit info
   const result = await slackSendMessageTool.execute({
     channel: "#general",
     text: "Hello"
   });
   
   if (!result.success && result.code === 'RATE_LIMIT_ERROR') {
     console.log('Rate limited. Waiting before retry...');
     // SDK handles retry automatically
   }
   ```

### File Upload Issues

#### Issue: File upload failures

**Symptoms:**
```json
{
  "success": false,
  "error": "File does not exist: /path/to/file.txt",
  "code": "FILE_ERROR"
}
```

**Solutions:**
1. **Verify File Path**
   ```javascript
   const fs = require('fs');
   const path = require('path');
   
   const filePath = '/path/to/file.txt';
   
   // Check if file exists
   if (!fs.existsSync(filePath)) {
     console.error('File does not exist:', filePath);
     return;
   }
   
   // Check file permissions
   try {
     fs.accessSync(filePath, fs.constants.R_OK);
   } catch (error) {
     console.error('Cannot read file:', error);
     return;
   }
   
   // Upload file
   const result = await slackUploadFileTool.execute({
     channel: "#general",
     filePath: filePath,
     title: "My File"
   });
   ```

2. **File Size Limits**
   ```javascript
   const fs = require('fs');
   
   const stats = fs.statSync(filePath);
   const fileSizeInMB = stats.size / (1024 * 1024);
   
   if (fileSizeInMB > 1000) {  // Slack limit is ~1GB
     console.error('File too large:', fileSizeInMB, 'MB');
     return;
   }
   ```

3. **Supported File Types**
   Most file types are supported, but check Slack's documentation for restrictions on executable files.

### Network and Connectivity Issues

#### Issue: Network timeouts or connection errors

**Symptoms:**
```json
{
  "success": false,
  "error": "Network timeout after 30000ms",
  "code": "NETWORK_ERROR"
}
```

**Solutions:**
1. **Check Internet Connection**
   ```bash
   # Test connectivity to Slack API
   curl -I https://slack.com/api/api.test
   ```

2. **Configure Timeout Settings**
   ```bash
   # Increase timeout for slow connections
   export SLACK_API_TIMEOUT=60000  # 60 seconds
   ```

3. **Proxy Configuration**
   ```bash
   # If behind a corporate proxy
   export HTTP_PROXY=http://proxy.company.com:8080
   export HTTPS_PROXY=http://proxy.company.com:8080
   ```

### Memory and Performance Issues

#### Issue: High memory usage or slow performance

**Solutions:**
1. **Monitor Memory Usage**
   ```javascript
   console.log('Memory usage:', process.memoryUsage());
   
   const result = await slackSendMessageTool.execute({
     channel: "#general",
     text: "Hello"
   });
   
   console.log('Memory after operation:', process.memoryUsage());
   ```

2. **Optimize Concurrent Operations**
   ```javascript
   // Use appropriate concurrency limits
   const pLimit = require('p-limit');
   const limit = pLimit(10);  // Max 10 concurrent operations
   
   const results = await Promise.all(
     requests.map(req => 
       limit(() => slackSendMessageTool.execute(req))
     )
   );
   ```

3. **Clean Up Resources**
   ```javascript
   // For long-running applications, monitor memory
   setInterval(() => {
     if (process.memoryUsage().heapUsed > 100 * 1024 * 1024) {  // 100MB
       console.warn('High memory usage detected');
       // Consider restarting or cleaning up
     }
   }, 60000);  // Check every minute
   ```

## Debugging Tips

### Enable Debug Logging

```bash
# Set log level to DEBUG for detailed information
export LOG_LEVEL=DEBUG

# Run your application
node your-app.js
```

### Inspect API Responses

```javascript
const result = await slackSendMessageTool.execute({
  channel: "#general",
  text: "Debug message"
});

console.log('Full response:', JSON.stringify(result, null, 2));
```

### Test Individual Tools

```javascript
// Test each tool individually to isolate issues

// Test workspace connection
const workspaceTest = await slackGetWorkspaceInfoTool.execute({});
console.log('Workspace test:', workspaceTest.success ? 'PASS' : 'FAIL');

// Test user lookup
const userTest = await slackGetUserInfoTool.execute({ userId: 'USLACKBOT' });
console.log('User test:', userTest.success ? 'PASS' : 'FAIL');

// Test message sending
const messageTest = await slackSendMessageTool.execute({
  channel: '#general',
  text: 'Test message'
});
console.log('Message test:', messageTest.success ? 'PASS' : 'FAIL');
```

### Validate Environment

```javascript
// Check all required environment variables
const requiredEnvVars = ['SLACK_BOT_TOKEN'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing environment variables:', missingVars);
  process.exit(1);
}

console.log('Environment validation: PASS');
```

## Getting Help

### Check Logs
All operations are logged with structured information:
```bash
# Check application logs
tail -f your-app.log | grep -E "(ERROR|WARN)"
```

### Run Test Suite
```bash
# Run the complete test suite
npm test

# Run only integration tests (requires Slack token)
npm test -- __tests__/integration/
```

### Performance Benchmark
```bash
# Run performance benchmark
node scripts/simple-benchmark.js
```

### Common Error Patterns

1. **Token Issues**: Always start with authentication verification
2. **Permission Issues**: Check OAuth scopes and bot permissions
3. **Validation Issues**: Verify all required fields are provided
4. **Network Issues**: Test basic connectivity first
5. **Rate Limiting**: Reduce concurrent operations

### Support Resources

- **API Documentation**: [docs/api.md](./api.md)
- **Migration Guide**: [docs/migration.md](./migration.md)
- **Test Examples**: Check `__tests__/integration/` directory
- **Slack API Documentation**: https://api.slack.com/

Remember: The Enhanced MCP Slack SDK includes comprehensive error handling and logging to help diagnose issues quickly. Always check the error messages and codes for specific guidance.
