import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  file_id: z.string().describe('File ID to delete'),
  include_analytics: z.boolean().optional().default(true).describe('Include deletion analytics'),
  include_recommendations: z.boolean().optional().default(true).describe('Include recommendations'),
  confirm_deletion: z.boolean().optional().default(false).describe('Confirm deletion (safety check)'),
  backup_info: z.boolean().optional().default(true).describe('Backup file information before deletion')
});

export const slackFilesDeleteTool: MCPTool = {
  name: 'slack_files_delete',
  description: 'Delete a Slack file with analytics and safety checks',
  inputSchema: {
    type: 'object',
    properties: {
      file_id: {
        type: 'string',
        description: 'File ID to delete'
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include deletion analytics',
        default: true
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations',
        default: true
      },
      confirm_deletion: {
        type: 'boolean',
        description: 'Confirm deletion (safety check)',
        default: false
      },
      backup_info: {
        type: 'boolean',
        description: 'Backup file information before deletion',
        default: true
      }
    },
    required: ['file_id']
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args);
      const { 
        file_id,
        include_analytics,
        include_recommendations,
        confirm_deletion,
        backup_info
      } = validatedArgs;

      // Safety check
      if (!confirm_deletion) {
        return {
          success: false,
          error: 'Deletion not confirmed. Set confirm_deletion: true to proceed.',
          data: {
            file_id,
            deletion_prevented: true,
            safety_check: 'Confirmation required'
          }
        };
      }

      // Get file info before deletion
      let fileInfo = null;
      if (backup_info) {
        try {
          const fileResponse = await (slackClient as any).files.info({ file: file_id });
          fileInfo = fileResponse.file;
        } catch (error) {
          // Continue if we can't get file info
        }
      }

      // Delete the file
      await (slackClient as any).files.delete({ file: file_id });

      const result: any = {
        success: true,
        data: {
          file_id,
          deleted: true,
          deletion_time: new Date().toISOString(),
          backup_created: !!fileInfo,
          file_backup: fileInfo ? {
            name: fileInfo.name,
            size: fileInfo.size,
            mimetype: fileInfo.mimetype,
            created: fileInfo.created,
            channels: fileInfo.channels,
            comments_count: fileInfo.comments_count
          } : null
        }
      };

      // Add analytics
      if (include_analytics) {
        result.data.analytics = {
          file_analysis: {
            had_file_info: !!fileInfo,
            file_size_mb: fileInfo?.size ? (fileInfo.size / (1024 * 1024)).toFixed(2) : 0,
            file_age_days: fileInfo?.created ? Math.floor((Date.now() / 1000 - fileInfo.created) / 86400) : 0,
            was_shared: fileInfo?.channels ? fileInfo.channels.length > 1 : false,
            had_comments: fileInfo?.comments_count > 0
          },
          deletion_impact: {
            channels_affected: fileInfo?.channels?.length || 0,
            potential_broken_links: fileInfo?.permalink_public ? 1 : 0
          },
          timing: {
            execution_time_ms: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Add recommendations
      if (include_recommendations) {
        const recommendations = [];
        
        if (fileInfo?.channels && fileInfo.channels.length > 1) {
          recommendations.push('File was shared in multiple channels - notify affected users');
        }
        if (fileInfo?.comments_count > 0) {
          recommendations.push('File had comments - consider preserving discussion context');
        }
        if (fileInfo?.size && fileInfo.size > 10 * 1024 * 1024) {
          recommendations.push('Large file deleted - significant storage space recovered');
        }
        if (!fileInfo) {
          recommendations.push('File info unavailable - verify deletion was successful');
        }

        result.data.recommendations = recommendations;
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_files_delete', args, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_files_delete', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_files_delete',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
