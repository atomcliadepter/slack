import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  timestamp: z.string().min(1, 'Message timestamp is required'),
  notify_channel: z.boolean().default(false),
  analyze_content: z.boolean().default(true),
  check_pin_limit: z.boolean().default(true),
  add_context: z.boolean().default(true),
  custom_notification_message: z.string().optional(),
});

interface MessageContent {
  text: string;
  user: string;
  timestamp: string;
  type: string;
  has_attachments: boolean;
  has_blocks: boolean;
  has_files: boolean;
  thread_ts?: string;
  reply_count?: number;
}

interface ContentAnalysis {
  message_type: 'announcement' | 'decision' | 'resource' | 'discussion' | 'other';
  importance_score: number;
  content_categories: string[];
  key_topics: string[];
  estimated_relevance_duration: string;
  pin_worthiness: {
    score: number;
    reasons: string[];
    concerns: string[];
  };
}

interface PinContext {
  current_pins_count: number;
  pin_limit: number;
  pins_remaining: number;
  oldest_pin?: {
    timestamp: string;
    age_days: number;
    user: string;
  };
  pin_patterns: {
    most_active_pinner: string;
    average_pin_age_days: number;
    common_pin_types: string[];
  };
}

interface PinResult {
  success: boolean;
  pinned_message: {
    channel: string;
    timestamp: string;
    user: string;
    pinned_by: string;
    pin_timestamp: string;
  };
  message_content: MessageContent;
  content_analysis: ContentAnalysis;
  pin_context: PinContext;
  notifications_sent: Array<{
    type: 'channel' | 'user';
    target: string;
    success: boolean;
    message?: string;
  }>;
  recommendations: string[];
  performance: {
    analysis_time_ms: number;
    pin_time_ms: number;
    notification_time_ms: number;
    total_time_ms: number;
  };
}

function analyzeMessageContent(message: any): ContentAnalysis {
  const text = message.text || '';
  const hasAttachments = !!(message.attachments && message.attachments.length > 0);
  const hasFiles = !!(message.files && message.files.length > 0);
  const hasBlocks = !!(message.blocks && message.blocks.length > 0);
  
  // Determine message type based on content patterns
  let messageType: ContentAnalysis['message_type'] = 'other';
  let importanceScore = 50; // Base score
  const contentCategories: string[] = [];
  const keyTopics: string[] = [];
  const pinReasons: string[] = [];
  const pinConcerns: string[] = [];
  
  // Analyze text content for patterns
  const lowerText = text.toLowerCase();
  
  // Announcement patterns
  if (lowerText.includes('announcement') || lowerText.includes('important') || 
      lowerText.includes('notice') || lowerText.includes('attention')) {
    messageType = 'announcement';
    importanceScore += 20;
    contentCategories.push('announcement');
    pinReasons.push('Contains announcement keywords');
  }
  
  // Decision patterns
  if (lowerText.includes('decision') || lowerText.includes('approved') || 
      lowerText.includes('resolved') || lowerText.includes('final')) {
    messageType = 'decision';
    importanceScore += 25;
    contentCategories.push('decision');
    pinReasons.push('Contains decision-related content');
  }
  
  // Resource patterns
  if (lowerText.includes('documentation') || lowerText.includes('guide') || 
      lowerText.includes('tutorial') || lowerText.includes('reference') ||
      hasFiles || hasAttachments) {
    messageType = 'resource';
    importanceScore += 15;
    contentCategories.push('resource');
    pinReasons.push('Contains reference material or files');
  }
  
  // Discussion patterns
  if (message.reply_count && message.reply_count > 5) {
    messageType = 'discussion';
    importanceScore += 10;
    contentCategories.push('active_discussion');
    pinReasons.push('High engagement thread');
  }
  
  // Extract key topics (simple keyword extraction)
  const topicKeywords = [
    'project', 'deadline', 'meeting', 'release', 'bug', 'feature',
    'security', 'performance', 'deployment', 'maintenance', 'update',
    'policy', 'procedure', 'training', 'onboarding', 'documentation'
  ];
  
  topicKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      keyTopics.push(keyword);
    }
  });
  
  // Adjust importance based on message characteristics
  if (hasFiles) {
    importanceScore += 10;
    pinReasons.push('Contains file attachments');
  }
  
  if (hasBlocks) {
    importanceScore += 5;
    pinReasons.push('Rich formatted content');
  }
  
  if (text.length < 50) {
    importanceScore -= 10;
    pinConcerns.push('Very short message content');
  }
  
  if (text.length > 1000) {
    importanceScore += 5;
    pinReasons.push('Comprehensive detailed content');
  }
  
  // Determine estimated relevance duration
  let relevanceDuration = '1-2 weeks';
  if (messageType === 'announcement') relevanceDuration = '2-4 weeks';
  if (messageType === 'decision') relevanceDuration = '1-3 months';
  if (messageType === 'resource') relevanceDuration = '3-6 months';
  if (messageType === 'discussion') relevanceDuration = '1-2 weeks';
  
  // Calculate pin worthiness score (0-100)
  const pinScore = Math.min(100, Math.max(0, importanceScore));
  
  return {
    message_type: messageType,
    importance_score: importanceScore,
    content_categories: contentCategories,
    key_topics: keyTopics,
    estimated_relevance_duration: relevanceDuration,
    pin_worthiness: {
      score: pinScore,
      reasons: pinReasons,
      concerns: pinConcerns,
    },
  };
}

