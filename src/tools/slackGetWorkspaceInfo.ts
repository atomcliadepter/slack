
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

/**
 * Enhanced Slack Get Workspace Info Tool
 * Comprehensive workspace analytics with team insights and usage statistics
 */
export const slackGetWorkspaceInfoTool: MCPTool = {
  name: 'slack_get_workspace_info',
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
        description: 'Include channel statistics',
        default: true,
      },
      include_users: {
        type: 'boolean',
        description: 'Include user statistics',
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
        description: 'Analyze workspace activity patterns',
        default: false,
      },
    },
    required: [],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input
      Validator.validate(ToolSchemas.getWorkspaceInfo, args);
      
      // Get basic workspace information
      const [authTest, teamInfo] = await Promise.all([
        slackClient.getClient().auth.test(),
        slackClient.getClient().team.info(),
      ]);

      const workspaceInfo: any = {
        id: authTest.team_id,
        name: teamInfo.team?.name,
        domain: teamInfo.team?.domain,
        url: authTest.url,
        enterprise_id: teamInfo.team?.enterprise_id,
        enterprise_name: teamInfo.team?.enterprise_name,
        icon: teamInfo.team?.icon,
        bot_info: {
          id: authTest.user_id,
          name: authTest.user,
          is_enterprise_install: authTest.is_enterprise_install,
        },
      };

      // Get channel statistics
      let channelStats = null;
      if (args.include_channels !== false) {
        try {
          channelStats = await getChannelStatistics();
        } catch (error) {
          logger.warn('Failed to get channel statistics:', ErrorHandler.handleError(error));
          channelStats = { error: 'Unable to retrieve channel statistics' };
        }
      }

      // Get user statistics
      let userStats = null;
      if (args.include_users !== false) {
        try {
          userStats = await getUserStatistics();
        } catch (error) {
          logger.warn('Failed to get user statistics:', ErrorHandler.handleError(error));
          userStats = { error: 'Unable to retrieve user statistics' };
        }
      }

      // Get integration information
      let integrationInfo = null;
      if (args.include_integrations) {
        try {
          integrationInfo = await getIntegrationInfo();
        } catch (error) {
          logger.warn('Failed to get integration info:', ErrorHandler.handleError(error));
          integrationInfo = { error: 'Unable to retrieve integration information' };
        }
      }

      // Get billing information (requires admin permissions)
      let billingInfo = null;
      if (args.include_billing) {
        try {
          billingInfo = await getBillingInfo();
        } catch (error) {
          logger.warn('Failed to get billing info:', ErrorHandler.handleError(error));
          billingInfo = { error: 'Unable to retrieve billing information (admin permissions required)' };
        }
      }

      // Analyze activity patterns
      let activityAnalysis = null;
      if (args.analyze_activity) {
        try {
          activityAnalysis = await analyzeWorkspaceActivity();
        } catch (error) {
          logger.warn('Failed to analyze activity:', ErrorHandler.handleError(error));
          activityAnalysis = { error: 'Unable to analyze workspace activity' };
        }
      }

      // Generate workspace insights
      const insights = generateWorkspaceInsights({
        workspace: workspaceInfo,
        channels: channelStats,
        users: userStats,
        integrations: integrationInfo,
      });

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_get_workspace_info', args, duration);

      return {
        success: true,
        workspace: workspaceInfo,
        statistics: {
          channels: channelStats,
          users: userStats,
          integrations: integrationInfo,
          billing: billingInfo,
        },
        activity_analysis: activityAnalysis,
        insights,
        metadata: {
          data_included: {
            basic_info: true,
            channel_stats: args.include_channels !== false,
            user_stats: args.include_users !== false,
            integrations: args.include_integrations || false,
            billing: args.include_billing || false,
            activity_analysis: args.analyze_activity || false,
          },
          execution_time_ms: duration,
          generated_at: new Date().toISOString(),
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_get_workspace_info', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_get_workspace_info',
        args,
        execution_time_ms: duration,
      });
    }
  },
};

/**
 * Get channel statistics
 */
async function getChannelStatistics() {
  const [publicChannels, privateChannels] = await Promise.all([
    slackClient.getClient().conversations.list({
      types: 'public_channel',
      limit: 1000,
    }),
    slackClient.getClient().conversations.list({
      types: 'private_channel',
      limit: 1000,
    }),
  ]);

  const allChannels = [
    ...(publicChannels.channels || []),
    ...(privateChannels.channels || []),
  ];

  // Analyze channel data
  const archivedChannels = allChannels.filter(ch => ch.is_archived).length;
  const activeChannels = allChannels.length - archivedChannels;
  
  // Calculate average members per channel
  const channelsWithMembers = allChannels.filter(ch => ch.num_members);
  const avgMembers = channelsWithMembers.length > 0 
    ? Math.round(channelsWithMembers.reduce((sum, ch) => sum + (ch.num_members || 0), 0) / channelsWithMembers.length)
    : 0;

  return {
    total_channels: allChannels.length,
    public_channels: publicChannels.channels?.length || 0,
    private_channels: privateChannels.channels?.length || 0,
    archived_channels: archivedChannels,
    active_channels: activeChannels,
    average_members_per_channel: avgMembers,
    largest_channel: channelsWithMembers.length > 0 
      ? Math.max(...channelsWithMembers.map(ch => ch.num_members || 0))
      : 0,
  };
}

