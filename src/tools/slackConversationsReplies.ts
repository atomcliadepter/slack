/**
 * Enhanced Slack Conversations Replies Tool v2.0.0
 * Comprehensive thread reply management with analytics and conversation flow insights
 */

import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

/**
 * Input validation schema
 */
const inputSchema = z.object({
  channel: z.string()
    .min(1, 'Channel ID or name is required')
    .refine(val => val.startsWith('C') || val.startsWith('#'), 'Channel must be a valid ID (C1234567890) or name (#general)'),
  ts: z.string()
    .min(1, 'Thread timestamp is required')
    .regex(/^\d+\.\d+$/, 'Timestamp must be in format "1234567890.123456"'),
  cursor: z.string().optional(),
  latest: z.string().optional(),
  oldest: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100),
  inclusive: z.boolean().default(false),
  include_analytics: z.boolean().default(true),
  include_recommendations: z.boolean().default(true),
  thread_analysis: z.boolean().default(false),
  sentiment_analysis: z.boolean().default(false),
  engagement_tracking: z.boolean().default(false),
});

type SlackConversationsRepliesArgs = z.infer<typeof inputSchema>;

/**
 * Thread analytics interface
 */
interface ThreadAnalytics {
  total_replies: number;
  unique_participants: number;
  thread_depth: number;
  reply_distribution: {
    by_user: Record<string, number>;
    by_hour: Record<string, number>;
    by_day: Record<string, number>;
  };
  engagement_metrics: {
    average_reply_length: number;
    replies_with_reactions: number;
    most_active_participant: string | null;
    response_velocity: number; // Average time between replies in minutes
    participation_rate: number; // Percentage of unique users vs total replies
  };
  conversation_flow: {
    thread_duration_hours: number;
    peak_activity_period: string | null;
    conversation_momentum: 'increasing' | 'decreasing' | 'stable';
    thread_health_score: number; // 0-100
  };
  content_insights: {
    total_characters: number;
    total_words: number;
    average_words_per_reply: number;
    replies_with_links: number;
    replies_with_mentions: number;
    replies_with_files: number;
  };
  sentiment_analysis?: {
    overall_sentiment: number; // -1 to 1
    sentiment_trend: 'positive' | 'negative' | 'neutral' | 'mixed';
    positive_replies: number;
    negative_replies: number;
    neutral_replies: number;
  };
  recommendations: string[];
  warnings: string[];
}

/**
 * Enhanced reply interface
 */
interface EnhancedReply {
  type: string;
  subtype?: string;
  ts: string;
  user?: string;
  text?: string;
  thread_ts?: string;
  parent_user_id?: string;
  reactions?: Array<{
    name: string;
    users: string[];
    count: number;
  }>;
  files?: Array<{
    id: string;
    name: string;
    mimetype: string;
    size: number;
    url_private: string;
  }>;
  attachments?: any[];
  blocks?: any[];
  edited?: {
    user: string;
    ts: string;
  };
  bot_id?: string;
  app_id?: string;
  username?: string;
  metadata?: {
    word_count?: number;
    character_count?: number;
    has_links?: boolean;
    has_mentions?: boolean;
    sentiment_score?: number; // -1 to 1
    engagement_score?: number; // 0 to 100
    reply_position?: number; // Position in thread (1, 2, 3...)
    time_since_parent?: number; // Minutes since parent message
    time_since_previous?: number; // Minutes since previous reply
  };
}

/**
 * Thread replies result interface
 */
interface ThreadRepliesResult {
  success: boolean;
  messages: EnhancedReply[];
  channel_id: string;
  channel_name?: string;
  thread_ts: string;
  parent_message?: EnhancedReply;
  has_more: boolean;
  response_metadata?: {
    next_cursor?: string;
  };
  analytics?: ThreadAnalytics;
  recommendations?: string[];
  warnings?: string[];
}