async function analyzePinContext(client: any, channelId: string): Promise<PinContext> {
  try {
    const pinsResponse = await client.pins.list({ channel: channelId });
    
    if (!pinsResponse.ok) {
      throw new Error(`Failed to get pins: ${pinsResponse.error}`);
    }
    
    const pins = pinsResponse.items || [];
    const currentCount = pins.length;
    const pinLimit = 100; // Slack's default pin limit per channel
    
    let oldestPin;
    let totalAge = 0;
    const pinners: Record<string, number> = {};
    const pinTypes: Record<string, number> = {};
    
    if (pins.length > 0) {
      // Find oldest pin and calculate statistics
      let oldestTimestamp = Date.now() / 1000;
      
      pins.forEach((pin: any) => {
        const message = pin.message;
        if (message) {
          const timestamp = parseFloat(message.ts);
          totalAge += (Date.now() / 1000 - timestamp);
          
          if (timestamp < oldestTimestamp) {
            oldestTimestamp = timestamp;
            oldestPin = {
              timestamp: message.ts,
              age_days: Math.floor((Date.now() / 1000 - timestamp) / 86400),
              user: message.user || 'unknown',
            };
          }
          
          // Count pinners
          const pinner = pin.created_by || 'unknown';
          pinners[pinner] = (pinners[pinner] || 0) + 1;
          
          // Categorize pin types
          if (message.files && message.files.length > 0) {
            pinTypes['file'] = (pinTypes['file'] || 0) + 1;
          } else if (message.attachments && message.attachments.length > 0) {
            pinTypes['attachment'] = (pinTypes['attachment'] || 0) + 1;
          } else {
            pinTypes['message'] = (pinTypes['message'] || 0) + 1;
          }
        }
      });
    }
    
    const mostActivePinner = Object.entries(pinners)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';
    
    const averageAge = pins.length > 0 ? totalAge / pins.length / 86400 : 0;
    
    const commonPinTypes = Object.entries(pinTypes)
      .sort(([, a], [, b]) => b - a)
      .map(([type]) => type);
    
    return {
      current_pins_count: currentCount,
      pin_limit: pinLimit,
      pins_remaining: pinLimit - currentCount,
      oldest_pin: oldestPin,
      pin_patterns: {
        most_active_pinner: mostActivePinner,
        average_pin_age_days: Math.round(averageAge * 10) / 10,
        common_pin_types: commonPinTypes,
      },
    };
  } catch (error) {
    logger.warn('Failed to analyze pin context', { channel: channelId, error });
    return {
      current_pins_count: 0,
      pin_limit: 100,
      pins_remaining: 100,
      pin_patterns: {
        most_active_pinner: 'unknown',
        average_pin_age_days: 0,
        common_pin_types: [],
      },
    };
  }
}

