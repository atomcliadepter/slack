/**
 * Enhanced Slack Workspace Info Tool v2.0.0
 * Comprehensive workspace analytics with team insights and usage statistics
 */

import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

/**
 * Input validation schema
 */
const inputSchema = z.object({
  include_stats: z.boolean().default(true),
  include_channels: z.boolean().default(true),
  include_users: z.boolean().default(true),
  include_integrations: z.boolean().default(false),
  include_billing: z.boolean().default(false),
  analyze_activity: z.boolean().default(false),
  include_analytics: z.boolean().default(true),
  include_recommendations: z.boolean().default(true),
  detailed_analysis: z.boolean().default(false),
});

type SlackWorkspaceInfoArgs = z.infer<typeof inputSchema>;

/**
 * Workspace analytics interface
 */
interface WorkspaceAnalytics {
  workspace_health_score: number; // 0-100
  activity_level: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  growth_trend: 'growing' | 'stable' | 'declining';
  engagement_metrics: {
    daily_active_users_estimate: number;
    messages_per_user_estimate: number;
    channels_per_user: number;
    average_channel_size: number;
  };
  workspace_insights: {
    most_active_time: string;
    channel_distribution: {
      public_channels: number;
      private_channels: number;
      archived_channels: number;
    };
    user_distribution: {
      admins: number;
      members: number;
      guests: number;
      bots: number;
    };
  };
  recommendations: string[];
  warnings: string[];
}

/**
 * Workspace information interface
 */
interface WorkspaceInfo {
  team: {
    id: string;
    name: string;
    domain: string;
    email_domain?: string;
    icon?: {
      image_34?: string;
      image_44?: string;
      image_68?: string;
      image_88?: string;
      image_102?: string;
      image_132?: string;
      image_230?: string;
    };
    enterprise_id?: string;
    enterprise_name?: string;
  };
  plan?: {
    type: string;
    name: string;
  };
  stats?: {
    total_members: number;
    total_channels: number;
    total_public_channels: number;
    total_private_channels: number;
    total_archived_channels: number;
    total_bots: number;
    total_guests: number;
  };
  features?: {
    enterprise_compliance?: boolean;
    ldap?: boolean;
    sso?: boolean;
    two_factor_auth?: boolean;
    guest_access?: boolean;
    shared_channels?: boolean;
  };
  limits?: {
    max_members?: number;
    max_integrations?: number;
    message_retention_days?: number;
    file_storage_gb?: number;
  };
  integrations?: {
    total_apps: number;
    custom_apps: number;
    workflow_apps: number;
    popular_apps: string[];
  };
  analytics?: WorkspaceAnalytics;
}

/**
 * Workspace result interface
 */
interface WorkspaceResult {
  success: boolean;
  workspace_info: WorkspaceInfo;
  analytics?: WorkspaceAnalytics;
  recommendations?: string[];
  warnings?: string[];
  metadata: {
    data_freshness: string;
    analysis_depth: 'basic' | 'standard' | 'comprehensive';
    permissions_level: 'user' | 'admin' | 'owner';
  };
}

