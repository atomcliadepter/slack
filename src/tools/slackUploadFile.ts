import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { createReadStream } from 'fs';

const inputSchema = z.object({
  channels: z.array(z.string()).min(1, 'At least one channel is required'),
  file_path: z.string().min(1, 'File path is required'),
  filename: z.string().optional(),
  title: z.string().optional(),
  initial_comment: z.string().optional(),
  thread_ts: z.string().optional(),
  filetype: z.string().optional(),
  snippet_type: z.string().optional(),
  content: z.string().optional(),
  analyze_file: z.boolean().default(true),
  generate_preview: z.boolean().default(true),
  notify_users: z.array(z.string()).optional(),
});

interface FileAnalysis {
  size: number;
  type: string;
  extension: string;
  is_text: boolean;
  is_image: boolean;
  is_document: boolean;
  mime_type: string;
  estimated_upload_time: number;
  security_assessment: {
    is_safe: boolean;
    potential_risks: string[];
    recommendations: string[];
  };
}

interface UploadResult {
  file_id: string;
  name: string;
  title: string;
  mimetype: string;
  size: number;
  url_private: string;
  url_private_download: string;
  channels: string[];
  timestamp: string;
  user: string;
  analysis: FileAnalysis;
  upload_performance: {
    upload_time_ms: number;
    upload_speed_mbps: number;
    success_rate: number;
  };
  recommendations: string[];
}

function analyzeFile(filePath: string): FileAnalysis {
  const stats = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath);
  
  const textExtensions = ['.txt', '.md', '.json', '.xml', '.csv', '.log', '.yml', '.yaml'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'];
  const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif', '.vbs', '.js'];
  
  const isText = textExtensions.includes(ext);
  const isImage = imageExtensions.includes(ext);
  const isDocument = documentExtensions.includes(ext);
  const isDangerous = dangerousExtensions.includes(ext);
  
  // Estimate upload time based on file size (assuming 1MB/s average)
  const estimatedUploadTime = Math.ceil(stats.size / (1024 * 1024));
  
  const potentialRisks: string[] = [];
  const recommendations: string[] = [];
  
  if (isDangerous) {
    potentialRisks.push('Executable file type detected');
    recommendations.push('Verify file contents before sharing');
  }
  
  if (stats.size > 100 * 1024 * 1024) { // 100MB
    potentialRisks.push('Large file size may cause upload delays');
    recommendations.push('Consider compressing the file or using external storage');
  }
  
  if (basename.includes(' ')) {
    recommendations.push('Consider using underscores instead of spaces in filename');
  }
  
  return {
    size: stats.size,
    type: isText ? 'text' : isImage ? 'image' : isDocument ? 'document' : 'binary',
    extension: ext,
    is_text: isText,
    is_image: isImage,
    is_document: isDocument,
    mime_type: getMimeType(ext),
    estimated_upload_time: estimatedUploadTime,
    security_assessment: {
      is_safe: !isDangerous,
      potential_risks: potentialRisks,
      recommendations: recommendations,
    },
  };
}

function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.csv': 'text/csv',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

function generateRecommendations(analysis: FileAnalysis, channels: string[]): string[] {
  const recommendations: string[] = [];
  
  if (analysis.size > 50 * 1024 * 1024) {
    recommendations.push('Large file detected - consider using file compression');
  }
  
  if (channels.length > 5) {
    recommendations.push('Uploading to many channels - consider using a single channel and cross-posting');
  }
  
  if (analysis.is_image && analysis.size > 10 * 1024 * 1024) {
    recommendations.push('Large image file - consider optimizing image size for faster loading');
  }
  
  if (analysis.is_document) {
    recommendations.push('Document file - ensure it contains no sensitive information before sharing');
  }
  
  recommendations.push(...analysis.security_assessment.recommendations);
  
  return recommendations;
}

