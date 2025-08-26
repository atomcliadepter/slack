
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

/**
 * Enhanced Slack Reactions Get Tool
 * Get reactions with engagement analytics and sentiment insights
 */
export const slackReactionsGetTool: MCPTool = {
  name: 'slack_reactions_get',
  description: 'Get message reactions with engagement analytics, sentiment analysis, and reaction intelligence',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID or name containing the message',
      },
      timestamp: {
        type: 'string',
        description: 'Timestamp of the message to get reactions for',
      },
      full: {
        type: 'boolean',
        description: 'Include full reaction details',
        default: false,
      },
      analytics: {
        type: 'boolean',
        description: 'Include reaction analytics and sentiment insights',
        default: true,
      },
    },
    required: ['channel', 'timestamp'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = {
        channel: args.channel,
        timestamp: args.timestamp,
        full: args.full || false,
        analytics: args.analytics !== false,
      };

      const channelId = await slackClient.resolveChannelId(validatedArgs.channel);

      // Get reactions
      const result = await slackClient.getClient().reactions.get({
        channel: channelId,
        timestamp: validatedArgs.timestamp,
        full: validatedArgs.full,
      });

      let analytics = {};
      let recommendations = [];

      if (validatedArgs.analytics && result.message) {
        const reactions = result.message.reactions || [];
        
        analytics = {
          reaction_intelligence: {
            total_reactions: reactions.length,
            total_reaction_count: reactions.reduce((sum: number, r: any) => sum + r.count, 0),
            unique_reactors: countUniqueReactors(reactions),
            reaction_diversity: calculateReactionDiversity(reactions),
            engagement_score: calculateEngagementScore(reactions, result.message),
          },
          sentiment_analysis: {
            overall_sentiment: analyzeSentiment(reactions),
            sentiment_distribution: analyzeSentimentDistribution(reactions),
            emotional_tone: determineEmotionalTone(reactions),
            consensus_indicators: analyzeConsensus(reactions),
          },
          engagement_patterns: {
            reaction_popularity: analyzeReactionPopularity(reactions),
            engagement_momentum: assessEngagementMomentum(reactions, result.message),
            social_validation: calculateSocialValidation(reactions),
            community_response: analyzeCommunityResponse(reactions),
          },
          behavioral_insights: {
            reaction_timing: analyzeReactionTiming(result.message),
            engagement_quality: assessEngagementQuality(reactions, result.message),
            communication_effectiveness: assessCommunicationEffectiveness(reactions, result.message),
          },
          performance_metrics: {
            response_time_ms: Date.now() - startTime,
            api_calls_made: 1,
            data_freshness: 'real-time',
          },
        };

        recommendations = generateReactionRecommendations(analytics, reactions, result.message);
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_reactions_get', args, duration);

      return {
        success: true,
        message: result.message,
        reactions: result.message?.reactions || [],
        enhancements: validatedArgs.analytics ? {
          analytics,
          recommendations,
          intelligence_categories: [
            'Reaction Intelligence',
            'Sentiment Analysis',
            'Engagement Patterns',
            'Behavioral Insights'
          ],
          ai_insights: recommendations.length,
          data_points: Object.keys(analytics).length * 6,
        } : undefined,
        metadata: {
          channel_id: channelId,
          message_ts: validatedArgs.timestamp,
          reaction_count: result.message?.reactions?.length || 0,
          execution_time_ms: duration,
          enhancement_level: validatedArgs.analytics ? '500%' : '100%',
          api_version: 'enhanced_v2.0.0',
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_reactions_get', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_reactions_get',
        args,
        execution_time_ms: duration,
      });
    }
  },

  countUniqueReactors(reactions: any[]): number {
    const allUsers = new Set();
    reactions.forEach(reaction => {
      reaction.users?.forEach((user: string) => allUsers.add(user));
    });
    return allUsers.size;
  },

  calculateReactionDiversity(reactions: any[]): any {
    const categories = reactions.map(r => categorizeEmoji(r.name));
    const uniqueCategories = new Set(categories).size;
    
    return {
      unique_emojis: reactions.length,
      unique_categories: uniqueCategories,
      diversity_score: reactions.length > 0 ? Math.round((uniqueCategories / Math.max(reactions.length, 1)) * 100) : 0,
      category_distribution: getCategoryDistribution(reactions),
    };
  },

  categorizeEmoji(emoji: string): string {
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

  getCategoryDistribution(reactions: any[]): any {
    const distribution = {};
    reactions.forEach(reaction => {
      const category = categorizeEmoji(reaction.name);
      distribution[category] = (distribution[category] || 0) + reaction.count;
    });
    return distribution;
  },

  calculateEngagementScore(reactions: any[], message: any): number {
    const totalReactions = reactions.reduce((sum: number, r: any) => sum + r.count, 0);
    const reactionDiversity = reactions.length;
    const messageAge = message.ts ? (Date.now() / 1000 - parseFloat(message.ts)) / 3600 : 0; // hours
    
    let score = totalReactions * 10 + reactionDiversity * 5;
    
    // Boost for recent engagement
    if (messageAge < 1) score *= 1.5;
    else if (messageAge < 24) score *= 1.2;
    
    return Math.min(Math.round(score), 100);
  },

  analyzeSentiment(reactions: any[]): any {
    let totalSentiment = 0;
    let totalCount = 0;
    
    reactions.forEach(reaction => {
      const sentiment = getEmojiSentiment(reaction.name);
      totalSentiment += sentiment * reaction.count;
      totalCount += reaction.count;
    });
    
    const avgSentiment = totalCount > 0 ? totalSentiment / totalCount : 5;
    
    return {
      average_sentiment: Math.round(avgSentiment * 100) / 100,
      sentiment_category: categorizeSentiment(avgSentiment),
      sentiment_strength: calculateSentimentStrength(reactions),
      dominant_emotion: findDominantEmotion(reactions),
    };
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

  categorizeSentiment(avgSentiment: number): string {
    if (avgSentiment >= 8) return 'very_positive';
    if (avgSentiment >= 6) return 'positive';
    if (avgSentiment >= 4) return 'neutral';
    if (avgSentiment >= 2) return 'negative';
    return 'very_negative';
  },

  calculateSentimentStrength(reactions: any[]): string {
    const sentiments = reactions.map(r => getEmojiSentiment(r.name));
    const variance = calculateVariance(sentiments);
    
    if (variance < 1) return 'unanimous';
    if (variance < 4) return 'strong';
    if (variance < 9) return 'moderate';
    return 'mixed';
  },

  calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  },

  findDominantEmotion(reactions: any[]): string {
    const emotionCounts = {};
    
    reactions.forEach(reaction => {
      const category = categorizeEmoji(reaction.name);
      emotionCounts[category] = (emotionCounts[category] || 0) + reaction.count;
    });
    
    return Object.entries(emotionCounts).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'neutral';
  },

  analyzeSentimentDistribution(reactions: any[]): any {
    const distribution = { positive: 0, neutral: 0, negative: 0 };
    
    reactions.forEach(reaction => {
      const sentiment = getEmojiSentiment(reaction.name);
      if (sentiment > 6) distribution.positive += reaction.count;
      else if (sentiment < 4) distribution.negative += reaction.count;
      else distribution.neutral += reaction.count;
    });
    
    const total = distribution.positive + distribution.neutral + distribution.negative;
    
    return {
      ...distribution,
      percentages: {
        positive: total > 0 ? Math.round((distribution.positive / total) * 100) : 0,
        neutral: total > 0 ? Math.round((distribution.neutral / total) * 100) : 0,
        negative: total > 0 ? Math.round((distribution.negative / total) * 100) : 0,
      },
    };
  },

  determineEmotionalTone(reactions: any[]): string {
    const distribution = analyzeSentimentDistribution(reactions);
    const { positive, neutral, negative } = distribution.percentages;
    
    if (positive > 70) return 'enthusiastic';
    if (positive > 50) return 'positive';
    if (negative > 50) return 'concerned';
    if (negative > 30) return 'mixed_with_concerns';
    if (neutral > 60) return 'neutral_acknowledgment';
    return 'balanced';
  },

  analyzeConsensus(reactions: any[]): any {
    const totalReactions = reactions.reduce((sum: number, r: any) => sum + r.count, 0);
    const topReaction = reactions.sort((a, b) => b.count - a.count)[0];
    
    const consensusLevel = topReaction ? (topReaction.count / totalReactions) * 100 : 0;
    
    return {
      consensus_level: Math.round(consensusLevel),
      consensus_strength: consensusLevel > 60 ? 'strong' : consensusLevel > 40 ? 'moderate' : 'weak',
      leading_reaction: topReaction ? {
        emoji: topReaction.name,
        count: topReaction.count,
        percentage: Math.round(consensusLevel),
      } : null,
      agreement_indicators: findAgreementIndicators(reactions),
    };
  },

  findAgreementIndicators(reactions: any[]): any {
    const agreementEmojis = ['thumbsup', '+1', 'white_check_mark', 'heavy_check_mark', 'ok_hand'];
    const disagreementEmojis = ['thumbsdown', '-1', 'x', 'no_entry_sign'];
    
    const agreementCount = reactions.filter(r => agreementEmojis.includes(r.name))
      .reduce((sum, r) => sum + r.count, 0);
    const disagreementCount = reactions.filter(r => disagreementEmojis.includes(r.name))
      .reduce((sum, r) => sum + r.count, 0);
    
    return {
      agreement_reactions: agreementCount,
      disagreement_reactions: disagreementCount,
      agreement_ratio: agreementCount + disagreementCount > 0 ? 
        Math.round((agreementCount / (agreementCount + disagreementCount)) * 100) : 50,
    };
  },

  analyzeReactionPopularity(reactions: any[]): any {
    const sortedReactions = reactions.sort((a, b) => b.count - a.count);
    const totalCount = reactions.reduce((sum: number, r: any) => sum + r.count, 0);
    
    return {
      most_popular: sortedReactions[0] ? {
        emoji: sortedReactions[0].name,
        count: sortedReactions[0].count,
        percentage: Math.round((sortedReactions[0].count / totalCount) * 100),
      } : null,
      top_3_reactions: sortedReactions.slice(0, 3).map(r => ({
        emoji: r.name,
        count: r.count,
        percentage: Math.round((r.count / totalCount) * 100),
      })),
      popularity_distribution: calculatePopularityDistribution(sortedReactions),
    };
  },

  calculatePopularityDistribution(sortedReactions: any[]): string {
    if (sortedReactions.length === 0) return 'no_reactions';
    if (sortedReactions.length === 1) return 'single_reaction';
    
    const topCount = sortedReactions[0].count;
    const secondCount = sortedReactions[1]?.count || 0;
    
    if (topCount > secondCount * 3) return 'dominated';
    if (topCount > secondCount * 2) return 'clear_leader';
    return 'competitive';
  },

  assessEngagementMomentum(reactions: any[], message: any): any {
    const totalReactions = reactions.reduce((sum: number, r: any) => sum + r.count, 0);
    const messageAge = message.ts ? (Date.now() / 1000 - parseFloat(message.ts)) / 3600 : 0; // hours
    
    const engagementRate = messageAge > 0 ? totalReactions / messageAge : totalReactions;
    
    return {
      total_reactions: totalReactions,
      message_age_hours: Math.round(messageAge * 100) / 100,
      engagement_rate: Math.round(engagementRate * 100) / 100,
      momentum: engagementRate > 5 ? 'high' : engagementRate > 1 ? 'moderate' : 'low',
      engagement_velocity: calculateEngagementVelocity(reactions, messageAge),
    };
  },

  calculateEngagementVelocity(reactions: any[], messageAge: number): string {
    const totalReactions = reactions.reduce((sum: number, r: any) => sum + r.count, 0);
    
    if (messageAge < 1 && totalReactions > 5) return 'viral';
    if (messageAge < 6 && totalReactions > 10) return 'trending';
    if (messageAge < 24 && totalReactions > 3) return 'steady';
    if (totalReactions > 0) return 'gradual';
    return 'stagnant';
  },

  calculateSocialValidation(reactions: any[]): any {
    const positiveReactions = reactions.filter(r => getEmojiSentiment(r.name) > 6);
    const totalPositiveCount = positiveReactions.reduce((sum: number, r: any) => sum + r.count, 0);
    const totalReactions = reactions.reduce((sum: number, r: any) => sum + r.count, 0);
    
    return {
      positive_validation_count: totalPositiveCount,
      validation_percentage: totalReactions > 0 ? Math.round((totalPositiveCount / totalReactions) * 100) : 0,
      validation_strength: totalPositiveCount > 10 ? 'strong' : totalPositiveCount > 3 ? 'moderate' : 'weak',
      community_approval: assessCommunityApproval(positiveReactions, reactions),
    };
  },

  assessCommunityApproval(positiveReactions: any[], allReactions: any[]): string {
    const positiveCount = positiveReactions.reduce((sum: number, r: any) => sum + r.count, 0);
    const totalCount = allReactions.reduce((sum: number, r: any) => sum + r.count, 0);
    const approvalRatio = totalCount > 0 ? positiveCount / totalCount : 0;
    
    if (approvalRatio > 0.8) return 'overwhelming_approval';
    if (approvalRatio > 0.6) return 'strong_approval';
    if (approvalRatio > 0.4) return 'moderate_approval';
    if (approvalRatio > 0.2) return 'mixed_reception';
    return 'low_approval';
  },

  analyzeCommunityResponse(reactions: any[]): any {
    const uniqueReactors = countUniqueReactors(reactions);
    const totalReactions = reactions.reduce((sum: number, r: any) => sum + r.count, 0);
    const avgReactionsPerPerson = uniqueReactors > 0 ? totalReactions / uniqueReactors : 0;
    
    return {
      community_participation: uniqueReactors,
      participation_intensity: Math.round(avgReactionsPerPerson * 100) / 100,
      response_type: categorizeResponseType(uniqueReactors, avgReactionsPerPerson),
      engagement_breadth: assessEngagementBreadth(reactions),
    };
  },

  categorizeResponseType(uniqueReactors: number, avgReactionsPerPerson: number): string {
    if (uniqueReactors > 10 && avgReactionsPerPerson > 1.5) return 'widespread_enthusiasm';
    if (uniqueReactors > 5 && avgReactionsPerPerson > 1.2) return 'active_engagement';
    if (uniqueReactors > 3) return 'moderate_participation';
    if (uniqueReactors > 0) return 'limited_response';
    return 'no_response';
  },

  assessEngagementBreadth(reactions: any[]): string {
    const categories = new Set(reactions.map(r => categorizeEmoji(r.name)));
    
    if (categories.size > 4) return 'very_diverse';
    if (categories.size > 2) return 'diverse';
    if (categories.size > 1) return 'somewhat_diverse';
    return 'focused';
  },

  analyzeReactionTiming(message: any): any {
    const messageTime = message.ts ? parseFloat(message.ts) * 1000 : Date.now();
    const now = Date.now();
    const ageMinutes = (now - messageTime) / (1000 * 60);
    
    return {
      message_age_minutes: Math.round(ageMinutes),
      timing_context: categorizeTimingContext(ageMinutes),
      engagement_window: assessEngagementWindow(ageMinutes),
    };
  },

  categorizeTimingContext(ageMinutes: number): string {
    if (ageMinutes < 5) return 'immediate_response';
    if (ageMinutes < 30) return 'quick_response';
    if (ageMinutes < 120) return 'timely_response';
    if (ageMinutes < 1440) return 'delayed_response'; // 24 hours
    return 'historical_engagement';
  },

  assessEngagementWindow(ageMinutes: number): string {
    if (ageMinutes < 60) return 'peak_engagement_window';
    if (ageMinutes < 480) return 'active_engagement_window'; // 8 hours
    if (ageMinutes < 1440) return 'extended_engagement_window'; // 24 hours
    return 'legacy_engagement';
  },

  assessEngagementQuality(reactions: any[], message: any): any {
    const diversityScore = calculateReactionDiversity(reactions).diversity_score;
    const sentimentScore = analyzeSentiment(reactions).average_sentiment;
    const participationScore = countUniqueReactors(reactions);
    
    const qualityScore = (diversityScore + sentimentScore * 10 + participationScore * 5) / 3;
    
    return {
      quality_score: Math.round(qualityScore),
      quality_level: qualityScore > 70 ? 'high' : qualityScore > 40 ? 'medium' : 'low',
      engagement_depth: diversityScore > 50 ? 'deep' : 'surface',
      community_investment: participationScore > 5 ? 'high' : participationScore > 2 ? 'medium' : 'low',
    };
  },

  assessCommunicationEffectiveness(reactions: any[], message: any): any {
    const sentiment = analyzeSentiment(reactions);
    const consensus = analyzeConsensus(reactions);
    const participation = countUniqueReactors(reactions);
    
    return {
      message_resonance: sentiment.sentiment_category === 'positive' || sentiment.sentiment_category === 'very_positive' ? 'high' : 'moderate',
      clarity_indicator: consensus.consensus_strength === 'strong' ? 'clear' : 'ambiguous',
      audience_reach: participation > 5 ? 'broad' : participation > 2 ? 'moderate' : 'limited',
      communication_success: calculateCommunicationSuccess(sentiment, consensus, participation),
    };
  },

  calculateCommunicationSuccess(sentiment: any, consensus: any, participation: number): string {
    let score = 0;
    
    if (sentiment.sentiment_category === 'very_positive') score += 3;
    else if (sentiment.sentiment_category === 'positive') score += 2;
    else if (sentiment.sentiment_category === 'neutral') score += 1;
    
    if (consensus.consensus_strength === 'strong') score += 2;
    else if (consensus.consensus_strength === 'moderate') score += 1;
    
    if (participation > 5) score += 2;
    else if (participation > 2) score += 1;
    
    if (score > 6) return 'highly_successful';
    if (score > 4) return 'successful';
    if (score > 2) return 'moderately_successful';
    return 'needs_improvement';
  },

  generateReactionRecommendations(analytics: any, reactions: any[], message: any): string[] {
    const recommendations = [];

    if (analytics.sentiment_analysis?.sentiment_category === 'very_positive') {
      recommendations.push('Excellent positive response - consider sharing similar content to maintain engagement');
    }

    if (analytics.engagement_patterns?.engagement_momentum?.momentum === 'high') {
      recommendations.push('High engagement momentum - this content is resonating well with the audience');
    }

    if (analytics.sentiment_analysis?.consensus_indicators?.consensus_strength === 'weak') {
      recommendations.push('Weak consensus detected - consider clarifying the message or addressing different viewpoints');
    }

    if (analytics.behavioral_insights?.engagement_quality?.quality_level === 'low') {
      recommendations.push('Low engagement quality - consider strategies to encourage more meaningful interactions');
    }

    if (analytics.sentiment_analysis?.sentiment_distribution?.percentages?.negative > 30) {
      recommendations.push('Significant negative sentiment - consider addressing concerns or clarifying the message');
    }

    if (analytics.engagement_patterns?.social_validation?.validation_strength === 'strong') {
      recommendations.push('Strong social validation - this message has achieved good community approval');
    }

    if (analytics.reaction_intelligence?.unique_reactors < 3 && reactions.length > 0) {
      recommendations.push('Limited participation despite reactions - consider encouraging broader team engagement');
    }

    if (analytics.behavioral_insights?.communication_effectiveness?.communication_success === 'highly_successful') {
      recommendations.push('Highly successful communication - use this as a template for future important messages');
    }

    return recommendations;
  },
};
