import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  include_analytics: z.boolean().optional().default(true),
  include_content_analysis: z.boolean().optional().default(true),
  analyze_usage_patterns: z.boolean().optional().default(true),
  generate_recommendations: z.boolean().optional().default(true),
  sort_by: z.enum(['date', 'importance', 'engagement']).optional().default('date'),
  sort_direction: z.enum(['asc', 'desc']).optional().default('desc'),
});

type InputArgs = z.infer<typeof inputSchema>;

interface PinItem {
  message: {
    ts: string;
    text: string;
    user: string;
    username?: string;
    type: string;
    permalink?: string;
  };
  pin_info: {
    pinned_by?: string;
    pinned_at?: string;
    pin_age_hours: number;
    importance_score: number;
    engagement_metrics: {
      reaction_count: number;
      reply_count: number;
      has_files: boolean;
      has_links: boolean;
    };
  };
  content_analysis?: {
    content_type: string;
    content_length: number;
    readability_score: number;
    key_topics: string[];
    urgency_level: string;
  };
}

interface PinsListResult {
  success: boolean;
  channel: string;
  channel_name?: string;
  total_pins: number;
  pins: PinItem[];
  analytics?: {
    pin_distribution: {
      by_user: Record<string, number>;
      by_content_type: Record<string, number>;
      by_age_range: Record<string, number>;
    };
    usage_patterns: {
      average_pin_age_days: number;
      pin_density: string;
      content_freshness: string;
      organizational_health: string;
    };
    engagement_analysis: {
      total_engagement: number;
      average_engagement_per_pin: number;
      most_engaged_pin: string;
      engagement_distribution: string;
    };
    content_insights: {
      dominant_content_types: string[];
      average_content_length: number;
      readability_assessment: string;
      information_density: string;
    };
  };
  recommendations?: {
    pin_management: string[];
    content_optimization: string[];
    organizational_improvements: string[];
    workflow_enhancements: string[];
  };
  metadata: {
    execution_time_ms: number;
    api_calls_made: number;
    analysis_timestamp: string;
    sort_applied: string;
  };
}

export const slackPinsListTool: MCPTool = {
  name: 'slack_pins_list',
  description: 'List and analyze pinned messages with comprehensive insights and recommendations',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel ID or name to list pins from',
      },
      include_analytics: {
        type: 'boolean',
        description: 'Whether to include detailed pin analytics',
        default: true,
      },
      include_content_analysis: {
        type: 'boolean',
        description: 'Whether to analyze pin content for insights',
        default: true,
      },
      analyze_usage_patterns: {
        type: 'boolean',
        description: 'Whether to analyze pin usage patterns',
        default: true,
      },
      generate_recommendations: {
        type: 'boolean',
        description: 'Whether to generate actionable recommendations',
        default: true,
      },
      sort_by: {
        type: 'string',
        enum: ['date', 'importance', 'engagement'],
        description: 'How to sort the pins',
        default: 'date',
      },
      sort_direction: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort direction',
        default: 'desc',
      },
    },
    required: ['channel'],
  },

  async execute(args: Record<string, any>): Promise<PinsListResult> {
    const startTime = Date.now();
    let apiCallCount = 0;

    try {
      const validatedArgs = Validator.validate(inputSchema, args) as InputArgs;
      
      // Resolve channel ID if needed
      const channelId = await slackClient.resolveChannelId(validatedArgs.channel);
      apiCallCount++;

      // Get channel info for name
      let channelName: string | undefined;
      try {
        const channelInfo = await (slackClient as any).client.conversations.info({
          channel: channelId,
        });
        apiCallCount++;
        
        if (channelInfo.ok && channelInfo.channel) {
          channelName = channelInfo.channel.name;
        }
      } catch (error: any) {
        logger.warn('Could not fetch channel info', { error: error.message });
      }

      // Get pins list
      const pinsResponse = await (slackClient as any).client.pins.list({
        channel: channelId,
      });
      apiCallCount++;

      if (!pinsResponse.ok) {
        throw new Error(`Failed to get pins: ${pinsResponse.error}`);
      }

      const pins = pinsResponse.items || [];
      const processedPins: PinItem[] = [];

      // Process each pin
      for (const pin of pins) {
        if (!pin.message) continue;

        const message = pin.message;
        const messageTimestamp = parseFloat(message.ts);
        const currentTime = Date.now() / 1000;
        const pinAgeHours = (currentTime - messageTimestamp) / 3600;

        // Calculate importance score
        const importanceScore = calculateImportanceScore(message, pinAgeHours);

        // Analyze engagement metrics
        const engagementMetrics = {
          reaction_count: message.reactions 
            ? message.reactions.reduce((sum: number, r: any) => sum + r.count, 0)
            : 0,
          reply_count: message.reply_count || 0,
          has_files: !!(message.files && message.files.length > 0),
          has_links: !!(message.text && message.text.includes('http')),
        };

        const pinItem: PinItem = {
          message: {
            ts: message.ts,
            text: message.text || '',
            user: message.user || 'unknown',
            username: message.username,
            type: message.type || 'message',
            permalink: message.permalink,
          },
          pin_info: {
            pinned_by: pin.created_by,
            pinned_at: pin.created ? new Date(pin.created * 1000).toISOString() : undefined,
            pin_age_hours: Math.round(pinAgeHours * 100) / 100,
            importance_score: importanceScore,
            engagement_metrics: engagementMetrics,
          },
        };

        // Add content analysis if requested
        if (validatedArgs.include_content_analysis) {
          pinItem.content_analysis = analyzeContent(message);
        }

        processedPins.push(pinItem);
      }

      // Sort pins
      sortPins(processedPins, validatedArgs.sort_by, validatedArgs.sort_direction);

      // Build result
      const result: PinsListResult = {
        success: true,
        channel: channelId,
        channel_name: channelName,
        total_pins: processedPins.length,
        pins: processedPins,
        metadata: {
          execution_time_ms: Date.now() - startTime,
          api_calls_made: apiCallCount,
          analysis_timestamp: new Date().toISOString(),
          sort_applied: `${validatedArgs.sort_by}_${validatedArgs.sort_direction}`,
        },
      };

      // Add analytics if requested
      if (validatedArgs.include_analytics) {
        result.analytics = generatePinAnalytics(processedPins);
      }

      // Add recommendations if requested
      if (validatedArgs.generate_recommendations) {
        result.recommendations = generatePinRecommendations(
          processedPins,
          result.analytics
        );
      }

      logger.logToolExecution('slack_pins_list', validatedArgs, Date.now() - startTime);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_pins_list', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_pins_list',
        args,
        execution_time_ms: duration,
        api_calls_made: apiCallCount,
      }) as PinsListResult;
    }
  },
};

