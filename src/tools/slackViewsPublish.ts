/**
 * Enhanced Slack Views Publish Tool v2.0.0
 * Comprehensive view publishing with Block Kit support, analytics, and engagement tracking
 */

import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

/**
 * Block Kit block schema (simplified)
 */
const blockSchema = z.object({
  type: z.string(),
  block_id: z.string().optional(),
  text: z.any().optional(),
  elements: z.array(z.any()).optional(),
  accessory: z.any().optional(),
  fields: z.array(z.any()).optional(),
}).passthrough();

/**
 * View schema
 */
const viewSchema = z.object({
  type: z.enum(['home', 'modal', 'workflow_step']),
  blocks: z.array(blockSchema),
  private_metadata: z.string().max(3000).optional(),
  callback_id: z.string().max(255).optional(),
  external_id: z.string().max(255).optional(),
  title: z.object({
    type: z.literal('plain_text'),
    text: z.string().max(24),
    emoji: z.boolean().optional(),
  }).optional(),
  submit: z.object({
    type: z.literal('plain_text'),
    text: z.string().max(24),
    emoji: z.boolean().optional(),
  }).optional(),
  close: z.object({
    type: z.literal('plain_text'),
    text: z.string().max(24),
    emoji: z.boolean().optional(),
  }).optional(),
  clear_on_close: z.boolean().optional(),
  notify_on_close: z.boolean().optional(),
});

/**
 * Input validation schema
 */
const inputSchema = z.object({
  user_id: z.string()
    .min(1, 'User ID is required')
    .regex(/^U[A-Z0-9]{8,}$/, 'User ID must be a valid Slack user ID (U1234567890)'),
  view: viewSchema,
  hash: z.string().optional(),
  include_analytics: z.boolean().default(true),
  include_recommendations: z.boolean().default(true),
  validate_blocks: z.boolean().default(true),
  track_engagement: z.boolean().default(false),
  template: z.enum([
    'welcome',
    'dashboard',
    'profile',
    'custom'
  ]).optional(),
});

type SlackViewsPublishArgs = z.infer<typeof inputSchema>;

/**
 * View analytics interface
 */
interface ViewAnalytics {
  publish_success: boolean;
  view_type: string;
  block_count: number;
  complexity_score: number; // 0-100
  estimated_load_time_ms: number;
  accessibility_score: number; // 0-100
  view_insights: {
    has_interactive_elements: boolean;
    has_images: boolean;
    has_text_inputs: boolean;
    has_buttons: boolean;
    has_sections: boolean;
    estimated_height_px: number;
  };
  performance_metrics: {
    validation_time_ms: number;
    publish_time_ms: number;
    total_time_ms: number;
  };
  recommendations: string[];
  warnings: string[];
}

/**
 * View templates
 */
const VIEW_TEMPLATES = {
  welcome: {
    type: 'home' as const,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Welcome to the App! 👋*\n\nWe\'re excited to have you here. Get started by exploring the features below.'
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Quick Actions*'
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Get Started'
            },
            action_id: 'get_started',
            style: 'primary'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Learn More'
            },
            action_id: 'learn_more'
          }
        ]
      }
    ]
  },
  dashboard: {
    type: 'home' as const,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Dashboard 📊*\n\nHere\'s your overview:'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: '*Status:*\nActive'
          },
          {
            type: 'mrkdwn',
            text: '*Last Updated:*\nJust now'
          }
        ]
      }
    ]
  },
  profile: {
    type: 'home' as const,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Your Profile 👤*\n\nManage your account settings and preferences.'
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Edit Profile'
            },
            action_id: 'edit_profile'
          }
        ]
      }
    ]
  }
};

/**
 * View result interface
 */
interface ViewResult {
  success: boolean;
  view_published: boolean;
  view_id?: string;
  view_hash?: string;
  user_id: string;
  view_type: string;
  analytics?: ViewAnalytics;
  recommendations?: string[];
  warnings?: string[];
}

