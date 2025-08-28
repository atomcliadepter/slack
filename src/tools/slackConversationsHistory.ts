/**
 * Enhanced Slack Conversations History Tool v2.0.0
 * Comprehensive conversation history retrieval with analytics and message insights
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
  cursor: z.string().optional(),
  latest: z.string().optional(),
  oldest: z.string().optional(),
  limit: z.number().min(1).max(1000).default(100),
  inclusive: z.boolean().default(false),
  include_analytics: z.boolean().default(true),
  include_recommendations: z.boolean().default(true),
  filter_by_user: z.array(z.string()).default([]),
  filter_by_type: z.array(z.string()).default([]),
  include_thread_replies: z.boolean().default(false),
  message_analysis: z.boolean().default(false),
  sentiment_analysis: z.boolean().default(false),
});

type SlackConversationsHistoryArgs = z.infer<typeof inputSchema>;

/**
 * Message analytics interface
 */
interface MessageAnalytics {
  total_messages: number;
  unique_users: number;
  message_distribution: {
    by_user: Record<string, number>;
    by_hour: Record<string, number>;
    by_day: Record<string, number>;
    by_type: Record<string, number>;
  };
  engagement_metrics: {
    average_message_length: number;
    messages_with_reactions: number;
    messages_with_threads: number;
    most_active_user: string | null;
    peak_activity_hour: string | null;
  };
  content_insights: {
    total_characters: number;
    total_words: number;
    average_words_per_message: number;
    messages_with_links: number;
    messages_with_mentions: number;
    messages_with_files: number;
  };
  conversation_flow: {
    conversation_threads: number;
    average_thread_length: number;
    response_rate: number; // Percentage of messages that get replies
    activity_level: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  };
  time_analysis: {
    time_span_hours: number;
    messages_per_hour: number;
    most_active_day: string | null;
    activity_pattern: 'consistent' | 'bursty' | 'declining' | 'increasing';
  };
  recommendations: string[];
  warnings: string[];
}

/**
 * Enhanced message interface
 */
interface EnhancedMessage {
  type: string;
  subtype?: string;
  ts: string;
  user?: string;
  text?: string;
  thread_ts?: string;
  reply_count?: number;
  reply_users_count?: number;
  latest_reply?: string;
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
  icons?: {
    image_36?: string;
    image_48?: string;
    image_72?: string;
  };
  metadata?: {
    word_count?: number;
    character_count?: number;
    has_links?: boolean;
    has_mentions?: boolean;
    sentiment_score?: number; // -1 to 1
    engagement_score?: number; // 0 to 100
    is_thread_reply?: boolean;
    parent_ts?: string;
  };
}

/**
 * History result interface
 */
interface HistoryResult {
  success: boolean;
  messages: EnhancedMessage[];
  channel_id: string;
  channel_name?: string;
  has_more: boolean;
  pin_count?: number;
  response_metadata?: {
    next_cursor?: string;
  };
  analytics?: MessageAnalytics;
  recommendations?: string[];
  warnings?: string[];
}