export const slackConversationsRepliesTool: MCPTool = {
  name: 'slack_conversations_replies',
  description: 'Get thread replies with comprehensive analytics, engagement tracking, and conversation flow insights',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID (C1234567890) or name (#general) containing the thread',
      },
      ts: {
        type: 'string',
        description: 'Timestamp of the parent message (format: "1234567890.123456")',
      },
      cursor: {
        type: 'string',
        description: 'Pagination cursor for retrieving additional results',
      },
      latest: {
        type: 'string',
        description: 'Latest timestamp to include (Unix timestamp)',
      },
      oldest: {
        type: 'string',
        description: 'Oldest timestamp to include (Unix timestamp)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of replies to return (1-1000)',
        minimum: 1,
        maximum: 1000,
        default: 100,
      },
      inclusive: {
        type: 'boolean',
        description: 'Include messages with latest or oldest timestamp',
        default: false,
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include comprehensive thread analytics',
        default: true,
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations for thread optimization',
        default: true,
      },
      thread_analysis: {
        type: 'boolean',
        description: 'Perform detailed thread conversation analysis',
        default: false,
      },
      sentiment_analysis: {
        type: 'boolean',
        description: 'Perform sentiment analysis on thread replies',
        default: false,
      },
      engagement_tracking: {
        type: 'boolean',
        description: 'Track detailed engagement metrics for the thread',
        default: false,
      },
    },
    required: ['channel', 'ts'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackConversationsRepliesArgs;
      const client = slackClient.getClient();
      
      let threadAnalytics: ThreadAnalytics = {
        total_replies: 0,
        unique_participants: 0,
        thread_depth: 0,
        reply_distribution: {
          by_user: {},
          by_hour: {},
          by_day: {},
        },
        engagement_metrics: {
          average_reply_length: 0,
          replies_with_reactions: 0,
          most_active_participant: null,
          response_velocity: 0,
          participation_rate: 0,
        },
        conversation_flow: {
          thread_duration_hours: 0,
          peak_activity_period: null,
          conversation_momentum: 'stable',
          thread_health_score: 0,
        },
        content_insights: {
          total_characters: 0,
          total_words: 0,
          average_words_per_reply: 0,
          replies_with_links: 0,
          replies_with_mentions: 0,
          replies_with_files: 0,
        },
        recommendations: [],
        warnings: [],
      };

      let warnings: string[] = [];
      let channelId = validatedArgs.channel;
      let channelName: string | undefined;

      // Step 1: Resolve channel ID if name provided
      if (validatedArgs.channel.startsWith('#')) {
        try {
          const channelNameToResolve = validatedArgs.channel.slice(1);
          const channelsResult = await client.conversations.list({
            types: 'public_channel,private_channel',
            limit: 1000,
          });
          
          if (channelsResult.ok && channelsResult.channels) {
            const channel = channelsResult.channels.find((ch: any) => ch.name === channelNameToResolve);
            if (channel && channel.id) {
              channelId = channel.id;
              channelName = channel.name || undefined;
            } else {
              throw new Error(`Channel #${channelNameToResolve} not found`);
            }
          }
        } catch (error) {
          throw new Error(`Failed to resolve channel name: ${validatedArgs.channel}`);
        }
      }

      // Step 2: Get thread replies
      const repliesResult = await client.conversations.replies({
        channel: channelId,
        ts: validatedArgs.ts,
        cursor: validatedArgs.cursor,
        latest: validatedArgs.latest,
        oldest: validatedArgs.oldest,
        limit: validatedArgs.limit,
        inclusive: validatedArgs.inclusive,
      });

      if (!repliesResult.ok) {
        throw new Error(`Failed to get thread replies: ${repliesResult.error}`);
      }

      const messages = repliesResult.messages || [];
      const parentMessage = messages[0]; // First message is always the parent
      const replies = messages.slice(1); // Rest are replies

      // Step 3: Enhance replies with analysis
      const enhancedReplies: EnhancedReply[] = replies.map((reply: any, index: number) => {
        const enhanced: EnhancedReply = {
          ...reply,
          metadata: {
            reply_position: index + 1,
          },
        };

        if (validatedArgs.thread_analysis && reply.text) {
          enhanced.metadata!.word_count = reply.text.split(/\s+/).length;
          enhanced.metadata!.character_count = reply.text.length;
          enhanced.metadata!.has_links = /https?:\/\//.test(reply.text);
          enhanced.metadata!.has_mentions = /<@[UW][A-Z0-9]+>/.test(reply.text);
        }

        if (validatedArgs.sentiment_analysis && reply.text) {
          enhanced.metadata!.sentiment_score = this.calculateSentiment(reply.text);
        }

        // Calculate timing metrics
        if (parentMessage && parentMessage.ts) {
          const parentTime = parseFloat(parentMessage.ts);
          const replyTime = parseFloat(reply.ts);
          enhanced.metadata!.time_since_parent = (replyTime - parentTime) / 60; // Minutes
          
          if (index > 0) {
            const previousReply = replies[index - 1];
            if (previousReply && previousReply.ts) {
              const previousReplyTime = parseFloat(previousReply.ts);
              enhanced.metadata!.time_since_previous = (replyTime - previousReplyTime) / 60; // Minutes
            }
          }
        }

        // Calculate engagement score
        let engagementScore = 0;
        if (reply.reactions) engagementScore += reply.reactions.length * 15;
        if (reply.files) engagementScore += reply.files.length * 20;
        if (reply.text && reply.text.length > 100) engagementScore += 10;
        enhanced.metadata!.engagement_score = Math.min(engagementScore, 100);

        return enhanced;
      });

      // Step 4: Generate analytics
      if (validatedArgs.include_analytics) {
        threadAnalytics = this.generateThreadAnalytics(enhancedReplies, parentMessage, validatedArgs);
      }

      // Step 5: Generate recommendations
      if (validatedArgs.include_recommendations) {
        threadAnalytics.recommendations = this.generateRecommendations(enhancedReplies, threadAnalytics, validatedArgs);
      }

      threadAnalytics.warnings = warnings;

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_conversations_replies', args, duration);

      return {
        success: true,
        data: {
          success: true,
          messages: enhancedReplies,
          channel_id: channelId,
          channel_name: channelName,
          thread_ts: validatedArgs.ts,
          parent_message: parentMessage,
          has_more: repliesResult.has_more || false,
          response_metadata: repliesResult.response_metadata,
          analytics: validatedArgs.include_analytics ? threadAnalytics : undefined,
          recommendations: validatedArgs.include_recommendations ? threadAnalytics.recommendations : undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
        } as ThreadRepliesResult,
        metadata: {
          execution_time_ms: duration,
          operation_type: 'thread_replies',
          channel_id: channelId,
          thread_ts: validatedArgs.ts,
          replies_retrieved: enhancedReplies.length,
          thread_depth: enhancedReplies.length,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_conversations_replies', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_conversations_replies',
        args,
        execution_time_ms: duration,
      });
    }
  },

  /**
   * Calculate basic sentiment score for a message
   */
  calculateSentiment(text: string): number {
    const positiveWords = ['good', 'great', 'excellent', 'awesome', 'love', 'like', 'happy', 'thanks', 'thank you', 'perfect', 'amazing', 'wonderful', 'agree', 'yes', 'correct', 'right'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'problem', 'issue', 'error', 'fail', 'wrong', 'disagree', 'no'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });
    
    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, score / Math.max(words.length / 10, 1)));
  },

  /**
   * Generate comprehensive thread analytics
   */
  generateThreadAnalytics(
    replies: EnhancedReply[], 
    parentMessage: any,
    args: SlackConversationsRepliesArgs
  ): ThreadAnalytics {
    const analytics: ThreadAnalytics = {
      total_replies: replies.length,
      unique_participants: 0,
      thread_depth: replies.length,
      reply_distribution: {
        by_user: {},
        by_hour: {},
        by_day: {},
      },
      engagement_metrics: {
        average_reply_length: 0,
        replies_with_reactions: 0,
        most_active_participant: null,
        response_velocity: 0,
        participation_rate: 0,
      },
      conversation_flow: {
        thread_duration_hours: 0,
        peak_activity_period: null,
        conversation_momentum: 'stable',
        thread_health_score: 0,
      },
      content_insights: {
        total_characters: 0,
        total_words: 0,
        average_words_per_reply: 0,
        replies_with_links: 0,
        replies_with_mentions: 0,
        replies_with_files: 0,
      },
      recommendations: [],
      warnings: [],
    };

    if (replies.length === 0) return analytics;

    // Analyze reply distribution
    const userCounts: Record<string, number> = {};
    const hourCounts: Record<string, number> = {};
    const dayCounts: Record<string, number> = {};
    
    let totalCharacters = 0;
    let totalWords = 0;
    let repliesWithReactions = 0;
    let repliesWithLinks = 0;
    let repliesWithMentions = 0;
    let repliesWithFiles = 0;
    let totalResponseTime = 0;
    let responseCount = 0;

    const timestamps = replies.map(reply => parseFloat(reply.ts)).filter(ts => !isNaN(ts));
    const parentTime = parentMessage ? parseFloat(parentMessage.ts) : timestamps[0];
    const minTime = Math.min(parentTime, ...timestamps);
    const maxTime = Math.max(...timestamps);
    const threadDurationHours = (maxTime - minTime) / 3600;

    replies.forEach((reply, index) => {
      // User distribution
      if (reply.user) {
        userCounts[reply.user] = (userCounts[reply.user] || 0) + 1;
      }

      // Time distribution
      const date = new Date(parseFloat(reply.ts) * 1000);
      const hour = date.getHours().toString();
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;

      // Content analysis
      if (reply.text) {
        totalCharacters += reply.text.length;
        totalWords += reply.text.split(/\s+/).length;
        
        if (reply.metadata?.has_links) repliesWithLinks++;
        if (reply.metadata?.has_mentions) repliesWithMentions++;
      }

      if (reply.reactions && reply.reactions.length > 0) repliesWithReactions++;
      if (reply.files && reply.files.length > 0) repliesWithFiles++;

      // Response velocity calculation
      if (reply.metadata?.time_since_previous && reply.metadata.time_since_previous > 0) {
        totalResponseTime += reply.metadata.time_since_previous;
        responseCount++;
      }
    });

    // Calculate metrics
    analytics.unique_participants = Object.keys(userCounts).length;
    analytics.reply_distribution = {
      by_user: userCounts,
      by_hour: hourCounts,
      by_day: dayCounts,
    };

    analytics.engagement_metrics = {
      average_reply_length: totalCharacters / replies.length,
      replies_with_reactions: repliesWithReactions,
      most_active_participant: Object.entries(userCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || null,
      response_velocity: responseCount > 0 ? totalResponseTime / responseCount : 0,
      participation_rate: (analytics.unique_participants / replies.length) * 100,
    };

    analytics.conversation_flow = {
      thread_duration_hours: threadDurationHours,
      peak_activity_period: Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || null,
      conversation_momentum: this.determineConversationMomentum(replies),
      thread_health_score: this.calculateThreadHealthScore(analytics, replies),
    };

    analytics.content_insights = {
      total_characters: totalCharacters,
      total_words: totalWords,
      average_words_per_reply: totalWords / replies.length,
      replies_with_links: repliesWithLinks,
      replies_with_mentions: repliesWithMentions,
      replies_with_files: repliesWithFiles,
    };

    // Sentiment analysis if enabled
    if (args.sentiment_analysis) {
      const sentimentScores = replies
        .map(reply => reply.metadata?.sentiment_score)
        .filter((score): score is number => score !== undefined);
      
      if (sentimentScores.length > 0) {
        const avgSentiment = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
        const positiveReplies = sentimentScores.filter(score => score > 0.1).length;
        const negativeReplies = sentimentScores.filter(score => score < -0.1).length;
        const neutralReplies = sentimentScores.length - positiveReplies - negativeReplies;
        
        analytics.sentiment_analysis = {
          overall_sentiment: avgSentiment,
          sentiment_trend: this.determineSentimentTrend(avgSentiment, positiveReplies, negativeReplies),
          positive_replies: positiveReplies,
          negative_replies: negativeReplies,
          neutral_replies: neutralReplies,
        };
      }
    }

    return analytics;
  },

  /**
   * Determine conversation momentum
   */
  determineConversationMomentum(replies: EnhancedReply[]): ThreadAnalytics['conversation_flow']['conversation_momentum'] {
    if (replies.length < 3) return 'stable';
    
    const timestamps = replies.map(reply => parseFloat(reply.ts)).sort((a, b) => a - b);
    const intervals = [];
    
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    
    const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
    const secondHalf = intervals.slice(Math.floor(intervals.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, interval) => sum + interval, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, interval) => sum + interval, 0) / secondHalf.length;
    
    if (secondAvg < firstAvg * 0.7) return 'increasing'; // Faster responses = increasing momentum
    if (secondAvg > firstAvg * 1.5) return 'decreasing'; // Slower responses = decreasing momentum
    return 'stable';
  },

  /**
   * Calculate thread health score
   */
  calculateThreadHealthScore(analytics: ThreadAnalytics, replies: EnhancedReply[]): number {
    let score = 50; // Base score
    
    // Participation diversity bonus
    if (analytics.engagement_metrics.participation_rate > 50) score += 20;
    else if (analytics.engagement_metrics.participation_rate > 25) score += 10;
    
    // Engagement bonus
    const engagementRate = analytics.engagement_metrics.replies_with_reactions / analytics.total_replies;
    if (engagementRate > 0.3) score += 15;
    else if (engagementRate > 0.1) score += 8;
    
    // Response velocity bonus (faster responses = healthier thread)
    if (analytics.engagement_metrics.response_velocity < 60) score += 10; // Less than 1 hour
    else if (analytics.engagement_metrics.response_velocity < 240) score += 5; // Less than 4 hours
    
    // Content quality bonus
    if (analytics.content_insights.average_words_per_reply > 10) score += 5;
    
    // Penalties
    if (analytics.total_replies < 2) score -= 20; // Very short thread
    if (analytics.conversation_flow.thread_duration_hours > 168) score -= 10; // Very old thread
    
    return Math.max(0, Math.min(100, score));
  },

  /**
   * Determine sentiment trend
   */
  determineSentimentTrend(
    avgSentiment: number, 
    positiveReplies: number, 
    negativeReplies: number
  ): 'positive' | 'negative' | 'neutral' | 'mixed' {
    if (avgSentiment > 0.2) return 'positive';
    if (avgSentiment < -0.2) return 'negative';
    if (positiveReplies > 0 && negativeReplies > 0) return 'mixed';
    return 'neutral';
  },

  /**
   * Generate recommendations for thread optimization
   */
  generateRecommendations(
    replies: EnhancedReply[], 
    analytics: ThreadAnalytics, 
    args: SlackConversationsRepliesArgs
  ): string[] {
    const recommendations: string[] = [];

    // Thread health recommendations
    if (analytics.conversation_flow.thread_health_score < 40) {
      recommendations.push('Low thread health detected - consider encouraging more participation or clearer communication');
    } else if (analytics.conversation_flow.thread_health_score > 80) {
      recommendations.push('Excellent thread health! This conversation pattern could be a model for other discussions');
    }

    // Participation recommendations
    if (analytics.engagement_metrics.participation_rate < 30) {
      recommendations.push('Low participation rate - consider @mentioning specific people to encourage broader engagement');
    }

    // Response time recommendations
    if (analytics.engagement_metrics.response_velocity > 480) { // 8 hours
      recommendations.push('Slow response times detected - consider setting expectations for response timing or using urgent notifications');
    }

    // Content recommendations
    if (analytics.content_insights.average_words_per_reply < 5) {
      recommendations.push('Very short replies detected - encourage more detailed responses for better context');
    }

    if (analytics.content_insights.average_words_per_reply > 100) {
      recommendations.push('Very long replies detected - consider breaking complex responses into multiple messages');
    }

    // Engagement recommendations
    const engagementRate = analytics.engagement_metrics.replies_with_reactions / analytics.total_replies;
    if (engagementRate < 0.1) {
      recommendations.push('Low reaction engagement - encourage team members to use reactions for quick feedback');
    }

    // Sentiment recommendations
    if (analytics.sentiment_analysis) {
      if (analytics.sentiment_analysis.sentiment_trend === 'negative') {
        recommendations.push('Negative sentiment detected - consider addressing concerns or clarifying misunderstandings');
      } else if (analytics.sentiment_analysis.sentiment_trend === 'positive') {
        recommendations.push('Positive sentiment detected - great collaborative discussion!');
      }
    }

    // Thread length recommendations
    if (analytics.total_replies > 50) {
      recommendations.push('Very long thread - consider summarizing key points or creating a new thread for continued discussion');
    }

    // Momentum recommendations
    if (analytics.conversation_flow.conversation_momentum === 'decreasing') {
      recommendations.push('Conversation momentum is decreasing - consider asking follow-up questions to re-engage participants');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Thread looks healthy! Continue encouraging active participation and clear communication');
    }

    return recommendations;
  },
};

export default slackConversationsRepliesTool;
