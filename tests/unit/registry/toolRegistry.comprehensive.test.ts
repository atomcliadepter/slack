/**
 * Comprehensive tests for Tool Registry
 */

import { toolRegistry, MCPTool } from '../../../src/registry/toolRegistry';
import { logger } from '../../../src/utils/logger';

// Mock logger
jest.mock('../../../src/utils/logger');

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('Tool Registry - Comprehensive Tests', () => {
  // Create mock tools for testing
  const mockTool1: MCPTool = {
    name: 'test_tool_1',
    description: 'Test tool 1 for registry testing',
    inputSchema: {
      type: 'object',
      properties: {
        param1: { type: 'string' },
      },
      required: ['param1'],
    },
    execute: jest.fn().mockResolvedValue({ success: true, data: 'test1' }),
  };

  const mockTool2: MCPTool = {
    name: 'test_tool_2',
    description: 'Test tool 2 for registry testing',
    inputSchema: {
      type: 'object',
      properties: {
        param2: { type: 'number' },
      },
      required: ['param2'],
    },
    execute: jest.fn().mockResolvedValue({ success: true, data: 'test2' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the registry before each test
    toolRegistry.clear();
    
    // Re-setup mocks after clearing
    (mockTool1.execute as jest.Mock).mockResolvedValue({ success: true, data: 'test1' });
    (mockTool2.execute as jest.Mock).mockResolvedValue({ success: true, data: 'test2' });
  });

  describe('Tool Registration', () => {
    it('should register a tool successfully', () => {
      toolRegistry.register(mockTool1);

      expect(toolRegistry.hasTool('test_tool_1')).toBe(true);
      expect(toolRegistry.getTool('test_tool_1')).toBe(mockTool1);
    });

    it('should register multiple tools', () => {
      toolRegistry.register(mockTool1);
      toolRegistry.register(mockTool2);

      expect(toolRegistry.hasTool('test_tool_1')).toBe(true);
      expect(toolRegistry.hasTool('test_tool_2')).toBe(true);
      expect(toolRegistry.getAllTools()).toHaveLength(2);
    });

    it('should warn when overwriting existing tool', () => {
      toolRegistry.register(mockTool1);
      toolRegistry.register(mockTool1); // Register same tool again

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('already registered')
      );
    });

    it('should overwrite existing tool when re-registered', () => {
      const modifiedTool = {
        ...mockTool1,
        description: 'Modified description',
      };

      toolRegistry.register(mockTool1);
      toolRegistry.register(modifiedTool);

      const retrievedTool = toolRegistry.getTool('test_tool_1');
      expect(retrievedTool?.description).toBe('Modified description');
    });
  });

  describe('Tool Retrieval', () => {
    beforeEach(() => {
      toolRegistry.register(mockTool1);
      toolRegistry.register(mockTool2);
    });

    it('should retrieve tool by name', () => {
      const tool = toolRegistry.getTool('test_tool_1');
      expect(tool).toBe(mockTool1);
    });

    it('should return undefined for non-existent tool', () => {
      const tool = toolRegistry.getTool('non_existent_tool');
      expect(tool).toBeUndefined();
    });

    it('should get all registered tools', () => {
      const tools = toolRegistry.getAllTools();
      expect(tools).toHaveLength(2);
      expect(tools).toContain(mockTool1);
      expect(tools).toContain(mockTool2);
    });

    it('should get tool names', () => {
      const names = toolRegistry.getToolNames();
      expect(names).toHaveLength(2);
      expect(names).toContain('test_tool_1');
      expect(names).toContain('test_tool_2');
    });

    it('should check if tool exists', () => {
      expect(toolRegistry.hasTool('test_tool_1')).toBe(true);
      expect(toolRegistry.hasTool('non_existent_tool')).toBe(false);
    });
  });

  describe('Tool Unregistration', () => {
    beforeEach(() => {
      toolRegistry.register(mockTool1);
      toolRegistry.register(mockTool2);
    });

    it('should unregister tool successfully', () => {
      const result = toolRegistry.unregister('test_tool_1');

      expect(result).toBe(true);
      expect(toolRegistry.hasTool('test_tool_1')).toBe(false);
      expect(toolRegistry.hasTool('test_tool_2')).toBe(true);
    });

    it('should return false when unregistering non-existent tool', () => {
      const result = toolRegistry.unregister('non_existent_tool');

      expect(result).toBe(false);
    });

    it('should log when tool is unregistered', () => {
      toolRegistry.unregister('test_tool_1');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Unregistered tool: test_tool_1')
      );
    });
  });

  describe('Registry Management', () => {
    beforeEach(() => {
      toolRegistry.register(mockTool1);
      toolRegistry.register(mockTool2);
    });

    it('should clear all tools', () => {
      toolRegistry.clear();

      expect(toolRegistry.getAllTools()).toHaveLength(0);
      expect(toolRegistry.hasTool('test_tool_1')).toBe(false);
      expect(toolRegistry.hasTool('test_tool_2')).toBe(false);
    });

    it('should log when registry is cleared', () => {
      toolRegistry.clear();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Cleared all tools from registry'
      );
    });

    it('should get registry statistics', () => {
      const stats = toolRegistry.getStats();

      expect(stats.totalTools).toBe(2);
      expect(stats.toolNames).toHaveLength(2);
      expect(stats.toolNames).toContain('test_tool_1');
      expect(stats.toolNames).toContain('test_tool_2');
    });
  });

  describe('Tool Validation', () => {
    it('should accept valid tool structure', () => {
      expect(() => toolRegistry.register(mockTool1)).not.toThrow();
    });

    it('should handle tools with additional properties', () => {
      const extendedTool: MCPTool = {
        ...mockTool1,
        name: 'extended_tool',
        customProperty: 'custom value',
        customMethod: () => 'custom result',
      };

      expect(() => toolRegistry.register(extendedTool)).not.toThrow();
      expect(toolRegistry.hasTool('extended_tool')).toBe(true);
    });

    it('should handle tools with complex input schemas', () => {
      const complexTool: MCPTool = {
        name: 'complex_tool',
        description: 'Tool with complex schema',
        inputSchema: {
          type: 'object',
          properties: {
            stringParam: { type: 'string', minLength: 1 },
            numberParam: { type: 'number', minimum: 0 },
            booleanParam: { type: 'boolean' },
            arrayParam: {
              type: 'array',
              items: { type: 'string' },
            },
            objectParam: {
              type: 'object',
              properties: {
                nestedString: { type: 'string' },
              },
            },
          },
          required: ['stringParam', 'numberParam'],
        },
        execute: jest.fn(),
      };

      expect(() => toolRegistry.register(complexTool)).not.toThrow();
      expect(toolRegistry.hasTool('complex_tool')).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent registrations', () => {
      const tools = Array.from({ length: 10 }, (_, i) => ({
        name: `concurrent_tool_${i}`,
        description: `Concurrent tool ${i}`,
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
        execute: jest.fn(),
      }));

      // Register all tools concurrently
      tools.forEach(tool => toolRegistry.register(tool));

      expect(toolRegistry.getAllTools()).toHaveLength(10);
      tools.forEach(tool => {
        expect(toolRegistry.hasTool(tool.name)).toBe(true);
      });
    });

    it('should handle concurrent retrievals', () => {
      toolRegistry.register(mockTool1);

      // Simulate concurrent access
      const retrievals = Array.from({ length: 100 }, () => 
        toolRegistry.getTool('test_tool_1')
      );

      retrievals.forEach(tool => {
        expect(tool).toBe(mockTool1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty registry operations', () => {
      expect(toolRegistry.getAllTools()).toHaveLength(0);
      expect(toolRegistry.getToolNames()).toHaveLength(0);
      expect(toolRegistry.getTool('any_tool')).toBeUndefined();
      expect(toolRegistry.hasTool('any_tool')).toBe(false);
      expect(toolRegistry.unregister('any_tool')).toBe(false);
    });

    it('should handle tools with empty names', () => {
      const emptyNameTool: MCPTool = {
        name: '',
        description: 'Tool with empty name',
        inputSchema: { type: 'object', properties: {} },
        execute: jest.fn(),
      };

      toolRegistry.register(emptyNameTool);
      expect(toolRegistry.hasTool('')).toBe(true);
    });

    it('should handle tools with special characters in names', () => {
      const specialTool: MCPTool = {
        name: 'tool-with_special.chars@123',
        description: 'Tool with special characters',
        inputSchema: { type: 'object', properties: {} },
        execute: jest.fn(),
      };

      toolRegistry.register(specialTool);
      expect(toolRegistry.hasTool('tool-with_special.chars@123')).toBe(true);
    });

    it('should handle very long tool names', () => {
      const longName = 'a'.repeat(1000);
      const longNameTool: MCPTool = {
        name: longName,
        description: 'Tool with very long name',
        inputSchema: { type: 'object', properties: {} },
        execute: jest.fn(),
      };

      toolRegistry.register(longNameTool);
      expect(toolRegistry.hasTool(longName)).toBe(true);
    });
  });

  describe('Real-world Integration', () => {
    it('should work with actual Slack tools structure', () => {
      // Test with structure similar to actual Slack tools
      const slackTool: MCPTool = {
        name: 'slack_send_message',
        description: 'Send a message to a Slack channel',
        inputSchema: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              description: 'Channel ID or name',
            },
            text: {
              type: 'string',
              description: 'Message text',
            },
            thread_ts: {
              type: 'string',
              description: 'Thread timestamp',
            },
          },
          required: ['channel', 'text'],
        },
        execute: async (args: Record<string, any>) => {
          return {
            success: true,
            data: {
              message_sent: true,
              timestamp: '1234567890.123456',
            },
          };
        },
      };

      toolRegistry.register(slackTool);

      expect(toolRegistry.hasTool('slack_send_message')).toBe(true);
      expect(toolRegistry.getTool('slack_send_message')).toBe(slackTool);
    });

    it('should maintain tool execution functionality', async () => {
      toolRegistry.register(mockTool1);
      
      const tool = toolRegistry.getTool('test_tool_1');
      expect(tool).toBeDefined();
      
      if (tool) {
        const result = await tool.execute({ param1: 'test' });
        expect(result).toEqual({ success: true, data: 'test1' });
      }
    });
  });

  describe('Performance', () => {
    it('should handle large number of tools efficiently', () => {
      const startTime = Date.now();
      
      // Register 1000 tools
      for (let i = 0; i < 1000; i++) {
        const tool: MCPTool = {
          name: `performance_tool_${i}`,
          description: `Performance test tool ${i}`,
          inputSchema: { type: 'object', properties: {} },
          execute: jest.fn(),
        };
        toolRegistry.register(tool);
      }

      const registrationTime = Date.now() - startTime;
      
      // Test retrieval performance
      const retrievalStart = Date.now();
      for (let i = 0; i < 1000; i++) {
        toolRegistry.getTool(`performance_tool_${i}`);
      }
      const retrievalTime = Date.now() - retrievalStart;

      expect(toolRegistry.getAllTools()).toHaveLength(1000);
      expect(registrationTime).toBeLessThan(1000); // Should complete within 1 second
      expect(retrievalTime).toBeLessThan(100); // Should complete within 100ms
    });
  });
});
