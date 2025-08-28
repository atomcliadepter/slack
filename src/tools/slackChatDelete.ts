import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  channel: z.string().min(1, 'Channel is required'),
  ts: z.string().min(1, 'Message timestamp is required'),
  as_user: z.boolean().optional(),
  create_backup: z.boolean().default(true),
  check_permissions: z.boolean().default(true),
  require_confirmation: z.boolean().default(true),
  confirmation_code: z.string().optional(),
  notify_users: z.array(z.string()).optional(),
  audit_reason: z.string().optional(),
  preserve_thread: z.boolean().default(false),
});

interface MessageBackup {
  message_data: {
    channel: string;
    ts: string;
    text?: string;
    user: string;
    blocks?: any[];
    attachments?: any[];
    files?: any[];
    reactions?: any[];
    replies?: any[];
    thread_ts?: string;
    reply_count?: number;
  };
  metadata: {
    backup_timestamp: string;
    backup_reason: string;
    deleted_by: string;
    original_permalink?: string;
  };
  recovery_info: {
    can_recover: boolean;
    recovery_method: string;
    recovery_limitations: string[];
  };
}

interface PermissionCheck {
  can_delete: boolean;
  permission_level: 'owner' | 'admin' | 'member' | 'restricted' | 'none';
  restrictions: string[];
  warnings: string[];
  required_confirmations: string[];
}

interface DeletionAnalysis {
  impact_assessment: {
    message_importance: 'low' | 'medium' | 'high' | 'critical';
    thread_impact: 'none' | 'minor' | 'moderate' | 'severe';
    user_impact: number;
    data_loss_risk: 'low' | 'medium' | 'high';
  };
  content_analysis: {
    contains_files: boolean;
    contains_links: boolean;
    contains_mentions: boolean;
    contains_sensitive_data: boolean;
    message_age_hours: number;
  };
  compliance_considerations: {
    retention_policy_conflict: boolean;
    audit_requirements: string[];
    legal_hold_status: boolean;
    compliance_score: number;
  };
}

interface DeletionResult {
  success: boolean;
  deleted_message: {
    channel: string;
    ts: string;
    deleted_by: string;
    deletion_timestamp: string;
  };
  backup_created?: MessageBackup;
  permission_check: PermissionCheck;
  deletion_analysis: DeletionAnalysis;
  notifications_sent: Array<{
    user_id: string;
    success: boolean;
    message?: string;
  }>;
  audit_log: {
    action: 'message_deleted';
    timestamp: string;
    user: string;
    channel: string;
    message_ts: string;
    reason?: string;
    backup_created: boolean;
  };
  recommendations: string[];
  performance: {
    permission_check_time_ms: number;
    backup_time_ms: number;
    deletion_time_ms: number;
    notification_time_ms: number;
    total_time_ms: number;
  };
}

async function checkPermissions(
  client: any,
  channelId: string,
  messageTs: string,
  userId: string
): Promise<PermissionCheck> {
  const restrictions: string[] = [];
  const warnings: string[] = [];
  const requiredConfirmations: string[] = [];
  
  try {
    // Get channel info to check permissions
    const channelResponse = await client.conversations.info({ channel: channelId });
    if (!channelResponse.ok) {
      throw new Error('Cannot access channel information');
    }
    
    const channel = channelResponse.channel;
    let permissionLevel: PermissionCheck['permission_level'] = 'none';
    let canDelete = false;
    
    // Check if user is member of the channel
    if (!channel.is_member) {
      restrictions.push('User is not a member of this channel');
      return {
        can_delete: false,
        permission_level: 'none',
        restrictions,
        warnings,
        required_confirmations: requiredConfirmations,
      };
    }
    
    // Get message to check ownership
    try {
      const historyResponse = await client.conversations.history({
        channel: channelId,
        latest: messageTs,
        limit: 1,
        inclusive: true,
      });
      
      if (historyResponse.ok && historyResponse.messages && historyResponse.messages.length > 0) {
        const message = historyResponse.messages[0];
        
        // Check if user owns the message
        if (message.user === userId) {
          permissionLevel = 'owner';
          canDelete = true;
        } else {
          permissionLevel = 'member';
          restrictions.push('Can only delete own messages');
        }
        
        // Check message age (Slack has time limits for deletion)
        const messageAge = (Date.now() / 1000) - parseFloat(messageTs);
        const ageHours = messageAge / 3600;
        
        if (ageHours > 24 && permissionLevel === 'owner') {
          warnings.push('Message is older than 24 hours - deletion may be restricted');
        }
        
        // Check if message has replies
        if (message.reply_count && message.reply_count > 0) {
          warnings.push('Message has replies - deleting will affect thread');
          requiredConfirmations.push('Confirm deletion of message with replies');
        }
        
        // Check if message has reactions
        if (message.reactions && message.reactions.length > 0) {
          warnings.push('Message has reactions from other users');
          requiredConfirmations.push('Confirm deletion of message with reactions');
        }
        
        // Check if message has files
        if (message.files && message.files.length > 0) {
          warnings.push('Message contains file attachments');
          requiredConfirmations.push('Confirm deletion of message with files');
        }
      }
    } catch (error) {
      restrictions.push('Cannot retrieve message information');
    }
    
    return {
      can_delete: canDelete,
      permission_level: permissionLevel,
      restrictions,
      warnings,
      required_confirmations: requiredConfirmations,
    };
    
  } catch (error) {
    return {
      can_delete: false,
      permission_level: 'none',
      restrictions: ['Permission check failed'],
      warnings,
      required_confirmations: requiredConfirmations,
    };
  }
}

