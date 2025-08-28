#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { toolRegistry } = require('./dist/registry/toolRegistry.js');

async function main() {
  console.log('🚀 Starting Enhanced MCP Slack SDK v2.0.0');
  
  const server = new Server(
    {
      name: 'enhanced-slack-mcp-server',
      version: '2.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all tools
  const tools = toolRegistry.getAllTools();
  console.log(`📦 Registering ${tools.length} tools...`);
  
  server.setRequestHandler('tools/list', async () => {
    return {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;
    const tool = tools.find(t => t.name === name);
    
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    console.log(`🔧 Executing tool: ${name}`);
    const result = await tool.execute(args || {});
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.log('✅ Enhanced MCP Slack SDK server running');
  console.log(`🛠️  Available tools: ${tools.length}`);
  console.log('📡 Ready for MCP client connections');
}

main().catch(console.error);
