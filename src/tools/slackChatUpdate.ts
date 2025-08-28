import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  ts: z.string().min(1, 'Message timestamp is required'),
  text: z.string().optional(),
  blocks: z.array(z.any()).optional(),
  attachments: z.array(z.any()).optional(),
  parse: z.enum(['full', 'none']).optional(),
  link_names: z.boolean().optional(),
  as_user: z.boolean().optional(),
  file_ids: z.array(z.string()).optional(),
  reply_broadcast: z.boolean().optional(),
  preserve_formatting: z.boolean().default(true),
  validate_content: z.boolean().default(true),
  track_changes: z.boolean().default(true),
  notify_users: z.array(z.string()).optional(),
  add_edit_indicator: z.boolean().default(true),
});

interface MessageChange {
  field: string;
  old_value: any;
  new_value: any;
  change_type: 'added' | 'modified' | 'removed';
}

interface ContentValidation {
  is_valid: boolean;
  validation_errors: string[];
  content_warnings: string[];
  formatting_issues: string[];
  accessibility_score: number;
  readability_score: number;
}

interface UpdateAnalytics {
  change_summary: {
    total_changes: number;
    significant_changes: number;
    formatting_changes: number;
    content_changes: number;
  };
  impact_assessment: {
    estimated_readers_affected: number;
    notification_impact: 'low' | 'medium' | 'high';
    urgency_level: 'low' | 'medium' | 'high' | 'critical';
    change_significance: 'minor' | 'moderate' | 'major';
  };
  optimization_suggestions: string[];
  best_practices: string[];
}

interface UpdateResult {
  success: boolean;
  updated_message: {
    channel: string;
    ts: string;
    text?: string;
    user: string;
    edited?: {
      user: string;
      ts: string;
    };
  };
  changes_made: MessageChange[];
  content_validation: ContentValidation;
  update_analytics: UpdateAnalytics;
  notifications_sent: Array<{
    user_id: string;
    success: boolean;
    message?: string;
  }>;
  recommendations: string[];
  performance: {
    validation_time_ms: number;
    update_time_ms: number;
    notification_time_ms: number;
    total_time_ms: number;
  };
}

function detectChanges(originalMessage: any, newContent: any): MessageChange[] {
  const changes: MessageChange[] = [];
  
  // Compare text content
  if (originalMessage.text !== newContent.text) {
    changes.push({
      field: 'text',
      old_value: originalMessage.text || '',
      new_value: newContent.text || '',
      change_type: !originalMessage.text ? 'added' : !newContent.text ? 'removed' : 'modified',
    });
  }
  
  // Compare blocks
  if (JSON.stringify(originalMessage.blocks) !== JSON.stringify(newContent.blocks)) {
    changes.push({
      field: 'blocks',
      old_value: originalMessage.blocks || [],
      new_value: newContent.blocks || [],
      change_type: !originalMessage.blocks ? 'added' : !newContent.blocks ? 'removed' : 'modified',
    });
  }
  
  // Compare attachments
  if (JSON.stringify(originalMessage.attachments) !== JSON.stringify(newContent.attachments)) {
    changes.push({
      field: 'attachments',
      old_value: originalMessage.attachments || [],
      new_value: newContent.attachments || [],
      change_type: !originalMessage.attachments ? 'added' : !newContent.attachments ? 'removed' : 'modified',
    });
  }
  
  return changes;
}

