import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  include_analytics: z.boolean().optional().default(true).describe('Include team analytics'),
  include_recommendations: z.boolean().optional().default(true).describe('Include recommendations'),
  detailed_analysis: z.boolean().optional().default(false).describe('Include detailed team analysis'),
  include_billing: z.boolean().optional().default(false).describe('Include billing information (admin only)')
});

export const slackTeamInfoTool: MCPTool = {
  name: 'slack_team_info',
  description: 'Get comprehensive Slack team information with analytics',
  inputSchema: {
    type: 'object',
    properties: {
      include_analytics: {
        type: 'boolean',
        description: 'Include team analytics',
        default: true
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations',
        default: true
      },
      detailed_analysis: {
        type: 'boolean',
        description: 'Include detailed team analysis',
        default: false
      },
      include_billing: {
        type: 'boolean',
        description: 'Include billing information (admin only)',
        default: false
      }
    }
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args);
      const { 
        include_analytics,
        include_recommendations,
        detailed_analysis,
        include_billing
      } = validatedArgs;

      // Get team info
      const teamResponse = await (slackClient as any).team.info();
      const team = teamResponse.team;

      // Get additional data for analytics
      let usersResponse, channelsResponse, billingInfo;
      
      if (include_analytics || detailed_analysis) {
        try {
          [usersResponse, channelsResponse] = await Promise.all([
            (slackClient as any).users.list({ limit: 1000 }),
            (slackClient as any).conversations.list({ limit: 1000, types: 'public_channel,private_channel' })
          ]);
        } catch (error) {
          // Continue without additional data
        }
      }

      if (include_billing) {
        try {
          billingInfo = await (slackClient as any).team.billableInfo();
        } catch (error) {
          // Billing info requires admin permissions
        }
      }

      const result: any = {
        success: true,
        data: {
          team_info: {
            id: team.id,
            name: team.name,
            domain: team.domain,
            email_domain: team.email_domain,
            icon: team.icon,
            enterprise_id: team.enterprise_id,
            enterprise_name: team.enterprise_name
          },
          creation_info: {
            created: team.created,
            created_formatted: new Date(team.created * 1000).toISOString()
          }
        }
      };

      // Add analytics
      if (include_analytics && (usersResponse || channelsResponse)) {
        const users = usersResponse?.members || [];
        const channels = channelsResponse?.channels || [];
        
        const activeUsers = users.filter((u: any) => !u.deleted && !u.is_bot);
        const botUsers = users.filter((u: any) => u.is_bot);
        const publicChannels = channels.filter((c: any) => !c.is_private);
        const privateChannels = channels.filter((c: any) => c.is_private);

        result.data.analytics = {
          team_metrics: {
            total_users: users.length,
            active_users: activeUsers.length,
            bot_users: botUsers.length,
            admin_users: users.filter((u: any) => u.is_admin).length,
            owner_users: users.filter((u: any) => u.is_owner).length
          },
          channel_metrics: {
            total_channels: channels.length,
            public_channels: publicChannels.length,
            private_channels: privateChannels.length,
            archived_channels: channels.filter((c: any) => c.is_archived).length
          },
          engagement_metrics: {
            avg_channel_members: channels.length > 0 ? 
              Math.round(channels.reduce((sum: number, c: any) => sum + (c.num_members || 0), 0) / channels.length) : 0,
            channels_per_user: activeUsers.length > 0 ? (channels.length / activeUsers.length).toFixed(1) : 0
          },
          team_health: {
            user_diversity: users.filter((u: any) => u.tz).length / Math.max(users.length, 1) * 100,
            admin_ratio: (users.filter((u: any) => u.is_admin).length / Math.max(activeUsers.length, 1) * 100).toFixed(1) + '%'
          }
        };

        // Detailed analysis
        if (detailed_analysis) {
          result.data.analytics.detailed_analysis = {
            timezone_distribution: users.reduce((acc: any, u: any) => {
              if (u.tz) {
                acc[u.tz] = (acc[u.tz] || 0) + 1;
              }
              return acc;
            }, {}),
            channel_activity: {
              most_active_channels: channels
                .sort((a: any, b: any) => (b.num_members || 0) - (a.num_members || 0))
                .slice(0, 5)
                .map((c: any) => ({ name: c.name, members: c.num_members })),
              channel_creation_trend: 'Analysis not available'
            },
            user_patterns: {
              profile_completion_rate: (users.filter((u: any) => u.profile?.real_name).length / Math.max(users.length, 1) * 100).toFixed(1) + '%',
              two_factor_adoption: (users.filter((u: any) => u.has_2fa).length / Math.max(activeUsers.length, 1) * 100).toFixed(1) + '%'
            }
          };
        }
      }

      // Add billing info if available
      if (include_billing && billingInfo) {
        result.data.billing_info = {
          billable_users: billingInfo.billable_info ? Object.keys(billingInfo.billable_info).length : 0,
          billing_active: !!billingInfo.billable_info
        };
      }

      // Add recommendations
      if (include_recommendations) {
        const recommendations = [];
        
        if (result.data.analytics) {
          const metrics = result.data.analytics;
          
          if (metrics.team_metrics.admin_users === 0) {
            recommendations.push('⚠️ No admin users detected - ensure proper administrative access');
          }
          
          if (parseFloat(metrics.team_health.admin_ratio) > 20) {
            recommendations.push('High admin ratio - consider reviewing admin permissions');
          }
          
          if (metrics.channel_metrics.private_channels > metrics.channel_metrics.public_channels * 2) {
            recommendations.push('Many private channels - consider promoting transparency with public channels');
          }
          
          if (metrics.team_metrics.bot_users > metrics.team_metrics.active_users * 0.3) {
            recommendations.push('High bot-to-user ratio - review bot necessity and permissions');
          }
        }

        if (!team.email_domain) {
          recommendations.push('No email domain configured - consider setting up SSO');
        }

        result.data.recommendations = recommendations;
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_team_info', args, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_team_info', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_team_info',
        args,
        execution_time_ms: duration,
      });
    }
  },
};
