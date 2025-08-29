import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  user: z.string().optional().describe('User to check DND status (defaults to current user)'),
  include_analytics: z.boolean().optional().default(true).describe('Include DND analytics'),
  include_recommendations: z.boolean().optional().default(true).describe('Include recommendations'),
  team_dnd_overview: z.boolean().optional().default(false).describe('Include team-wide DND overview')
});

export const slackDndInfoTool: MCPTool = {
  name: 'slack_dnd_info',
  description: 'Get Do Not Disturb status and analytics for users',
  inputSchema: {
    type: 'object',
    properties: {
      user: {
        type: 'string',
        description: 'User to check DND status (defaults to current user)'
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
      team_dnd_overview: {
        type: 'boolean',
        description: 'Include team-wide DND overview',
        default: false
      }
    }
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args);
      const { 
        user,
        include_analytics,
        include_recommendations,
        team_dnd_overview
      } = validatedArgs;

      // Resolve user ID if provided
      const userId = user ? await slackClient.resolveUserId(user) : undefined;

      // Get DND info
      const dndResponse = await (slackClient as any).dnd.info({ 
        user: userId 
      });

      // Get team DND info if requested
      let teamDndInfo;
      if (team_dnd_overview) {
        try {
          teamDndInfo = await (slackClient as any).dnd.teamInfo();
        } catch (error) {
          // Continue without team info
        }
      }

      const result: any = {
        success: true,
        data: {
          user_id: userId || 'current_user',
          dnd_status: {
            dnd_enabled: dndResponse.dnd_enabled,
            next_dnd_start_ts: dndResponse.next_dnd_start_ts,
            next_dnd_end_ts: dndResponse.next_dnd_end_ts,
            snooze_enabled: dndResponse.snooze_enabled,
            snooze_endtime: dndResponse.snooze_endtime,
            snooze_remaining: dndResponse.snooze_remaining
          }
        }
      };

      // Add analytics
      if (include_analytics) {
        const now = Math.floor(Date.now() / 1000);
        const dndActive = dndResponse.dnd_enabled || (dndResponse.snooze_enabled && dndResponse.snooze_endtime > now);
        
        result.data.analytics = {
          current_status: {
            is_disturb_free: dndActive,
            status_type: dndResponse.snooze_enabled ? 'snoozed' : 
                        dndResponse.dnd_enabled ? 'dnd_scheduled' : 'available',
            time_until_available: dndActive ? 
              (dndResponse.snooze_endtime || dndResponse.next_dnd_end_ts || 0) - now : 0
          },
          schedule_analysis: {
            has_dnd_schedule: !!(dndResponse.next_dnd_start_ts && dndResponse.next_dnd_end_ts),
            next_dnd_in_hours: dndResponse.next_dnd_start_ts ? 
              Math.round((dndResponse.next_dnd_start_ts - now) / 3600) : null,
            dnd_duration_hours: (dndResponse.next_dnd_start_ts && dndResponse.next_dnd_end_ts) ?
              Math.round((dndResponse.next_dnd_end_ts - dndResponse.next_dnd_start_ts) / 3600) : null
          },
          snooze_analysis: {
            is_snoozed: dndResponse.snooze_enabled,
            snooze_remaining_minutes: dndResponse.snooze_remaining ? 
              Math.round(dndResponse.snooze_remaining / 60) : 0,
            snooze_end_time: dndResponse.snooze_endtime ? 
              new Date(dndResponse.snooze_endtime * 1000).toISOString() : null
          }
        };

        // Team overview analytics
        if (team_dnd_overview && teamDndInfo) {
          const teamUsers = Object.keys(teamDndInfo.users || {});
          const usersInDnd = teamUsers.filter(uid => {
            const userDnd = teamDndInfo.users[uid];
            return userDnd.dnd_enabled || (userDnd.snooze_enabled && userDnd.snooze_endtime > now);
          });

          result.data.analytics.team_overview = {
            total_users_checked: teamUsers.length,
            users_in_dnd: usersInDnd.length,
            availability_rate: teamUsers.length > 0 ? 
              ((teamUsers.length - usersInDnd.length) / teamUsers.length * 100).toFixed(1) + '%' : '100%',
            team_productivity_window: usersInDnd.length < teamUsers.length * 0.3 ? 'high' : 
                                    usersInDnd.length < teamUsers.length * 0.6 ? 'medium' : 'low'
          };
        }
      }

      // Add recommendations
      if (include_recommendations) {
        const recommendations = [];
        
        if (dndResponse.dnd_enabled) {
          recommendations.push('DND is active - consider if urgent communication is needed');
        }
        
        if (dndResponse.snooze_enabled) {
          const remaining = Math.round((dndResponse.snooze_remaining || 0) / 60);
          recommendations.push(`User is snoozed for ${remaining} more minutes`);
        }
        
        if (!dndResponse.dnd_enabled && !dndResponse.next_dnd_start_ts) {
          recommendations.push('No DND schedule set - consider setting work hours for better work-life balance');
        }
        
        if (result.data.analytics?.team_overview?.team_productivity_window === 'low') {
          recommendations.push('Many team members in DND - consider scheduling meetings for better availability');
        }
        
        if (result.data.analytics?.schedule_analysis?.dnd_duration_hours > 12) {
          recommendations.push('Long DND period scheduled - ensure emergency contact methods are available');
        }

        result.data.recommendations = recommendations;
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_dnd_info', args, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_dnd_info', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_dnd_info',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