function validateContent(content: any): ContentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const formattingIssues: string[] = [];
  
  // Validate text content
  if (content.text) {
    if (content.text.length > 4000) {
      errors.push('Message text exceeds 4000 character limit');
    }
    
    if (content.text.length < 1 && !content.blocks && !content.attachments) {
      errors.push('Message must contain text, blocks, or attachments');
    }
    
    // Check for potential formatting issues
    if (content.text.includes('```') && !content.text.match(/```[\s\S]*?```/)) {
      formattingIssues.push('Incomplete code block formatting detected');
    }
    
    if (content.text.includes('*') && content.text.split('*').length % 2 === 0) {
      formattingIssues.push('Unmatched bold formatting asterisks');
    }
    
    // Content warnings
    if (content.text.toLowerCase().includes('urgent') || content.text.toLowerCase().includes('asap')) {
      warnings.push('Message contains urgency indicators');
    }
    
    if (content.text.includes('@channel') || content.text.includes('@here')) {
      warnings.push('Message contains channel-wide mentions');
    }
  }
  
  // Validate blocks
  if (content.blocks) {
    if (content.blocks.length > 50) {
      errors.push('Too many blocks (maximum 50 allowed)');
    }
    
    content.blocks.forEach((block: any, index: number) => {
      if (!block.type) {
        errors.push(`Block ${index} missing required 'type' field`);
      }
    });
  }
  
  // Calculate scores
  const accessibilityScore = Math.max(0, 100 - (formattingIssues.length * 10) - (errors.length * 20));
  const readabilityScore = content.text ? 
    Math.max(0, 100 - Math.max(0, content.text.length - 500) / 50) : 80;
  
  return {
    is_valid: errors.length === 0,
    validation_errors: errors,
    content_warnings: warnings,
    formatting_issues: formattingIssues,
    accessibility_score: Math.round(accessibilityScore),
    readability_score: Math.round(readabilityScore),
  };
}

function analyzeUpdate(
  changes: MessageChange[],
  originalMessage: any,
  validation: ContentValidation
): UpdateAnalytics {
  const totalChanges = changes.length;
  const significantChanges = changes.filter(c => 
    c.field === 'text' && Math.abs((c.new_value?.length || 0) - (c.old_value?.length || 0)) > 50
  ).length;
  const formattingChanges = changes.filter(c => c.field === 'blocks' || c.field === 'attachments').length;
  const contentChanges = changes.filter(c => c.field === 'text').length;
  
  // Estimate impact
  const estimatedReaders = Math.min(100, Math.max(1, 
    (originalMessage.reply_count || 0) * 2 + 
    (originalMessage.reactions?.reduce((sum: number, r: any) => sum + r.count, 0) || 0) + 5
  ));
  
  let notificationImpact: 'low' | 'medium' | 'high' = 'low';
  if (significantChanges > 0 || validation.content_warnings.length > 0) {
    notificationImpact = 'high';
  } else if (totalChanges > 1) {
    notificationImpact = 'medium';
  }
  
  let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (validation.content_warnings.some(w => w.includes('urgent'))) {
    urgencyLevel = 'critical';
  } else if (significantChanges > 0) {
    urgencyLevel = 'medium';
  }
  
  let changeSignificance: 'minor' | 'moderate' | 'major' = 'minor';
  if (significantChanges > 0 || validation.validation_errors.length > 0) {
    changeSignificance = 'major';
  } else if (totalChanges > 1 || formattingChanges > 0) {
    changeSignificance = 'moderate';
  }
  
  // Generate suggestions
  const suggestions: string[] = [];
  if (validation.accessibility_score < 80) {
    suggestions.push('Improve message accessibility by fixing formatting issues');
  }
  if (validation.readability_score < 70) {
    suggestions.push('Consider shortening message for better readability');
  }
  if (significantChanges > 0) {
    suggestions.push('Consider adding a note about what was changed');
  }
  if (validation.content_warnings.length > 0) {
    suggestions.push('Review content warnings before updating');
  }
  
  const bestPractices: string[] = [
    'Use clear, concise language in message updates',
    'Test formatting before updating important messages',
    'Consider the timing of message updates for maximum visibility',
    'Use thread replies for minor corrections when possible',
  ];
  
  return {
    change_summary: {
      total_changes: totalChanges,
      significant_changes: significantChanges,
      formatting_changes: formattingChanges,
      content_changes: contentChanges,
    },
    impact_assessment: {
      estimated_readers_affected: estimatedReaders,
      notification_impact: notificationImpact,
      urgency_level: urgencyLevel,
      change_significance: changeSignificance,
    },
    optimization_suggestions: suggestions,
    best_practices: bestPractices,
  };
}

