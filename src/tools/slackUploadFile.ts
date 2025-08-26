
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import * as fs from 'fs';
import * as path from 'path';


/**
 * Enhanced Slack Upload File Tool
 * Advanced file handling with metadata, thumbnails, and multi-channel support
 */
export const slackUploadFileTool: MCPTool = {
  name: 'slack_upload_file',
  description: 'Upload files to Slack channels with advanced metadata, thumbnails, and multi-channel support',
  inputSchema: {
    type: 'object',
    properties: {
      channels: {
        type: 'array',
        description: 'Channel IDs or names to upload the file to',
        items: {
          type: 'string',
        },
        minItems: 1,
      },
      file_path: {
        type: 'string',
        description: 'Local path to the file to upload',
      },
      filename: {
        type: 'string',
        description: 'Custom filename (defaults to original filename)',
      },
      title: {
        type: 'string',
        description: 'File title for display',
      },
      initial_comment: {
        type: 'string',
        description: 'Initial comment to post with the file',
      },
      thread_ts: {
        type: 'string',
        description: 'Thread timestamp to upload file as reply',
      },
      filetype: {
        type: 'string',
        description: 'File type override (auto-detected if not provided)',
      },
      snippet_type: {
        type: 'string',
        description: 'Syntax highlighting for code files',
        enum: ['javascript', 'python', 'java', 'html', 'css', 'json', 'xml', 'sql', 'bash', 'text'],
      },
      generate_preview: {
        type: 'boolean',
        description: 'Generate preview for supported file types',
        default: true,
      },
      alt_text: {
        type: 'string',
        description: 'Alt text for accessibility',
      },
    },
    required: ['channels', 'file_path'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedArgs = Validator.validate(ToolSchemas.uploadFile, args);
      
      // Check if file exists
      if (!validatedArgs.file_path) {
        throw new Error('File path is required');
      }
      
      if (!fs.existsSync(validatedArgs.file_path)) {
        throw new Error(`File not found: ${validatedArgs.file_path}`);
      }

      // Get file stats and metadata
      const fileStats = fs.statSync(validatedArgs.file_path);
      const originalFilename = path.basename(validatedArgs.file_path);
      const fileExtension = path.extname(validatedArgs.file_path).toLowerCase();
      
      // Validate file size (Slack has limits)
      const maxFileSize = 1024 * 1024 * 1024; // 1GB
      if (fileStats.size > maxFileSize) {
        throw new Error(`File too large: ${fileStats.size} bytes (max: ${maxFileSize} bytes)`);
      }

      // Resolve channel IDs
      let channelIds: string[] = [];
      if (validatedArgs.channels) {
        const channelsArray = Array.isArray(validatedArgs.channels) 
          ? validatedArgs.channels 
          : [validatedArgs.channels];
        channelIds = await Promise.all(
          channelsArray.map((channel: string) => slackClient.resolveChannelId(channel))
        );
      }

      // Determine file type
      const fileType = args.filetype || detectFileType(fileExtension);
      
      // Prepare filename
      const filename = args.filename || originalFilename;

      // Read file content
      const fileContent = fs.readFileSync(validatedArgs.file_path);

      // Use the new files.uploadV2 method instead of deprecated files.upload
      const uploadParams: any = {
        filename: filename,
        file: fileContent,
        filetype: fileType,
      };

      // Add channels if specified
      if (channelIds.length > 0) {
        uploadParams.channels = channelIds;
      }

      // Add optional parameters
      if (args.title) {
        uploadParams.title = args.title;
      }

      if (args.initial_comment) {
        uploadParams.initial_comment = args.initial_comment;
      }

      if (args.thread_ts) {
        uploadParams.thread_ts = args.thread_ts;
      }

      if (args.snippet_type && isCodeFile(fileExtension)) {
        uploadParams.filetype = args.snippet_type;
      }

      if (args.alt_text) {
        uploadParams.alt_text = args.alt_text;
      }

      // Upload the file using the new uploadV2 method
      const uploadResult = await slackClient.getClient().files.uploadV2(uploadParams);

      if (!(uploadResult as any).file) {
        throw new Error('File upload failed');
      }

      const uploadedFile = (uploadResult as any).file;

      // Generate file analysis
      const fileAnalysis = {
        size_bytes: fileStats.size,
        size_human: formatFileSize(fileStats.size),
        type: fileType,
        extension: fileExtension,
        is_image: isImageFile(fileExtension),
        is_document: isDocumentFile(fileExtension),
        is_code: isCodeFile(fileExtension),
        is_archive: isArchiveFile(fileExtension),
        mime_type: uploadedFile.mimetype,
        has_preview: !!uploadedFile.preview,
        has_thumbnail: !!uploadedFile.thumb_360,
      };

      // Get additional file metadata if it's an image
      let imageMetadata = null;
      if (fileAnalysis.is_image && uploadedFile.original_w && uploadedFile.original_h) {
        const width = Number(uploadedFile.original_w);
        const height = Number(uploadedFile.original_h);
        imageMetadata = {
          width,
          height,
          aspect_ratio: (width / height).toFixed(2),
        };
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_upload_file', args, duration);

      return {
        success: true,
        file: {
          id: uploadedFile.id,
          name: uploadedFile.name,
          title: uploadedFile.title,
          mimetype: uploadedFile.mimetype,
          filetype: uploadedFile.filetype,
          size: uploadedFile.size,
          url_private: uploadedFile.url_private,
          url_private_download: uploadedFile.url_private_download,
          permalink: uploadedFile.permalink,
          permalink_public: uploadedFile.permalink_public,
          created: uploadedFile.created ? new Date(uploadedFile.created * 1000).toISOString() : null,
          channels: uploadedFile.channels,
          shares: uploadedFile.shares,
        },
        analysis: fileAnalysis,
        image_metadata: imageMetadata,
        upload_details: {
          channels_uploaded_to: channelIds,
          original_path: validatedArgs.file_path,
          original_filename: originalFilename,
          custom_filename: args.filename || null,
          has_initial_comment: !!args.initial_comment,
          is_thread_reply: !!args.thread_ts,
        },
        metadata: {
          execution_time_ms: duration,
          file_size_bytes: fileStats.size,
          channels_count: channelIds.length,
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

/**
 * Detect file type based on extension
 */
function detectFileType(extension: string): string {
  const typeMap: Record<string, string> = {
    // Images
    '.jpg': 'jpg',
    '.jpeg': 'jpg',
    '.png': 'png',
    '.gif': 'gif',
    '.svg': 'svg',
    '.webp': 'webp',
    '.bmp': 'bmp',
    '.tiff': 'tiff',
    
    // Documents
    '.pdf': 'pdf',
    '.doc': 'doc',
    '.docx': 'docx',
    '.xls': 'xls',
    '.xlsx': 'xlsx',
    '.ppt': 'ppt',
    '.pptx': 'pptx',
    '.txt': 'text',
    '.rtf': 'rtf',
    
    // Code files
    '.js': 'javascript',
    '.ts': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.html': 'html',
    '.css': 'css',
    '.json': 'json',
    '.xml': 'xml',
    '.sql': 'sql',
    '.sh': 'bash',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    
    // Archives
    '.zip': 'zip',
    '.tar': 'tar',
    '.gz': 'gzip',
    '.rar': 'rar',
    '.7z': '7z',
    
    // Audio/Video
    '.mp3': 'mp3',
    '.wav': 'wav',
    '.mp4': 'mp4',
    '.avi': 'avi',
    '.mov': 'mov',
  };
  
  return typeMap[extension] || 'binary';
}

/**
 * Check if file is an image
 */
function isImageFile(extension: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff'];
  return imageExtensions.includes(extension);
}

/**
 * Check if file is a document
 */
function isDocumentFile(extension: string): boolean {
  const docExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'];
  return docExtensions.includes(extension);
}

/**
 * Check if file is a code file
 */
function isCodeFile(extension: string): boolean {
  const codeExtensions = ['.js', '.ts', '.py', '.java', '.html', '.css', '.json', '.xml', '.sql', '.sh', '.yml', '.yaml'];
  return codeExtensions.includes(extension);
}

/**
 * Check if file is an archive
 */
function isArchiveFile(extension: string): boolean {
  const archiveExtensions = ['.zip', '.tar', '.gz', '.rar', '.7z'];
  return archiveExtensions.includes(extension);
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
