# Troubleshooting Guide - Enhanced MCP Slack SDK v2.0.0

## Quick Diagnostics

### Health Check
```bash
# Test basic functionality
npm test -- tests/unit/simple.test.ts

# Check authentication
npm run test:auth

# Verify build
npm run build
```

### Circuit Breaker Status
```typescript
import { ErrorRecovery } from './src/utils/errorRecovery';

const status = ErrorRecovery.getCircuitBreakerStatus('slack-api');
console.log('Circuit breaker state:', status.state);
console.log('Failures:', status.failures);
console.log('Available:', status.isAvailable);
```

## Common Issues

### Authentication Errors

#### "invalid_auth" - Invalid Authentication Token
**Symptoms:**
- All API calls fail with authentication error
- Error code: `invalid_auth`

**Solutions:**
1. Verify `SLACK_BOT_TOKEN` format (starts with `xoxb-`)
2. Check token hasn't been revoked in Slack app settings
3. Ensure app is installed in the workspace
4. Regenerate token if necessary

**Example Fix:**
```env
# Correct format
SLACK_BOT_TOKEN=xoxb-1234567890-1234567890-abcdefghijklmnopqrstuvwx

# Incorrect format
SLACK_BOT_TOKEN=xoxp-1234567890  # This is a user token, not bot token
```

#### "no_permission" - Insufficient Permissions
**Symptoms:**
- Some operations work, others fail
- Error code: `no_permission`

**Solutions:**
1. Check OAuth scopes in app settings
2. Add missing scopes (see [Quick Start](../QUICKSTART.md#configure-oauth-scopes))
3. Reinstall app after adding scopes

### Channel Errors

#### "channel_not_found" - Channel Not Found
**Symptoms:**
- Channel operations fail
- Error code: `channel_not_found`

**Solutions:**
1. Verify channel exists and spelling is correct
2. Use channel ID instead of name for private channels
3. Ensure bot is invited to private channels
4. Check if channel was archived or deleted

#### "not_in_channel" - Bot Not in Channel
**Symptoms:**
- Cannot send messages or read history
- Error code: `not_in_channel`

**Solutions:**
1. Invite bot to the channel: `/invite @your-bot-name`
2. For private channels, admin must invite the bot
3. Use public channels or DMs if possible

### Rate Limiting

#### "rate_limited" - API Rate Limit Exceeded
**Symptoms:**
- Requests fail with rate limit error
- Error code: `rate_limited`
- Circuit breaker may open

**Solutions:**
1. SDK automatically handles with exponential backoff
2. Reduce request frequency if persistent
3. Check circuit breaker status
4. Implement request queuing for high-volume operations

### Performance Issues

#### Circuit Breaker Open
**Symptoms:**
- Operations fail with "Circuit breaker is OPEN"
- Multiple consecutive failures occurred

**Solutions:**
1. Wait for automatic reset (default: 30 seconds)
2. Check underlying issue causing failures
3. Manually reset if needed

**Manual Reset:**
```typescript
import { ErrorRecovery } from './src/utils/errorRecovery';

ErrorRecovery.resetCircuitBreaker('slack-api');
```

## Advanced Troubleshooting

### Debug Logging
Enable detailed logging:
```env
SLACK_LOG_LEVEL=DEBUG
NODE_ENV=development
```

### Performance Profiling
Monitor performance:
```typescript
import { PerformanceTimer } from './src/utils/performance';

const timer = new PerformanceTimer();
timer.mark('operation_start');

// Your operation here
await slackSendMessageTool.execute({...});

const duration = timer.measure('operation_start');
console.log(`Operation took ${duration}ms`);
```

## Getting Help

### Self-Service Resources
1. **API Reference**: [docs/API_REFERENCE.md](API_REFERENCE.md)
2. **Quick Start**: [QUICKSTART.md](../QUICKSTART.md)
3. **Examples**: [README.md Usage Examples](../README.md#usage-examples)

### Community Support
1. **GitHub Issues**: [Report bugs](https://github.com/your-org/enhanced-mcp-slack-sdk/issues)
2. **Discussions**: [Community discussions](https://github.com/your-org/enhanced-mcp-slack-sdk/discussions)

---

**Still having issues?** [Open a GitHub issue](https://github.com/your-org/enhanced-mcp-slack-sdk/issues) with error details and reproduction steps.
