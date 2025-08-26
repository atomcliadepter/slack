
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

/**
 * Enhanced Slack Get User Info Tool
 * Enhanced user data retrieval with presence, activity, and profile analysis
 */
export const slackGetUserInfoTool: MCPTool = {
  name: 'slack_get_user_info',
  description: 'Get comprehensive user information including profile, presence, activity, and team data',
  inputSchema: {
    type: 'object',
    properties: {
      user: {
        type: 'string',
        description: 'User ID, username, or email address',
      },
      include_locale: {
        type: 'boolean',
        description: 'Include user locale information',
        default: false,
      },
      include_presence: {
        type: 'boolean',
        description: 'Include user presence information',
        default: true,
      },
      include_profile_extended: {
        type: 'boolean',
        description: 'Include extended profile information',
        default: true,
      },
      include_team_info: {
        type: 'boolean',
        description: 'Include team/workspace information',
        default: false,
      },
      include_activity_stats: {
        type: 'boolean',
        description: 'Include user activity statistics (requires additional API calls)',
        default: false,
      },
    },
    required: ['user'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validatedArgs = Validator.validate(ToolSchemas.getUserInfo, args);
      
      // Resolve user ID
      const userId = await slackClient.resolveUserId(validatedArgs.user);
      
      // Get basic user info
      const userInfoResult = await slackClient.getClient().users.info({
        user: userId,
        include_locale: validatedArgs.include_locale,
      });

      if (!userInfoResult.user) {
        throw new Error('User information not found');
      }

      const user = userInfoResult.user;
      const enhancedUserInfo: any = {
        ...user,
        analysis: {
          is_bot: !!user.is_bot,
          is_admin: !!user.is_admin,
          is_owner: !!user.is_owner,
          is_primary_owner: !!user.is_primary_owner,
          is_restricted: !!user.is_restricted,
          is_ultra_restricted: !!user.is_ultra_restricted,
          has_custom_image: !user.profile?.image_72?.includes('default'),
          profile_completeness: calculateProfileCompleteness(user.profile),
        },
      };

      // Get presence information
      if (args.include_presence !== false) {
        try {
          const presenceResult = await slackClient.getClient().users.getPresence({
            user: userId,
          });
          
          enhancedUserInfo.presence = {
            ...presenceResult,
            last_activity: presenceResult.last_activity 
              ? new Date(presenceResult.last_activity * 1000).toISOString()
              : null,
          };
        } catch (error) {
          logger.warn(`Failed to get presence for user ${userId}:`, ErrorHandler.handleError(error));
          enhancedUserInfo.presence = { error: 'Unable to retrieve presence information' };
        }
      }

      // Get extended profile information
      if (args.include_profile_extended) {
        try {
          const profileResult = await slackClient.getClient().users.profile.get({
            user: userId,
          });
          
          if (profileResult.profile) {
            enhancedUserInfo.profile_extended = {
              ...profileResult.profile,
              custom_fields: extractCustomFields(profileResult.profile),
              social_links: extractSocialLinks(profileResult.profile),
            };
          }
        } catch (error) {
          logger.warn(`Failed to get extended profile for user ${userId}:`, ErrorHandler.handleError(error));
        }
      }

      // Get team information
      if (args.include_team_info) {
        try {
          const teamInfo = await slackClient.getWorkspaceInfo();
          if (teamInfo.success) {
            enhancedUserInfo.team_info = teamInfo.workspace;
          }
        } catch (error) {
          logger.warn('Failed to get team info:', ErrorHandler.handleError(error));
        }
      }

      // Get activity statistics (expensive operation)
      if (args.include_activity_stats) {
        try {
          const activityStats = await getUserActivityStats(userId);
          enhancedUserInfo.activity_stats = activityStats;
        } catch (error) {
          logger.warn(`Failed to get activity stats for user ${userId}:`, ErrorHandler.handleError(error));
          enhancedUserInfo.activity_stats = { error: 'Unable to retrieve activity statistics' };
        }
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_get_user_info', args, duration);

      return {
        success: true,
        user: enhancedUserInfo,
        metadata: {
          user_id: userId,
          original_query: validatedArgs.user,
          data_included: {
            basic_info: true,
            presence: args.include_presence !== false,
            extended_profile: args.include_profile_extended !== false,
            team_info: args.include_team_info || false,
            activity_stats: args.include_activity_stats || false,
            locale: validatedArgs.include_locale,
          },
          execution_time_ms: duration,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_get_user_info', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_get_user_info',
        args,
        execution_time_ms: duration,
      });
    }
  },
};

/**
 * Calculate profile completeness percentage
 */
function calculateProfileCompleteness(profile: any): number {
  if (!profile) return 0;
  
  const fields = [
    'real_name',
    'display_name',
    'title',
    'phone',
    'skype',
    'status_text',
    'image_72',
  ];
  
  const completedFields = fields.filter(field => 
    profile[field] && profile[field] !== '' && !profile[field].includes('default')
  ).length;
  
  return Math.round((completedFields / fields.length) * 100);
}

/**
 * Extract custom fields from profile
 */
function extractCustomFields(profile: any): Record<string, any> {
  const customFields: Record<string, any> = {};
  
  if (profile.fields) {
    Object.entries(profile.fields).forEach(([key, value]: [string, any]) => {
      if (value && typeof value === 'object' && value.value) {
        customFields[key] = {
          label: value.label || key,
          value: value.value,
          alt: value.alt || '',
        };
      }
    });
  }
  
  return customFields;
}

/**
 * Extract social links from profile
 */
function extractSocialLinks(profile: any): string[] {
  const socialLinks: string[] = [];
  
  // Common social media patterns
  const socialPatterns = [
    /https?:\/\/(www\.)?(twitter|x)\.com\/\w+/i,
    /https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+/i,
    /https?:\/\/(www\.)?github\.com\/\w+/i,
    /https?:\/\/(www\.)?instagram\.com\/\w+/i,
    /https?:\/\/(www\.)?facebook\.com\/[\w.]+/i,
  ];
  
  // Check various profile fields for social links
  const fieldsToCheck = [
    profile.status_text,
    profile.title,
    ...(profile.fields ? Object.values(profile.fields).map((f: any) => f.value) : []),
  ];
  
  fieldsToCheck.forEach(field => {
    if (typeof field === 'string') {
      socialPatterns.forEach(pattern => {
        const match = field.match(pattern);
        if (match && !socialLinks.includes(match[0])) {
          socialLinks.push(match[0]);
        }
      });
    }
  });
  
  return socialLinks;
}

/**
 * Get user activity statistics (simplified version)
 */
async function getUserActivityStats(_userId: string): Promise<any> {
  // This would require additional API calls to get comprehensive stats
  // For now, return a placeholder structure
  return {
    note: 'Activity statistics require additional API permissions and calls',
    available_metrics: [
      'message_count_last_30_days',
      'channels_active_in',
      'files_shared',
      'reactions_given',
      'reactions_received',
    ],
    implementation_status: 'placeholder',
  };
}
