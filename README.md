
# Enhanced MCP Slack SDK v2.0.0

A production-ready, comprehensive Slack integration SDK built on the Model Context Protocol (MCP) with advanced tooling, intelligent automation, and enterprise-grade features.

## 🚀 Features

### Core Capabilities
- **33 Enhanced Tools** with intelligent automation and context awareness
- **Production-Ready Architecture** with TypeScript, Zod validation, and comprehensive error handling
- **MCP Protocol Integration** for seamless AI agent communication
- **Extensible Tool Registry** for easy addition of new tools
- **Comprehensive Testing Suite** with Jest, unit, integration, e2e, performance, and security tests
- **Docker Support** with health checks and multi-stage builds
- **Advanced Analytics & AI Integration** with built-in analytics and AI-powered features

### Complete Tool Suite (33 Tools)

#### **Core Messaging Tools**
1. **slack_send_message** - Advanced messaging with Block Kit, threading, and rich formatting
2. **slack_chat_update** - Update existing messages with enhanced formatting
3. **slack_chat_delete** - Delete messages with proper permissions and logging

#### **Channel Management Tools**
4. **slack_create_channel** - Smart channel creation with templates and automation
5. **slack_list_channels** - List and filter channels with advanced metadata
6. **slack_join_channel** - Join channels with validation and error handling
7. **slack_leave_channel** - Leave channels with proper cleanup
8. **slack_archive_channel** - Archive channels with backup and notification

#### **Conversation & History Tools**
9. **slack_get_channel_history** - Intelligent history retrieval with filtering
10. **slack_conversations_info** - Get detailed channel/conversation information
11. **slack_conversations_history** - Advanced conversation history with pagination
12. **slack_conversations_members** - List conversation members with roles
13. **slack_conversations_replies** - Get thread replies with context
14. **slack_conversations_mark** - Mark conversations as read with timestamps

#### **User Management Tools**
15. **slack_get_user_info** - Enhanced user profiles with analytics
16. **slack_users_info** - Detailed user information with presence
17. **slack_users_list** - List users with filtering and pagination
18. **slack_list_users** - Alternative user listing with enhanced metadata
19. **slack_users_lookup_by_email** - Find users by email address

#### **Reactions & Interactions**
20. **slack_reactions_add** - Add reactions with emoji validation
21. **slack_reactions_remove** - Remove reactions with proper permissions
22. **slack_reactions_get** - Get reaction details and analytics

#### **Pins & Bookmarks**
23. **slack_pins_add** - Pin messages with context and notifications
24. **slack_pins_remove** - Unpin messages with proper validation
25. **slack_pins_list** - List pinned items with metadata
26. **slack_bookmarks_list** - List channel bookmarks and shortcuts

#### **Search & Discovery**
27. **slack_search_messages** - AI-powered search with advanced filtering

#### **File Management**
28. **slack_upload_file** - Advanced file upload with multi-channel support

#### **Status & Presence**
29. **slack_set_status** - Intelligent status management with templates

#### **Workspace & Analytics**
30. **slack_get_workspace_info** - Comprehensive workspace analytics
31. **slack_auth_test** - Authentication testing and validation

#### **Advanced Features**
32. **slack_views_publish** - Publish App Home views and modals
33. **slack_events_tail** - Real-time event monitoring and logging

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Slack workspace with bot permissions
- (Optional) Docker for containerized deployment

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd enhanced-mcp-slack-sdk

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Configure your Slack credentials in .env
# SLACK_BOT_TOKEN=xoxb-your-bot-token
# SLACK_SIGNING_SECRET=your-signing-secret

# Build the project
npm run build

# Run tests
npm test

# Start the MCP server
npm start
```

### Docker Deployment

```bash
# Build Docker image
npm run docker:build

# Run with Docker Compose (includes Redis)
docker-compose -f docker/docker-compose.yml up -d

