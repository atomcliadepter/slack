import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  timestamp: z.string().min(1, 'Message timestamp is required'),
  include_analytics: z.boolean().optional().default(true),
  include_user_details: z.boolean().optional().default(false),
  analyze_sentiment: z.boolean().optional().default(true),
  generate_insights: z.boolean().optional().default(true),
});

type InputArgs = z.infer<typeof inputSchema>;

interface ReactionData {
  name: string;
  count: number;
  users: string[];
  user_details?: Array<{
    id: string;
    name?: string;
    real_name?: string;
    display_name?: string;
  }>;
}

interface ReactionsGetResult {
  success: boolean;
  channel: string;
  timestamp: string;
  message_info: {
    text: string;
    user: string;
    username?: string;
    message_age_hours: number;
    thread_ts?: string;
    reply_count: number;
  };
  reactions: ReactionData[];
  analytics?: {
    reaction_summary: {
      total_reactions: number;
      unique_reactions: number;
      most_popular_reaction: string;
      reaction_diversity_score: number;
      engagement_level: string;
    };
    sentiment_analysis: {
      overall_sentiment: string;
      positive_reactions: number;
      negative_reactions: number;
      neutral_reactions: number;
      sentiment_score: number;
    };
    user_engagement: {
      total_users_reacted: number;
      average_reactions_per_user: number;
      top_reactors: Array<{ user: string; reaction_count: number }>;
      engagement_distribution: string;
    };
    temporal_patterns: {
      reaction_velocity: string;
      peak_reaction_period: string;
      reaction_timeline_analysis: string;
    };
  };
  insights?: {
    message_performance: string[];
    engagement_recommendations: string[];
    content_optimization_tips: string[];
    audience_insights: string[];
  };
  metadata: {
    execution_time_ms: number;
    api_calls_made: number;
    analysis_timestamp: string;
  };
}

export const slackReactionsGetTool: MCPTool = {
  name: 'slack_reactions_get',
  description: 'Retrieve comprehensive reaction data with advanced analytics and sentiment analysis',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID or name where the message is located',
      },
      timestamp: {
        type: 'string',
        description: 'Timestamp of the message to get reactions for',
      },
      include_analytics: {
        type: 'boolean',
        description: 'Whether to include detailed reaction analytics',
        default: true,
      },
      include_user_details: {
        type: 'boolean',
        description: 'Whether to include detailed user information for reactors',
        default: false,
      },
      analyze_sentiment: {
        type: 'boolean',
        description: 'Whether to perform sentiment analysis on reactions',
        default: true,
      },
      generate_insights: {
        type: 'boolean',
        description: 'Whether to generate actionable insights and recommendations',
        default: true,
      },
    },
    required: ['channel', 'timestamp'],
  },

  async execute(args: Record<string, any>): Promise<ReactionsGetResult> {
    const startTime = Date.now();
    let apiCallCount = 0;

    try {
      const validatedArgs = Validator.validate(inputSchema, args) as InputArgs;
      
      // Resolve channel ID if needed
      const channelId = await slackClient.resolveChannelId(validatedArgs.channel);
      apiCallCount++;

      // Get message with reactions
      const historyResponse = await (slackClient as any).client.conversations.history({
        channel: channelId,
        latest: validatedArgs.timestamp,
        limit: 1,
        inclusive: true,
      });
      apiCallCount++;

      if (!historyResponse.ok || !historyResponse.messages || historyResponse.messages.length === 0) {
        throw new Error('Message not found or no access to channel');
      }

      const message = historyResponse.messages[0];
      const reactions = message.reactions || [];

      // Process reactions data
      const processedReactions: ReactionData[] = [];
      
      for (const reaction of reactions) {
        const reactionData: ReactionData = {
          name: reaction.name,
          count: reaction.count,
          users: reaction.users || [],
        };

        // Get user details if requested
        if (validatedArgs.include_user_details && reaction.users) {
          reactionData.user_details = [];
          for (const userId of reaction.users.slice(0, 10)) { // Limit to 10 users to avoid rate limits
            try {
              const userResponse = await (slackClient as any).client.users.info({
                user: userId,
              });
              apiCallCount++;

              if (userResponse.ok && userResponse.user) {
                reactionData.user_details.push({
                  id: userId,
                  name: userResponse.user.name,
                  real_name: userResponse.user.real_name,
                  display_name: userResponse.user.profile?.display_name,
                });
              }
            } catch (error: any) {
              logger.warn(`Failed to get user details for ${userId}`, { error: error.message });
            }
          }
        }

        processedReactions.push(reactionData);
      }

      // Calculate message age
      const messageAge = (Date.now() - parseFloat(message.ts) * 1000) / (1000 * 60 * 60);

      // Build basic result
      const result: ReactionsGetResult = {
        success: true,
        channel: channelId,
        timestamp: validatedArgs.timestamp,
        message_info: {
          text: message.text || '',
          user: message.user || 'unknown',
          username: message.username,
          message_age_hours: Math.round(messageAge * 100) / 100,
          thread_ts: message.thread_ts,
          reply_count: message.reply_count || 0,
        },
        reactions: processedReactions,
        metadata: {
          execution_time_ms: Date.now() - startTime,
          api_calls_made: apiCallCount,
          analysis_timestamp: new Date().toISOString(),
        },
      };

      // Add analytics if requested
      if (validatedArgs.include_analytics) {
        result.analytics = generateReactionAnalytics(processedReactions, message);
      }

      // Add insights if requested
      if (validatedArgs.generate_insights) {
        result.insights = generateReactionInsights(
          processedReactions,
          message,
          result.analytics
        );
      }

      logger.logToolExecution('slack_reactions_get', validatedArgs, Date.now() - startTime);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_reactions_get', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_reactions_get',
        args,
        execution_time_ms: duration,
        api_calls_made: apiCallCount,
      }) as ReactionsGetResult;
    }
  },
};