export const slackUploadFileTool: MCPTool = {
  name: 'slack_upload_file',
  description: 'Upload files to Slack channels with advanced analysis, multi-channel support, and security assessment',
  inputSchema: {
    type: 'object',
    properties: {
      channels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of channel names or IDs to upload the file to',
        minItems: 1,
      },
      file_path: {
        type: 'string',
        description: 'Path to the file to upload',
      },
      filename: {
        type: 'string',
        description: 'Custom filename for the uploaded file (optional)',
      },
      title: {
        type: 'string',
        description: 'Title for the file (optional)',
      },
      initial_comment: {
        type: 'string',
        description: 'Initial comment to post with the file (optional)',
      },
      thread_ts: {
        type: 'string',
        description: 'Timestamp of thread to upload file to (optional)',
      },
      filetype: {
        type: 'string',
        description: 'File type identifier (optional, auto-detected if not provided)',
      },
      snippet_type: {
        type: 'string',
        description: 'Syntax highlighting type for code snippets (optional)',
      },
      content: {
        type: 'string',
        description: 'File content as string (alternative to file_path for text content)',
      },
      analyze_file: {
        type: 'boolean',
        description: 'Whether to perform file analysis (default: true)',
        default: true,
      },
      generate_preview: {
        type: 'boolean',
        description: 'Whether to generate file preview (default: true)',
        default: true,
      },
      notify_users: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of user IDs to notify about the file upload (optional)',
      },
    },
    required: ['channels'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args);
      const client = slackClient.getClient();
      
      // Validate that either file_path or content is provided
      if (!validatedArgs.file_path && !validatedArgs.content) {
        throw new Error('Either file_path or content must be provided');
      }
      
      // Resolve channel IDs
      const resolvedChannels: string[] = [];
      for (const channel of validatedArgs.channels) {
        const channelId = await slackClient.resolveChannelId(channel);
        resolvedChannels.push(channelId);
      }
      
      let analysis: FileAnalysis | null = null;
      let fileStream: any = null;
      let filename = validatedArgs.filename;
      let title = validatedArgs.title;
      
      // Handle file upload vs content upload
      if (validatedArgs.file_path) {
        // Validate file exists
        if (!fs.existsSync(validatedArgs.file_path)) {
          throw new Error(`File not found: ${validatedArgs.file_path}`);
        }
        
        // Analyze file if requested
        if (validatedArgs.analyze_file) {
          analysis = analyzeFile(validatedArgs.file_path);
          
          // Check security assessment
          if (!analysis.security_assessment.is_safe) {
            logger.warn('Potentially unsafe file detected', {
              file_path: validatedArgs.file_path,
              risks: analysis.security_assessment.potential_risks,
            });
          }
        }
        
        fileStream = createReadStream(validatedArgs.file_path);
        filename = filename || path.basename(validatedArgs.file_path);
        title = title || filename;
      }
      
      // Prepare upload parameters
      const uploadParams: any = {
        channels: resolvedChannels.join(','),
        filename: filename,
        title: title,
        initial_comment: validatedArgs.initial_comment,
        thread_ts: validatedArgs.thread_ts,
        filetype: validatedArgs.filetype,
      };
      
      if (validatedArgs.content) {
        uploadParams.content = validatedArgs.content;
        uploadParams.filetype = validatedArgs.snippet_type || validatedArgs.filetype || 'text';
      } else {
        uploadParams.file = fileStream;
      }
      
      // Upload file
      const uploadStartTime = Date.now();
      const response = await client.files.upload(uploadParams);
      const uploadEndTime = Date.now();
      
      if (!response.ok || !response.file) {
        throw new Error(`File upload failed: ${response.error || 'Unknown error'}`);
      }
      
      const uploadTime = uploadEndTime - uploadStartTime;
      const fileSizeBytes = analysis?.size || (validatedArgs.content?.length || 0);
      const uploadSpeedMbps = fileSizeBytes > 0 ? (fileSizeBytes / 1024 / 1024) / (uploadTime / 1000) : 0;
      
      // Notify users if specified
      if (validatedArgs.notify_users && validatedArgs.notify_users.length > 0) {
        for (const userId of validatedArgs.notify_users) {
          try {
            await client.chat.postMessage({
              channel: userId,
              text: `📎 New file uploaded: *${response.file.name}*\nChannels: ${resolvedChannels.map(c => `<#${c}>`).join(', ')}`,
            });
          } catch (notifyError) {
            logger.warn('Failed to notify user about file upload', {
              user_id: userId,
              error: notifyError,
            });
          }
        }
      }
      
      // Generate recommendations
      const recommendations = analysis ? generateRecommendations(analysis, resolvedChannels) : [];
      
      const result: UploadResult = {
        file_id: response.file.id || '',
        name: response.file.name || '',
        title: response.file.title || response.file.name || '',
        mimetype: response.file.mimetype || 'application/octet-stream',
        size: response.file.size || 0,
        url_private: response.file.url_private || '',
        url_private_download: response.file.url_private_download || '',
        channels: resolvedChannels,
        timestamp: response.file.timestamp?.toString() || '',
        user: response.file.user || '',
        analysis: analysis || {
          size: response.file.size || 0,
          type: 'unknown',
          extension: '',
          is_text: false,
          is_image: false,
          is_document: false,
          mime_type: response.file.mimetype || 'application/octet-stream',
          estimated_upload_time: 0,
          security_assessment: {
            is_safe: true,
            potential_risks: [],
            recommendations: [],
          },
        },
        upload_performance: {
          upload_time_ms: uploadTime,
          upload_speed_mbps: Math.round(uploadSpeedMbps * 100) / 100,
          success_rate: 1.0,
        },
        recommendations,
      };
      
      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_upload_file', args, duration);

      return {
        success: true,
        data: result,
        metadata: {
          execution_time_ms: duration,
          channels_count: resolvedChannels.length,
          file_size_bytes: fileSizeBytes,
          upload_speed_mbps: uploadSpeedMbps,
          has_analysis: !!analysis,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_upload_file', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_upload_file',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
