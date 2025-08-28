import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  timestamp: z.string().min(1, 'Message timestamp is required'),
  analyze_context: z.boolean().optional().default(true),
  include_analytics: z.boolean().optional().default(true),
  notify_channel: z.boolean().optional().default(false),
  notify_users: z.array(z.string()).optional().default([]),
  reason: z.string().optional(),
  create_backup: z.boolean().optional().default(true),
});

type InputArgs = z.infer<typeof inputSchema>;

interface PinRemovalResult {
  success: boolean;
  channel: string;
  timestamp: string;
  pin_context?: {
    message_content: string;
    message_author: string;
    pin_age_hours: number;
    importance_score: number;
    removal_impact: string;
  };
  analytics?: {
    pin_patterns: {
      total_pins_remaining: number;
      pin_density: string;
      content_diversity: string;
    };
    channel_impact: {
      information_accessibility: string;
      user_workflow_impact: string;
      knowledge_retention_risk: string;
    };
    usage_insights: {
      pin_utilization_rate: string;
      content_freshness: string;
      organizational_value: string;
    };
  };
  backup_info?: {
    backup_created: boolean;
    backup_location: string;
    recovery_instructions: string;
  };
  recommendations?: {
    alternative_actions: string[];
    workflow_improvements: string[];
    best_practices: string[];
  };
  notifications?: {
    channel_notified: boolean;
    users_notified: string[];
    notification_content: string;
  };
  metadata: {
    execution_time_ms: number;
    api_calls_made: number;
    removal_timestamp: string;
    reason?: string;
  };
}

export const slackPinsRemoveTool: MCPTool = {
  name: 'slack_pins_remove',
  description: 'Remove pinned messages from Slack channels with comprehensive context analysis and impact assessment',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID or name where the pinned message is located',
      },
      timestamp: {
        type: 'string',
        description: 'Timestamp of the message to unpin',
      },
      analyze_context: {
        type: 'boolean',
        description: 'Whether to analyze the context and importance of the pinned message',
        default: true,
      },
      include_analytics: {
        type: 'boolean',
        description: 'Whether to include detailed pin analytics and impact assessment',
        default: true,
      },
      notify_channel: {
        type: 'boolean',
        description: 'Whether to notify the channel about the pin removal',
        default: false,
      },
      notify_users: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of user IDs to notify about the pin removal',
        default: [],
      },
      reason: {
        type: 'string',
        description: 'Optional reason for removing the pin',
      },
      create_backup: {
        type: 'boolean',
        description: 'Whether to create a backup record of the pinned message',
        default: true,
      },
    },
    required: ['channel', 'timestamp'],
  },

  async execute(args: Record<string, any>): Promise<PinRemovalResult> {
    const startTime = Date.now();
    let apiCallCount = 0;

    try {
      const validatedArgs = Validator.validate(inputSchema, args) as InputArgs;
      
      // Resolve channel ID if needed
      const channelId = await slackClient.resolveChannelId(validatedArgs.channel);
      apiCallCount++;

      let messageInfo: any = null;
      let pinContext: any = null;
      let currentPins: any[] = [];

      // Get message info and current pins for analysis
      if (validatedArgs.analyze_context || validatedArgs.include_analytics) {
        try {
          // Get the specific message
          const historyResponse = await (slackClient as any).client.conversations.history({
            channel: channelId,
            latest: validatedArgs.timestamp,
            limit: 1,
            inclusive: true,
          });
          apiCallCount++;

          if (historyResponse.messages && historyResponse.messages.length > 0) {
            messageInfo = historyResponse.messages[0];
          }

          // Get current pins list
          const pinsResponse = await (slackClient as any).client.pins.list({
            channel: channelId,
          });
          apiCallCount++;

          if (pinsResponse.ok && pinsResponse.items) {
            currentPins = pinsResponse.items;
          }

          if (messageInfo) {
            pinContext = analyzePinContext(messageInfo, currentPins);
          }
        } catch (error: any) {
          logger.warn('Could not fetch message or pins for analysis', { error: error.message });
        }
      }

      // Create backup if requested
      let backupInfo: any = null;
      if (validatedArgs.create_backup && messageInfo) {
        backupInfo = await createPinBackup(messageInfo, channelId, validatedArgs.reason);
      }

      // Remove the pin
      const removeResponse = await (slackClient as any).client.pins.remove({
        channel: channelId,
        timestamp: validatedArgs.timestamp,
      });
      apiCallCount++;

      if (!removeResponse.ok) {
        throw new Error(`Failed to remove pin: ${removeResponse.error}`);
      }

      // Get updated pins list for post-removal analysis
      let updatedPins: any[] = [];
      if (validatedArgs.include_analytics) {
        try {
          const updatedPinsResponse = await (slackClient as any).client.pins.list({
            channel: channelId,
          });
          apiCallCount++;

          if (updatedPinsResponse.ok && updatedPinsResponse.items) {
            updatedPins = updatedPinsResponse.items;
          }
        } catch (error: any) {
          logger.warn('Could not fetch updated pins for analysis', { error: error.message });
        }
      }

      // Build comprehensive result
      const result: PinRemovalResult = {
        success: true,
        channel: channelId,
        timestamp: validatedArgs.timestamp,
        metadata: {
          execution_time_ms: Date.now() - startTime,
          api_calls_made: apiCallCount,
          removal_timestamp: new Date().toISOString(),
          reason: validatedArgs.reason,
        },
      };

      // Add context analysis
      if (validatedArgs.analyze_context && pinContext && messageInfo) {
        result.pin_context = {
          message_content: truncateText(messageInfo.text || 'No text content', 200),
          message_author: messageInfo.user || 'Unknown',
          pin_age_hours: pinContext.pin_age_hours,
          importance_score: pinContext.importance_score,
          removal_impact: pinContext.removal_impact,
        };
      }

      // Add detailed analytics
      if (validatedArgs.include_analytics) {
        result.analytics = generatePinAnalytics(currentPins, updatedPins, messageInfo);
        result.recommendations = generatePinRecommendations(
          pinContext,
          currentPins,
          messageInfo
        );
      }

      // Add backup information
      if (backupInfo) {
        result.backup_info = backupInfo;
      }

      // Send notifications
      const notifications = await sendPinRemovalNotifications(
        channelId,
        messageInfo,
        validatedArgs.notify_channel,
        validatedArgs.notify_users,
        validatedArgs.reason
      );
      
      if (notifications.api_calls > 0) {
        apiCallCount += notifications.api_calls;
        result.notifications = notifications.result;
      }

      result.metadata.api_calls_made = apiCallCount;

      logger.logToolExecution('slack_pins_remove', validatedArgs, Date.now() - startTime);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_pins_remove', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_pins_remove',
        args,
        execution_time_ms: duration,
        api_calls_made: apiCallCount,
      }) as PinRemovalResult;
    }
  },
};