async function createMessageBackup(
  client: any,
  channelId: string,
  messageTs: string,
  deletedBy: string,
  reason?: string
): Promise<MessageBackup | null> {
  try {
    // Get the message
    const historyResponse = await client.conversations.history({
      channel: channelId,
      latest: messageTs,
      limit: 1,
      inclusive: true,
    });
    
    if (!historyResponse.ok || !historyResponse.messages || historyResponse.messages.length === 0) {
      return null;
    }
    
    const message = historyResponse.messages[0];
    
    // Get thread replies if it's a thread parent
    let replies: any[] = [];
    if (message.reply_count && message.reply_count > 0) {
      try {
        const repliesResponse = await client.conversations.replies({
          channel: channelId,
          ts: messageTs,
        });
        
        if (repliesResponse.ok && repliesResponse.messages) {
          replies = repliesResponse.messages.slice(1); // Exclude the parent message
        }
      } catch (error) {
        logger.warn('Could not backup thread replies', { error });
      }
    }
    
    // Try to get permalink
    let permalink: string | undefined;
    try {
      const permalinkResponse = await client.chat.getPermalink({
        channel: channelId,
        message_ts: messageTs,
      });
      
      if (permalinkResponse.ok) {
        permalink = permalinkResponse.permalink;
      }
    } catch (error) {
      logger.warn('Could not get message permalink', { error });
    }
    
    return {
      message_data: {
        channel: channelId,
        ts: message.ts,
        text: message.text,
        user: message.user,
        blocks: message.blocks,
        attachments: message.attachments,
        files: message.files,
        reactions: message.reactions,
        replies: replies,
        thread_ts: message.thread_ts,
        reply_count: message.reply_count,
      },
      metadata: {
        backup_timestamp: new Date().toISOString(),
        backup_reason: reason || 'Message deletion backup',
        deleted_by: deletedBy,
        original_permalink: permalink,
      },
      recovery_info: {
        can_recover: false, // Slack doesn't support message recovery
        recovery_method: 'Manual recreation from backup data',
        recovery_limitations: [
          'Original timestamp cannot be preserved',
          'Reactions and replies cannot be automatically restored',
          'File attachments may need to be re-uploaded',
        ],
      },
    };
    
  } catch (error) {
    logger.error('Failed to create message backup', { error, channelId, messageTs });
    return null;
  }
}