function generateRecommendations(
  contentAnalysis: ContentAnalysis,
  pinContext: PinContext,
  messageContent: MessageContent
): string[] {
  const recommendations: string[] = [];
  
  // Pin worthiness recommendations
  if (contentAnalysis.pin_worthiness.score < 30) {
    recommendations.push('Low pin worthiness score - consider if this message needs to be pinned');
  } else if (contentAnalysis.pin_worthiness.score > 80) {
    recommendations.push('High pin worthiness score - excellent candidate for pinning');
  }
  
  // Pin limit recommendations
  if (pinContext.pins_remaining < 5) {
    recommendations.push('Channel approaching pin limit - consider unpinning older messages');
  }
  
  if (pinContext.pins_remaining === 0) {
    recommendations.push('Channel at pin limit - must unpin a message before adding new pin');
  }
  
  // Content-specific recommendations
  if (contentAnalysis.message_type === 'discussion' && !messageContent.thread_ts) {
    recommendations.push('Discussion message - consider pinning the thread starter instead');
  }
  
  if (contentAnalysis.message_type === 'resource') {
    recommendations.push('Resource message - consider adding to channel bookmarks as well');
  }
  
  if (contentAnalysis.message_type === 'announcement') {
    recommendations.push('Announcement - consider setting an unpin reminder based on relevance duration');
  }
  
  // Age-based recommendations
  if (pinContext.oldest_pin && pinContext.oldest_pin.age_days > 90) {
    recommendations.push('Oldest pin is over 90 days old - review if still relevant');
  }
  
  // Content concerns
  contentAnalysis.pin_worthiness.concerns.forEach(concern => {
    recommendations.push(`Content concern: ${concern}`);
  });
  
  return recommendations;
}

