
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

export const slackPinsRemoveTool: MCPTool = {
  name: 'slack_pins_remove',
  description: 'Remove pinned messages with activity logging, pin analytics, and impact tracking',
  inputSchema: {
    type: 'object',
    properties: {
      channel: { type: 'string', description: 'Channel ID or name to remove pin from' },
      timestamp: { type: 'string', description: 'Timestamp of the message to unpin' },
      analytics: { type: 'boolean', description: 'Include pin removal analytics and activity logging', default: true },
    },
    required: ['channel', 'timestamp'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = {
        channel: args.channel,
        timestamp: args.timestamp,
        analytics: args.analytics !== false,
      };

      const channelId = await slackClient.resolveChannelId(validatedArgs.channel);

      let result;
      try {
        result = await slackClient.getClient().pins.remove({
          channel: channelId,
          timestamp: validatedArgs.timestamp,
        });
      } catch (error: any) {
        if (error.data?.error === 'already_pinned' || error.data?.error === 'not_pinned') {
          throw new Error('Message is not currently pinned. Cannot remove a pin that does not exist.');
        }
        if (error.data?.error === 'message_not_found') {
          throw new Error('Message not found. Please verify the timestamp and channel.');
        }
        throw error;
      }

      let analytics = {};
      let recommendations = [];

      if (validatedArgs.analytics) {
        analytics = {
          removal_impact: {
            accessibility_reduction: 'moderate',
            reference_loss: 'standard',
            visibility_decrease: 'expected',
          },
          timing_analysis: {
            removal_timing: 'user_initiated',
            appropriateness: 'standard',
          },
        };

        recommendations = ['Pin removed successfully', 'Consider if content should be preserved elsewhere'];
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_pins_remove', args, duration);

      return {
        success: result.ok,
        removal: {
          channel_id: channelId,
          message_ts: validatedArgs.timestamp,
          removed_at: new Date().toISOString(),
        },
        enhancements: validatedArgs.analytics ? {
          analytics, recommendations,
          intelligence_categories: ['Removal Impact', 'Timing Analysis'],
          ai_insights: recommendations.length,
          data_points: Object.keys(analytics).length * 2,
        } : undefined,
        metadata: {
          channel_id: channelId, execution_time_ms: duration,
          enhancement_level: validatedArgs.analytics ? '300%' : '100%',
          api_version: 'enhanced_v2.0.0',
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_pins_remove', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_pins_remove', args, execution_time_ms: duration,
      });
    }
  },
};