function calculateImportanceScore(message: any, ageHours: number): number {
  let score = 0;

  // Age factor (newer pins might be more relevant)
  if (ageHours < 24) score += 30;
  else if (ageHours < 168) score += 20; // 1 week
  else if (ageHours < 720) score += 10; // 1 month

  // Content length factor
  const contentLength = (message.text || '').length;
  if (contentLength > 200) score += 25;
  else if (contentLength > 100) score += 15;
  else if (contentLength > 50) score += 10;

  // Reactions factor
  const reactionCount = message.reactions 
    ? message.reactions.reduce((sum: number, r: any) => sum + r.count, 0)
    : 0;
  score += Math.min(reactionCount * 3, 20);

  // Thread activity factor
  if (message.reply_count && message.reply_count > 0) {
    score += Math.min(message.reply_count * 2, 15);
  }

  // File attachments factor
  if (message.files && message.files.length > 0) {
    score += 10;
  }

  // Links factor
  if (message.text && message.text.includes('http')) {
    score += 5;
  }

  return Math.min(score, 100);
}

function analyzeContent(message: any) {
  const text = message.text || '';
  const contentLength = text.length;

  // Determine content type
  let contentType = 'text';
  if (message.files && message.files.length > 0) {
    contentType = 'file_attachment';
  } else if (text.includes('http')) {
    contentType = 'link_sharing';
  } else if (text.includes('@') && text.includes('<@')) {
    contentType = 'announcement';
  } else if (text.includes('?')) {
    contentType = 'question';
  }

  // Calculate readability score (simplified)
  const sentences = text.split(/[.!?]+/).length;
  const words = text.split(/\s+/).length;
  const avgWordsPerSentence = sentences > 0 ? words / sentences : words;
  let readabilityScore = 100;
  
  if (avgWordsPerSentence > 20) readabilityScore -= 20;
  else if (avgWordsPerSentence > 15) readabilityScore -= 10;
  
  if (contentLength > 500) readabilityScore -= 15;
  else if (contentLength > 300) readabilityScore -= 10;

  // Extract key topics (simplified keyword extraction)
  const keyTopics = extractKeyTopics(text);

  // Determine urgency level
  const urgentWords = ['urgent', 'asap', 'immediately', 'critical', 'emergency', 'deadline'];
  const urgencyLevel = urgentWords.some(word => 
    text.toLowerCase().includes(word)
  ) ? 'high' : 'normal';

  return {
    content_type: contentType,
    content_length: contentLength,
    readability_score: Math.max(readabilityScore, 0),
    key_topics: keyTopics,
    urgency_level: urgencyLevel,
  };
}