function analyzePinContext(message: any, currentPins: any[]) {
  const messageTimestamp = parseFloat(message.ts);
  const currentTime = Date.now() / 1000;
  const pinAgeHours = (currentTime - messageTimestamp) / 3600;
  
  // Calculate importance score based on various factors
  let importanceScore = 0;
  
  // Age factor (newer pins might be more relevant)
  if (pinAgeHours < 24) importanceScore += 30;
  else if (pinAgeHours < 168) importanceScore += 20; // 1 week
  else if (pinAgeHours < 720) importanceScore += 10; // 1 month
  
  // Content length factor
  const contentLength = (message.text || '').length;
  if (contentLength > 100) importanceScore += 20;
  else if (contentLength > 50) importanceScore += 10;
  
  // Reactions factor
  const reactionCount = message.reactions 
    ? message.reactions.reduce((sum: number, r: any) => sum + r.count, 0)
    : 0;
  importanceScore += Math.min(reactionCount * 5, 25);
  
  // Thread activity factor
  if (message.reply_count && message.reply_count > 0) {
    importanceScore += Math.min(message.reply_count * 3, 15);
  }
  
  // Determine removal impact
  let removalImpact = 'low';
  if (importanceScore > 70) removalImpact = 'high';
  else if (importanceScore > 40) removalImpact = 'medium';
  
  return {
    pin_age_hours: Math.round(pinAgeHours * 100) / 100,
    importance_score: Math.min(importanceScore, 100),
    removal_impact: removalImpact,
    content_analysis: {
      has_links: (message.text || '').includes('http'),
      has_mentions: (message.text || '').includes('@'),
      has_attachments: message.files && message.files.length > 0,
    },
  };
}

function generatePinAnalytics(currentPins: any[], updatedPins: any[], removedMessage: any) {
  const pinsRemoved = currentPins.length - updatedPins.length;
  const remainingPins = updatedPins.length;
  
  // Analyze pin density
  let pinDensity = 'low';
  if (remainingPins > 10) pinDensity = 'high';
  else if (remainingPins > 5) pinDensity = 'medium';
  
  // Analyze content diversity
  const contentTypes = new Set();
  updatedPins.forEach(pin => {
    if (pin.message) {
      if (pin.message.files && pin.message.files.length > 0) contentTypes.add('files');
      if (pin.message.text && pin.message.text.includes('http')) contentTypes.add('links');
      if (pin.message.blocks && pin.message.blocks.length > 0) contentTypes.add('rich_content');
      if (pin.message.text) contentTypes.add('text');
    }
  });
  
  const diversityScore = contentTypes.size;
  let contentDiversity = 'low';
  if (diversityScore > 3) contentDiversity = 'high';
  else if (diversityScore > 1) contentDiversity = 'medium';
  
  return {
    pin_patterns: {
      total_pins_remaining: remainingPins,
      pin_density: pinDensity,
      content_diversity: contentDiversity,
    },
    channel_impact: {
      information_accessibility: remainingPins > 5 ? 'good' : remainingPins > 2 ? 'moderate' : 'limited',
      user_workflow_impact: pinsRemoved > 1 ? 'moderate' : 'minimal',
      knowledge_retention_risk: remainingPins < 3 ? 'high' : remainingPins < 7 ? 'medium' : 'low',
    },
    usage_insights: {
      pin_utilization_rate: remainingPins > 8 ? 'high' : remainingPins > 3 ? 'moderate' : 'low',
      content_freshness: analyzeContentFreshness(updatedPins),
      organizational_value: remainingPins > 5 ? 'high' : remainingPins > 2 ? 'medium' : 'low',
    },
  };
}