export const slackWorkspaceInfoTool: MCPTool = {
  name: 'slack_workspace_info',
  description: 'Get comprehensive workspace information including team analytics, usage statistics, and insights',
  inputSchema: {
    type: 'object',
    properties: {
      include_stats: {
        type: 'boolean',
        description: 'Include detailed workspace statistics',
        default: true,
      },
      include_channels: {
        type: 'boolean',
        description: 'Include channel statistics and analysis',
        default: true,
      },
      include_users: {
        type: 'boolean',
        description: 'Include user statistics and distribution',
        default: true,
      },
      include_integrations: {
        type: 'boolean',
        description: 'Include information about installed apps and integrations',
        default: false,
      },
      include_billing: {
        type: 'boolean',
        description: 'Include billing and plan information (requires admin permissions)',
        default: false,
      },
      analyze_activity: {
        type: 'boolean',
        description: 'Analyze workspace activity patterns and engagement',
        default: false,
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include comprehensive workspace analytics',
        default: true,
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations for workspace optimization',
        default: true,
      },
      detailed_analysis: {
        type: 'boolean',
        description: 'Perform detailed analysis (may take longer)',
        default: false,
      },
    },
    required: [],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackWorkspaceInfoArgs;
      const client = slackClient.getClient();
      
      let workspaceInfo: WorkspaceInfo = {
        team: {
          id: '',
          name: '',
          domain: '',
        },
      };
      
      let workspaceAnalytics: WorkspaceAnalytics = {
        workspace_health_score: 0,
        activity_level: 'medium',
        growth_trend: 'stable',
        engagement_metrics: {
          daily_active_users_estimate: 0,
          messages_per_user_estimate: 0,
          channels_per_user: 0,
          average_channel_size: 0,
        },
        workspace_insights: {
          most_active_time: 'Unknown',
          channel_distribution: {
            public_channels: 0,
            private_channels: 0,
            archived_channels: 0,
          },
          user_distribution: {
            admins: 0,
            members: 0,
            guests: 0,
            bots: 0,
          },
        },
        recommendations: [],
        warnings: [],
      };

      let warnings: string[] = [];
      let permissionLevel: 'user' | 'admin' | 'owner' = 'user';

      // Step 1: Get basic team information
      try {
        const teamResult = await client.team.info();
        if (teamResult.ok && teamResult.team) {
          workspaceInfo.team = {
            id: teamResult.team.id || '',
            name: teamResult.team.name || '',
            domain: teamResult.team.domain || '',
            email_domain: teamResult.team.email_domain,
            icon: teamResult.team.icon,
            enterprise_id: teamResult.team.enterprise_id,
            enterprise_name: teamResult.team.enterprise_name,
          };
        }
      } catch (error) {
        warnings.push('Could not retrieve basic team information');
      }

      // Step 2: Get authentication info to determine permission level
      try {
        const authResult = await client.auth.test();
        if (authResult.ok) {
          if ((authResult as any).is_owner) {
            permissionLevel = 'owner';
          } else if ((authResult as any).is_admin) {
            permissionLevel = 'admin';
          }
        }
      } catch (error) {
        warnings.push('Could not determine user permission level');
      }

      // Step 3: Get billing/plan information (admin only)
      if (validatedArgs.include_billing && (permissionLevel === 'admin' || permissionLevel === 'owner')) {
        try {
          const billingResult = await client.team.billableInfo();
          if (billingResult.ok) {
            // Extract plan information from billing data
            workspaceInfo.plan = {
              type: 'unknown',
              name: 'Unknown Plan',
            };
          }
        } catch (error) {
          warnings.push('Could not retrieve billing information');
        }
      }

      // Step 4: Get channel statistics
      if (validatedArgs.include_channels) {
        try {
          const channelsResult = await client.conversations.list({
            types: 'public_channel,private_channel',
            limit: 1000,
          });
          
          if (channelsResult.ok && channelsResult.channels) {
            const channels = channelsResult.channels;
            const publicChannels = channels.filter((ch: any) => !ch.is_private && !ch.is_archived);
            const privateChannels = channels.filter((ch: any) => ch.is_private && !ch.is_archived);
            const archivedChannels = channels.filter((ch: any) => ch.is_archived);
            
            workspaceInfo.stats = {
              total_members: workspaceInfo.stats?.total_members || 0,
              total_bots: workspaceInfo.stats?.total_bots || 0,
              total_guests: workspaceInfo.stats?.total_guests || 0,
              total_channels: channels.length,
              total_public_channels: publicChannels.length,
              total_private_channels: privateChannels.length,
              total_archived_channels: archivedChannels.length,
            };
            
            workspaceAnalytics.workspace_insights.channel_distribution = {
              public_channels: publicChannels.length,
              private_channels: privateChannels.length,
              archived_channels: archivedChannels.length,
            };
            
            // Calculate average channel size
            const channelsWithMembers = channels.filter((ch: any) => ch.num_members);
            if (channelsWithMembers.length > 0) {
              const totalMembers = channelsWithMembers.reduce((sum: number, ch: any) => sum + (ch.num_members || 0), 0);
              workspaceAnalytics.engagement_metrics.average_channel_size = Math.round(totalMembers / channelsWithMembers.length);
            }
          }
        } catch (error) {
          warnings.push('Could not retrieve channel statistics');
        }
      }

      // Step 5: Get user statistics
      if (validatedArgs.include_users) {
        try {
          const usersResult = await client.users.list({
            limit: 1000,
          });
          
          if (usersResult.ok && usersResult.members) {
            const users = usersResult.members;
            const activeUsers = users.filter((user: any) => !user.deleted && !user.is_bot);
            const bots = users.filter((user: any) => user.is_bot);
            const admins = users.filter((user: any) => user.is_admin || user.is_owner);
            const guests = users.filter((user: any) => user.is_restricted || user.is_ultra_restricted);
            const members = activeUsers.filter((user: any) => !user.is_admin && !user.is_owner && !user.is_restricted && !user.is_ultra_restricted);
            
            workspaceInfo.stats = {
              total_channels: workspaceInfo.stats?.total_channels || 0,
              total_public_channels: workspaceInfo.stats?.total_public_channels || 0,
              total_private_channels: workspaceInfo.stats?.total_private_channels || 0,
              total_archived_channels: workspaceInfo.stats?.total_archived_channels || 0,
              total_members: activeUsers.length,
              total_bots: bots.length,
              total_guests: guests.length,
            };
            
            workspaceAnalytics.workspace_insights.user_distribution = {
              admins: admins.length,
              members: members.length,
              guests: guests.length,
              bots: bots.length,
            };
            
            // Calculate channels per user
            if (workspaceInfo.stats?.total_channels && activeUsers.length > 0) {
              workspaceAnalytics.engagement_metrics.channels_per_user = 
                Math.round((workspaceInfo.stats.total_channels / activeUsers.length) * 10) / 10;
            }
          }
        } catch (error) {
          warnings.push('Could not retrieve user statistics');
        }
      }

      // Step 6: Analyze integrations (if requested)
      if (validatedArgs.include_integrations) {
        try {
          // Note: This would require additional API calls to get app information
          // For now, we'll provide a placeholder structure
          workspaceInfo.integrations = {
            total_apps: 0,
            custom_apps: 0,
            workflow_apps: 0,
            popular_apps: [],
          };
        } catch (error) {
          warnings.push('Could not retrieve integration information');
        }
      }

      // Step 7: Perform activity analysis (if requested)
      if (validatedArgs.analyze_activity) {
        try {
          // Sample a few channels to estimate activity
          const sampleChannels = await this.sampleChannelActivity(client);
          if (sampleChannels.length > 0) {
            const avgMessagesPerChannel = sampleChannels.reduce((sum: number, ch: any) => sum + ch.messageCount, 0) / sampleChannels.length;
            workspaceAnalytics.engagement_metrics.messages_per_user_estimate = Math.round(avgMessagesPerChannel * 0.1); // Rough estimate
            
            // Determine activity level
            if (avgMessagesPerChannel > 50) {
              workspaceAnalytics.activity_level = 'very_high';
            } else if (avgMessagesPerChannel > 20) {
              workspaceAnalytics.activity_level = 'high';
            } else if (avgMessagesPerChannel > 10) {
              workspaceAnalytics.activity_level = 'medium';
            } else if (avgMessagesPerChannel > 5) {
              workspaceAnalytics.activity_level = 'low';
            } else {
              workspaceAnalytics.activity_level = 'very_low';
            }
          }
        } catch (error) {
          warnings.push('Could not analyze workspace activity');
        }
      }

      // Step 8: Calculate workspace health score
      workspaceAnalytics.workspace_health_score = this.calculateHealthScore(workspaceInfo, workspaceAnalytics);

      // Step 9: Generate recommendations
      if (validatedArgs.include_recommendations) {
        workspaceAnalytics.recommendations = this.generateRecommendations(workspaceInfo, workspaceAnalytics);
      }

      workspaceAnalytics.warnings = warnings;

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_workspace_info', args, duration);

      return {
        success: true,
        data: {
          success: true,
          workspace_info: workspaceInfo,
          analytics: validatedArgs.include_analytics ? workspaceAnalytics : undefined,
          recommendations: validatedArgs.include_recommendations ? workspaceAnalytics.recommendations : undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
          metadata: {
            data_freshness: new Date().toISOString(),
            analysis_depth: validatedArgs.detailed_analysis ? 'comprehensive' : 
              validatedArgs.analyze_activity ? 'standard' : 'basic',
            permissions_level: permissionLevel,
          },
        } as WorkspaceResult,
        metadata: {
          execution_time_ms: duration,
          operation_type: 'workspace_analysis',
          analysis_depth: validatedArgs.detailed_analysis ? 'comprehensive' : 'standard',
          permission_level: permissionLevel,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_workspace_info', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_workspace_info',
        args,
        execution_time_ms: duration,
      });
    }
  },

  /**
   * Sample channel activity to estimate workspace engagement
   */
  async sampleChannelActivity(client: any): Promise<Array<{ id: string; messageCount: number }>> {
    try {
      const channelsResult = await client.conversations.list({
        types: 'public_channel',
        limit: 10, // Sample first 10 public channels
      });
      
      if (!channelsResult.ok || !channelsResult.channels) {
        return [];
      }
      
      const activityPromises = channelsResult.channels.slice(0, 5).map(async (channel: any) => {
        try {
          const historyResult = await client.conversations.history({
            channel: channel.id,
            limit: 100,
          });
          
          return {
            id: channel.id,
            messageCount: historyResult.ok ? (historyResult.messages?.length || 0) : 0,
          };
        } catch {
          return { id: channel.id, messageCount: 0 };
        }
      });
      
      return await Promise.all(activityPromises);
    } catch {
      return [];
    }
  },

  /**
   * Calculate workspace health score (0-100)
   */
  calculateHealthScore(workspaceInfo: WorkspaceInfo, analytics: WorkspaceAnalytics): number {
    let score = 50; // Base score
    
    // Channel diversity (0-20 points)
    const totalChannels = workspaceInfo.stats?.total_channels || 0;
    const publicChannels = analytics.workspace_insights.channel_distribution.public_channels;
    const privateChannels = analytics.workspace_insights.channel_distribution.private_channels;
    
    if (totalChannels > 0) {
      const channelDiversity = Math.min(totalChannels / 10, 1); // Up to 10 channels = full points
      const publicPrivateBalance = Math.min(Math.min(publicChannels, privateChannels) / Math.max(publicChannels, privateChannels, 1), 1);
      score += (channelDiversity * 10) + (publicPrivateBalance * 10);
    }
    
    // User engagement (0-20 points)
    const totalUsers = workspaceInfo.stats?.total_members || 0;
    const channelsPerUser = analytics.engagement_metrics.channels_per_user;
    
    if (totalUsers > 0) {
      const userBase = Math.min(totalUsers / 50, 1); // Up to 50 users = full points
      const engagement = Math.min(channelsPerUser / 3, 1); // Up to 3 channels per user = full points
      score += (userBase * 10) + (engagement * 10);
    }
    
    // Activity level (0-10 points)
    switch (analytics.activity_level) {
      case 'very_high':
        score += 10;
        break;
      case 'high':
        score += 8;
        break;
      case 'medium':
        score += 6;
        break;
      case 'low':
        score += 4;
        break;
      case 'very_low':
        score += 2;
        break;
    }
    
    return Math.min(Math.max(Math.round(score), 0), 100);
  },

  /**
   * Generate recommendations for workspace optimization
   */
  generateRecommendations(workspaceInfo: WorkspaceInfo, analytics: WorkspaceAnalytics): string[] {
    const recommendations: string[] = [];
    
    // Channel recommendations
    const totalChannels = workspaceInfo.stats?.total_channels || 0;
    const publicChannels = analytics.workspace_insights.channel_distribution.public_channels;
    const archivedChannels = analytics.workspace_insights.channel_distribution.archived_channels;
    
    if (totalChannels < 5) {
      recommendations.push('Consider creating more channels to organize conversations by topic or team');
    }
    
    if (archivedChannels > totalChannels * 0.3) {
      recommendations.push('High number of archived channels - consider cleaning up old channels regularly');
    }
    
    if (publicChannels === 0) {
      recommendations.push('Consider creating public channels to encourage open communication');
    }
    
    // User recommendations
    const totalUsers = workspaceInfo.stats?.total_members || 0;
    const admins = analytics.workspace_insights.user_distribution.admins;
    const guests = analytics.workspace_insights.user_distribution.guests;
    
    if (totalUsers > 0 && admins / totalUsers > 0.2) {
      recommendations.push('Consider reducing the number of admins - too many admins can complicate governance');
    }
    
    if (guests > totalUsers * 0.5) {
      recommendations.push('High number of guests - consider converting frequent collaborators to full members');
    }
    
    // Activity recommendations
    switch (analytics.activity_level) {
      case 'very_low':
      case 'low':
        recommendations.push('Low activity detected - consider organizing team events or encouraging more communication');
        recommendations.push('Set up regular check-ins or standups to increase engagement');
        break;
      case 'very_high':
        recommendations.push('Very high activity - consider creating more focused channels to reduce noise');
        break;
    }
    
    // Health score recommendations
    if (analytics.workspace_health_score < 60) {
      recommendations.push('Workspace health score is below average - focus on improving channel organization and user engagement');
    } else if (analytics.workspace_health_score > 80) {
      recommendations.push('Excellent workspace health! Consider sharing best practices with other teams');
    }
    
    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Workspace looks well-organized! Continue monitoring engagement and growth');
    }
    
    return recommendations;
  },
};

export default slackWorkspaceInfoTool;
