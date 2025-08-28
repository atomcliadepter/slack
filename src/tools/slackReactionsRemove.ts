import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  timestamp: z.string().min(1, 'Message timestamp is required'),
  name: z.string().min(1, 'Reaction name is required'),
  analyze_impact: z.boolean().optional().default(true),
  include_analytics: z.boolean().optional().default(true),
  notify_users: z.boolean().optional().default(false),
  reason: z.string().optional(),
});

type InputArgs = z.infer<typeof inputSchema>;

interface ReactionRemovalResult {
  success: boolean;
  channel: string;
  timestamp: string;
  reaction_name: string;
  removal_impact?: {
    previous_reaction_count: number;
    remaining_reactions: number;
    sentiment_change: string;
    user_engagement_impact: string;
    message_popularity_change: string;
  };
  analytics?: {
    reaction_patterns: {
      most_common_reactions: string[];
      reaction_diversity_score: number;
      engagement_level: string;
    };
    user_behavior: {
      reaction_frequency: string;
      engagement_consistency: string;
      social_influence_score: number;
    };
    message_context: {
      message_age_hours: number;
      thread_activity: string;
      channel_engagement: string;
    };
  };
  recommendations?: {
    alternative_reactions: string[];
    engagement_tips: string[];
    best_practices: string[];
  };
  metadata: {
    execution_time_ms: number;
    api_calls_made: number;
    removal_timestamp: string;
    reason?: string;
  };
}

export const slackReactionsRemoveTool: MCPTool = {
  name: 'slack_reactions_remove',
  description: 'Remove reactions from Slack messages with comprehensive impact analysis and engagement insights',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID or name where the message is located',
      },
      timestamp: {
        type: 'string',
        description: 'Timestamp of the message to remove reaction from',
      },
      name: {
        type: 'string',
        description: 'Name of the reaction to remove (without colons, e.g., "thumbsup")',
      },
      analyze_impact: {
        type: 'boolean',
        description: 'Whether to analyze the impact of removing this reaction',
        default: true,
      },
      include_analytics: {
        type: 'boolean',
        description: 'Whether to include detailed reaction analytics',
        default: true,
      },
      notify_users: {
        type: 'boolean',
        description: 'Whether to notify relevant users about the reaction removal',
        default: false,
      },
      reason: {
        type: 'string',
        description: 'Optional reason for removing the reaction',
      },
    },
    required: ['channel', 'timestamp', 'name'],
  },

  async execute(args: Record<string, any>): Promise<ReactionRemovalResult> {
    const startTime = Date.now();
    let apiCallCount = 0;

    try {
      const validatedArgs = Validator.validate(inputSchema, args) as InputArgs;
      
      // Resolve channel ID if needed
      const channelId = await slackClient.resolveChannelId(validatedArgs.channel);
      apiCallCount++;

      let preRemovalAnalysis: any = null;
      let messageInfo: any = null;

      // Get message info and current reactions for impact analysis
      if (validatedArgs.analyze_impact || validatedArgs.include_analytics) {
        try {
          // Get message details
          const historyResponse = await (slackClient as any).client.conversations.history({
            channel: channelId,
            latest: validatedArgs.timestamp,
            limit: 1,
            inclusive: true,
          });
          apiCallCount++;

          if (historyResponse.messages && historyResponse.messages.length > 0) {
            messageInfo = historyResponse.messages[0];
            preRemovalAnalysis = analyzeCurrentReactions(messageInfo);
          }
        } catch (error: any) {
          logger.warn('Could not fetch message for analysis', { error: error.message });
        }
      }

      // Remove the reaction
      const removeResponse = await (slackClient as any).client.reactions.remove({
        channel: channelId,
        timestamp: validatedArgs.timestamp,
        name: validatedArgs.name,
      });
      apiCallCount++;

      if (!removeResponse.ok) {
        throw new Error(`Failed to remove reaction: ${removeResponse.error}`);
      }

      // Get updated message info for post-removal analysis
      let postRemovalAnalysis: any = null;
      if (validatedArgs.analyze_impact && messageInfo) {
        try {
          const updatedHistoryResponse = await (slackClient as any).client.conversations.history({
            channel: channelId,
            latest: validatedArgs.timestamp,
            limit: 1,
            inclusive: true,
          });
          apiCallCount++;

          if (updatedHistoryResponse.messages && updatedHistoryResponse.messages.length > 0) {
            postRemovalAnalysis = analyzeCurrentReactions(updatedHistoryResponse.messages[0]);
          }
        } catch (error: any) {
          logger.warn('Could not fetch updated message for analysis', { error: error.message });
        }
      }

      // Build comprehensive result
      const result: ReactionRemovalResult = {
        success: true,
        channel: channelId,
        timestamp: validatedArgs.timestamp,
        reaction_name: validatedArgs.name,
        metadata: {
          execution_time_ms: Date.now() - startTime,
          api_calls_made: apiCallCount,
          removal_timestamp: new Date().toISOString(),
          reason: validatedArgs.reason,
        },
      };

      // Add impact analysis
      if (validatedArgs.analyze_impact && preRemovalAnalysis && postRemovalAnalysis) {
        result.removal_impact = generateImpactAnalysis(
          preRemovalAnalysis,
          postRemovalAnalysis,
          validatedArgs.name
        );
      }

      // Add detailed analytics
      if (validatedArgs.include_analytics && messageInfo) {
        result.analytics = generateReactionAnalytics(messageInfo, channelId);
        result.recommendations = generateRecommendations(
          preRemovalAnalysis,
          validatedArgs.name,
          messageInfo
        );
      }

      // Send notifications if requested
      if (validatedArgs.notify_users && messageInfo) {
        await sendRemovalNotifications(
          channelId,
          messageInfo,
          validatedArgs.name,
          validatedArgs.reason
        );
        apiCallCount++;
      }

      result.metadata.api_calls_made = apiCallCount;

      logger.logToolExecution('slack_reactions_remove', validatedArgs, Date.now() - startTime);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_reactions_remove', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_reactions_remove',
        args,
        execution_time_ms: duration,
        api_calls_made: apiCallCount,
      }) as ReactionRemovalResult;
    }
  },
};