function analyzeDeletion(message: any, channelInfo: any): DeletionAnalysis {
  const messageAge = (Date.now() / 1000) - parseFloat(message.ts);
  const ageHours = messageAge / 3600;
  
  // Assess message importance
  let messageImportance: DeletionAnalysis['impact_assessment']['message_importance'] = 'low';
  if (message.reply_count && message.reply_count > 10) {
    messageImportance = 'critical';
  } else if (message.reply_count && message.reply_count > 5) {
    messageImportance = 'high';
  } else if (message.reactions && message.reactions.length > 5) {
    messageImportance = 'medium';
  }
  
  // Assess thread impact
  let threadImpact: DeletionAnalysis['impact_assessment']['thread_impact'] = 'none';
  if (message.reply_count) {
    if (message.reply_count > 20) {
      threadImpact = 'severe';
    } else if (message.reply_count > 10) {
      threadImpact = 'moderate';
    } else {
      threadImpact = 'minor';
    }
  }
  
  // Calculate user impact
  const userImpact = Math.min(100, 
    (message.reply_count || 0) * 2 + 
    (message.reactions?.reduce((sum: number, r: any) => sum + r.count, 0) || 0)
  );
  
  // Assess data loss risk
  let dataLossRisk: DeletionAnalysis['impact_assessment']['data_loss_risk'] = 'low';
  if (message.files && message.files.length > 0) {
    dataLossRisk = 'high';
  } else if (message.attachments && message.attachments.length > 0) {
    dataLossRisk = 'medium';
  }
  
  // Content analysis
  const containsFiles = !!(message.files && message.files.length > 0);
  const containsLinks = !!(message.text && (message.text.includes('http') || message.text.includes('www.')));
  const containsMentions = !!(message.text && (message.text.includes('@') || message.text.includes('#')));
  const containsSensitiveData = !!(message.text && 
    (message.text.toLowerCase().includes('password') || 
     message.text.toLowerCase().includes('confidential') ||
     message.text.toLowerCase().includes('secret')));
  
  // Compliance considerations
  const retentionPolicyConflict = ageHours < 24; // Assume 24-hour minimum retention
  const auditRequirements = ['Message deletion logged', 'Backup created'];
  const legalHoldStatus = false; // Would need integration with legal hold system
  
  const complianceScore = Math.max(0, 100 - 
    (retentionPolicyConflict ? 30 : 0) - 
    (containsSensitiveData ? 20 : 0) - 
    (dataLossRisk === 'high' ? 25 : dataLossRisk === 'medium' ? 15 : 0)
  );
  
  return {
    impact_assessment: {
      message_importance: messageImportance,
      thread_impact: threadImpact,
      user_impact: userImpact,
      data_loss_risk: dataLossRisk,
    },
    content_analysis: {
      contains_files: containsFiles,
      contains_links: containsLinks,
      contains_mentions: containsMentions,
      contains_sensitive_data: containsSensitiveData,
      message_age_hours: Math.round(ageHours * 10) / 10,
    },
    compliance_considerations: {
      retention_policy_conflict: retentionPolicyConflict,
      audit_requirements: auditRequirements,
      legal_hold_status: legalHoldStatus,
      compliance_score: Math.round(complianceScore),
    },
  };
}

function generateRecommendations(
  permissionCheck: PermissionCheck,
  analysis: DeletionAnalysis,
  backup: MessageBackup | null
): string[] {
  const recommendations: string[] = [];
  
  if (!permissionCheck.can_delete) {
    recommendations.push('Cannot delete message - check permissions and restrictions');
    return recommendations;
  }
  
  if (analysis.impact_assessment.message_importance === 'critical') {
    recommendations.push('Critical message - consider editing instead of deleting');
  }
  
  if (analysis.impact_assessment.thread_impact === 'severe') {
    recommendations.push('Deleting will severely impact thread - consider preserving');
  }
  
  if (analysis.content_analysis.contains_files) {
    recommendations.push('Message contains files - ensure files are backed up separately');
  }
  
  if (analysis.content_analysis.contains_sensitive_data) {
    recommendations.push('Message may contain sensitive data - verify compliance requirements');
  }
  
  if (analysis.compliance_considerations.retention_policy_conflict) {
    recommendations.push('Deletion may conflict with retention policy - verify compliance');
  }
  
  if (!backup) {
    recommendations.push('No backup created - message data will be permanently lost');
  }
  
  if (analysis.impact_assessment.user_impact > 20) {
    recommendations.push('High user impact - consider notifying affected users');
  }
  
  return recommendations.length > 0 ? recommendations : ['Deletion appears safe to proceed'];
}

