# Enhanced MCP Slack SDK API Reference v2.0.0

## Overview

The Enhanced MCP Slack SDK provides **33 fully functional tools** for comprehensive Slack integration through the Model Context Protocol (MCP). Each tool includes:

- ✅ **Enhanced Error Handling**: User-friendly error messages with suggested actions
- ✅ **Performance Optimization**: Caching, parallel processing, and exponential backoff
- ✅ **Input Validation**: Comprehensive validation with specific error messages
- ✅ **Circuit Breaker Protection**: Automatic failure detection and recovery
- ✅ **Analytics & Insights**: AI-powered analytics and recommendations

## Quick Start

```typescript
import { slackSendMessageTool } from './src/tools/slackSendMessage';

const result = await slackSendMessageTool.execute({
  channel: 'general',
  text: 'Hello from Enhanced MCP Slack SDK!',
});
```

## Core Tools

### 1. slack_send_message
Send enhanced messages with Block Kit support and analytics.

**Parameters:**
- `channel` (string): Channel ID, name (#general), or user ID for DM
- `text` (string): Message text with Slack markdown support
- `thread_ts` (string, optional): Parent message timestamp for threading
- `blocks` (array, optional): Slack Block Kit blocks for rich formatting
- `include_analytics` (boolean, optional): Include message analytics

**Enhanced Features:**
- Block Kit validation and accessibility scoring
- Message analytics with read time estimation
- Channel resolution (supports #channel-name format)
- Thread broadcasting options

**Example:**
```typescript
const result = await slackSendMessageTool.execute({
  channel: '#development',
  text: 'Deployment completed! 🚀',
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Deployment Status*\n✅ Production deployment successful'
      }
    }
  ],
  include_analytics: true
});
```

### 2. slack_auth_test
Test authentication with comprehensive security analysis.

**Parameters:**
- `include_analytics` (boolean, optional): Include security analysis
- `include_recommendations` (boolean, optional): Include security recommendations

**Enhanced Features:**
- Token type detection and validation
- Security assessment with scoring
- Permission analysis and recommendations
- Connection quality metrics

### 3. slack_get_channel_history
Retrieve channel messages with advanced filtering and analytics.

**Parameters:**
- `channel` (string): Channel ID or name
- `limit` (number, optional): Number of messages (default: 100)
- `oldest` (string, optional): Start timestamp
- `latest` (string, optional): End timestamp
- `include_analytics` (boolean, optional): Include message analytics

**Enhanced Features:**
- Advanced filtering by user, message type, time range
- Message enhancement with metadata
- Content analysis and engagement metrics
- Pagination support for large datasets

## Error Handling

All tools include enhanced error handling with:

### Slack API Error Mapping
- **Authentication**: `invalid_auth`, `token_revoked`, `no_permission`
- **Channel Operations**: `channel_not_found`, `not_in_channel`, `is_archived`
- **User Operations**: `user_not_found`, `user_not_in_channel`
- **Rate Limiting**: `rate_limited` with intelligent backoff

### Error Response Format
```typescript
{
  success: false,
  error: "User-friendly error message",
  error_code: "slack_api_error_code",
  suggested_action: "Specific action to resolve the issue",
  is_retryable: true,
  context: { /* Additional context */ },
  metadata: { /* Error details */ }
}
```

### Input Validation
- User ID format: `U + 8+ alphanumeric characters`
- Channel ID format: `C/G/D + 8+ alphanumeric characters`
- Timestamp format: `1234567890.123456`
- Email format: Standard email validation

## Performance Features

### Caching System
- **User Info Cache**: 5-minute TTL for user lookups
- **Channel Resolution Cache**: Cached channel name to ID mapping
- **API Response Cache**: Configurable caching for repeated requests

### Parallel Processing
- **Batch API Calls**: Concurrent processing with `Promise.all`
- **Presence Calls**: Parallel presence information retrieval
- **User Lookups**: Batch user information processing

### Circuit Breaker
- **Failure Threshold**: Configurable failure count before opening
- **Reset Timeout**: Automatic recovery attempt timing
- **Monitoring**: Real-time circuit breaker status

### Retry Logic
- **Exponential Backoff**: Smart delay calculation (1s, 2s, 4s, 8s...)
- **Retryable Errors**: Automatic retry for transient failures
- **Max Attempts**: Configurable retry limits

## Analytics & Insights

### Message Analytics
```typescript
{
  message_analytics: {
    estimated_read_time_seconds: 15,
    character_count: 150,
    word_count: 25,
    has_mentions: true,
    has_links: false
  }
}
```

### Channel Analytics
```typescript
{
  channel_analytics: {
    activity_level: 'high',
    member_count: 45,
    recent_activity: true,
    engagement_score: 85
  }
}
```

### User Analytics
```typescript
{
  user_analytics: {
    profile_completeness_score: 90,
    security_score: 75,
    activity_level: 'active',
    timezone_info: {
      timezone: 'America/New_York',
      local_time: '2024-01-15T10:30:00-05:00'
    }
  }
}
```

## Advanced Features

### Smart Channel Operations
- **Channel Resolution**: Automatic ID resolution from names
- **Safety Checks**: Prevent dangerous operations (archiving #general)
- **Member Analysis**: Comprehensive member insights
- **Activity Assessment**: Channel health scoring

### Intelligent User Management
- **Profile Analysis**: Completeness scoring and recommendations
- **Security Assessment**: 2FA status, verification levels
- **Engagement Metrics**: Activity patterns and insights
- **Timezone Intelligence**: Local time calculation and distribution

### File Operations
- **Multi-Channel Upload**: Upload to multiple channels simultaneously
- **File Analysis**: Automatic type detection and security assessment
- **Performance Metrics**: Upload speed tracking
- **User Notifications**: Targeted file sharing notifications

## Configuration

### Environment Variables
```env
# Required
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret

# Optional Performance
SLACK_API_TIMEOUT_MS=30000
SLACK_API_MAX_RETRIES=3
SLACK_LOG_LEVEL=INFO

# Optional Caching
REDIS_URL=redis://localhost:6379
```

### Performance Tuning
```typescript
import { slackClient } from '@/utils/slackClient';
import { ErrorRecovery } from '@/utils/errorRecovery';

// Clear cache when needed
slackClient.clearCache();

// Configure circuit breaker
ErrorRecovery.resetCircuitBreaker('slack-api');

// Check performance metrics
const status = ErrorRecovery.getCircuitBreakerStatus('slack-api');
```

## Best Practices

### Error Handling
1. Always check `success` field in responses
2. Use `suggested_action` for user guidance
3. Implement retry logic for `is_retryable` errors
4. Log error context for debugging

### Performance
1. Enable caching for repeated operations
2. Use batch processing for multiple API calls
3. Implement circuit breaker for external dependencies
4. Monitor performance metrics

### Security
1. Validate all inputs before API calls
2. Use least privilege principle for tokens
3. Enable 2FA for admin users
4. Regular security assessments

### Analytics
1. Enable analytics for insights
2. Use recommendations for optimization
3. Monitor engagement metrics
4. Track performance trends

## Migration Guide

### From v1.x to v2.0.0
- Enhanced error responses now include `suggested_action`
- Analytics are optional but recommended
- New caching system improves performance
- Circuit breaker provides better reliability

### Breaking Changes
- Error response format updated
- Some tool parameters renamed for consistency
- Analytics data structure enhanced

## Support

- **Documentation**: [Full Documentation](../README.md)
- **Troubleshooting**: [Troubleshooting Guide](troubleshooting.md)
- **Examples**: [Usage Examples](../README.md#usage-examples)
- **Issues**: [GitHub Issues](https://github.com/your-org/enhanced-mcp-slack-sdk/issues)
