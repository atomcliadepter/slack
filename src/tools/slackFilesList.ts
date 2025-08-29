import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  channel: z.string().optional().describe('Channel to list files from'),
  user: z.string().optional().describe('User to filter files by'),
  count: z.number().optional().default(20).describe('Number of files to return'),
  page: z.number().optional().default(1).describe('Page number'),
  types: z.string().optional().describe('File types to filter (e.g., "images,pdfs")'),
  include_analytics: z.boolean().optional().default(true).describe('Include file analytics'),
  include_recommendations: z.boolean().optional().default(true).describe('Include recommendations')
});

export const slackFilesListTool: MCPTool = {
  name: 'slack_files_list',
  description: 'List Slack files with advanced filtering and analytics',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Channel to list files from'
      },
      user: {
        type: 'string',
        description: 'User to filter files by'
      },
      count: {
        type: 'number',
        description: 'Number of files to return',
        default: 20
      },
      page: {
        type: 'number',
        description: 'Page number',
        default: 1
      },
      types: {
        type: 'string',
        description: 'File types to filter (e.g., "images,pdfs")'
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include file analytics',
        default: true
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations',
        default: true
      }
    }
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args);
      const { 
        channel,
        user,
        count,
        page,
        types,
        include_analytics,
        include_recommendations
      } = validatedArgs;

      // Resolve IDs if provided
      const channelId = channel ? await slackClient.resolveChannelId(channel) : undefined;
      const userId = user ? await slackClient.resolveUserId(user) : undefined;

      // Build API parameters
      const apiParams: any = {
        count,
        page
      };
      
      if (channelId) apiParams.channel = channelId;
      if (userId) apiParams.user = userId;
      if (types) apiParams.types = types;

      // Get files list
      const filesResponse = await (slackClient as any).files.list(apiParams);
      const files = filesResponse.files || [];

      // Enhance files with metadata
      const enhancedFiles = files.map((file: any) => ({
        ...file,
        metadata: {
          size_mb: file.size ? (file.size / (1024 * 1024)).toFixed(2) : 0,
          age_days: file.created ? Math.floor((Date.now() / 1000 - file.created) / 86400) : 0,
          is_image: /^image\//.test(file.mimetype || ''),
          is_document: /\.(pdf|doc|docx|txt|md)$/i.test(file.name || ''),
          has_comments: (file.comments_count || 0) > 0,
          is_shared: (file.channels?.length || 0) > 1
        }
      }));

      const result: any = {
        success: true,
        data: {
          files: enhancedFiles,
          total_count: filesResponse.paging?.total || files.length,
          page: filesResponse.paging?.page || page,
          pages: filesResponse.paging?.pages || 1
        }
      };

      // Add analytics
      if (include_analytics) {
        const totalSize = files.reduce((sum: number, f: any) => sum + (f.size || 0), 0);
        const fileTypes = files.reduce((acc: any, f: any) => {
          const ext = f.name?.split('.').pop()?.toLowerCase() || 'unknown';
          acc[ext] = (acc[ext] || 0) + 1;
          return acc;
        }, {});

        result.data.analytics = {
          file_distribution: {
            total_files: files.length,
            total_size_mb: (totalSize / (1024 * 1024)).toFixed(2),
            average_size_mb: files.length > 0 ? (totalSize / files.length / (1024 * 1024)).toFixed(2) : 0,
            file_types: fileTypes
          },
          content_analysis: {
            images: enhancedFiles.filter((f: any) => f.metadata.is_image).length,
            documents: enhancedFiles.filter((f: any) => f.metadata.is_document).length,
            with_comments: enhancedFiles.filter((f: any) => f.metadata.has_comments).length,
            shared_files: enhancedFiles.filter((f: any) => f.metadata.is_shared).length
          },
          age_analysis: {
            recent_files: enhancedFiles.filter((f: any) => f.metadata.age_days <= 7).length,
            old_files: enhancedFiles.filter((f: any) => f.metadata.age_days > 30).length,
            average_age_days: files.length > 0 ? 
              Math.round(enhancedFiles.reduce((sum: number, f: any) => sum + f.metadata.age_days, 0) / files.length) : 0
          }
        };
      }

      // Add recommendations
      if (include_recommendations) {
        const recommendations = [];
        const oldFiles = enhancedFiles.filter((f: any) => f.metadata.age_days > 90).length;
        const largeFiles = enhancedFiles.filter((f: any) => parseFloat(f.metadata.size_mb) > 10).length;

        if (oldFiles > 5) {
          recommendations.push(`${oldFiles} files are over 90 days old - consider archiving or cleanup`);
        }
        if (largeFiles > 0) {
          recommendations.push(`${largeFiles} large files (>10MB) found - monitor storage usage`);
        }
        if (files.length === 0) {
          recommendations.push('No files found - adjust filters or check permissions');
        }

        result.data.recommendations = recommendations;
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_files_list', args, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_files_list', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_files_list',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