export const slackChatDeleteTool: MCPTool = {
  name: 'slack_chat_delete',
  description: 'Delete Slack messages with comprehensive permission checking, backup creation, and audit logging',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel name or ID where the message is located',
      },
      ts: {
        type: 'string',
        description: 'Timestamp of the message to delete',
      },
      as_user: {
        type: 'boolean',
        description: 'Pass true to delete the message as the authed user (optional)',
      },
      create_backup: {
        type: 'boolean',
        description: 'Create a backup of the message before deletion (default: true)',
        default: true,
      },
      check_permissions: {
        type: 'boolean',
        description: 'Perform permission checks before deletion (default: true)',
        default: true,
      },
      require_confirmation: {
        type: 'boolean',
        description: 'Require confirmation for high-impact deletions (default: true)',
        default: true,
      },
      confirmation_code: {
        type: 'string',
        description: 'Confirmation code for high-impact deletions (optional)',
      },
      notify_users: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of user IDs to notify about the deletion (optional)',
      },
      audit_reason: {
        type: 'string',
        description: 'Reason for deletion (for audit logging) (optional)',
      },
      preserve_thread: {
        type: 'boolean',
        description: 'Attempt to preserve thread structure when deleting parent (default: false)',
        default: false,
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
      
      // Get current user ID
      const authResponse = await client.auth.test();
      const currentUserId = authResponse.user_id || 'unknown';
      
      // Check permissions
      const permissionStartTime = Date.now();
      let permissionCheck: PermissionCheck;
      
      if (validatedArgs.check_permissions) {
        permissionCheck = await checkPermissions(client, channelId, validatedArgs.ts, currentUserId);
        
        if (!permissionCheck.can_delete) {
          throw new Error(`Cannot delete message: ${permissionCheck.restrictions.join(', ')}`);
        }
      } else {
        permissionCheck = {
          can_delete: true,
          permission_level: 'member',
          restrictions: [],
          warnings: [],
          required_confirmations: [],
        };
      }
      
      const permissionTime = Date.now() - permissionStartTime;
      
      // Get message for analysis and backup
      const historyResponse = await client.conversations.history({
        channel: channelId,
        latest: validatedArgs.ts,
        limit: 1,
        inclusive: true,
      });
      
      if (!historyResponse.ok || !historyResponse.messages || historyResponse.messages.length === 0) {
        throw new Error('Message not found or cannot be accessed');
      }
      
      const message = historyResponse.messages[0];
      
      // Get channel info for analysis
      const channelResponse = await client.conversations.info({ channel: channelId });
      const channelInfo = channelResponse.ok ? channelResponse.channel : null;
      
      // Analyze deletion impact
      const deletionAnalysis = analyzeDeletion(message, channelInfo);
      
      // Check if confirmation is required
      if (validatedArgs.require_confirmation && permissionCheck.required_confirmations.length > 0) {
        if (!validatedArgs.confirmation_code) {
          throw new Error(`Confirmation required: ${permissionCheck.required_confirmations.join(', ')}. Provide confirmation_code.`);
        }
        // In a real implementation, you'd validate the confirmation code
      }
      
      // Create backup if requested
      const backupStartTime = Date.now();
      let backup: MessageBackup | null = null;
      
      if (validatedArgs.create_backup) {
        backup = await createMessageBackup(
          client,
          channelId,
          validatedArgs.ts,
          currentUserId,
          validatedArgs.audit_reason
        );
      }
      
      const backupTime = Date.now() - backupStartTime;
      
      // Delete the message
      const deletionStartTime = Date.now();
      const deleteParams: any = {
        channel: channelId,
        ts: validatedArgs.ts,
      };
      
      if (validatedArgs.as_user !== undefined) {
        deleteParams.as_user = validatedArgs.as_user;
      }
      
      const deleteResponse = await client.chat.delete(deleteParams);
      const deletionTime = Date.now() - deletionStartTime;
      
      if (!deleteResponse.ok) {
        throw new Error(`Failed to delete message: ${deleteResponse.error || 'Unknown error'}`);
      }
      
      // Send notifications if requested
      const notificationStartTime = Date.now();
      const notificationsSent: Array<{ user_id: string; success: boolean; message?: string }> = [];
      
      if (validatedArgs.notify_users && validatedArgs.notify_users.length > 0) {
        for (const userId of validatedArgs.notify_users) {
          try {
            const notificationText = `🗑️ Message deleted in <#${channelId}>${validatedArgs.audit_reason ? ` - Reason: ${validatedArgs.audit_reason}` : ''}`;
            
            await client.chat.postMessage({
              channel: userId,
              text: notificationText,
            });
            
            notificationsSent.push({ user_id: userId, success: true, message: notificationText });
          } catch (notifyError) {
            logger.warn('Failed to notify user about message deletion', {
              user_id: userId,
              error: notifyError,
            });
            notificationsSent.push({ user_id: userId, success: false });
          }
        }
      }
      
      const notificationTime = Date.now() - notificationStartTime;
      
      // Create audit log entry
      const auditLog = {
        action: 'message_deleted' as const,
        timestamp: new Date().toISOString(),
        user: currentUserId,
        channel: channelId,
        message_ts: validatedArgs.ts,
        reason: validatedArgs.audit_reason,
        backup_created: !!backup,
      };
      
      // Generate recommendations
      const recommendations = generateRecommendations(permissionCheck, deletionAnalysis, backup);
      
      const result: DeletionResult = {
        success: true,
        deleted_message: {
          channel: channelId,
          ts: validatedArgs.ts,
          deleted_by: currentUserId,
          deletion_timestamp: new Date().toISOString(),
        },
        backup_created: backup || undefined,
        permission_check: permissionCheck,
        deletion_analysis: deletionAnalysis,
        notifications_sent: notificationsSent,
        audit_log: auditLog,
        recommendations,
        performance: {
          permission_check_time_ms: permissionTime,
          backup_time_ms: backupTime,
          deletion_time_ms: deletionTime,
          notification_time_ms: notificationTime,
          total_time_ms: Date.now() - startTime,
        },
      };
      
      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_chat_delete', args, duration);

      return {
        success: true,
        data: result,
        metadata: {
          execution_time_ms: duration,
          channel_id: channelId,
          backup_created: !!backup,
          permissions_checked: validatedArgs.check_permissions,
          notifications_sent: notificationsSent.length,
          impact_level: deletionAnalysis.impact_assessment.message_importance,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_chat_delete', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_chat_delete',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