export const slackConversationsHistoryTool: MCPTool = {
  name: 'slack_conversations_history',
  description: 'Get conversation history with comprehensive analytics, message insights, and engagement metrics',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID (C1234567890) or name (#general) to get history for',
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
        description: 'Maximum number of messages to return (1-1000)',
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
        description: 'Include comprehensive message analytics',
        default: true,
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations for conversation optimization',
        default: true,
      },
      filter_by_user: {
        type: 'array',
        description: 'Filter messages by specific user IDs',
        items: { type: 'string' },
        default: [],
      },
      filter_by_type: {
        type: 'array',
        description: 'Filter messages by type (message, file_share, etc.)',
        items: { type: 'string' },
        default: [],
      },
      include_thread_replies: {
        type: 'boolean',
        description: 'Include thread replies in the results',
        default: false,
      },
      message_analysis: {
        type: 'boolean',
        description: 'Perform detailed message content analysis',
        default: false,
      },
      sentiment_analysis: {
        type: 'boolean',
        description: 'Perform basic sentiment analysis on messages',
        default: false,
      },
    },
    required: ['channel'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackConversationsHistoryArgs;
      const client = slackClient.getClient();
      
      let messageAnalytics: MessageAnalytics = {
        total_messages: 0,
        unique_users: 0,
        message_distribution: {
          by_user: {},
          by_hour: {},
          by_day: {},
          by_type: {},
        },
        engagement_metrics: {
          average_message_length: 0,
          messages_with_reactions: 0,
          messages_with_threads: 0,
          most_active_user: null,
          peak_activity_hour: null,
        },
        content_insights: {
          total_characters: 0,
          total_words: 0,
          average_words_per_message: 0,
          messages_with_links: 0,
          messages_with_mentions: 0,
          messages_with_files: 0,
        },
        conversation_flow: {
          conversation_threads: 0,
          average_thread_length: 0,
          response_rate: 0,
          activity_level: 'medium',
        },
        time_analysis: {
          time_span_hours: 0,
          messages_per_hour: 0,
          most_active_day: null,
          activity_pattern: 'consistent',
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

      // Step 2: Get conversation history
      const historyResult = await client.conversations.history({
        channel: channelId,
        cursor: validatedArgs.cursor,
        latest: validatedArgs.latest,
        oldest: validatedArgs.oldest,
        limit: validatedArgs.limit,
        inclusive: validatedArgs.inclusive,
      });

      if (!historyResult.ok) {
        throw new Error(`Failed to get conversation history: ${historyResult.error}`);
      }

      let messages = historyResult.messages || [];

      // Step 3: Apply filtering
      if (validatedArgs.filter_by_user.length > 0) {
        messages = messages.filter((msg: any) => 
          validatedArgs.filter_by_user.includes(msg.user)
        );
      }

      if (validatedArgs.filter_by_type.length > 0) {
        messages = messages.filter((msg: any) => 
          validatedArgs.filter_by_type.includes(msg.type) ||
          validatedArgs.filter_by_type.includes(msg.subtype)
        );
      }

      // Step 4: Enhance messages with analysis
      const enhancedMessages: EnhancedMessage[] = messages.map((msg: any) => {
        const enhanced: EnhancedMessage = {
          ...msg,
          metadata: {},
        };

        if (validatedArgs.message_analysis && msg.text) {
          enhanced.metadata!.word_count = msg.text.split(/\s+/).length;
          enhanced.metadata!.character_count = msg.text.length;
          enhanced.metadata!.has_links = /https?:\/\//.test(msg.text);
          enhanced.metadata!.has_mentions = /<@[UW][A-Z0-9]+>/.test(msg.text);
        }

        if (validatedArgs.sentiment_analysis && msg.text) {
          enhanced.metadata!.sentiment_score = this.calculateSentiment(msg.text);
        }

        // Calculate engagement score
        let engagementScore = 0;
        if (msg.reactions) engagementScore += msg.reactions.length * 10;
        if (msg.reply_count) engagementScore += msg.reply_count * 5;
        if (msg.files) engagementScore += msg.files.length * 15;
        enhanced.metadata!.engagement_score = Math.min(engagementScore, 100);

        return enhanced;
      });

      // Step 5: Get thread replies if requested
      if (validatedArgs.include_thread_replies) {
        const threadMessages: EnhancedMessage[] = [];
        
        for (const msg of enhancedMessages) {
          if (msg.thread_ts && msg.reply_count && msg.reply_count > 0) {
            try {
              const repliesResult = await client.conversations.replies({
                channel: channelId,
                ts: msg.thread_ts,
                limit: 100,
              });
              
              if (repliesResult.ok && repliesResult.messages) {
                const replies = repliesResult.messages.slice(1); // Skip the parent message
                threadMessages.push(...replies.map((reply: any) => ({
                  ...reply,
                  metadata: {
                    is_thread_reply: true,
                    parent_ts: msg.thread_ts,
                  },
                })));
              }
            } catch (error) {
              warnings.push(`Could not retrieve replies for thread ${msg.thread_ts}`);
            }
          }
        }
        
        enhancedMessages.push(...threadMessages);
      }

      // Step 6: Generate analytics
      if (validatedArgs.include_analytics) {
        messageAnalytics = this.generateMessageAnalytics(enhancedMessages, validatedArgs);
      }

      // Step 7: Generate recommendations
      if (validatedArgs.include_recommendations) {
        messageAnalytics.recommendations = this.generateRecommendations(enhancedMessages, messageAnalytics, validatedArgs);
      }

      messageAnalytics.warnings = warnings;

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_conversations_history', args, duration);

      return {
        success: true,
        data: {
          success: true,
          messages: enhancedMessages,
          channel_id: channelId,
          channel_name: channelName,
          has_more: historyResult.has_more || false,
          pin_count: historyResult.pin_count,
          response_metadata: historyResult.response_metadata,
          analytics: validatedArgs.include_analytics ? messageAnalytics : undefined,
          recommendations: validatedArgs.include_recommendations ? messageAnalytics.recommendations : undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
        } as HistoryResult,
        metadata: {
          execution_time_ms: duration,
          operation_type: 'history_retrieval',
          channel_id: channelId,
          messages_retrieved: enhancedMessages.length,
          time_range_hours: messageAnalytics.time_analysis.time_span_hours,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_conversations_history', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_conversations_history',
        args,
        execution_time_ms: duration,
      });
    }
  },

  /**
   * Calculate basic sentiment score for a message
   */
  calculateSentiment(text: string): number {
    const positiveWords = ['good', 'great', 'excellent', 'awesome', 'love', 'like', 'happy', 'thanks', 'thank you', 'perfect', 'amazing', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'problem', 'issue', 'error', 'fail'];
    
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
   * Generate comprehensive message analytics
   */
  generateMessageAnalytics(
    messages: EnhancedMessage[], 
    args: SlackConversationsHistoryArgs
  ): MessageAnalytics {
    const analytics: MessageAnalytics = {
      total_messages: messages.length,
      unique_users: 0,
      message_distribution: {
        by_user: {},
        by_hour: {},
        by_day: {},
        by_type: {},
      },
      engagement_metrics: {
        average_message_length: 0,
        messages_with_reactions: 0,
        messages_with_threads: 0,
        most_active_user: null,
        peak_activity_hour: null,
      },
      content_insights: {
        total_characters: 0,
        total_words: 0,
        average_words_per_message: 0,
        messages_with_links: 0,
        messages_with_mentions: 0,
        messages_with_files: 0,
      },
      conversation_flow: {
        conversation_threads: 0,
        average_thread_length: 0,
        response_rate: 0,
        activity_level: 'medium',
      },
      time_analysis: {
        time_span_hours: 0,
        messages_per_hour: 0,
        most_active_day: null,
        activity_pattern: 'consistent',
      },
      recommendations: [],
      warnings: [],
    };

    if (messages.length === 0) return analytics;

    // Analyze message distribution
    const userCounts: Record<string, number> = {};
    const hourCounts: Record<string, number> = {};
    const dayCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    
    let totalCharacters = 0;
    let totalWords = 0;
    let messagesWithReactions = 0;
    let messagesWithThreads = 0;
    let messagesWithLinks = 0;
    let messagesWithMentions = 0;
    let messagesWithFiles = 0;
    let threadCount = 0;

    const timestamps = messages.map(msg => parseFloat(msg.ts)).filter(ts => !isNaN(ts));
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeSpanHours = (maxTime - minTime) / 3600;

    messages.forEach(msg => {
      // User distribution
      if (msg.user) {
        userCounts[msg.user] = (userCounts[msg.user] || 0) + 1;
      }

      // Time distribution
      const date = new Date(parseFloat(msg.ts) * 1000);
      const hour = date.getHours().toString();
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;

      // Type distribution
      const type = msg.subtype || msg.type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;

      // Content analysis
      if (msg.text) {
        totalCharacters += msg.text.length;
        totalWords += msg.text.split(/\s+/).length;
        
        if (msg.metadata?.has_links) messagesWithLinks++;
        if (msg.metadata?.has_mentions) messagesWithMentions++;
      }

      if (msg.reactions && msg.reactions.length > 0) messagesWithReactions++;
      if (msg.thread_ts) messagesWithThreads++;
      if (msg.files && msg.files.length > 0) messagesWithFiles++;
      if (msg.thread_ts && !msg.metadata?.is_thread_reply) threadCount++;
    });

    // Calculate metrics
    analytics.unique_users = Object.keys(userCounts).length;
    analytics.message_distribution = {
      by_user: userCounts,
      by_hour: hourCounts,
      by_day: dayCounts,
      by_type: typeCounts,
    };

    analytics.engagement_metrics = {
      average_message_length: totalCharacters / messages.length,
      messages_with_reactions: messagesWithReactions,
      messages_with_threads: messagesWithThreads,
      most_active_user: Object.entries(userCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || null,
      peak_activity_hour: Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || null,
    };

    analytics.content_insights = {
      total_characters: totalCharacters,
      total_words: totalWords,
      average_words_per_message: totalWords / messages.length,
      messages_with_links: messagesWithLinks,
      messages_with_mentions: messagesWithMentions,
      messages_with_files: messagesWithFiles,
    };

    analytics.conversation_flow = {
      conversation_threads: threadCount,
      average_thread_length: messagesWithThreads > 0 ? messagesWithThreads / threadCount : 0,
      response_rate: (messagesWithThreads / messages.length) * 100,
      activity_level: this.calculateActivityLevel(messages.length, timeSpanHours),
    };

    analytics.time_analysis = {
      time_span_hours: timeSpanHours,
      messages_per_hour: timeSpanHours > 0 ? messages.length / timeSpanHours : 0,
      most_active_day: Object.entries(dayCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || null,
      activity_pattern: this.determineActivityPattern(messages),
    };

    return analytics;
  },

  /**
   * Calculate activity level based on message frequency
   */
  calculateActivityLevel(messageCount: number, timeSpanHours: number): MessageAnalytics['conversation_flow']['activity_level'] {
    if (timeSpanHours <= 0) return 'medium';
    
    const messagesPerHour = messageCount / timeSpanHours;
    
    if (messagesPerHour > 10) return 'very_high';
    if (messagesPerHour > 5) return 'high';
    if (messagesPerHour > 1) return 'medium';
    if (messagesPerHour > 0.1) return 'low';
    return 'very_low';
  },

  /**
   * Determine activity pattern from message timestamps
   */
  determineActivityPattern(messages: EnhancedMessage[]): MessageAnalytics['time_analysis']['activity_pattern'] {
    if (messages.length < 10) return 'consistent';
    
    const timestamps = messages.map(msg => parseFloat(msg.ts)).sort((a, b) => a - b);
    const intervals = [];
    
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // High variance indicates bursty activity
    if (stdDev > avgInterval) return 'bursty';
    
    // Check for trends
    const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
    const secondHalf = intervals.slice(Math.floor(intervals.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, interval) => sum + interval, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, interval) => sum + interval, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.5) return 'declining';
    if (firstAvg > secondAvg * 1.5) return 'increasing';
    
    return 'consistent';
  },

  /**
   * Generate recommendations for conversation optimization
   */
  generateRecommendations(
    messages: EnhancedMessage[], 
    analytics: MessageAnalytics, 
    args: SlackConversationsHistoryArgs
  ): string[] {
    const recommendations: string[] = [];

    // Activity level recommendations
    switch (analytics.conversation_flow.activity_level) {
      case 'very_low':
        recommendations.push('Very low activity detected - consider strategies to increase engagement');
        break;
      case 'very_high':
        recommendations.push('Very high activity - consider creating focused discussion threads to organize conversations');
        break;
    }

    // Engagement recommendations
    if (analytics.engagement_metrics.messages_with_reactions < analytics.total_messages * 0.1) {
      recommendations.push('Low reaction engagement - encourage team members to use reactions for quick feedback');
    }

    if (analytics.conversation_flow.response_rate < 20) {
      recommendations.push('Low response rate - consider asking more engaging questions or using @mentions');
    }

    // Content recommendations
    if (analytics.content_insights.average_words_per_message > 50) {
      recommendations.push('Long messages detected - consider breaking complex topics into separate messages or threads');
    }

    if (analytics.content_insights.messages_with_links > analytics.total_messages * 0.5) {
      recommendations.push('High link sharing - consider creating a dedicated resources channel');
    }

    // Thread usage recommendations
    if (analytics.conversation_flow.conversation_threads < analytics.total_messages * 0.1) {
      recommendations.push('Low thread usage - encourage using threads for detailed discussions to keep main channel organized');
    }

    // Time pattern recommendations
    if (analytics.time_analysis.activity_pattern === 'bursty') {
      recommendations.push('Bursty activity pattern detected - consider scheduling regular check-ins for more consistent communication');
    }

    // User participation recommendations
    if (analytics.unique_users < 3 && analytics.total_messages > 20) {
      recommendations.push('Limited user participation - consider inviting more team members or encouraging broader participation');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Conversation looks healthy! Consider maintaining current engagement patterns');
    }

    return recommendations;
  },
};

export default slackConversationsHistoryTool;
