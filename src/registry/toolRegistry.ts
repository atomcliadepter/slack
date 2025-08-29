

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
// Removed duplicate slackGetUserInfo - using enhanced slackUsersInfo instead
import { slackListChannelsTool } from '@/tools/slackListChannels';
import { slackListUsersTool } from '@/tools/slackListUsers';
import { slackAuthTestTool } from '@/tools/slackAuthTest';

// Previously implemented tools
import { slackUploadFileTool } from '@/tools/slackUploadFile';
import { slackReactionsAddTool } from '@/tools/slackReactionsAdd';
import { slackPinsAddTool } from '@/tools/slackPinsAdd';

// New priority tools
import { slackConversationsInfoTool } from '@/tools/slackConversationsInfo';
import { slackChatUpdateTool } from '@/tools/slackChatUpdate';
import { slackChatDeleteTool } from '@/tools/slackChatDelete';

// Latest priority tools (Session 4)
import { slackReactionsRemoveTool } from '@/tools/slackReactionsRemove';
import { slackPinsRemoveTool } from '@/tools/slackPinsRemove';
import { slackSearchMessagesTool } from '@/tools/slackSearchMessages';

// Session 5 tools (reactions_get, pins_list, bookmarks_list)
import { slackReactionsGetTool } from '@/tools/slackReactionsGet';
import { slackPinsListTool } from '@/tools/slackPinsList';
import { slackBookmarksListTool } from '@/tools/slackBookmarksList';
import { slackJoinChannelTool } from '@/tools/slackJoinChannel';
import { slackLeaveChannelTool } from '@/tools/slackLeaveChannel';
import { slackArchiveChannelTool } from '@/tools/slackArchiveChannel';
import { slackSetStatusTool } from '@/tools/slackSetStatus';
import { slackWorkspaceInfoTool } from '@/tools/slackWorkspaceInfo';
import { slackViewsPublishTool } from '@/tools/slackViewsPublish';
import { slackEventsTailTool } from '@/tools/slackEventsTail';
import { slackConversationsMembersTool } from '@/tools/slackConversationsMembers';
import { slackConversationsHistoryTool } from '@/tools/slackConversationsHistory';
import { slackConversationsRepliesTool } from '@/tools/slackConversationsReplies';
import { slackConversationsMarkTool } from '@/tools/slackConversationsMark';
import { slackUsersLookupByEmailTool } from '@/tools/slackUsersLookupByEmail';
import { slackUsersInfoTool } from '@/tools/slackUsersInfo';
import { slackConversationsOpenTool } from '@/tools/slackConversationsOpen';
import { slackUsersListTool } from '@/tools/slackUsersList';

// New additional tools
import { slackConversationsUnarchiveTool } from '@/tools/slackConversationsUnarchive';
import { slackConversationsInviteTool } from '@/tools/slackConversationsInvite';
import { slackConversationsKickTool } from '@/tools/slackConversationsKick';
import { slackRemindersAddTool } from '@/tools/slackRemindersAdd';
import { slackRemindersListTool } from '@/tools/slackRemindersList';

// Register all implemented tools
toolRegistry.register(slackSendMessageTool);
toolRegistry.register(slackGetChannelHistoryTool);
toolRegistry.register(slackCreateChannelTool);
// Removed duplicate registration - using enhanced slackUsersInfo instead
toolRegistry.register(slackListChannelsTool);
toolRegistry.register(slackListUsersTool);
toolRegistry.register(slackAuthTestTool);
toolRegistry.register(slackUploadFileTool);
toolRegistry.register(slackReactionsAddTool);
toolRegistry.register(slackPinsAddTool);
toolRegistry.register(slackConversationsInfoTool);
toolRegistry.register(slackChatUpdateTool);
toolRegistry.register(slackChatDeleteTool);
toolRegistry.register(slackReactionsRemoveTool);
toolRegistry.register(slackPinsRemoveTool);
toolRegistry.register(slackSearchMessagesTool);
toolRegistry.register(slackReactionsGetTool);
toolRegistry.register(slackPinsListTool);
toolRegistry.register(slackBookmarksListTool);
toolRegistry.register(slackJoinChannelTool);
toolRegistry.register(slackLeaveChannelTool);
toolRegistry.register(slackArchiveChannelTool);
toolRegistry.register(slackSetStatusTool);
toolRegistry.register(slackWorkspaceInfoTool);
toolRegistry.register(slackViewsPublishTool);
toolRegistry.register(slackEventsTailTool);
toolRegistry.register(slackConversationsMembersTool);
toolRegistry.register(slackConversationsHistoryTool);
toolRegistry.register(slackConversationsRepliesTool);
toolRegistry.register(slackConversationsMarkTool);
toolRegistry.register(slackUsersLookupByEmailTool);
toolRegistry.register(slackUsersInfoTool);
toolRegistry.register(slackUsersListTool);
toolRegistry.register(slackConversationsOpenTool);

// Register new additional tools
toolRegistry.register(slackConversationsUnarchiveTool);
toolRegistry.register(slackConversationsInviteTool);
toolRegistry.register(slackConversationsKickTool);
toolRegistry.register(slackRemindersAddTool);
toolRegistry.register(slackRemindersListTool);

logger.info(`🎉 ENHANCED! Registered ${toolRegistry.getAllTools().length} tools in registry - NOW WITH ${toolRegistry.getAllTools().length} TOTAL TOOLS!`);