export const slackPinsAddTool: MCPTool = {
  name: 'slack_pins_add',
  description: 'Pin messages to Slack channels with content analysis, context awareness, and smart recommendations',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel name or ID where the message is located',
      },
      timestamp: {
        type: 'string',
        description: 'Timestamp of the message to pin',
      },
      notify_channel: {
        type: 'boolean',
        description: 'Whether to notify the channel about the pin (default: false)',
        default: false,
      },
      analyze_content: {
        type: 'boolean',
        description: 'Whether to analyze message content for pin worthiness (default: true)',
        default: true,
      },
      check_pin_limit: {
        type: 'boolean',
        description: 'Whether to check current pin count and limits (default: true)',
        default: true,
      },
      add_context: {
        type: 'boolean',
        description: 'Whether to add context about why the message was pinned (default: true)',
        default: true,
      },
      custom_notification_message: {
        type: 'string',
        description: 'Custom message to post when notifying about the pin (optional)',
      },
    },
    required: ['channel', 'timestamp'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args);
      const client = slackClient.getClient();
      
      // Resolve channel ID
      const channelId = await slackClient.resolveChannelId(validatedArgs.channel);
      
      // Get message content for analysis
      const analysisStartTime = Date.now();
      let messageContent: MessageContent;
      let contentAnalysis: ContentAnalysis;
      
      try {
        const historyResponse = await client.conversations.history({
          channel: channelId,
          latest: validatedArgs.timestamp,
          limit: 1,
          inclusive: true,
        });
        
        if (!historyResponse.ok || !historyResponse.messages || historyResponse.messages.length === 0) {
          throw new Error('Message not found');
        }
        
        const message = historyResponse.messages[0];
        
        messageContent = {
          text: message.text || '',
          user: message.user || 'unknown',
          timestamp: message.ts || '',
          type: message.type || 'message',
          has_attachments: !!(message.attachments && message.attachments.length > 0),
          has_blocks: !!(message.blocks && message.blocks.length > 0),
          has_files: !!(message.files && message.files.length > 0),
          thread_ts: message.thread_ts,
          reply_count: message.reply_count,
        };
        
        if (validatedArgs.analyze_content) {
          contentAnalysis = analyzeMessageContent(message);
        } else {
          contentAnalysis = {
            message_type: 'other',
            importance_score: 50,
            content_categories: [],
            key_topics: [],
            estimated_relevance_duration: '1-2 weeks',
            pin_worthiness: {
              score: 50,
              reasons: ['Analysis skipped'],
              concerns: [],
            },
          };
        }
      } catch (error) {
        throw new Error(`Failed to retrieve message: ${error}`);
      }
      
      // Analyze pin context
      let pinContext: PinContext;
      if (validatedArgs.check_pin_limit) {
        pinContext = await analyzePinContext(client, channelId);
        
        // Check if we can add more pins
        if (pinContext.pins_remaining <= 0) {
          throw new Error('Channel has reached the maximum number of pins (100). Please unpin a message first.');
        }
      } else {
        pinContext = {
          current_pins_count: 0,
          pin_limit: 100,
          pins_remaining: 100,
          pin_patterns: {
            most_active_pinner: 'unknown',
            average_pin_age_days: 0,
            common_pin_types: [],
          },
        };
      }
      
      const analysisTime = Date.now() - analysisStartTime;
      
      // Pin the message
      const pinStartTime = Date.now();
      const response = await client.pins.add({
        channel: channelId,
        timestamp: validatedArgs.timestamp,
      });
      const pinTime = Date.now() - pinStartTime;
      
      if (!response.ok) {
        throw new Error(`Failed to pin message: ${response.error || 'Unknown error'}`);
      }
      
      // Get current user for tracking
      const authResponse = await client.auth.test();
      const currentUser = authResponse.user_id || 'unknown';
      
      // Send notifications if requested
      const notificationStartTime = Date.now();
      const notificationsSent: Array<{
        type: 'channel' | 'user';
        target: string;
        success: boolean;
        message?: string;
      }> = [];
      
      if (validatedArgs.notify_channel) {
        try {
          let notificationText = validatedArgs.custom_notification_message;
          
          if (!notificationText && validatedArgs.add_context) {
            const reasons = contentAnalysis.pin_worthiness.reasons.slice(0, 2).join(', ');
            notificationText = `📌 Message pinned${reasons ? ` (${reasons})` : ''} - ${contentAnalysis.estimated_relevance_duration} estimated relevance`;
          } else if (!notificationText) {
            notificationText = '📌 Message has been pinned to this channel';
          }
          
          await client.chat.postMessage({
            channel: channelId,
            text: notificationText,
            thread_ts: validatedArgs.timestamp, // Reply in thread to keep channel clean
          });
          
          notificationsSent.push({
            type: 'channel',
            target: channelId,
            success: true,
            message: notificationText,
          });
        } catch (notifyError) {
          logger.warn('Failed to send channel notification', {
            channel: channelId,
            error: notifyError,
          });
          
          notificationsSent.push({
            type: 'channel',
            target: channelId,
            success: false,
          });
        }
      }
      
      const notificationTime = Date.now() - notificationStartTime;
      
      // Generate recommendations
      const recommendations = generateRecommendations(contentAnalysis, pinContext, messageContent);
      
      const result: PinResult = {
        success: true,
        pinned_message: {
          channel: channelId,
          timestamp: validatedArgs.timestamp,
          user: messageContent.user,
          pinned_by: currentUser,
          pin_timestamp: new Date().toISOString(),
        },
        message_content: messageContent,
        content_analysis: contentAnalysis,
        pin_context: pinContext,
        notifications_sent: notificationsSent,
        recommendations,
        performance: {
          analysis_time_ms: analysisTime,
          pin_time_ms: pinTime,
          notification_time_ms: notificationTime,
          total_time_ms: Date.now() - startTime,
        },
      };
      
      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_pins_add', args, duration);

      return {
        success: true,
        data: result,
        metadata: {
          execution_time_ms: duration,
          content_analyzed: validatedArgs.analyze_content,
          pin_worthiness_score: contentAnalysis.pin_worthiness.score,
          pins_remaining: pinContext.pins_remaining,
          notifications_sent: notificationsSent.length,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_pins_add', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_pins_add',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
