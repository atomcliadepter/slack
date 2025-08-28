# Quick Start Guide - Enhanced MCP Slack SDK v2.0.0

Get up and running with the Enhanced MCP Slack SDK in 5 minutes.

## Prerequisites

- Node.js 18+
- Slack workspace with admin access
- Basic TypeScript/JavaScript knowledge

## 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-org/enhanced-mcp-slack-sdk.git
cd enhanced-mcp-slack-sdk

# Install dependencies
npm install

# Build the project
npm run build
```

## 2. Slack App Setup

### Create Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name your app and select your workspace

### Configure OAuth Scopes
Add these Bot Token Scopes:
```
channels:history    channels:read       channels:write
chat:write         files:read          files:write
groups:history     groups:read         groups:write
im:history         im:read             im:write
pins:read          pins:write          reactions:read
reactions:write    search:read         users:read
users:read.email   users.profile:read  team:read
```

### Install App
1. Click "Install to Workspace"
2. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

## 3. Configuration

Create `.env` file:
```env
# Required
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here

# Optional
NODE_ENV=development
SLACK_LOG_LEVEL=INFO
```

## 4. First Test

Test your setup:
```bash
npm test -- tests/unit/simple.test.ts
```

## 5. Basic Usage

### Send a Message
```typescript
import { slackSendMessageTool } from './src/tools/slackSendMessage';

const result = await slackSendMessageTool.execute({
  channel: 'general',
  text: 'Hello from Enhanced MCP Slack SDK! 🚀',
});

console.log(result.success ? 'Message sent!' : result.error);
```

### Get Channel History
```typescript
import { slackGetChannelHistoryTool } from './src/tools/slackGetChannelHistory';

const result = await slackGetChannelHistoryTool.execute({
  channel: 'general',
  limit: 10,
  include_analytics: true,
});

console.log(`Found ${result.data.messages.length} messages`);
```

### Create a Channel
```typescript
import { slackCreateChannelTool } from './src/tools/slackCreateChannel';

const result = await slackCreateChannelTool.execute({
  name: 'my-new-channel',
  template: 'project',
  invite_users: ['john.doe', 'jane.smith'],
  send_welcome_message: true,
});
```

## 6. Production Deployment

### Docker (Recommended)
```bash
# Using Docker Compose
cd deployment/docker
docker-compose up -d

# Check status
docker-compose ps
curl http://localhost:3000/health
```

### Kubernetes
```bash
# Apply manifests
kubectl apply -f deployment/k8s/deployment.yaml

# Check deployment
kubectl get pods -l app=slack-mcp
kubectl get svc slack-mcp-service
```

### Helm
```bash
# Install with Helm
helm install slack-mcp deployment/helm/

# Upgrade
helm upgrade slack-mcp deployment/helm/
```

### Monitoring
```bash
# Deploy monitoring stack
cd deployment/monitoring
docker-compose up -d

# Access dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)
```

## 7. Advanced Features

### Error Handling
```typescript
const result = await slackSendMessageTool.execute({
  channel: 'invalid-channel',
  text: 'Test message',
});

if (!result.success) {
  console.log('Error:', result.error);
  console.log('Suggestion:', result.suggested_action);
  console.log('Retryable:', result.is_retryable);
}
```

### Performance Monitoring
```typescript
import { ErrorRecovery } from './src/utils/errorRecovery';

// Check circuit breaker status
const status = ErrorRecovery.getCircuitBreakerStatus('slack-api');
console.log('Circuit breaker state:', status.state);

// Clear cache for fresh data
import { slackClient } from './src/utils/slackClient';
slackClient.clearCache();
```

### Analytics & Insights
```typescript
const result = await slackUsersInfoTool.execute({
  user: 'john.doe',
  include_analytics: true,
  include_recommendations: true,
});

console.log('Profile completeness:', result.data.analytics.profile_completeness_score);
console.log('Security score:', result.data.analytics.security_score);
console.log('Recommendations:', result.data.recommendations);
```

## 7. Common Use Cases

### Daily Standup Bot
```typescript
// Send standup reminder
await slackSendMessageTool.execute({
  channel: 'team-standup',
  text: '🌅 Good morning! Time for daily standup!',
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Daily Standup Reminder*\nPlease share:\n• What you did yesterday\n• What you plan to do today\n• Any blockers'
      }
    }
  ]
});
```

### Channel Analytics Dashboard
```typescript
// Get channel insights
const channels = await slackListChannelsTool.execute({
  include_analytics: true,
  sort_by: 'activity',
});

channels.data.channels.forEach(channel => {
  console.log(`${channel.name}: ${channel.analytics.activity_level} activity`);
});
```

### User Onboarding
```typescript
// Welcome new user
await slackSendMessageTool.execute({
  channel: '@new.user',
  text: 'Welcome to the team! 🎉',
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Welcome to the team!* 🎉\n\nHere are some helpful resources to get you started:'
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Team Handbook' },
          url: 'https://company.com/handbook'
        }
      ]
    }
  ]
});
```

## 8. Testing

### Run All Tests
```bash
npm test
```

### Run Specific Tests
```bash
npm test -- tests/unit/tools/slackSendMessage.test.ts
```

### Performance Tests
```bash
npm test -- tests/performance/
```

## 9. Deployment

### Docker
```bash
# Build Docker image
npm run docker:build

# Run with Docker Compose
docker-compose up -d
```

### Production Environment
```env
NODE_ENV=production
SLACK_LOG_LEVEL=WARN
REDIS_URL=redis://production-redis:6379
```

## 10. Next Steps

- **Read the [Full Documentation](README.md)** for comprehensive features
- **Check [API Reference](docs/API_REFERENCE.md)** for detailed tool documentation
- **Review [Best Practices](docs/api.md#best-practices)** for production usage
- **Explore [Examples](README.md#usage-examples)** for advanced use cases
- **Join the Community** for support and discussions

## Troubleshooting

### Common Issues

**"Invalid authentication token"**
- Verify your `SLACK_BOT_TOKEN` is correct
- Ensure the token starts with `xoxb-`
- Check that the app is installed in your workspace

**"Channel not found"**
- Verify the channel exists
- Ensure the bot is invited to private channels
- Use channel ID instead of name for private channels

**"Rate limited"**
- The SDK automatically handles rate limits with exponential backoff
- Check circuit breaker status if issues persist
- Consider reducing request frequency

### Getting Help

- **Documentation**: [README.md](README.md)
- **API Reference**: [docs/API_REFERENCE.md](docs/API_REFERENCE.md)
- **Troubleshooting**: [docs/troubleshooting.md](docs/troubleshooting.md)
- **Issues**: [GitHub Issues](https://github.com/your-org/enhanced-mcp-slack-sdk/issues)

---

**🎉 You're ready to build amazing Slack integrations with the Enhanced MCP Slack SDK!**
