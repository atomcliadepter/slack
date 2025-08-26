
/**
 * Tests for Tool Registry
 */
import { toolRegistry, MCPTool } from '../../../../src/registry/toolRegistry';

describe('Tool Registry', () => {
  // Create a mock tool for testing
  const mockTool: MCPTool = {
    name: 'test_tool',
    description: 'A test tool',
    inputSchema: {
      type: 'object',
      properties: {
        test_param: {
          type: 'string',
        },
      },
      required: ['test_param'],
    },
    async execute(args: Record<string, any>) {
      return { success: true, data: args };
    },
  };

  beforeEach(() => {
    // Clear registry before each test
    toolRegistry.clear();
  });

  describe('Tool Registration', () => {
    test('should register a tool successfully', () => {
      toolRegistry.register(mockTool);
      
      expect(toolRegistry.hasTool('test_tool')).toBe(true);
      expect(toolRegistry.getTool('test_tool')).toBe(mockTool);
    });

    test('should get all registered tools', () => {
      toolRegistry.register(mockTool);
      
      const tools = toolRegistry.getAllTools();
      expect(tools).toHaveLength(1);
      expect(tools[0]).toBe(mockTool);
    });

    test('should get tool names', () => {
      toolRegistry.register(mockTool);
      
      const names = toolRegistry.getToolNames();
      expect(names).toContain('test_tool');
    });

    test('should unregister a tool', () => {
      toolRegistry.register(mockTool);
      expect(toolRegistry.hasTool('test_tool')).toBe(true);
      
      const removed = toolRegistry.unregister('test_tool');
      expect(removed).toBe(true);
      expect(toolRegistry.hasTool('test_tool')).toBe(false);
    });

    test('should return false when unregistering non-existent tool', () => {
      const removed = toolRegistry.unregister('nonexistent_tool');
      expect(removed).toBe(false);
    });
  });

  describe('Tool Retrieval', () => {
    test('should return undefined for non-existent tool', () => {
      const tool = toolRegistry.getTool('nonexistent_tool');
      expect(tool).toBeUndefined();
    });

    test('should check if tool exists', () => {
      expect(toolRegistry.hasTool('test_tool')).toBe(false);
      
      toolRegistry.register(mockTool);
      expect(toolRegistry.hasTool('test_tool')).toBe(true);
    });
  });

  describe('Registry Statistics', () => {
    test('should provide correct statistics', () => {
      const stats = toolRegistry.getStats();
      expect(stats.totalTools).toBe(0);
      expect(stats.toolNames).toHaveLength(0);
      
      toolRegistry.register(mockTool);
      
      const updatedStats = toolRegistry.getStats();
      expect(updatedStats.totalTools).toBe(1);
      expect(updatedStats.toolNames).toContain('test_tool');
    });
  });

  describe('Default Tools', () => {
    test('should have default tools registered after import', () => {
      // Re-import to get default tools
      jest.resetModules();
      const { toolRegistry: freshRegistry } = require('../../src/registry/toolRegistry');
      
      const stats = freshRegistry.getStats();
      expect(stats.totalTools).toBeGreaterThan(0);
      
      // Check for expected tools
      const expectedTools = [
        'slack_send_message',
        'slack_get_channel_history',
        'slack_create_channel',
        'slack_get_user_info',
        'slack_upload_file',
        'slack_search_messages',
        'slack_set_status',
        'slack_get_workspace_info',
      ];
      
      expectedTools.forEach(toolName => {
        expect(freshRegistry.hasTool(toolName)).toBe(true);
      });
    });
  });
});