# Check health
curl http://localhost:3000/health
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```env
# Slack Configuration (Required)
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret

# Optional Slack Configuration
SLACK_USER_TOKEN=xoxp-your-user-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

# Application Configuration
NODE_ENV=development
HTTP_PORT=3000
SLACK_SOCKET_MODE=false
SLACK_LOG_LEVEL=INFO
SLACK_API_TIMEOUT_MS=30000
SLACK_API_MAX_RETRIES=3

# MCP Configuration
MCP_SERVER_NAME=enhanced-slack-mcp-server
MCP_SERVER_VERSION=2.0.0

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379

# Optional: AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=default
```

### Slack App Setup

1. **Create a Slack App** at https://api.slack.com/apps
2. **Configure OAuth Scopes**:
   ```
   Bot Token Scopes:
   - channels:history
   - channels:read
   - channels:write
   - chat:write
   - files:read
   - files:write
   - groups:history
   - groups:read
   - groups:write
   - im:history
   - im:read
   - im:write
   - mpim:history
   - mpim:read
   - mpim:write
   - pins:read
   - pins:write
   - reactions:read
   - reactions:write
   - search:read
   - users:read
   - users:read.email
   - users.profile:read
   - users.profile:write
   - team:read
   - bookmarks:read
   ```

3. **Install App** to your workspace
4. **Copy tokens** to your `.env` file

## 🛠️ Usage Examples

### Basic Message Sending

```typescript
import { slackSendMessageTool } from './src/tools/slackSendMessage';

const result = await slackSendMessageTool.execute({
  channel: 'general',
  text: 'Hello from Enhanced MCP Slack SDK!',
});

console.log(result);
```

### Advanced Message with Blocks

```typescript
const result = await slackSendMessageTool.execute({
  channel: 'general',
  text: 'Fallback text',
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Project Update*\nDeployment completed successfully! 🚀'
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View Details' },
          url: 'https://example.com/deployment'
        }
      ]
    }
  ]
});
```

### Channel Creation with Template

```typescript
import { slackCreateChannelTool } from './src/tools/slackCreateChannel';

const result = await slackCreateChannelTool.execute({
  name: 'project-alpha',
  template: 'project',
  invite_users: ['john.doe', 'jane.smith'],
  send_welcome_message: true
});
```

### File Upload with Analysis

```typescript
import { slackUploadFileTool } from './src/tools/slackUploadFile';

const result = await slackUploadFileTool.execute({
  channels: ['general', 'development'],
  file_path: '/path/to/document.pdf',
  title: 'Project Documentation',
  initial_comment: 'Latest project documentation for review'
});
```

### Advanced Search with Filters

```typescript
import { slackSearchMessagesTool } from './src/tools/slackSearchMessages';

const result = await slackSearchMessagesTool.execute({
  query: 'deployment error',
  channel_filter: ['development', 'ops'],
  user_filter: ['john.doe'],
  date_range: {
    after: '2024-01-01',
    before: '2024-01-31'
  },
  has_files: true,
  include_context: true,
  context_size: 3
});
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests only
npm run test:performance  # Performance tests only
npm run test:security     # Security tests only

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests in CI mode
npm run test:ci

# Debug tests
npm run test:debug
```

### Test Structure

```
tests/
├── config/
│   └── jest.config.ts     # Jest configuration
├── unit/                  # Unit tests
│   ├── tools/            # Tool-specific tests
│   ├── utils/            # Utility tests
│   └── registry/         # Registry tests
├── integration/          # Integration tests
│   ├── slack-api/        # Slack API integration tests
│   └── mcp-protocol/     # MCP protocol tests
├── e2e/                  # End-to-end tests
│   └── workflows/        # Complete workflow tests
├── performance/          # Performance tests
│   └── benchmarks/       # Performance benchmarks
├── security/             # Security tests
│   └── vulnerabilities/  # Security vulnerability tests
├── fixtures/             # Test data and fixtures
├── mocks/                # Mock implementations
├── helpers/              # Test helper functions
└── reports/              # Test reports and coverage
```

### Integration Testing

Integration tests require real Slack credentials and will make actual API calls to your Slack workspace. Set up a test channel and configure the following environment variable:

