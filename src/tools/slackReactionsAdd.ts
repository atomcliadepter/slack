import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  timestamp: z.string().min(1, 'Message timestamp is required'),
  name: z.string().min(1, 'Emoji name is required'),
  validate_emoji: z.boolean().default(true),
  check_existing: z.boolean().default(true),
  analyze_reactions: z.boolean().default(true),
});

interface EmojiValidation {
  is_valid: boolean;
  is_custom: boolean;
  is_standard: boolean;
  emoji_info: {
    name: string;
    unicode?: string;
    url?: string;
    category?: string;
  };
  validation_errors: string[];
}

interface ReactionAnalysis {
  total_reactions: number;
  unique_users: number;
  reaction_diversity: number;
  most_popular_reactions: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  user_engagement: {
    high_engagement_users: string[];
    reaction_patterns: string[];
  };
  sentiment_analysis: {
    positive_reactions: number;
    negative_reactions: number;
    neutral_reactions: number;
    overall_sentiment: 'positive' | 'negative' | 'neutral';
  };
}

interface ReactionResult {
  success: boolean;
  reaction_added: {
    emoji: string;
    channel: string;
    timestamp: string;
    user: string;
  };
  emoji_validation: EmojiValidation;
  existing_reactions?: Array<{
    name: string;
    count: number;
    users: string[];
  }>;
  reaction_analysis?: ReactionAnalysis;
  recommendations: string[];
  performance: {
    validation_time_ms: number;
    reaction_time_ms: number;
    total_time_ms: number;
  };
}

// Standard Unicode emoji list (subset for validation)
const STANDARD_EMOJIS = new Set([
  '+1', 'thumbsup', '-1', 'thumbsdown', 'heart', 'fire', 'clap', 'eyes',
  'raised_hands', 'pray', 'muscle', 'ok_hand', 'point_right', 'point_left',
  'point_up', 'point_down', 'wave', 'smile', 'laughing', 'joy', 'sob',
  'angry', 'confused', 'thinking_face', 'facepalm', 'shrug', 'tada',
  'rocket', 'star', 'warning', 'x', 'white_check_mark', 'heavy_check_mark',
  'question', 'exclamation', 'bulb', 'gear', 'wrench', 'hammer', 'nut_and_bolt',
  'computer', 'phone', 'email', 'calendar', 'clock', 'hourglass', 'alarm_clock',
  'coffee', 'pizza', 'beer', 'wine_glass', 'cake', 'apple', 'banana',
  'car', 'airplane', 'ship', 'train', 'bus', 'bike', 'walking', 'running',
  'house', 'office', 'school', 'hospital', 'bank', 'hotel', 'church',
  'sunny', 'cloud', 'rain', 'snow', 'thunder', 'rainbow', 'umbrella',
]);

function validateEmoji(emojiName: string): EmojiValidation {
  const cleanName = emojiName.replace(/:/g, '').toLowerCase();
  const isStandard = STANDARD_EMOJIS.has(cleanName);
  const validationErrors: string[] = [];
  
  // Basic validation
  if (cleanName.length === 0) {
    validationErrors.push('Emoji name cannot be empty');
  }
  
  if (cleanName.length > 100) {
    validationErrors.push('Emoji name too long (max 100 characters)');
  }
  
  if (!/^[a-z0-9_+-]+$/.test(cleanName)) {
    validationErrors.push('Emoji name contains invalid characters (only lowercase letters, numbers, _, +, - allowed)');
  }
  
  return {
    is_valid: validationErrors.length === 0,
    is_custom: !isStandard && validationErrors.length === 0,
    is_standard: isStandard,
    emoji_info: {
      name: cleanName,
      category: isStandard ? 'standard' : 'custom',
    },
    validation_errors: validationErrors,
  };
}

function analyzeReactions(reactions: any[]): ReactionAnalysis {
  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
  const uniqueUsers = new Set();
  const reactionCounts: Record<string, number> = {};
  
  // Count reactions and users
  reactions.forEach(reaction => {
    reactionCounts[reaction.name] = reaction.count;
    reaction.users?.forEach((user: string) => uniqueUsers.add(user));
  });
  
  // Calculate most popular reactions
  const mostPopular = Object.entries(reactionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalReactions) * 100),
    }));
  
  // Sentiment analysis based on emoji types
  const positiveEmojis = new Set(['thumbsup', '+1', 'heart', 'fire', 'clap', 'tada', 'star', 'smile', 'laughing', 'joy']);
  const negativeEmojis = new Set(['thumbsdown', '-1', 'angry', 'sob', 'confused', 'facepalm', 'x']);
  
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  
  reactions.forEach(reaction => {
    if (positiveEmojis.has(reaction.name)) {
      positiveCount += reaction.count;
    } else if (negativeEmojis.has(reaction.name)) {
      negativeCount += reaction.count;
    } else {
      neutralCount += reaction.count;
    }
  });
  
  const overallSentiment = positiveCount > negativeCount ? 'positive' : 
                          negativeCount > positiveCount ? 'negative' : 'neutral';
  
  return {
    total_reactions: totalReactions,
    unique_users: uniqueUsers.size,
    reaction_diversity: reactions.length,
    most_popular_reactions: mostPopular,
    user_engagement: {
      high_engagement_users: [], // Would need additional API calls to determine
      reaction_patterns: [`${reactions.length} different reaction types used`],
    },
    sentiment_analysis: {
      positive_reactions: positiveCount,
      negative_reactions: negativeCount,
      neutral_reactions: neutralCount,
      overall_sentiment: overallSentiment,
    },
  };
}