export const slackViewsPublishTool: MCPTool = {
  name: 'slack_views_publish',
  description: 'Publish Slack views (Home tabs, modals) with Block Kit support, analytics, and engagement tracking',
  inputSchema: {
    type: 'object',
    properties: {
      user_id: {
        type: 'string',
        description: 'User ID to publish view for (U1234567890)',
      },
      view: {
        type: 'object',
        description: 'View object with blocks and metadata',
        properties: {
          type: {
            type: 'string',
            enum: ['home', 'modal', 'workflow_step'],
            description: 'Type of view to publish',
          },
          blocks: {
            type: 'array',
            description: 'Array of Block Kit blocks',
            items: { type: 'object' },
          },
          private_metadata: {
            type: 'string',
            description: 'Private metadata for the view (max 3000 chars)',
            maxLength: 3000,
          },
          callback_id: {
            type: 'string',
            description: 'Callback ID for the view (max 255 chars)',
            maxLength: 255,
          },
          external_id: {
            type: 'string',
            description: 'External ID for the view (max 255 chars)',
            maxLength: 255,
          },
        },
        required: ['type', 'blocks'],
      },
      hash: {
        type: 'string',
        description: 'Hash of the view being updated (for optimistic updates)',
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include view analytics and performance metrics',
        default: true,
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations for view optimization',
        default: true,
      },
      validate_blocks: {
        type: 'boolean',
        description: 'Validate Block Kit blocks before publishing',
        default: true,
      },
      track_engagement: {
        type: 'boolean',
        description: 'Enable engagement tracking for the view',
        default: false,
      },
      template: {
        type: 'string',
        description: 'Use a pre-defined template',
        enum: ['welcome', 'dashboard', 'profile', 'custom'],
      },
    },
    required: ['user_id', 'view'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackViewsPublishArgs;
      const client = slackClient.getClient();
      
      let viewAnalytics: ViewAnalytics = {
        publish_success: false,
        view_type: validatedArgs.view.type,
        block_count: validatedArgs.view.blocks.length,
        complexity_score: 0,
        estimated_load_time_ms: 0,
        accessibility_score: 0,
        view_insights: {
          has_interactive_elements: false,
          has_images: false,
          has_text_inputs: false,
          has_buttons: false,
          has_sections: false,
          estimated_height_px: 0,
        },
        performance_metrics: {
          validation_time_ms: 0,
          publish_time_ms: 0,
          total_time_ms: 0,
        },
        recommendations: [],
        warnings: [],
      };

      let finalView = validatedArgs.view;
      let warnings: string[] = [];

      // Step 1: Apply template if specified
      if (validatedArgs.template && validatedArgs.template !== 'custom') {
        const template = VIEW_TEMPLATES[validatedArgs.template as keyof typeof VIEW_TEMPLATES];
        if (template) {
          finalView = {
            ...template,
            ...validatedArgs.view,
            blocks: validatedArgs.view.blocks.length > 0 ? validatedArgs.view.blocks : template.blocks,
          };
        }
      }

      // Step 2: Validate blocks if requested
      const validationStart = Date.now();
      if (validatedArgs.validate_blocks) {
        try {
          const validationResult = this.validateBlocks(finalView.blocks);
          if (!validationResult.valid) {
            warnings.push(`Block validation warnings: ${validationResult.warnings.join(', ')}`);
          }
          viewAnalytics.accessibility_score = validationResult.accessibilityScore;
        } catch (error) {
          warnings.push('Block validation failed - proceeding with publish attempt');
        }
      }
      viewAnalytics.performance_metrics.validation_time_ms = Date.now() - validationStart;

      // Step 3: Analyze view complexity and insights
      viewAnalytics.view_insights = this.analyzeViewInsights(finalView.blocks);
      viewAnalytics.complexity_score = this.calculateComplexityScore(finalView.blocks);
      viewAnalytics.estimated_load_time_ms = this.estimateLoadTime(finalView.blocks);

      // Step 4: Publish the view
      const publishStart = Date.now();
      try {
        const publishResult = await client.views.publish({
          user_id: validatedArgs.user_id,
          view: finalView as any, // Type assertion for Slack API compatibility
          hash: validatedArgs.hash,
        });

        if (publishResult.ok) {
          viewAnalytics.publish_success = true;
          viewAnalytics.performance_metrics.publish_time_ms = Date.now() - publishStart;
        } else {
          throw new Error(`Failed to publish view: ${publishResult.error}`);
        }

        // Step 5: Generate recommendations
        if (validatedArgs.include_recommendations) {
          viewAnalytics.recommendations = this.generateRecommendations(finalView, viewAnalytics);
        }

        viewAnalytics.warnings = warnings;

        const duration = Date.now() - startTime;
        viewAnalytics.performance_metrics.total_time_ms = duration;
        
        logger.logToolExecution('slack_views_publish', args, duration);

        return {
          success: true,
          data: {
            success: true,
            view_published: true,
            view_id: publishResult.view?.id,
            view_hash: publishResult.view?.hash,
            user_id: validatedArgs.user_id,
            view_type: finalView.type,
            analytics: validatedArgs.include_analytics ? viewAnalytics : undefined,
            recommendations: validatedArgs.include_recommendations ? viewAnalytics.recommendations : undefined,
            warnings: warnings.length > 0 ? warnings : undefined,
          } as ViewResult,
          metadata: {
            execution_time_ms: duration,
            operation_type: 'view_publish',
            view_type: finalView.type,
            block_count: finalView.blocks.length,
            complexity_score: viewAnalytics.complexity_score,
          },
        };

      } catch (error: any) {
        // Handle specific Slack API errors
        if (error.data?.error === 'not_enabled') {
          throw new Error('App Home feature is not enabled for this app. Please enable App Home in your Slack app configuration under "App Home" settings.');
        } else if (error.data?.error === 'invalid_blocks') {
          throw new Error('Invalid Block Kit blocks provided. Please check your block structure and try again.');
        } else if (error.data?.error === 'view_too_large') {
          throw new Error('View is too large. Please reduce the number of blocks or simplify the content.');
        }
        throw error;
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_views_publish', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_views_publish',
        args,
        execution_time_ms: duration,
      });
    }
  },

  /**
   * Validate Block Kit blocks
   */
  validateBlocks(blocks: any[]): { valid: boolean; warnings: string[]; accessibilityScore: number } {
    const warnings: string[] = [];
    let accessibilityScore = 100;

    for (const block of blocks) {
      // Check for accessibility issues
      if (block.type === 'image' && !block.alt_text) {
        warnings.push('Image blocks should include alt_text for accessibility');
        accessibilityScore -= 10;
      }

      if (block.type === 'section' && block.text && block.text.text && block.text.text.length > 3000) {
        warnings.push('Section text is very long - consider breaking into multiple sections');
        accessibilityScore -= 5;
      }

      // Check for interactive elements without proper labels
      if (block.type === 'actions' && block.elements) {
        for (const element of block.elements) {
          if (element.type === 'button' && !element.text) {
            warnings.push('Button elements should have descriptive text');
            accessibilityScore -= 5;
          }
        }
      }
    }

    return {
      valid: warnings.length === 0,
      warnings,
      accessibilityScore: Math.max(accessibilityScore, 0),
    };
  },

  /**
   * Analyze view insights
   */
  analyzeViewInsights(blocks: any[]): ViewAnalytics['view_insights'] {
    const insights = {
      has_interactive_elements: false,
      has_images: false,
      has_text_inputs: false,
      has_buttons: false,
      has_sections: false,
      estimated_height_px: 0,
    };

    let estimatedHeight = 0;

    for (const block of blocks) {
      switch (block.type) {
        case 'section':
          insights.has_sections = true;
          estimatedHeight += 60; // Base section height
          if (block.accessory) {
            estimatedHeight += 20;
          }
          break;
        case 'actions':
          insights.has_interactive_elements = true;
          if (block.elements) {
            insights.has_buttons = block.elements.some((el: any) => el.type === 'button');
          }
          estimatedHeight += 50;
          break;
        case 'image':
          insights.has_images = true;
          estimatedHeight += 200; // Estimated image height
          break;
        case 'input':
          insights.has_text_inputs = true;
          insights.has_interactive_elements = true;
          estimatedHeight += 80;
          break;
        case 'divider':
          estimatedHeight += 20;
          break;
        case 'context':
          estimatedHeight += 30;
          break;
        case 'header':
          estimatedHeight += 40;
          break;
        default:
          estimatedHeight += 40; // Default block height
      }
    }

    insights.estimated_height_px = estimatedHeight;
    return insights;
  },

  /**
   * Calculate complexity score (0-100)
   */
  calculateComplexityScore(blocks: any[]): number {
    let score = 0;
    
    // Base score from block count
    score += Math.min(blocks.length * 2, 30);
    
    // Add complexity for different block types
    for (const block of blocks) {
      switch (block.type) {
        case 'section':
          score += 5;
          if (block.accessory) score += 5;
          if (block.fields) score += block.fields.length * 2;
          break;
        case 'actions':
          score += 10;
          if (block.elements) score += block.elements.length * 3;
          break;
        case 'input':
          score += 15; // Input blocks are complex
          break;
        case 'image':
          score += 8;
          break;
        default:
          score += 3;
      }
    }
    
    return Math.min(score, 100);
  },

  /**
   * Estimate load time based on view complexity
   */
  estimateLoadTime(blocks: any[]): number {
    let baseTime = 100; // Base load time in ms
    
    // Add time for each block type
    for (const block of blocks) {
      switch (block.type) {
        case 'image':
          baseTime += 200; // Images take longer to load
          break;
        case 'actions':
          baseTime += 50; // Interactive elements
          break;
        case 'input':
          baseTime += 75; // Form elements
          break;
        default:
          baseTime += 25;
      }
    }
    
    return baseTime;
  },

  /**
   * Generate recommendations for view optimization
   */
  generateRecommendations(view: any, analytics: ViewAnalytics): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (analytics.complexity_score > 80) {
      recommendations.push('High complexity view - consider simplifying or breaking into multiple views');
    }

    if (analytics.estimated_load_time_ms > 1000) {
      recommendations.push('View may load slowly - consider reducing the number of images or complex elements');
    }

    // Accessibility recommendations
    if (analytics.accessibility_score < 80) {
      recommendations.push('Consider improving accessibility by adding alt text to images and descriptive labels');
    }

    // UX recommendations
    if (analytics.view_insights.estimated_height_px > 2000) {
      recommendations.push('Very tall view - users may need to scroll extensively. Consider pagination or collapsible sections');
    }

    if (!analytics.view_insights.has_interactive_elements) {
      recommendations.push('Static view detected - consider adding interactive elements to improve engagement');
    }

    if (analytics.block_count > 20) {
      recommendations.push('Many blocks detected - consider grouping related content or using progressive disclosure');
    }

    // Content recommendations
    if (analytics.view_insights.has_images && !analytics.view_insights.has_sections) {
      recommendations.push('Consider adding section blocks to provide context for images');
    }

    if (analytics.view_insights.has_buttons && analytics.view_insights.has_text_inputs) {
      recommendations.push('Form-like interface detected - ensure clear submit/cancel actions');
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('View looks well-structured! Consider A/B testing different layouts for optimization');
    }

    return recommendations;
  },

  /**
   * Get available view templates
   */
  getAvailableTemplates(): typeof VIEW_TEMPLATES {
    return VIEW_TEMPLATES;
  },
};

export default slackViewsPublishTool;