function analyzeCurrentReactions(message: any) {
  const reactions = message.reactions || [];
  
  return {
    total_reactions: reactions.reduce((sum: number, r: any) => sum + r.count, 0),
    unique_reactions: reactions.length,
    reaction_details: reactions.map((r: any) => ({
      name: r.name,
      count: r.count,
      users: r.users || [],
    })),
    most_popular: reactions.length > 0 
      ? reactions.reduce((max: any, r: any) => r.count > max.count ? r : max)
      : null,
    diversity_score: reactions.length > 0 
      ? Math.min(reactions.length / 5, 1) * 100 
      : 0,
  };
}

function generateImpactAnalysis(preAnalysis: any, postAnalysis: any, reactionName: string) {
  const preReaction = preAnalysis.reaction_details.find((r: any) => r.name === reactionName);
  const previousCount = preReaction ? preReaction.count : 0;
  
  const reactionCountChange = preAnalysis.total_reactions - postAnalysis.total_reactions;
  const diversityChange = postAnalysis.diversity_score - preAnalysis.diversity_score;
  
  return {
    previous_reaction_count: previousCount,
    remaining_reactions: postAnalysis.total_reactions,
    sentiment_change: determineSentimentChange(reactionName, reactionCountChange),
    user_engagement_impact: determineEngagementImpact(reactionCountChange, previousCount),
    message_popularity_change: determinePopularityChange(diversityChange, reactionCountChange),
  };
}