function extractKeyTopics(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);

  const commonWords = ['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'other'];
  const filteredWords = words.filter(word => !commonWords.includes(word));

  // Count word frequency
  const wordCount: Record<string, number> = {};
  filteredWords.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // Return top 5 most frequent words
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
}

function sortPins(pins: PinItem[], sortBy: string, direction: string) {
  pins.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison = parseFloat(a.message.ts) - parseFloat(b.message.ts);
        break;
      case 'importance':
        comparison = a.pin_info.importance_score - b.pin_info.importance_score;
        break;
      case 'engagement':
        const aEngagement = a.pin_info.engagement_metrics.reaction_count + a.pin_info.engagement_metrics.reply_count;
        const bEngagement = b.pin_info.engagement_metrics.reaction_count + b.pin_info.engagement_metrics.reply_count;
        comparison = aEngagement - bEngagement;
        break;
    }

    return direction === 'desc' ? -comparison : comparison;
  });
}

function generatePinAnalytics(pins: PinItem[]) {
  if (pins.length === 0) {
    return {
      pin_distribution: { by_user: {}, by_content_type: {}, by_age_range: {} },
      usage_patterns: {
        average_pin_age_days: 0,
        pin_density: 'none',
        content_freshness: 'none',
        organizational_health: 'poor',
      },
      engagement_analysis: {
        total_engagement: 0,
        average_engagement_per_pin: 0,
        most_engaged_pin: 'none',
        engagement_distribution: 'none',
      },
      content_insights: {
        dominant_content_types: [],
        average_content_length: 0,
        readability_assessment: 'none',
        information_density: 'none',
      },
    };
  }

  // Pin distribution analysis
  const byUser: Record<string, number> = {};
  const byContentType: Record<string, number> = {};
  const byAgeRange: Record<string, number> = {};

  pins.forEach(pin => {
    // By user
    const user = pin.message.username || pin.message.user;
    byUser[user] = (byUser[user] || 0) + 1;

    // By content type
    const contentType = pin.content_analysis?.content_type || 'unknown';
    byContentType[contentType] = (byContentType[contentType] || 0) + 1;

    // By age range
    const ageHours = pin.pin_info.pin_age_hours;
    let ageRange = 'very_old';
    if (ageHours < 24) ageRange = 'recent';
    else if (ageHours < 168) ageRange = 'this_week';
    else if (ageHours < 720) ageRange = 'this_month';
    else if (ageHours < 8760) ageRange = 'this_year';

    byAgeRange[ageRange] = (byAgeRange[ageRange] || 0) + 1;
  });

  // Usage patterns
  const totalAgeHours = pins.reduce((sum, pin) => sum + pin.pin_info.pin_age_hours, 0);
  const averagePinAgeDays = (totalAgeHours / pins.length) / 24;

  let pinDensity = 'low';
  if (pins.length > 15) pinDensity = 'very_high';
  else if (pins.length > 10) pinDensity = 'high';
  else if (pins.length > 5) pinDensity = 'medium';

  const recentPins = pins.filter(pin => pin.pin_info.pin_age_hours < 168).length;
  const freshnessRatio = recentPins / pins.length;
  let contentFreshness = 'stale';
  if (freshnessRatio > 0.5) contentFreshness = 'fresh';
  else if (freshnessRatio > 0.3) contentFreshness = 'moderate';

  let organizationalHealth = 'poor';
  if (pinDensity !== 'very_high' && contentFreshness !== 'stale') organizationalHealth = 'excellent';
  else if (pinDensity === 'medium' || contentFreshness === 'moderate') organizationalHealth = 'good';
  else if (pinDensity === 'high' || contentFreshness === 'fresh') organizationalHealth = 'fair';

  // Engagement analysis
  const totalEngagement = pins.reduce((sum, pin) => 
    sum + pin.pin_info.engagement_metrics.reaction_count + pin.pin_info.engagement_metrics.reply_count, 0
  );
  const averageEngagement = totalEngagement / pins.length;

  const mostEngagedPin = pins.reduce((max, pin) => {
    const engagement = pin.pin_info.engagement_metrics.reaction_count + pin.pin_info.engagement_metrics.reply_count;
    const maxEngagement = max.pin_info.engagement_metrics.reaction_count + max.pin_info.engagement_metrics.reply_count;
    return engagement > maxEngagement ? pin : max;
  });

  let engagementDistribution = 'low';
  if (averageEngagement > 10) engagementDistribution = 'high';
  else if (averageEngagement > 5) engagementDistribution = 'medium';

  // Content insights
  const dominantContentTypes = Object.entries(byContentType)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([type]) => type);

  const totalContentLength = pins.reduce((sum, pin) => 
    sum + (pin.content_analysis?.content_length || 0), 0
  );
  const averageContentLength = totalContentLength / pins.length;

  const readabilityScores = pins
    .filter(pin => pin.content_analysis?.readability_score)
    .map(pin => pin.content_analysis!.readability_score);
  const averageReadability = readabilityScores.length > 0 
    ? readabilityScores.reduce((sum, score) => sum + score, 0) / readabilityScores.length
    : 0;

  let readabilityAssessment = 'poor';
  if (averageReadability > 80) readabilityAssessment = 'excellent';
  else if (averageReadability > 60) readabilityAssessment = 'good';
  else if (averageReadability > 40) readabilityAssessment = 'fair';

  let informationDensity = 'low';
  if (averageContentLength > 300) informationDensity = 'high';
  else if (averageContentLength > 150) informationDensity = 'medium';

  return {
    pin_distribution: {
      by_user: byUser,
      by_content_type: byContentType,
      by_age_range: byAgeRange,
    },
    usage_patterns: {
      average_pin_age_days: Math.round(averagePinAgeDays * 100) / 100,
      pin_density: pinDensity,
      content_freshness: contentFreshness,
      organizational_health: organizationalHealth,
    },
    engagement_analysis: {
      total_engagement: totalEngagement,
      average_engagement_per_pin: Math.round(averageEngagement * 100) / 100,
      most_engaged_pin: mostEngagedPin.message.ts,
      engagement_distribution: engagementDistribution,
    },
    content_insights: {
      dominant_content_types: dominantContentTypes,
      average_content_length: Math.round(averageContentLength),
      readability_assessment: readabilityAssessment,
      information_density: informationDensity,
    },
  };
}

