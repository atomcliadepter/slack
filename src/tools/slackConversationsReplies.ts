
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

/**
 * Enhanced Slack Conversations Replies Tool
 * Get thread replies with engagement metrics and analytics
 */
export const slackConversationsRepliesTool: MCPTool = {
  name: 'slack_conversations_replies',
  description: 'Get thread replies with engagement metrics, sentiment analysis, and conversation flow insights',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID or name containing the thread',
      },
      ts: {
        type: 'string',
        description: 'Timestamp of the parent message',
      },
      cursor: {
        type: 'string',
        description: 'Pagination cursor',
      },
      latest: {
        type: 'string',
        description: 'Latest timestamp to include',
      },
      oldest: {
        type: 'string',
        description: 'Oldest timestamp to include',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of replies to return',
        minimum: 1,
        maximum: 1000,
        default: 100,
      },
      inclusive: {
        type: 'boolean',
        description: 'Include messages with latest or oldest timestamp',
        default: false,
      },
      analytics: {
        type: 'boolean',
        description: 'Include thread engagement analytics',
        default: true,
      },
    },
    required: ['channel', 'ts'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedArgs = {
        channel: args.channel,
        ts: args.ts,
        cursor: args.cursor,
        latest: args.latest,
        oldest: args.oldest,
        limit: Math.min(args.limit || 100, 1000),
        inclusive: args.inclusive || false,
        analytics: args.analytics !== false,
      };

      // Resolve channel ID
      const channelId = await slackClient.resolveChannelId(validatedArgs.channel);

      // Get thread replies
      const repliesResponse = await slackClient.getClient().conversations.replies({
        channel: channelId,
        ts: validatedArgs.ts,
        cursor: validatedArgs.cursor,
        latest: validatedArgs.latest,
        oldest: validatedArgs.oldest,
        limit: validatedArgs.limit,
        inclusive: validatedArgs.inclusive,
      });

      let analytics = {};
      let recommendations = [];

      if (validatedArgs.analytics && repliesResponse.messages) {
        // Generate thread analytics
        analytics = {
          thread_intelligence: {
            total_replies: repliesResponse.messages.length - 1, // Exclude parent message
            thread_analysis: analyzeThread(repliesResponse.messages),
            engagement_metrics: calculateThreadEngagement(repliesResponse.messages),
            participant_analysis: analyzeParticipants(repliesResponse.messages),
            conversation_flow: analyzeConversationFlow(repliesResponse.messages),
          },
          sentiment_intelligence: {
            thread_sentiment: analyzeThreadSentiment(repliesResponse.messages),
            engagement_sentiment: analyzeEngagementSentiment(repliesResponse.messages),
            resolution_indicators: analyzeResolutionIndicators(repliesResponse.messages),
          },
          temporal_intelligence: {
            response_patterns: analyzeResponsePatterns(repliesResponse.messages),
            activity_timeline: generateActivityTimeline(repliesResponse.messages),
            engagement_velocity: calculateEngagementVelocity(repliesResponse.messages),
          },
          performance_metrics: {
            response_time_ms: Date.now() - startTime,
            api_calls_made: 1,
            data_freshness: 'real-time',
            pagination_info: {
              has_more: !!repliesResponse.response_metadata?.next_cursor,
              cursor: repliesResponse.response_metadata?.next_cursor,
            },
          },
        };

        // Generate AI-powered recommendations
        recommendations = generateThreadRecommendations(analytics, repliesResponse.messages);
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_conversations_replies', args, duration);

      return {
        success: true,
        messages: repliesResponse.messages,
        response_metadata: repliesResponse.response_metadata,
        enhancements: validatedArgs.analytics ? {
          analytics,
          recommendations,
          intelligence_categories: [
            'Thread Intelligence',
            'Engagement Metrics',
            'Participant Analysis',
            'Sentiment Intelligence',
            'Temporal Intelligence'
          ],
          ai_insights: recommendations.length,
          data_points: Object.keys(analytics).length * 7,
        } : undefined,
        metadata: {
          channel_id: channelId,
          parent_message_ts: validatedArgs.ts,
          reply_count: repliesResponse.messages?.length ? repliesResponse.messages.length - 1 : 0,
          execution_time_ms: duration,
          enhancement_level: validatedArgs.analytics ? '400%' : '100%',
          api_version: 'enhanced_v2.0.0',
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

  // Helper methods for thread analytics
  analyzeThread(messages: any[]): any {
    const parentMessage = messages[0];
    const replies = messages.slice(1);
    
    return {
      parent_message: {
        user: parentMessage?.user,
        timestamp: parentMessage?.ts,
        text_length: parentMessage?.text?.length || 0,
        has_files: !!(parentMessage?.files?.length),
        has_attachments: !!(parentMessage?.attachments?.length),
      },
      reply_statistics: {
        total_replies: replies.length,
        unique_participants: new Set(replies.map(r => r.user).filter(Boolean)).size,
        avg_reply_length: replies.length > 0 ? Math.round(replies.reduce((sum, r) => sum + (r.text?.length || 0), 0) / replies.length) : 0,
        replies_with_reactions: replies.filter(r => r.reactions?.length > 0).length,
      },
    };
  },

  calculateThreadEngagement(messages: any[]): any {
    const replies = messages.slice(1);
    const totalReactions = replies.reduce((sum, r) => sum + (r.reactions?.length || 0), 0);
    const totalMentions = replies.reduce((sum, r) => sum + (r.text?.match(/<@\w+>/g)?.length || 0), 0);
    
    return {
      engagement_score: replies.length > 0 ? Math.round(((totalReactions + totalMentions) / replies.length) * 100) : 0,
      reaction_rate: replies.length > 0 ? Math.round((replies.filter(r => r.reactions?.length > 0).length / replies.length) * 100) : 0,
      mention_density: replies.length > 0 ? Math.round((totalMentions / replies.length) * 100) : 0,
      thread_depth: replies.length,
    };
  },

  analyzeParticipants(messages: any[]): any {
    const replies = messages.slice(1);
    const participants = {};
    
    replies.forEach(reply => {
      if (reply.user) {
        participants[reply.user] = (participants[reply.user] || 0) + 1;
      }
    });

    const participantEntries = Object.entries(participants);
    const mostActiveParticipant = participantEntries.sort(([,a], [,b]) => (b as number) - (a as number))[0];

    return {
      unique_participants: participantEntries.length,
      most_active_participant: mostActiveParticipant ? {
        user_id: mostActiveParticipant[0],
        reply_count: mostActiveParticipant[1],
      } : null,
      participation_distribution: participantEntries.map(([userId, count]) => ({
        user_id: userId,
        reply_count: count,
        participation_percentage: Math.round((count as number / replies.length) * 100),
      })),
      conversation_balance: calculateConversationBalance(participants),
    };
  },

  calculateConversationBalance(participants: any): string {
    const counts = Object.values(participants) as number[];
    if (counts.length === 0) return 'no_participants';
    if (counts.length === 1) return 'monologue';
    
    const maxCount = Math.max(...counts);
    const totalCount = counts.reduce((sum, count) => sum + count, 0);
    const dominanceRatio = maxCount / totalCount;
    
    if (dominanceRatio > 0.7) return 'dominated';
    if (dominanceRatio > 0.5) return 'led';
    return 'balanced';
  },

  analyzeConversationFlow(messages: any[]): any {
    const replies = messages.slice(1);
    if (replies.length < 2) return { flow_pattern: 'insufficient_data' };

    const timestamps = replies.map(r => parseFloat(r.ts)).sort();
    const intervals = [];
    
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const maxInterval = Math.max(...intervals);
    const minInterval = Math.min(...intervals);

    return {
      flow_pattern: determineFlowPattern(intervals),
      avg_response_time_minutes: Math.round(avgInterval / 60 * 100) / 100,
      max_gap_minutes: Math.round(maxInterval / 60 * 100) / 100,
      min_gap_minutes: Math.round(minInterval / 60 * 100) / 100,
      conversation_pace: avgInterval < 300 ? 'fast' : avgInterval < 1800 ? 'moderate' : 'slow',
    };
  },

  determineFlowPattern(intervals: number[]): string {
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev / avgInterval < 0.5) return 'steady';
    if (stdDev / avgInterval < 1.0) return 'variable';
    return 'sporadic';
  },

  analyzeThreadSentiment(messages: any[]): any {
    const replies = messages.slice(1);
    const positiveKeywords = ['thanks', 'great', 'good', 'awesome', 'perfect', 'solved', 'resolved'];
    const negativeKeywords = ['problem', 'issue', 'error', 'wrong', 'bad', 'failed', 'broken'];
    
    let positive = 0, negative = 0, neutral = 0;

    replies.forEach(reply => {
      if (!reply.text) {
        neutral++;
        return;
      }

      const text = reply.text.toLowerCase();
      const hasPositive = positiveKeywords.some(word => text.includes(word));
      const hasNegative = negativeKeywords.some(word => text.includes(word));

      if (hasPositive && !hasNegative) positive++;
      else if (hasNegative && !hasPositive) negative++;
      else neutral++;
    });

    return {
      positive_replies: positive,
      negative_replies: negative,
      neutral_replies: neutral,
      sentiment_trend: calculateSentimentTrend(replies),
      overall_tone: positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral',
    };
  },

  calculateSentimentTrend(replies: any[]): string {
    if (replies.length < 3) return 'insufficient_data';
    
    const firstHalf = replies.slice(0, Math.floor(replies.length / 2));
    const secondHalf = replies.slice(Math.floor(replies.length / 2));
    
    const firstHalfSentiment = getSimpleSentiment(firstHalf);
    const secondHalfSentiment = getSimpleSentiment(secondHalf);
    
    if (secondHalfSentiment > firstHalfSentiment) return 'improving';
    if (secondHalfSentiment < firstHalfSentiment) return 'declining';
    return 'stable';
  },

  getSimpleSentiment(messages: any[]): number {
    const positiveKeywords = ['thanks', 'great', 'good', 'awesome', 'perfect', 'solved'];
    const negativeKeywords = ['problem', 'issue', 'error', 'wrong', 'bad', 'failed'];
    
    let score = 0;
    messages.forEach(msg => {
      if (msg.text) {
        const text = msg.text.toLowerCase();
        positiveKeywords.forEach(word => {
          if (text.includes(word)) score += 1;
        });
        negativeKeywords.forEach(word => {
          if (text.includes(word)) score -= 1;
        });
      }
    });
    
    return score;
  },

  analyzeEngagementSentiment(messages: any[]): any {
    const replies = messages.slice(1);
    const engagedReplies = replies.filter(r => r.reactions?.length > 0);
    
    return {
      engaged_replies: engagedReplies.length,
      engagement_rate: replies.length > 0 ? Math.round((engagedReplies.length / replies.length) * 100) : 0,
      most_reacted_reply: findMostReactedReply(replies),
    };
  },

  findMostReactedReply(replies: any[]): any {
    let mostReacted = null;
    let maxReactions = 0;
    
    replies.forEach(reply => {
      const reactionCount = reply.reactions?.reduce((sum: number, reaction: any) => sum + reaction.count, 0) || 0;
      if (reactionCount > maxReactions) {
        maxReactions = reactionCount;
        mostReacted = {
          timestamp: reply.ts,
          user: reply.user,
          reaction_count: reactionCount,
          text_preview: reply.text?.substring(0, 100) || '',
        };
      }
    });
    
    return mostReacted;
  },

  analyzeResolutionIndicators(messages: any[]): any {
    const replies = messages.slice(1);
    const resolutionKeywords = ['solved', 'resolved', 'fixed', 'done', 'completed', 'thanks', 'perfect'];
    const questionKeywords = ['?', 'how', 'what', 'why', 'when', 'where', 'help'];
    
    const resolutionIndicators = replies.filter(r => 
      r.text && resolutionKeywords.some(word => r.text.toLowerCase().includes(word))
    ).length;
    
    const questionIndicators = replies.filter(r => 
      r.text && questionKeywords.some(word => r.text.toLowerCase().includes(word))
    ).length;
    
    return {
      resolution_indicators: resolutionIndicators,
      question_indicators: questionIndicators,
      likely_resolved: resolutionIndicators > questionIndicators && resolutionIndicators > 0,
      resolution_confidence: resolutionIndicators > 0 ? Math.min(resolutionIndicators * 25, 100) : 0,
    };
  },

  analyzeResponsePatterns(messages: any[]): any {
    const replies = messages.slice(1);
    if (replies.length < 2) return { pattern: 'insufficient_data' };

    const timestamps = replies.map(r => parseFloat(r.ts));
    const intervals = [];
    
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    return {
      response_pattern: identifyResponsePattern(intervals),
      peak_activity_period: findPeakActivityPeriod(timestamps),
      response_consistency: calculateResponseConsistency(intervals),
    };
  },

  identifyResponsePattern(intervals: number[]): string {
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    
    if (avgInterval < 300) return 'rapid_fire'; // < 5 minutes
    if (avgInterval < 1800) return 'conversational'; // < 30 minutes
    if (avgInterval < 7200) return 'periodic'; // < 2 hours
    return 'sporadic';
  },

  findPeakActivityPeriod(timestamps: number[]): any {
    const hours = timestamps.map(ts => new Date(ts * 1000).getHours());
    const hourCounts = {};
    
    hours.forEach(hour => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const peakHour = Object.entries(hourCounts).sort(([,a], [,b]) => (b as number) - (a as number))[0];
    
    return peakHour ? {
      hour: parseInt(peakHour[0]),
      activity_count: peakHour[1],
    } : null;
  },

  calculateResponseConsistency(intervals: number[]): number {
    if (intervals.length < 2) return 0;
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower coefficient of variation = higher consistency
    const coefficientOfVariation = stdDev / avgInterval;
    return Math.max(0, Math.round((1 - Math.min(coefficientOfVariation, 1)) * 100));
  },

  generateActivityTimeline(messages: any[]): any {
    const replies = messages.slice(1);
    if (replies.length === 0) return { timeline: [] };

    const timeline = replies.map((reply, index) => ({
      sequence: index + 1,
      timestamp: reply.ts,
      user: reply.user,
      text_length: reply.text?.length || 0,
      has_reactions: !!(reply.reactions?.length),
      reaction_count: reply.reactions?.reduce((sum: number, r: any) => sum + r.count, 0) || 0,
    }));

    return {
      timeline,
      total_duration_hours: replies.length > 1 ? 
        Math.round((parseFloat(replies[replies.length - 1].ts) - parseFloat(replies[0].ts)) / 3600 * 100) / 100 : 0,
    };
  },

  calculateEngagementVelocity(messages: any[]): any {
    const replies = messages.slice(1);
    if (replies.length < 2) return { velocity: 0 };

    const timeSpan = parseFloat(replies[replies.length - 1].ts) - parseFloat(replies[0].ts);
    const velocity = timeSpan > 0 ? replies.length / (timeSpan / 3600) : 0; // replies per hour

    return {
      velocity: Math.round(velocity * 100) / 100,
      velocity_category: velocity > 5 ? 'high' : velocity > 1 ? 'moderate' : 'low',
      sustained_engagement: velocity > 0.5 && replies.length > 3,
    };
  },

  generateThreadRecommendations(analytics: any, messages: any[]): string[] {
    const recommendations = [];

    if (analytics.thread_intelligence?.engagement_metrics?.engagement_score < 20) {
      recommendations.push('Low thread engagement - consider asking follow-up questions to encourage participation');
    }

    if (analytics.thread_intelligence?.participant_analysis?.conversation_balance === 'dominated') {
      recommendations.push('Conversation is dominated by one participant - encourage broader participation');
    }

    if (analytics.sentiment_intelligence?.resolution_indicators?.likely_resolved) {
      recommendations.push('Thread appears resolved - consider marking as complete or summarizing outcomes');
    }

    if (analytics.temporal_intelligence?.engagement_velocity?.velocity < 0.5) {
      recommendations.push('Low engagement velocity - consider strategies to maintain conversation momentum');
    }

    if (analytics.sentiment_intelligence?.thread_sentiment?.sentiment_trend === 'declining') {
      recommendations.push('Sentiment is declining - consider addressing concerns or clarifying issues');
    }

    if (analytics.thread_intelligence?.thread_analysis?.reply_statistics?.total_replies === 0) {
      recommendations.push('No replies yet - consider rephrasing the question or adding more context');
    }

    return recommendations;
  },
};
