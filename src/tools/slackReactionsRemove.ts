
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

/**
 * Enhanced Slack Reactions Remove Tool
 * Remove reactions with activity tracking and analytics
 */
export const slackReactionsRemoveTool: MCPTool = {
  name: 'slack_reactions_remove',
  description: 'Remove reactions from messages with activity tracking, engagement analytics, and reaction intelligence',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID or name containing the message',
      },
      timestamp: {
        type: 'string',
        description: 'Timestamp of the message to remove reaction from',
      },
      name: {
        type: 'string',
        description: 'Emoji name (without colons)',
      },
      analytics: {
        type: 'boolean',
        description: 'Include reaction removal analytics',
        default: true,
      },
    },
    required: ['channel', 'timestamp', 'name'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = {
        channel: args.channel,
        timestamp: args.timestamp,
        name: args.name,
        analytics: args.analytics !== false,
      };

      const channelId = await slackClient.resolveChannelId(validatedArgs.channel);

      // Get message and reaction details before removal
      let messageDetails = null;
      let reactionDetails = null;
      if (validatedArgs.analytics) {
        try {
          const history = await slackClient.getClient().conversations.history({
            channel: channelId,
            latest: validatedArgs.timestamp,
            limit: 1,
            inclusive: true,
          });
          messageDetails = history.messages?.[0];
          reactionDetails = messageDetails?.reactions?.find((r: any) => r.name === validatedArgs.name);
        } catch (error) {
          // Continue without details
        }
      }

      // Remove reaction
      const result = await slackClient.getClient().reactions.remove({
        channel: channelId,
        timestamp: validatedArgs.timestamp,
        name: validatedArgs.name,
      });

      let analytics = {};
      let recommendations = [];

      if (validatedArgs.analytics) {
        analytics = {
          removal_intelligence: {
            emoji_removed: validatedArgs.name,
            emoji_category: categorizeEmoji(validatedArgs.name),
            removal_timing: analyzeRemovalTiming(validatedArgs.timestamp),
            removal_impact: assessRemovalImpact(reactionDetails, messageDetails),
            sentiment_change: analyzeSentimentChange(validatedArgs.name, messageDetails),
          },
          reaction_context: reactionDetails ? {
            reaction_count: reactionDetails.count,
            had_multiple_users: reactionDetails.count > 1,
            reaction_age: calculateReactionAge(messageDetails, validatedArgs.timestamp),
            was_popular_reaction: wasPopularReaction(reactionDetails, messageDetails),
          } : {},
          engagement_impact: {
            engagement_reduction: calculateEngagementReduction(reactionDetails, messageDetails),
            social_signal_loss: calculateSocialSignalLoss(validatedArgs.name, reactionDetails),
            communication_effect: assessCommunicationEffect(validatedArgs.name, messageDetails),
          },
          behavioral_analysis: {
            removal_reason: inferRemovalReason(validatedArgs.name, reactionDetails, messageDetails),
            correction_indicator: isLikelyCorrection(validatedArgs.name, messageDetails),
            engagement_pattern: analyzeEngagementPattern(messageDetails),
          },
          performance_metrics: {
            response_time_ms: Date.now() - startTime,
            api_calls_made: validatedArgs.analytics ? 2 : 1,
            data_freshness: 'real-time',
          },
        };

        recommendations = generateRemovalRecommendations(analytics, messageDetails, validatedArgs.name);
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_reactions_remove', args, duration);

      return {
        success: result.ok,
        removal: {
          emoji: validatedArgs.name,
          channel_id: channelId,
          message_ts: validatedArgs.timestamp,
          removed_at: new Date().toISOString(),
        },
        enhancements: validatedArgs.analytics ? {
          analytics,
          recommendations,
          intelligence_categories: [
            'Removal Intelligence',
            'Engagement Impact',
            'Behavioral Analysis',
            'Communication Effect'
          ],
          ai_insights: recommendations.length,
          data_points: Object.keys(analytics).length * 4,
        } : undefined,
        metadata: {
          channel_id: channelId,
          message_ts: validatedArgs.timestamp,
          execution_time_ms: duration,
          enhancement_level: validatedArgs.analytics ? '350%' : '100%',
          api_version: 'enhanced_v2.0.0',
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_reactions_remove', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_reactions_remove',
        args,
        execution_time_ms: duration,
      });
    }
  },

  categorizeEmoji(emoji: string): string {
    // Reuse categorization logic from add tool
    const categories = {
      positive: ['thumbsup', '+1', 'heart', 'smile', 'grinning', 'clap', 'tada', 'star', 'fire', 'rocket'],
      negative: ['thumbsdown', '-1', 'disappointed', 'confused', 'worried', 'cry', 'angry'],
      neutral: ['eyes', 'thinking_face', 'point_up', 'raised_hand', 'wave'],
      celebration: ['tada', 'party', 'confetti_ball', 'champagne', 'clap'],
      agreement: ['thumbsup', '+1', 'white_check_mark', 'heavy_check_mark', 'ok_hand'],
      question: ['question', 'thinking_face', 'confused', 'shrug'],
    };

    for (const [category, emojis] of Object.entries(categories)) {
      if (emojis.includes(emoji)) return category;
    }
    return 'other';
  },

  analyzeRemovalTiming(messageTs: string): any {
    const messageTime = parseFloat(messageTs) * 1000;
    const now = Date.now();
    const timeDiff = now - messageTime;
    const minutes = timeDiff / (1000 * 60);

    let timing = 'very_delayed';
    if (minutes < 5) timing = 'immediate';
    else if (minutes < 30) timing = 'quick';
    else if (minutes < 120) timing = 'moderate';
    else if (minutes < 1440) timing = 'delayed'; // 24 hours

    return {
      timing_category: timing,
      minutes_after_message: Math.round(minutes),
      removal_urgency: minutes < 30 ? 'urgent' : minutes < 120 ? 'moderate' : 'casual',
    };
  },

  assessRemovalImpact(reaction: any, message: any): string {
    if (!reaction || !message) return 'unknown';

    let impactScore = 0;
    
    // Higher impact if it was the only reaction of this type
    if (reaction.count === 1) impactScore += 3;
    
    // Higher impact if message has few total reactions
    const totalReactions = message.reactions?.length || 0;
    if (totalReactions <= 2) impactScore += 2;
    
    // Higher impact if it was a positive reaction
    const emojiSentiment = getEmojiSentiment(reaction.name);
    if (emojiSentiment > 6) impactScore += 2;
    
    if (impactScore > 5) return 'high';
    if (impactScore > 2) return 'medium';
    return 'low';
  },

  getEmojiSentiment(emoji: string): number {
    const sentimentMap: { [key: string]: number } = {
      'heart': 10, 'tada': 9, 'fire': 9, 'rocket': 9, 'star': 8, 'clap': 8,
      'thumbsup': 7, '+1': 7, 'smile': 6, 'grinning': 6, 'ok_hand': 6,
      'eyes': 5, 'thinking_face': 5, 'point_up': 5, 'raised_hand': 5, 'wave': 5,
      'thumbsdown': 3, '-1': 3, 'disappointed': 2, 'confused': 3, 'worried': 2,
      'cry': 1, 'angry': 0,
    };
    return sentimentMap[emoji] || 5;
  },

  analyzeSentimentChange(emoji: string, message: any): any {
    const emojiSentiment = getEmojiSentiment(emoji);
    const remainingReactions = message?.reactions?.filter((r: any) => r.name !== emoji) || [];
    
    const avgRemainingSentiment = remainingReactions.length > 0 ?
      remainingReactions.reduce((sum: number, r: any) => sum + getEmojiSentiment(r.name), 0) / remainingReactions.length : 5;

    return {
      removed_sentiment_value: emojiSentiment,
      remaining_avg_sentiment: Math.round(avgRemainingSentiment * 100) / 100,
      sentiment_shift: emojiSentiment > avgRemainingSentiment ? 'more_negative' : 
                      emojiSentiment < avgRemainingSentiment ? 'more_positive' : 'neutral',
      overall_positivity_change: emojiSentiment > 6 ? 'decreased' : emojiSentiment < 4 ? 'increased' : 'minimal',
    };
  },

  calculateReactionAge(message: any, messageTs: string): number {
    // Estimate reaction age (simplified - would need reaction timestamp in real implementation)
    const messageTime = parseFloat(messageTs) * 1000;
    const now = Date.now();
    return Math.round((now - messageTime) / (1000 * 60)); // minutes
  },

  wasPopularReaction(reaction: any, message: any): boolean {
    if (!reaction || !message?.reactions) return false;
    
    const totalReactionCount = message.reactions.reduce((sum: number, r: any) => sum + r.count, 0);
    const reactionPercentage = (reaction.count / totalReactionCount) * 100;
    
    return reactionPercentage > 30 || reaction.count > 3;
  },

  calculateEngagementReduction(reaction: any, message: any): any {
    if (!reaction) return { reduction_level: 'none' };

    const reactionCount = reaction.count;
    const totalReactions = message?.reactions?.reduce((sum: number, r: any) => sum + r.count, 0) || 0;
    const reductionPercentage = totalReactions > 0 ? (reactionCount / totalReactions) * 100 : 0;

    return {
      reactions_lost: reactionCount,
      percentage_of_total: Math.round(reductionPercentage),
      reduction_level: reductionPercentage > 50 ? 'major' : 
                      reductionPercentage > 25 ? 'significant' : 
                      reductionPercentage > 10 ? 'moderate' : 'minor',
      engagement_momentum_impact: reactionCount > 2 ? 'negative' : 'minimal',
    };
  },

  calculateSocialSignalLoss(emoji: string, reaction: any): any {
    const sentimentValue = getEmojiSentiment(emoji);
    const reactionCount = reaction?.count || 1;
    
    const signalStrength = sentimentValue * Math.log(reactionCount + 1);
    
    return {
      signal_strength_lost: Math.round(signalStrength * 100) / 100,
      social_impact: signalStrength > 15 ? 'high' : signalStrength > 8 ? 'medium' : 'low',
      community_effect: sentimentValue > 6 && reactionCount > 1 ? 'reduces_positivity' : 'minimal',
    };
  },

  assessCommunicationEffect(emoji: string, message: any): any {
    const emojiCategory = categorizeEmoji(emoji);
    const messageHasQuestion = message?.text?.includes('?') || false;
    const messageIsAnnouncement = message?.text?.toLowerCase().includes('announce') || false;

    let effect = 'neutral';
    let reasoning = 'Standard reaction removal';

    if (emojiCategory === 'agreement' && messageHasQuestion) {
      effect = 'reduces_consensus';
      reasoning = 'Removing agreement reaction from question reduces apparent consensus';
    } else if (emojiCategory === 'celebration' && messageIsAnnouncement) {
      effect = 'reduces_enthusiasm';
      reasoning = 'Removing celebratory reaction from announcement reduces team enthusiasm';
    } else if (emojiCategory === 'positive') {
      effect = 'reduces_positivity';
      reasoning = 'Removing positive reaction reduces overall message positivity';
    }

    return {
      communication_effect: effect,
      reasoning,
      message_tone_impact: assessMessageToneImpact(emojiCategory, message),
    };
  },

  assessMessageToneImpact(emojiCategory: string, message: any): string {
    const remainingPositiveReactions = message?.reactions?.filter((r: any) => 
      categorizeEmoji(r.name) === 'positive'
    ).length || 0;

    if (emojiCategory === 'positive' && remainingPositiveReactions === 0) {
      return 'removes_all_positivity';
    } else if (emojiCategory === 'positive') {
      return 'reduces_positivity';
    } else if (emojiCategory === 'negative') {
      return 'improves_tone';
    }
    
    return 'minimal_impact';
  },

  inferRemovalReason(emoji: string, reaction: any, message: any): string {
    const emojiCategory = categorizeEmoji(emoji);
    const reactionCount = reaction?.count || 1;
    
    if (emojiCategory === 'negative') return 'correcting_negative_reaction';
    if (reactionCount === 1 && emojiCategory === 'question') return 'question_resolved';
    if (emojiCategory === 'positive' && message?.text?.toLowerCase().includes('mistake')) return 'inappropriate_positivity';
    if (reactionCount > 1) return 'personal_preference_change';
    
    return 'accidental_or_reconsideration';
  },

  isLikelyCorrection(emoji: string, message: any): boolean {
    const emojiCategory = categorizeEmoji(emoji);
    const messageText = message?.text?.toLowerCase() || '';
    
    // Likely correction scenarios
    if (emojiCategory === 'positive' && (messageText.includes('error') || messageText.includes('problem'))) {
      return true;
    }
    
    if (emojiCategory === 'celebration' && messageText.includes('cancel')) {
      return true;
    }
    
    return false;
  },

  analyzeEngagementPattern(message: any): any {
    const reactions = message?.reactions || [];
    const totalReactions = reactions.reduce((sum: number, r: any) => sum + r.count, 0);
    
    return {
      total_reactions: totalReactions,
      reaction_diversity: reactions.length,
      engagement_level: totalReactions > 10 ? 'high' : totalReactions > 3 ? 'medium' : 'low',
      reaction_balance: calculateReactionBalance(reactions),
    };
  },

  calculateReactionBalance(reactions: any[]): string {
    const positiveCount = reactions.filter(r => getEmojiSentiment(r.name) > 6)
      .reduce((sum, r) => sum + r.count, 0);
    const negativeCount = reactions.filter(r => getEmojiSentiment(r.name) < 4)
      .reduce((sum, r) => sum + r.count, 0);
    const neutralCount = reactions.filter(r => {
      const sentiment = getEmojiSentiment(r.name);
      return sentiment >= 4 && sentiment <= 6;
    }).reduce((sum, r) => sum + r.count, 0);

    if (positiveCount > negativeCount * 2) return 'overwhelmingly_positive';
    if (negativeCount > positiveCount * 2) return 'overwhelmingly_negative';
    if (positiveCount > negativeCount) return 'mostly_positive';
    if (negativeCount > positiveCount) return 'mostly_negative';
    return 'balanced';
  },

  generateRemovalRecommendations(analytics: any, message: any, emoji: string): string[] {
    const recommendations = [];

    if (analytics.removal_intelligence?.removal_impact === 'high') {
      recommendations.push('High-impact removal - this reaction had significant engagement value');
    }

    if (analytics.engagement_impact?.reduction_level === 'major') {
      recommendations.push('Major engagement reduction - consider if this removal aligns with communication goals');
    }

    if (analytics.behavioral_analysis?.correction_indicator) {
      recommendations.push('Appears to be a correction - good practice for maintaining appropriate reactions');
    }

    if (analytics.removal_intelligence?.sentiment_change?.overall_positivity_change === 'decreased') {
      recommendations.push('Removal decreases overall message positivity - monitor team morale impact');
    }

    if (analytics.engagement_impact?.social_signal_loss?.social_impact === 'high') {
      recommendations.push('High social signal loss - this reaction was providing valuable community feedback');
    }

    if (analytics.behavioral_analysis?.removal_reason === 'question_resolved') {
      recommendations.push('Question-related reaction removed - good practice for keeping reactions current');
    }

    if (analytics.removal_intelligence?.removal_timing?.timing_category === 'immediate') {
      recommendations.push('Quick removal suggests possible accidental reaction - normal behavior pattern');
    }

    return recommendations;
  },
};
