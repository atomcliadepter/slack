

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

// Import and register all tools
import { slackSendMessageTool } from '@/tools/slackSendMessage';
import { slackGetChannelHistoryTool } from '@/tools/slackGetChannelHistory';
import { slackCreateChannelTool } from '@/tools/slackCreateChannel';
import { slackGetUserInfoTool } from '@/tools/slackGetUserInfo';
import { slackUploadFileTool } from '@/tools/slackUploadFile';
import { slackSearchMessagesTool } from '@/tools/slackSearchMessages';
import { slackSetStatusTool } from '@/tools/slackSetStatus';
import { slackGetWorkspaceInfoTool } from '@/tools/slackGetWorkspaceInfo';
import { slackListChannelsTool } from '@/tools/slackListChannels';
import { slackListUsersTool } from '@/tools/slackListUsers';
import { slackJoinChannelTool } from '@/tools/slackJoinChannel';
import { slackLeaveChannelTool } from '@/tools/slackLeaveChannel';
import { slackArchiveChannelTool } from '@/tools/slackArchiveChannel';

// New Enhanced Conversation Tools
import { slackConversationsInfoTool } from '@/tools/slackConversationsInfo';
import { slackConversationsMembersTool } from '@/tools/slackConversationsMembers';
import { slackConversationsHistoryTool } from '@/tools/slackConversationsHistory';
import { slackConversationsRepliesTool } from '@/tools/slackConversationsReplies';
import { slackConversationsMarkTool } from '@/tools/slackConversationsMark';

// New Enhanced Chat & Reactions Tools
import { slackChatUpdateTool } from '@/tools/slackChatUpdate';
import { slackChatDeleteTool } from '@/tools/slackChatDelete';
import { slackReactionsAddTool } from '@/tools/slackReactionsAdd';
import { slackReactionsRemoveTool } from '@/tools/slackReactionsRemove';
import { slackReactionsGetTool } from '@/tools/slackReactionsGet';
import { slackAuthTestTool } from '@/tools/slackAuthTest';

// New Enhanced Pins, Search & Users Tools
import { slackPinsAddTool } from '@/tools/slackPinsAdd';
import { slackPinsRemoveTool } from '@/tools/slackPinsRemove';
import { slackPinsListTool } from '@/tools/slackPinsList';
import { slackBookmarksListTool } from '@/tools/slackBookmarksList';
import { slackUsersInfoTool } from '@/tools/slackUsersInfo';
import { slackUsersListTool } from '@/tools/slackUsersList';

// New Enhanced Advanced Features Tools
import { slackUsersLookupByEmailTool } from '@/tools/slackUsersLookupByEmail';
import { slackViewsPublishTool } from '@/tools/slackViewsPublish';
import { slackEventsTailTool } from '@/tools/slackEventsTail';

// Register all tools
toolRegistry.register(slackSendMessageTool);
toolRegistry.register(slackGetChannelHistoryTool);
toolRegistry.register(slackCreateChannelTool);
toolRegistry.register(slackGetUserInfoTool);
toolRegistry.register(slackUploadFileTool);
toolRegistry.register(slackSearchMessagesTool);
toolRegistry.register(slackSetStatusTool);
toolRegistry.register(slackGetWorkspaceInfoTool);
toolRegistry.register(slackListChannelsTool);
toolRegistry.register(slackListUsersTool);
toolRegistry.register(slackJoinChannelTool);
toolRegistry.register(slackLeaveChannelTool);
toolRegistry.register(slackArchiveChannelTool);

// Register new enhanced conversation tools
toolRegistry.register(slackConversationsInfoTool);
toolRegistry.register(slackConversationsMembersTool);
toolRegistry.register(slackConversationsHistoryTool);
toolRegistry.register(slackConversationsRepliesTool);
toolRegistry.register(slackConversationsMarkTool);

// Register new enhanced chat & reactions tools
toolRegistry.register(slackChatUpdateTool);
toolRegistry.register(slackChatDeleteTool);
toolRegistry.register(slackReactionsAddTool);
toolRegistry.register(slackReactionsRemoveTool);
toolRegistry.register(slackReactionsGetTool);
toolRegistry.register(slackAuthTestTool);

// Register new enhanced pins, search & users tools
toolRegistry.register(slackPinsAddTool);
toolRegistry.register(slackPinsRemoveTool);
toolRegistry.register(slackPinsListTool);
toolRegistry.register(slackBookmarksListTool);
toolRegistry.register(slackSearchMessagesTool);
toolRegistry.register(slackUsersInfoTool);
toolRegistry.register(slackUsersListTool);

// Register new enhanced advanced features tools
toolRegistry.register(slackUsersLookupByEmailTool);
toolRegistry.register(slackViewsPublishTool);
toolRegistry.register(slackEventsTailTool);

logger.info(`Registered ${toolRegistry.getAllTools().length} tools in registry`);