function generateReactionAnalytics(reactions: ReactionData[], message: any) {
  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
  const uniqueReactions = reactions.length;
  const mostPopular = reactions.length > 0 
    ? reactions.reduce((max, r) => r.count > max.count ? r : max)
    : null;

  // Calculate diversity score (0-100)
  const diversityScore = uniqueReactions > 0 
    ? Math.min((uniqueReactions / Math.max(totalReactions / 3, 1)) * 100, 100)
    : 0;

  // Determine engagement level
  let engagementLevel = 'low';
  if (totalReactions > 20) engagementLevel = 'very_high';
  else if (totalReactions > 10) engagementLevel = 'high';
  else if (totalReactions > 5) engagementLevel = 'medium';

  // Sentiment analysis
  const sentimentData = analyzeSentiment(reactions);

  // User engagement analysis
  const allUsers = new Set();
  reactions.forEach(r => r.users.forEach(u => allUsers.add(u)));
  const totalUsersReacted = allUsers.size;
  const avgReactionsPerUser = totalUsersReacted > 0 ? totalReactions / totalUsersReacted : 0;

  // Calculate top reactors
  const userReactionCounts: Record<string, number> = {};
  reactions.forEach(r => {
    r.users.forEach(user => {
      userReactionCounts[user] = (userReactionCounts[user] || 0) + 1;
    });
  });

  const topReactors = Object.entries(userReactionCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([user, count]) => ({ user, reaction_count: count }));

  // Engagement distribution
  let engagementDistribution = 'concentrated';
  if (topReactors.length > 0 && topReactors[0].reaction_count < totalReactions * 0.3) {
    engagementDistribution = 'distributed';
  }

  // Temporal patterns
  const messageAge = (Date.now() - parseFloat(message.ts) * 1000) / (1000 * 60 * 60);
  let reactionVelocity = 'slow';
  if (messageAge < 1 && totalReactions > 5) reactionVelocity = 'very_fast';
  else if (messageAge < 6 && totalReactions > 3) reactionVelocity = 'fast';
  else if (messageAge < 24 && totalReactions > 1) reactionVelocity = 'moderate';

  return {
    reaction_summary: {
      total_reactions: totalReactions,
      unique_reactions: uniqueReactions,
      most_popular_reaction: mostPopular?.name || 'none',
      reaction_diversity_score: Math.round(diversityScore),
      engagement_level: engagementLevel,
    },
    sentiment_analysis: sentimentData,
    user_engagement: {
      total_users_reacted: totalUsersReacted,
      average_reactions_per_user: Math.round(avgReactionsPerUser * 100) / 100,
      top_reactors: topReactors,
      engagement_distribution: engagementDistribution,
    },
    temporal_patterns: {
      reaction_velocity: reactionVelocity,
      peak_reaction_period: messageAge < 1 ? 'immediate' : messageAge < 24 ? 'same_day' : 'delayed',
      reaction_timeline_analysis: `Message received ${Math.round(messageAge)} hours ago with ${reactionVelocity} reaction velocity`,
    },
  };
}