/**
 * Get user statistics
 */
async function getUserStatistics() {
  const usersResult = await slackClient.getClient().users.list({
    limit: 1000,
  });

  const users = usersResult.members || [];
  
  // Analyze user data
  const activeUsers = users.filter(u => !u.deleted && !u.is_bot).length;
  const botUsers = users.filter(u => u.is_bot).length;
  const adminUsers = users.filter(u => u.is_admin || u.is_owner).length;
  const guestUsers = users.filter(u => u.is_restricted || u.is_ultra_restricted).length;
  
  // Analyze user profiles
  const usersWithCustomImages = users.filter(u => 
    u.profile?.image_72 && !u.profile.image_72.includes('default')
  ).length;
  
  const usersWithStatus = users.filter(u => 
    u.profile?.status_text && u.profile.status_text.length > 0
  ).length;

  return {
    total_users: users.length,
    active_users: activeUsers,
    bot_users: botUsers,
    admin_users: adminUsers,
    guest_users: guestUsers,
    users_with_custom_images: usersWithCustomImages,
    users_with_status: usersWithStatus,
    profile_completion_rate: Math.round((usersWithCustomImages / Math.max(activeUsers, 1)) * 100),
  };
}

/**
 * Get integration information
 */
async function getIntegrationInfo() {
  // This would require additional API calls to get app information
  // For now, return a placeholder structure
  return {
    note: 'Integration information requires additional API permissions',
    available_data: [
      'installed_apps',
      'custom_integrations',
      'workflow_automations',
      'external_connections',
    ],
    implementation_status: 'placeholder',
  };
}

/**
 * Get billing information
 */
async function getBillingInfo() {
  // This would require admin API access
  return {
    note: 'Billing information requires admin permissions',
    available_data: [
      'plan_type',
      'billing_cycle',
      'user_limits',
      'storage_usage',
      'api_usage',
    ],
    implementation_status: 'requires_admin_permissions',
  };
}

/**
 * Analyze workspace activity patterns
 */
async function analyzeWorkspaceActivity() {
  // This would require analyzing message patterns, user activity, etc.
  return {
    note: 'Activity analysis requires comprehensive data collection',
    available_metrics: [
      'message_volume_trends',
      'peak_activity_hours',
      'channel_activity_distribution',
      'user_engagement_patterns',
      'file_sharing_trends',
    ],
    implementation_status: 'placeholder',
  };
}

/**
 * Generate workspace insights
 */
function generateWorkspaceInsights(data: any) {
  const insights = [];
  
  // Channel insights
  if (data.channels && !data.channels.error) {
    const channelRatio = data.channels.private_channels / Math.max(data.channels.public_channels, 1);
    if (channelRatio > 1) {
      insights.push({
        type: 'channel_privacy',
        level: 'info',
        message: 'Your workspace has more private channels than public ones, which may indicate focused team collaboration.',
      });
    }
    
    if (data.channels.archived_channels > data.channels.active_channels * 0.3) {
      insights.push({
        type: 'channel_maintenance',
        level: 'warning',
        message: 'Consider reviewing archived channels - you have a high ratio of archived to active channels.',
      });
    }
  }
  
  // User insights
  if (data.users && !data.users.error) {
    if (data.users.profile_completion_rate < 50) {
      insights.push({
        type: 'user_engagement',
        level: 'suggestion',
        message: 'Encourage users to complete their profiles with custom images and information.',
      });
    }
    
    const guestRatio = data.users.guest_users / Math.max(data.users.active_users, 1);
    if (guestRatio > 0.2) {
      insights.push({
        type: 'user_access',
        level: 'info',
        message: 'You have a significant number of guest users, which suggests good external collaboration.',
      });
    }
  }
  
  // General workspace health
  if (data.channels && data.users && !data.channels.error && !data.users.error) {
    const channelsPerUser = data.channels.total_channels / Math.max(data.users.active_users, 1);
    if (channelsPerUser > 5) {
      insights.push({
        type: 'workspace_organization',
        level: 'suggestion',
        message: 'Consider consolidating channels or creating channel naming conventions to improve organization.',
      });
    }
  }
  
  return insights;
}
