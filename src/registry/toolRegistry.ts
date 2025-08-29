

import { logger } from '@/utils/logger';

/**
 * Tool interface for MCP Slack SDK tools
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute(args: Record<string, any>): Promise<any>;
  [key: string]: any; // Allow additional methods and properties
}

/**
 * Tool registry for managing MCP tools
 */
class ToolRegistry {
  private tools: Map<string, MCPTool> = new Map();

  /**
   * Register a tool
   */
  register(tool: MCPTool): void {
    if (this.tools.has(tool.name)) {
      logger.warn(`Tool '${tool.name}' is already registered. Overwriting.`);
    }

    this.tools.set(tool.name, tool);
    logger.debug(`Registered tool: ${tool.name}`);
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    const removed = this.tools.delete(name);
    if (removed) {
      logger.debug(`Unregistered tool: ${name}`);
    }
    return removed;
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
    logger.debug('Cleared all tools from registry');
  }

  /**
   * Get registry statistics
   */
  getStats(): { totalTools: number; toolNames: string[] } {
    return {
      totalTools: this.tools.size,
      toolNames: this.getToolNames(),
    };
  }
}

// Create and export the singleton instance
export const toolRegistry = new ToolRegistry();

// Dynamically discover and register tools from the tools directory
import fs from 'fs';
import path from 'path';

const toolsPath = path.resolve(__dirname, '../tools');

try {
  const toolFiles = fs.readdirSync(toolsPath);

  toolFiles.forEach(file => {
    if (!file.endsWith('.ts') && !file.endsWith('.js')) {
      return;
    }

    const fullPath = path.join(toolsPath, file);

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(fullPath);

      let tool: MCPTool | undefined = mod.default;

      if (!tool) {
        tool = Object.values(mod).find(
          (exp: any) =>
            exp && typeof exp === 'object' && 'name' in exp && 'execute' in exp
        ) as MCPTool | undefined;
      }

      if (tool) {
        toolRegistry.register(tool);
        logger.info(`Loaded tool '${tool.name}' from ${file}`);
      } else {
        logger.warn(`No MCPTool export found in ${file}`);
      }
    } catch (err) {
      logger.error(`Failed to load tool from ${file}: ${(err as Error).message}`);
    }
  });
} catch (err) {
  logger.error(`Failed to read tools directory '${toolsPath}': ${(err as Error).message}`);
}

logger.info(`🎉 SUPER ENHANCED! Registered ${toolRegistry.getAllTools().length} tools in registry - NOW WITH ${toolRegistry.getAllTools().length} TOTAL TOOLS!`);