function analyzeSentiment(reactions: ReactionData[]) {
  const positiveReactions = ['thumbsup', 'heart', 'star', 'clap', 'fire', 'rocket', 'tada', 'muscle', 'raised_hands'];
  const negativeReactions = ['thumbsdown', 'x', 'no_entry_sign', 'disappointed', 'confused'];
  const neutralReactions = ['eyes', 'thinking_face', 'point_up', 'question'];

  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  reactions.forEach(reaction => {
    if (positiveReactions.includes(reaction.name)) {
      positiveCount += reaction.count;
    } else if (negativeReactions.includes(reaction.name)) {
      negativeCount += reaction.count;
    } else {
      neutralCount += reaction.count;
    }
  });

  const totalCount = positiveCount + negativeCount + neutralCount;
  let overallSentiment = 'neutral';
  let sentimentScore = 0;

  if (totalCount > 0) {
    sentimentScore = ((positiveCount - negativeCount) / totalCount) * 100;
    
    if (sentimentScore > 20) overallSentiment = 'positive';
    else if (sentimentScore < -20) overallSentiment = 'negative';
    else overallSentiment = 'neutral';
  }

  return {
    overall_sentiment: overallSentiment,
    positive_reactions: positiveCount,
    negative_reactions: negativeCount,
    neutral_reactions: neutralCount,
    sentiment_score: Math.round(sentimentScore),
  };
}

function generateReactionInsights(
  reactions: ReactionData[],
  message: any,
  analytics: any
) {
  const insights = {
    message_performance: [] as string[],
    engagement_recommendations: [] as string[],
    content_optimization_tips: [] as string[],
    audience_insights: [] as string[],
  };

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

  // Message performance insights
  if (analytics?.reaction_summary.engagement_level === 'very_high') {
    insights.message_performance.push('Exceptional engagement - this message resonated strongly with your audience');
  } else if (analytics?.reaction_summary.engagement_level === 'high') {
    insights.message_performance.push('Strong engagement - consider similar content in the future');
  } else if (analytics?.reaction_summary.engagement_level === 'low') {
    insights.message_performance.push('Low engagement - consider revising messaging strategy');
  }

  if (analytics?.sentiment_analysis.overall_sentiment === 'positive') {
    insights.message_performance.push('Positive audience sentiment indicates successful communication');
  } else if (analytics?.sentiment_analysis.overall_sentiment === 'negative') {
    insights.message_performance.push('Negative sentiment detected - may need follow-up or clarification');
  }

  // Engagement recommendations
  if (totalReactions < 3) {
    insights.engagement_recommendations.push('Consider asking questions or adding call-to-action to increase engagement');
    insights.engagement_recommendations.push('Try posting at different times to reach more audience members');
  }

  if (analytics?.reaction_summary.reaction_diversity_score < 30) {
    insights.engagement_recommendations.push('Limited reaction variety - consider content that evokes diverse responses');
  }

  if (analytics?.user_engagement.engagement_distribution === 'concentrated') {
    insights.engagement_recommendations.push('Engagement is concentrated among few users - consider broader audience appeal');
  }

  // Content optimization tips
  if (message.text && message.text.length < 50) {
    insights.content_optimization_tips.push('Short message - consider adding more context or detail');
  } else if (message.text && message.text.length > 500) {
    insights.content_optimization_tips.push('Long message - consider breaking into smaller, digestible parts');
  }

  if (analytics?.temporal_patterns.reaction_velocity === 'slow') {
    insights.content_optimization_tips.push('Slow reaction velocity - consider more engaging opening or clearer value proposition');
  }

  // Audience insights
  if (analytics?.user_engagement.total_users_reacted > 10) {
    insights.audience_insights.push('Broad audience engagement indicates wide appeal');
  } else if (analytics?.user_engagement.total_users_reacted < 3) {
    insights.audience_insights.push('Limited audience reach - consider timing or channel selection');
  }

  if (analytics?.user_engagement.average_reactions_per_user > 1.5) {
    insights.audience_insights.push('High average reactions per user shows strong individual engagement');
  }

  return insights;
}
