
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { config } from '@/config/env';
import { toolRegistry } from '@/registry/toolRegistry';
import { logger } from '@/utils/logger';
import { ErrorHandler } from '@/utils/error';

/**
 * Enhanced MCP Slack SDK v2.0.0 Server
 * Production-ready Slack integration with comprehensive toolset
 */
class EnhancedMCPSlackServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: config.MCP_SERVER_NAME,
        version: config.MCP_SERVER_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = toolRegistry.getAllTools();
      logger.info(`Listing ${tools.length} available tools`);
      
      return {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info(`Executing tool: ${name}`, { args });

      try {
        const tool = toolRegistry.getTool(name);
        if (!tool) {
          throw new Error(`Tool '${name}' not found`);
        }

        const result = await tool.execute(args || {});
        
        logger.info(`Tool '${name}' executed successfully`);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = ErrorHandler.handleError(error);
        logger.error(`Tool '${name}' execution failed: ${errorMessage}`);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: errorMessage,
                tool: name,
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    logger.info(`Enhanced MCP Slack SDK v${config.MCP_SERVER_VERSION} started successfully`);
    logger.info(`Available tools: ${toolRegistry.getAllTools().length}`);
  }
}

// Start the server
async function main() {
  try {
    const server = new EnhancedMCPSlackServer();
    await server.start();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { EnhancedMCPSlackServer };