function generateRecommendations(
  emojiValidation: EmojiValidation,
  existingReactions: any[],
  reactionAnalysis?: ReactionAnalysis
): string[] {
  const recommendations: string[] = [];
  
  if (!emojiValidation.is_valid) {
    recommendations.push('Fix emoji validation errors before adding reaction');
    return recommendations;
  }
  
  if (emojiValidation.is_custom) {
    recommendations.push('Custom emoji detected - ensure it exists in your workspace');
  }
  
  if (existingReactions.length > 10) {
    recommendations.push('Message has many reactions - consider if another reaction is necessary');
  }
  
  if (reactionAnalysis) {
    if (reactionAnalysis.sentiment_analysis.overall_sentiment === 'negative') {
      recommendations.push('Message has negative sentiment - consider positive reactions to balance');
    }
    
    if (reactionAnalysis.reaction_diversity > 15) {
      recommendations.push('High reaction diversity - message is generating varied responses');
    }
    
    if (reactionAnalysis.unique_users < 3) {
      recommendations.push('Low user engagement - consider sharing message more widely');
    }
  }
  
  // Suggest popular alternatives for common typos
  const commonTypos: Record<string, string> = {
    'thumbup': 'thumbsup',
    'thumbdown': 'thumbsdown',
    'check': 'white_check_mark',
    'cross': 'x',
    'fire_emoji': 'fire',
    'clapping': 'clap',
  };
  
  const cleanName = emojiValidation.emoji_info.name;
  if (commonTypos[cleanName]) {
    recommendations.push(`Did you mean '${commonTypos[cleanName]}' instead of '${cleanName}'?`);
  }
  
  return recommendations;
}

export const slackReactionsAddTool: MCPTool = {
  name: 'slack_reactions_add',
  description: 'Add emoji reactions to Slack messages with validation, analytics, and engagement insights',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel name or ID where the message is located',
      },
      timestamp: {
        type: 'string',
        description: 'Timestamp of the message to add reaction to',
      },
      name: {
        type: 'string',
        description: 'Name of emoji to add (without colons, e.g., "thumbsup")',
      },
      validate_emoji: {
        type: 'boolean',
        description: 'Whether to validate emoji before adding (default: true)',
        default: true,
      },
      check_existing: {
        type: 'boolean',
        description: 'Whether to check existing reactions on the message (default: true)',
        default: true,
      },
      analyze_reactions: {
        type: 'boolean',
        description: 'Whether to analyze all reactions on the message (default: true)',
        default: true,
      },
    },
    required: ['channel', 'timestamp', 'name'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args);
      const client = slackClient.getClient();
      
      // Resolve channel ID
      const channelId = await slackClient.resolveChannelId(validatedArgs.channel);
      
      // Validate emoji if requested
      const validationStartTime = Date.now();
      let emojiValidation: EmojiValidation | null = null;
      
      if (validatedArgs.validate_emoji) {
        emojiValidation = validateEmoji(validatedArgs.name);
        
        if (!emojiValidation.is_valid) {
          throw new Error(`Invalid emoji: ${emojiValidation.validation_errors.join(', ')}`);
        }
      }
      
      const validationTime = Date.now() - validationStartTime;
      
      // Check existing reactions if requested
      let existingReactions: any[] = [];
      let reactionAnalysis: ReactionAnalysis | undefined;
      
      if (validatedArgs.check_existing || validatedArgs.analyze_reactions) {
        try {
          const reactionsResponse = await client.reactions.get({
            channel: channelId,
            timestamp: validatedArgs.timestamp,
          });
          
          if (reactionsResponse.ok && reactionsResponse.message?.reactions) {
            existingReactions = reactionsResponse.message.reactions;
            
            if (validatedArgs.analyze_reactions) {
              reactionAnalysis = analyzeReactions(existingReactions);
            }
          }
        } catch (reactionsError) {
          logger.warn('Failed to get existing reactions', {
            channel: channelId,
            timestamp: validatedArgs.timestamp,
            error: reactionsError,
          });
        }
      }
      
      // Add the reaction
      const reactionStartTime = Date.now();
      const response = await client.reactions.add({
        channel: channelId,
        timestamp: validatedArgs.timestamp,
        name: validatedArgs.name,
      });
      const reactionTime = Date.now() - reactionStartTime;
      
      if (!response.ok) {
        throw new Error(`Failed to add reaction: ${response.error || 'Unknown error'}`);
      }
      
      // Get current user info for the result
      const authResponse = await client.auth.test();
      const currentUser = authResponse.user_id || 'unknown';
      
      // Generate recommendations
      const recommendations = generateRecommendations(
        emojiValidation || validateEmoji(validatedArgs.name),
        existingReactions,
        reactionAnalysis
      );
      
      const result: ReactionResult = {
        success: true,
        reaction_added: {
          emoji: validatedArgs.name,
          channel: channelId,
          timestamp: validatedArgs.timestamp,
          user: currentUser,
        },
        emoji_validation: emojiValidation || validateEmoji(validatedArgs.name),
        existing_reactions: existingReactions.length > 0 ? existingReactions : undefined,
        reaction_analysis: reactionAnalysis,
        recommendations,
        performance: {
          validation_time_ms: validationTime,
          reaction_time_ms: reactionTime,
          total_time_ms: Date.now() - startTime,
        },
      };
      
      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_reactions_add', args, duration);

      return {
        success: true,
        data: result,
        metadata: {
          execution_time_ms: duration,
          emoji_validated: validatedArgs.validate_emoji,
          existing_reactions_count: existingReactions.length,
          has_analysis: !!reactionAnalysis,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_reactions_add', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_reactions_add',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