```env
TEST_SLACK_CHANNEL=test-channel
```

## 🏗️ Architecture

### Project Structure

```
enhanced-mcp-slack-sdk/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── config/
│   │   └── env.ts         # Environment configuration with Zod validation
│   ├── utils/
│   │   ├── slackClient.ts # Enhanced Slack client
│   │   ├── error.ts       # Error handling utilities
│   │   ├── logger.ts      # Structured logging
│   │   ├── validator.ts   # Zod validation utilities
│   │   ├── performance.ts # Performance monitoring
│   │   ├── aiAnalytics.ts # AI-powered analytics
│   │   ├── advancedAnalytics.ts # Advanced analytics
│   │   ├── missingFunctions.ts # Missing function implementations
│   │   └── globalStubs.ts # Global function stubs
│   ├── registry/
│   │   └── toolRegistry.ts # Tool management system
│   ├── tools/             # Enhanced tool implementations (33 tools)
│   │   ├── slackSendMessage.ts
│   │   ├── slackGetChannelHistory.ts
│   │   ├── slackCreateChannel.ts
│   │   ├── slackGetUserInfo.ts
│   │   ├── slackUploadFile.ts
│   │   ├── slackSearchMessages.ts
│   │   ├── slackSetStatus.ts
│   │   ├── slackGetWorkspaceInfo.ts
│   │   ├── slackListChannels.ts
│   │   ├── slackListUsers.ts
│   │   ├── slackJoinChannel.ts
│   │   ├── slackLeaveChannel.ts
│   │   ├── slackArchiveChannel.ts
│   │   ├── slackConversationsInfo.ts
│   │   ├── slackConversationsMembers.ts
│   │   ├── slackConversationsHistory.ts
│   │   ├── slackConversationsReplies.ts
│   │   ├── slackConversationsMark.ts
│   │   ├── slackChatUpdate.ts
│   │   ├── slackChatDelete.ts
│   │   ├── slackReactionsAdd.ts
│   │   ├── slackReactionsRemove.ts
│   │   ├── slackReactionsGet.ts
│   │   ├── slackAuthTest.ts
│   │   ├── slackPinsAdd.ts
│   │   ├── slackPinsRemove.ts
│   │   ├── slackPinsList.ts
│   │   ├── slackBookmarksList.ts
│   │   ├── slackUsersInfo.ts
│   │   ├── slackUsersList.ts
│   │   ├── slackUsersLookupByEmail.ts
│   │   ├── slackViewsPublish.ts
│   │   └── slackEventsTail.ts
│   ├── types/
│   │   └── index.ts       # TypeScript definitions
│   └── healthcheck.ts     # Docker health check
├── tests/                 # Comprehensive test suites
│   ├── config/           # Test configuration
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── e2e/              # End-to-end tests
│   ├── performance/      # Performance tests
│   ├── security/         # Security tests
│   ├── fixtures/         # Test data
│   ├── mocks/            # Mock implementations
│   ├── helpers/          # Test helpers
│   └── reports/          # Test reports
├── dist/                 # Compiled JavaScript
├── coverage/             # Test coverage reports
├── docs/                 # Additional documentation
├── docker/               # Docker configuration
│   ├── Dockerfile
│   └── docker-compose.yml
├── scripts/              # Build and utility scripts
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

### Core Components

#### 1. **MCP Server** (`src/index.ts`)
- Handles MCP protocol communication
- Routes tool execution requests
- Manages server lifecycle and error handling

#### 2. **Tool Registry** (`src/registry/toolRegistry.ts`)
- Centralized tool management
- Dynamic tool registration and discovery
- Tool metadata and validation

#### 3. **Enhanced Slack Client** (`src/utils/slackClient.ts`)
- Wrapper around Slack Web API
- Connection management and retry logic
- ID resolution and caching

#### 4. **Validation System** (`src/utils/validator.ts`)
- Zod-based input validation
- Common schema definitions
- Type-safe parameter handling

#### 5. **Error Handling** (`src/utils/error.ts`)
- Comprehensive error categorization
- User-friendly error messages
- Structured error responses

## 🚀 Deployment

### Docker Production Deployment

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  enhanced-mcp-slack-sdk:
    image: enhanced-mcp-slack-sdk:latest
    environment:
      - NODE_ENV=production
      - SLACK_LOG_LEVEL=WARN
    ports:
      - "3000:3000"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "dist/healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: enhanced-mcp-slack-sdk
spec:
  replicas: 3
  selector:
    matchLabels:
      app: enhanced-mcp-slack-sdk
  template:
    metadata:
      labels:
        app: enhanced-mcp-slack-sdk
    spec:
      containers:
      - name: enhanced-mcp-slack-sdk
        image: enhanced-mcp-slack-sdk:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: SLACK_BOT_TOKEN
          valueFrom:
            secretKeyRef:
              name: slack-secrets
              key: bot-token
        livenessProbe:
          exec:
            command:
            - node
            - dist/healthcheck.js
          initialDelaySeconds: 30
          periodSeconds: 30
```

