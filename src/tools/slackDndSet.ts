import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  num_minutes: z.number().describe('Number of minutes to snooze notifications'),
  include_analytics: z.boolean().optional().default(true).describe('Include DND analytics'),
  include_recommendations: z.boolean().optional().default(true).describe('Include recommendations'),
  reason: z.string().optional().describe('Reason for setting DND (for logging)')
});

export const slackDndSetTool: MCPTool = {
  name: 'slack_dnd_set',
  description: 'Set Do Not Disturb mode with analytics and smart recommendations',
  inputSchema: {
    type: 'object',
    properties: {
      num_minutes: {
        type: 'number',
        description: 'Number of minutes to snooze notifications'
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include DND analytics',
        default: true
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations',
        default: true
      },
      reason: {
        type: 'string',
        description: 'Reason for setting DND (for logging)'
      }
    },
    required: ['num_minutes']
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args);
      const { 
        num_minutes,
        include_analytics,
        include_recommendations,
        reason
      } = validatedArgs;

      // Set DND
      const dndResponse = await (slackClient as any).dnd.setSnooze({ 
        num_minutes 
      });

      const endTime = Math.floor(Date.now() / 1000) + (num_minutes * 60);

      const result: any = {
        success: true,
        data: {
          dnd_enabled: true,
          snooze_duration_minutes: num_minutes,
          snooze_end_time: new Date(endTime * 1000).toISOString(),
          snooze_end_timestamp: endTime,
          reason: reason || 'Not specified',
          set_time: new Date().toISOString()
        }
      };

      // Add analytics
      if (include_analytics) {
        const durationCategory = 
          num_minutes <= 30 ? 'short' :
          num_minutes <= 120 ? 'medium' :
          num_minutes <= 480 ? 'long' : 'extended';

        const timeOfDay = new Date().getHours();
        const workingHours = timeOfDay >= 9 && timeOfDay <= 17;

        result.data.analytics = {
          dnd_analysis: {
            duration_category: durationCategory,
            duration_hours: (num_minutes / 60).toFixed(1),
            set_during_work_hours: workingHours,
            time_of_day: timeOfDay,
            estimated_productivity_impact: durationCategory === 'short' ? 'minimal' :
                                         durationCategory === 'medium' ? 'moderate' : 'significant'
          },
          timing_insights: {
            end_time_formatted: new Date(endTime * 1000).toLocaleString(),
            crosses_work_boundary: workingHours && (timeOfDay + num_minutes / 60) > 17,
            weekend_dnd: [0, 6].includes(new Date().getDay())
          },
          usage_patterns: {
            common_duration: num_minutes === 60 || num_minutes === 30 || num_minutes === 120,
            focus_session: num_minutes >= 25 && num_minutes <= 90,
            meeting_block: num_minutes >= 30 && num_minutes <= 120
          }
        };
      }

      // Add recommendations
      if (include_recommendations) {
        const recommendations = [];
        
        if (num_minutes > 480) { // > 8 hours
          recommendations.push('Very long DND period - ensure emergency contacts are available');
        }
        
        if (num_minutes < 15) {
          recommendations.push('Short DND period - consider longer blocks for deep focus work');
        }
        
        const timeOfDay = new Date().getHours();
        if (timeOfDay >= 17 || timeOfDay <= 9) {
          recommendations.push('DND set outside work hours - good work-life balance practice');
        }
        
        if (num_minutes >= 25 && num_minutes <= 90) {
          recommendations.push('Good focus session duration - consider using Pomodoro technique');
        }
        
        if ([0, 6].includes(new Date().getDay())) {
          recommendations.push('Weekend DND set - prioritizing rest and personal time');
        }
        
        if (num_minutes === 60) {
          recommendations.push('Standard 1-hour focus block - ideal for deep work sessions');
        }

        result.data.recommendations = recommendations;
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_dnd_set', args, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_dnd_set', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_dnd_set',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