function generatePinRecommendations(pins: PinItem[], analytics: any) {
  const recommendations = {
    pin_management: [] as string[],
    content_optimization: [] as string[],
    organizational_improvements: [] as string[],
    workflow_enhancements: [] as string[],
  };

  if (!analytics) return recommendations;

  // Pin management recommendations
  if (analytics.usage_patterns.pin_density === 'very_high') {
    recommendations.pin_management.push('Consider removing outdated pins to improve information clarity');
    recommendations.pin_management.push('Review pins older than 3 months for relevance');
  } else if (analytics.usage_patterns.pin_density === 'low') {
    recommendations.pin_management.push('Consider pinning more essential information for easy access');
  }

  if (analytics.usage_patterns.content_freshness === 'stale') {
    recommendations.pin_management.push('Update or replace stale pinned content with current information');
    recommendations.pin_management.push('Establish a regular pin review schedule');
  }

  // Content optimization recommendations
  if (analytics.content_insights.readability_assessment === 'poor') {
    recommendations.content_optimization.push('Improve pin readability with shorter sentences and clearer language');
    recommendations.content_optimization.push('Consider using bullet points and formatting for better clarity');
  }

  if (analytics.content_insights.information_density === 'low') {
    recommendations.content_optimization.push('Add more detailed information to pins for better context');
  } else if (analytics.content_insights.information_density === 'high') {
    recommendations.content_optimization.push('Consider breaking long pins into smaller, focused messages');
  }

  // Organizational improvements
  if (analytics.usage_patterns.organizational_health === 'poor') {
    recommendations.organizational_improvements.push('Implement a pin governance strategy');
    recommendations.organizational_improvements.push('Assign pin management responsibilities to team members');
  }

  if (analytics.engagement_analysis.engagement_distribution === 'low') {
    recommendations.organizational_improvements.push('Encourage team interaction with pinned content');
    recommendations.organizational_improvements.push('Consider pinning more engaging or interactive content');
  }

  // Workflow enhancements
  recommendations.workflow_enhancements.push('Use channel bookmarks for frequently accessed resources');
  recommendations.workflow_enhancements.push('Consider creating pin categories or themes for better organization');
  
  if (pins.length > 10) {
    recommendations.workflow_enhancements.push('Create a pin index or summary for easier navigation');
  }

  return recommendations;
}
