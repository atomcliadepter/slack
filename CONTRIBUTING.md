# Contributing to Enhanced MCP Slack SDK

## Quick Start for Contributors

### Development Setup
```bash
git clone https://github.com/your-org/enhanced-mcp-slack-sdk.git
cd enhanced-mcp-slack-sdk
npm install
npm run build
npm test
```

### Adding New Tools

1. **Create Tool File**: `src/tools/slackNewTool.ts`
```typescript
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { z } from 'zod';

const inputSchema = z.object({
  // Define schema
});

export const slackNewTool: MCPTool = {
  name: 'slack_new_tool',
  description: 'Tool description',
  inputSchema: { /* JSON schema */ },
  async execute(args) {
    // Implementation
  }
};
```

2. **Register Tool**: Add to `src/registry/toolRegistry.ts`
```typescript
import { slackNewTool } from '@/tools/slackNewTool';
toolRegistry.register(slackNewTool);
```

3. **Add Tests**: `tests/unit/tools/slackNewTool.test.ts`
```typescript
import { slackNewTool } from '../../../src/tools/slackNewTool';
// Test implementation
```

### Code Standards

- **TypeScript**: Strict mode, full type safety
- **Testing**: Minimum 80% coverage
- **Validation**: Zod schemas for all inputs
- **Error Handling**: Comprehensive error management
- **Logging**: Structured logging for all operations

### Testing
```bash
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:coverage      # Coverage report
```

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes with tests
4. Run full test suite: `npm test`
5. Update documentation if needed
6. Submit pull request

### Commit Messages
```
feat: add slack_new_tool for feature X
fix: resolve authentication issue in tool Y
docs: update API reference for tool Z
test: add integration tests for feature X
```

## Need Help?

- Check [API Reference](API_REFERENCE.md)
- Review existing tools in `src/tools/`
- Ask questions in GitHub Issues