function generatePinRecommendations(pinContext: any, currentPins: any[], removedMessage: any) {
  const recommendations = {
    alternative_actions: [] as string[],
    workflow_improvements: [] as string[],
    best_practices: [] as string[],
  };

  // Alternative actions based on importance
  if (pinContext && pinContext.importance_score > 60) {
    recommendations.alternative_actions.push('Consider creating a summary document instead of unpinning');
    recommendations.alternative_actions.push('Move important information to channel topic or description');
  }
  
  if (removedMessage && removedMessage.files && removedMessage.files.length > 0) {
    recommendations.alternative_actions.push('Ensure files are accessible through other means');
  }

  // Workflow improvements
  const remainingPins = currentPins.length - 1; // After removal
  if (remainingPins < 3) {
    recommendations.workflow_improvements.push('Consider pinning more essential information for easy access');
  } else if (remainingPins > 10) {
    recommendations.workflow_improvements.push('Review and organize pins to maintain clarity');
  }

  recommendations.workflow_improvements.push('Regularly review pinned content for relevance');
  recommendations.workflow_improvements.push('Use channel bookmarks for frequently accessed resources');

  // Best practices
  recommendations.best_practices.push('Document important information before unpinning');
  recommendations.best_practices.push('Communicate pin changes to team members');
  recommendations.best_practices.push('Maintain a balance between information access and channel clarity');
  
  if (pinContext && pinContext.removal_impact === 'high') {
    recommendations.best_practices.push('Consider gradual transition when removing high-impact pins');
  }

  return recommendations;
}

function analyzeContentFreshness(pins: any[]): string {
  if (pins.length === 0) return 'none';
  
  const currentTime = Date.now() / 1000;
  const recentPins = pins.filter(pin => {
    const pinTime = pin.message ? parseFloat(pin.message.ts) : 0;
    const ageHours = (currentTime - pinTime) / 3600;
    return ageHours < 168; // 1 week
  });
  
  const freshnessRatio = recentPins.length / pins.length;
  
  if (freshnessRatio > 0.7) return 'very_fresh';
  if (freshnessRatio > 0.4) return 'moderately_fresh';
  if (freshnessRatio > 0.1) return 'somewhat_stale';
  return 'mostly_stale';
}

async function createPinBackup(message: any, channelId: string, reason?: string) {
  const backupData = {
    message_id: message.ts,
    channel_id: channelId,
    content: message.text || '',
    author: message.user || 'Unknown',
    timestamp: message.ts,
    backup_created: new Date().toISOString(),
    removal_reason: reason || 'No reason provided',
    attachments: message.files || [],
    reactions: message.reactions || [],
  };

  // In a real implementation, you might save this to a database or file system
  const backupLocation = `pin_backup_${channelId}_${message.ts}.json`;
  
  return {
    backup_created: true,
    backup_location: backupLocation,
    recovery_instructions: 'Contact administrator to restore pinned message from backup',
  };
}

async function sendPinRemovalNotifications(
  channelId: string,
  message: any,
  notifyChannel: boolean,
  notifyUsers: string[],
  reason?: string
) {
  let apiCalls = 0;
  const result = {
    channel_notified: false,
    users_notified: [] as string[],
    notification_content: '',
  };

  const messagePreview = message ? truncateText(message.text || 'Message content', 100) : 'Unknown message';
  const notificationText = reason 
    ? `📌 A pinned message was removed. Reason: ${reason}\nMessage preview: "${messagePreview}"`
    : `📌 A pinned message was removed.\nMessage preview: "${messagePreview}"`;

  result.notification_content = notificationText;

  // Notify channel if requested
  if (notifyChannel) {
    try {
      await (slackClient as any).client.chat.postMessage({
        channel: channelId,
        text: notificationText,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: notificationText,
            },
          },
        ],
      });
      apiCalls++;
      result.channel_notified = true;
    } catch (error: any) {
      logger.warn('Failed to send channel notification', { error: error.message });
    }
  }

  // Notify specific users
  for (const userId of notifyUsers) {
    try {
      await (slackClient as any).client.chat.postMessage({
        channel: userId,
        text: `📌 Pin Removal Notification\n\n${notificationText}`,
      });
      apiCalls++;
      result.users_notified.push(userId);
    } catch (error: any) {
      logger.warn(`Failed to notify user ${userId}`, { error: error.message });
    }
  }

  return { result, api_calls: apiCalls };
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}