function generateReactionAnalytics(message: any, channelId: string) {
  const reactions = message.reactions || [];
  const messageAge = (Date.now() - parseFloat(message.ts) * 1000) / (1000 * 60 * 60);
  
  const reactionNames = reactions.map((r: any) => r.name);
  const totalReactions = reactions.reduce((sum: number, r: any) => sum + r.count, 0);
  
  return {
    reaction_patterns: {
      most_common_reactions: reactionNames.slice(0, 5),
      reaction_diversity_score: Math.min(reactions.length / 5, 1) * 100,
      engagement_level: totalReactions > 10 ? 'high' : totalReactions > 3 ? 'medium' : 'low',
    },
    user_behavior: {
      reaction_frequency: totalReactions > 5 ? 'frequent' : 'occasional',
      engagement_consistency: reactions.length > 3 ? 'diverse' : 'focused',
      social_influence_score: Math.min(totalReactions * 10, 100),
    },
    message_context: {
      message_age_hours: Math.round(messageAge * 100) / 100,
      thread_activity: message.reply_count > 0 ? 'active' : 'none',
      channel_engagement: 'normal', // Would need more context to determine
    },
  };
}

function generateRecommendations(preAnalysis: any, removedReaction: string, message: any) {
  const recommendations = {
    alternative_reactions: [] as string[],
    engagement_tips: [] as string[],
    best_practices: [] as string[],
  };

  // Suggest alternative reactions based on context
  const positiveReactions = ['thumbsup', 'heart', 'star', 'clap'];
  const neutralReactions = ['eyes', 'thinking_face', 'point_up'];
  
  if (positiveReactions.includes(removedReaction)) {
    recommendations.alternative_reactions = ['heart', 'star', 'clap'].filter(r => r !== removedReaction);
  } else {
    recommendations.alternative_reactions = neutralReactions;
  }

  // Engagement tips
  if (preAnalysis.total_reactions < 3) {
    recommendations.engagement_tips.push('Consider adding more context to encourage engagement');
    recommendations.engagement_tips.push('Ask questions to prompt responses');
  }

  // Best practices
  recommendations.best_practices.push('Remove reactions thoughtfully to maintain positive engagement');
  recommendations.best_practices.push('Consider the message context before removing reactions');
  
  if (message.thread_ts) {
    recommendations.best_practices.push('Thread reactions can impact overall conversation flow');
  }

  return recommendations;
}

function determineSentimentChange(reactionName: string, countChange: number): string {
  const positiveReactions = ['thumbsup', 'heart', 'star', 'clap', 'fire', 'rocket'];
  const negativeReactions = ['thumbsdown', 'x', 'no_entry_sign'];
  
  if (positiveReactions.includes(reactionName)) {
    return countChange > 0 ? 'slightly_negative' : 'neutral';
  } else if (negativeReactions.includes(reactionName)) {
    return countChange > 0 ? 'slightly_positive' : 'neutral';
  }
  
  return 'neutral';
}

function determineEngagementImpact(countChange: number, previousCount: number): string {
  const impactPercentage = previousCount > 0 ? (countChange / previousCount) * 100 : 0;
  
  if (impactPercentage > 50) return 'significant_decrease';
  if (impactPercentage > 20) return 'moderate_decrease';
  if (impactPercentage > 5) return 'minor_decrease';
  return 'minimal_impact';
}

function determinePopularityChange(diversityChange: number, countChange: number): string {
  if (countChange > 3 && diversityChange < -10) return 'significant_decrease';
  if (countChange > 1 && diversityChange < -5) return 'moderate_decrease';
  if (countChange > 0) return 'minor_decrease';
  return 'stable';
}

async function sendRemovalNotifications(
  channelId: string,
  message: any,
  reactionName: string,
  reason?: string
) {
  try {
    const notificationText = reason 
      ? `Reaction :${reactionName}: was removed from a message. Reason: ${reason}`
      : `Reaction :${reactionName}: was removed from a message.`;

    await (slackClient as any).client.chat.postMessage({
      channel: channelId,
      text: notificationText,
      thread_ts: message.ts,
      reply_broadcast: false,
    });
  } catch (error: any) {
    logger.warn('Failed to send removal notification', { error: error.message });
  }
}