## 🔧 Development

### Adding New Tools

1. **Create Tool File** in `src/tools/`:

```typescript
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  // Define your input schema
});

export const myNewTool: MCPTool = {
  name: 'my_new_tool',
  description: 'Description of what this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      // Define JSON schema properties
    },
    required: ['required_param'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedArgs = Validator.validate(inputSchema, args);
      
      // Implement tool logic
      const result = await doSomething(validatedArgs);
      
      const duration = Date.now() - startTime;
      logger.logToolExecution('my_new_tool', args, duration);

      return {
        success: true,
        data: result,
        metadata: {
          execution_time_ms: duration,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('my_new_tool', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'my_new_tool',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
```

2. **Register Tool** in `src/registry/toolRegistry.ts`:

```typescript
import { myNewTool } from '@/tools/myNewTool';

// Add to the registration section
toolRegistry.register(myNewTool);
```

3. **Add Tests** in `__tests__/tools/myNewTool.test.ts`

### Code Style and Linting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### Building and Distribution

```bash
# Clean previous build
npm run clean

# Build TypeScript
npm run build

# Build Docker image
npm run docker:build
```

## 📊 Monitoring and Observability

### Logging

The SDK uses structured JSON logging with configurable levels:

```typescript
import { logger } from '@/utils/logger';

logger.info('Operation completed', { 
  operation: 'send_message',
  channel: 'general',
  duration: 150 
});

logger.error('Operation failed', { 
  operation: 'upload_file',
  error: 'File not found',
  file_path: '/invalid/path' 
});
```

### Health Checks

Health check endpoint available at `/health` when running in HTTP mode:

```bash
curl http://localhost:3000/health
```

### Metrics and Analytics

Each tool execution includes comprehensive metadata:

- Execution time
- Success/failure rates
- Parameter validation results
- API call statistics
- Error categorization

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Make your changes
5. Add tests for new functionality
6. Run tests: `npm test`
7. Run linting: `npm run lint:fix`
8. Commit changes: `git commit -m 'Add amazing feature'`
9. Push to branch: `git push origin feature/amazing-feature`
10. Open a Pull Request

### Code Standards

- **TypeScript**: Strict mode enabled with comprehensive type checking
- **Testing**: Minimum 80% code coverage required
- **Documentation**: All public APIs must be documented
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Logging**: Structured logging for all operations
- **Validation**: Zod schemas for all inputs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](docs/api.md)
- [Tool Reference](docs/tools.md)
- [Deployment Guide](docs/deployment.md)

### Community
- [GitHub Issues](https://github.com/your-org/enhanced-mcp-slack-sdk/issues)
- [Discussions](https://github.com/your-org/enhanced-mcp-slack-sdk/discussions)

### Enterprise Support
For enterprise support, custom integrations, and professional services, contact: support@your-org.com

---

**Enhanced MCP Slack SDK v2.0.0** - Built with ❤️ for the AI automation community.