function generateRecommendations(
  changes: MessageChange[],
  validation: ContentValidation,
  analytics: UpdateAnalytics
): string[] {
  const recommendations: string[] = [];
  
  if (!validation.is_valid) {
    recommendations.push('Fix validation errors before updating message');
    return recommendations;
  }
  
  if (validation.content_warnings.length > 0) {
    recommendations.push('Review content warnings - message may have high impact');
  }
  
  if (analytics.impact_assessment.change_significance === 'major') {
    recommendations.push('Consider adding a note explaining the changes made');
  }
  
  if (analytics.impact_assessment.notification_impact === 'high') {
    recommendations.push('High-impact update - ensure changes are necessary');
  }
  
  if (validation.accessibility_score < 70) {
    recommendations.push('Improve message accessibility by fixing formatting');
  }
  
  if (changes.length > 3) {
    recommendations.push('Multiple changes detected - consider if a new message would be clearer');
  }
  
  recommendations.push(...analytics.optimization_suggestions.slice(0, 2));
  
  return recommendations.length > 0 ? recommendations : ['Message update looks good'];
}

export const slackChatUpdateTool: MCPTool = {
  name: 'slack_chat_update',
  description: 'Update Slack messages with advanced content validation, change tracking, and impact analysis',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel name or ID where the message is located',
      },
      ts: {
        type: 'string',
        description: 'Timestamp of the message to update',
      },
      text: {
        type: 'string',
        description: 'New text content for the message (optional if blocks provided)',
      },
      blocks: {
        type: 'array',
        description: 'New Block Kit blocks for the message (optional)',
        items: { type: 'object' },
      },
      attachments: {
        type: 'array',
        description: 'New attachments for the message (optional)',
        items: { type: 'object' },
      },
      parse: {
        type: 'string',
        enum: ['full', 'none'],
        description: 'Change how messages are treated (optional)',
      },
      link_names: {
        type: 'boolean',
        description: 'Find and link channel names and usernames (optional)',
      },
      as_user: {
        type: 'boolean',
        description: 'Pass true to update the message as the authed user (optional)',
      },
      file_ids: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of file IDs to attach to the message (optional)',
      },
      reply_broadcast: {
        type: 'boolean',
        description: 'Used in conjunction with thread_ts to make reply visible to everyone (optional)',
      },
      preserve_formatting: {
        type: 'boolean',
        description: 'Preserve existing message formatting when possible (default: true)',
        default: true,
      },
      validate_content: {
        type: 'boolean',
        description: 'Validate message content before updating (default: true)',
        default: true,
      },
      track_changes: {
        type: 'boolean',
        description: 'Track and analyze changes made to the message (default: true)',
        default: true,
      },
      notify_users: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of user IDs to notify about the update (optional)',
      },
      add_edit_indicator: {
        type: 'boolean',
        description: 'Add an indicator that the message was edited (default: true)',
        default: true,
      },
    },
    required: ['channel', 'ts'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args);
      const client = slackClient.getClient();
      
      // Resolve channel ID
      const channelId = await slackClient.resolveChannelId(validatedArgs.channel);
      
      // Get original message for comparison
      let originalMessage: any = null;
      let changes: MessageChange[] = [];
      
      if (validatedArgs.track_changes) {
        try {
          const historyResponse = await client.conversations.history({
            channel: channelId,
            latest: validatedArgs.ts,
            limit: 1,
            inclusive: true,
          });
          
          if (historyResponse.ok && historyResponse.messages && historyResponse.messages.length > 0) {
            originalMessage = historyResponse.messages[0];
          }
        } catch (error) {
          logger.warn('Could not retrieve original message for change tracking', { error });
        }
      }
      
      // Validate content if requested
      const validationStartTime = Date.now();
      let contentValidation: ContentValidation;
      
      if (validatedArgs.validate_content) {
        contentValidation = validateContent({
          text: validatedArgs.text,
          blocks: validatedArgs.blocks,
          attachments: validatedArgs.attachments,
        });
        
        if (!contentValidation.is_valid) {
          throw new Error(`Content validation failed: ${contentValidation.validation_errors.join(', ')}`);
        }
      } else {
        contentValidation = {
          is_valid: true,
          validation_errors: [],
          content_warnings: [],
          formatting_issues: [],
          accessibility_score: 80,
          readability_score: 80,
        };
      }
      
      const validationTime = Date.now() - validationStartTime;
      
      // Detect changes
      if (originalMessage && validatedArgs.track_changes) {
        changes = detectChanges(originalMessage, {
          text: validatedArgs.text,
          blocks: validatedArgs.blocks,
          attachments: validatedArgs.attachments,
        });
      }
      
      // Prepare update parameters
      const updateParams: any = {
        channel: channelId,
        ts: validatedArgs.ts,
      };
      
      if (validatedArgs.text !== undefined) updateParams.text = validatedArgs.text;
      if (validatedArgs.blocks !== undefined) updateParams.blocks = validatedArgs.blocks;
      if (validatedArgs.attachments !== undefined) updateParams.attachments = validatedArgs.attachments;
      if (validatedArgs.parse !== undefined) updateParams.parse = validatedArgs.parse;
      if (validatedArgs.link_names !== undefined) updateParams.link_names = validatedArgs.link_names;
      if (validatedArgs.as_user !== undefined) updateParams.as_user = validatedArgs.as_user;
      if (validatedArgs.file_ids !== undefined) updateParams.file_ids = validatedArgs.file_ids;
      if (validatedArgs.reply_broadcast !== undefined) updateParams.reply_broadcast = validatedArgs.reply_broadcast;
      
      // Update the message
      const updateStartTime = Date.now();
      const response = await client.chat.update(updateParams);
      const updateTime = Date.now() - updateStartTime;
      
      if (!response.ok) {
        throw new Error(`Failed to update message: ${response.error || 'Unknown error'}`);
      }
      
      // Analyze the update
      const updateAnalytics = analyzeUpdate(changes, originalMessage, contentValidation);
      
      // Send notifications if requested
      const notificationStartTime = Date.now();
      const notificationsSent: Array<{ user_id: string; success: boolean; message?: string }> = [];
      
      if (validatedArgs.notify_users && validatedArgs.notify_users.length > 0) {
        for (const userId of validatedArgs.notify_users) {
          try {
            const notificationText = `📝 Message updated in <#${channelId}>: ${changes.length > 0 ? 
              `${changes.length} change(s) made` : 'Content updated'}`;
            
            await client.chat.postMessage({
              channel: userId,
              text: notificationText,
            });
            
            notificationsSent.push({ user_id: userId, success: true, message: notificationText });
          } catch (notifyError) {
            logger.warn('Failed to notify user about message update', {
              user_id: userId,
              error: notifyError,
            });
            notificationsSent.push({ user_id: userId, success: false });
          }
        }
      }
      
      const notificationTime = Date.now() - notificationStartTime;
      
      // Generate recommendations
      const recommendations = generateRecommendations(changes, contentValidation, updateAnalytics);
      
      const result: UpdateResult = {
        success: true,
        updated_message: {
          channel: channelId,
          ts: response.ts || validatedArgs.ts,
          text: response.text,
          user: response.message?.user || 'unknown',
          edited: response.message?.edited ? {
            user: response.message.edited.user || 'unknown',
            ts: response.message.edited.ts || '',
          } : undefined,
        },
        changes_made: changes,
        content_validation: contentValidation,
        update_analytics: updateAnalytics,
        notifications_sent: notificationsSent,
        recommendations,
        performance: {
          validation_time_ms: validationTime,
          update_time_ms: updateTime,
          notification_time_ms: notificationTime,
          total_time_ms: Date.now() - startTime,
        },
      };
      
      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_chat_update', args, duration);

      return {
        success: true,
        data: result,
        metadata: {
          execution_time_ms: duration,
          channel_id: channelId,
          changes_detected: changes.length,
          validation_performed: validatedArgs.validate_content,
          notifications_sent: notificationsSent.length,
          change_significance: updateAnalytics.impact_assessment.change_significance,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_chat_update', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_chat_update',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
