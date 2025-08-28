import { MCPTool } from '../registry/toolRegistry';
import { slackClient } from '../utils/slackClient';
import { Validator } from '../utils/validator';
import { ErrorHandler } from '../utils/error';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Enhanced input validation schema
const inputSchema = z.object({
  user: z.string().min(1, 'User ID or username is required'),
  include_locale: z.boolean().optional().default(false),
  include_profile: z.boolean().optional().default(true),
  include_presence: z.boolean().optional().default(false),
  include_analytics: z.boolean().optional().default(true),
  include_recommendations: z.boolean().optional().default(true),
});

type SlackGetUserInfoArgs = z.infer<typeof inputSchema>;

export const slackGetUserInfoTool: MCPTool = {
  name: 'slack_get_user_info',
  description: 'Retrieve comprehensive user information with analytics, presence, and profile details',
  inputSchema: {
    type: 'object',
    properties: {
      user: {
        type: 'string',
        description: 'User ID (U1234567890) or username (@username or username)',
      },
      include_locale: {
        type: 'boolean',
        description: 'Include user locale and timezone information',
        default: false,
      },
      include_profile: {
        type: 'boolean',
        description: 'Include detailed user profile information',
        default: true,
      },
      include_presence: {
        type: 'boolean',
        description: 'Include user presence and status information',
        default: false,
      },
      include_analytics: {
        type: 'boolean',
        description: 'Include user analytics and insights',
        default: true,
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include user engagement recommendations',
        default: true,
      },
    },
    required: ['user'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = Validator.validate(inputSchema, args) as SlackGetUserInfoArgs;
      
      // Resolve user ID if username provided
      let userId = validatedArgs.user;
      if (!userId.startsWith('U')) {
        userId = await slackClient.resolveUserId(validatedArgs.user);
      }

      // Get basic user information
      const userResult = await slackClient.getClient().users.info({
        user: userId,
        include_locale: validatedArgs.include_locale,
      });

      if (!userResult.ok) {
        throw new Error(`Failed to get user info: ${userResult.error}`);
      }

      const user = userResult.user;
      if (!user) {
        throw new Error('User information not found in response');
      }

      // Enhanced user data
      let enhancedUser: any = { ...user };

      // Get presence information if requested
      if (validatedArgs.include_presence) {
        try {
          const presenceResult = await slackClient.getClient().users.getPresence({
            user: userId,
          });
          
          if (presenceResult.ok) {
            enhancedUser.presence_info = {
              presence: presenceResult.presence,
              online: presenceResult.online,
              auto_away: presenceResult.auto_away,
              manual_away: presenceResult.manual_away,
              connection_count: presenceResult.connection_count,
              last_activity: presenceResult.last_activity,
            };
          }
        } catch (error) {
          // Continue without presence info if API call fails
          logger.error('Failed to get user presence:', error);
        }
      }

      // Generate analytics if requested
      let analytics = {};
      if (validatedArgs.include_analytics) {
        analytics = this.generateUserAnalytics(enhancedUser, validatedArgs);
      }

      // Generate recommendations if requested
      let recommendations = [];
      if (validatedArgs.include_recommendations) {
        recommendations = this.generateUserRecommendations(enhancedUser, validatedArgs);
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_get_user_info', args, duration);

      return {
        success: true,
        data: {
          user: enhancedUser,
          user_id: userId,
          resolved_from: validatedArgs.user !== userId ? validatedArgs.user : undefined,
        },
        metadata: {
          execution_time_ms: duration,
          analytics: validatedArgs.include_analytics ? analytics : undefined,
          recommendations: validatedArgs.include_recommendations ? recommendations : undefined,
          data_included: {
            basic_info: true,
            profile: validatedArgs.include_profile,
            locale: validatedArgs.include_locale,
            presence: validatedArgs.include_presence && !!enhancedUser.presence_info,
          },
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

  // Helper method to generate user analytics
  generateUserAnalytics(user: any, args: SlackGetUserInfoArgs): Record<string, any> {
    const analytics: any = {
      user_characteristics: {
        is_admin: user.is_admin || false,
        is_owner: user.is_owner || false,
        is_primary_owner: user.is_primary_owner || false,
        is_restricted: user.is_restricted || false,
        is_ultra_restricted: user.is_ultra_restricted || false,
        is_bot: user.is_bot || false,
        is_app_user: user.is_app_user || false,
        has_2fa: user.has_2fa || false,
      },
      account_status: {
        deleted: user.deleted || false,
        is_email_confirmed: user.is_email_confirmed || false,
        updated: user.updated || 0,
        created_timestamp: user.created || null,
        account_age_days: user.created ? Math.floor((Date.now() / 1000 - user.created) / 86400) : null,
      },
    };

    // Profile analysis
    if (user.profile) {
      analytics.profile_analysis = {
        has_avatar: !!(user.profile.image_72 || user.profile.avatar_hash),
        has_display_name: !!user.profile.display_name,
        has_real_name: !!user.profile.real_name,
        has_title: !!user.profile.title,
        has_phone: !!user.profile.phone,
        has_status: !!(user.profile.status_text || user.profile.status_emoji),
        profile_completeness: this.calculateProfileCompleteness(user.profile),
      };
    }

    // Presence analysis
    if (user.presence_info) {
      analytics.presence_analysis = {
        is_online: user.presence_info.online,
        is_away: user.presence_info.presence === 'away',
        connection_count: user.presence_info.connection_count || 0,
        last_activity_hours_ago: user.presence_info.last_activity ? 
          Math.floor((Date.now() / 1000 - user.presence_info.last_activity) / 3600) : null,
      };
    }

    // Timezone analysis
    if (user.tz) {
      analytics.timezone_info = {
        timezone: user.tz,
        timezone_label: user.tz_label,
        timezone_offset: user.tz_offset,
        current_local_time: this.calculateLocalTime(user.tz_offset),
      };
    }

    return analytics;
  },

  // Helper method to calculate profile completeness
  calculateProfileCompleteness(profile: any): number {
    const fields = [
      'display_name', 'real_name', 'title', 'phone', 'email',
      'image_72', 'status_text', 'first_name', 'last_name'
    ];
    
    const completedFields = fields.filter(field => profile[field]).length;
    return Math.round((completedFields / fields.length) * 100);
  },

  // Helper method to calculate local time
  calculateLocalTime(tzOffset: number): string {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const localTime = new Date(utc + (tzOffset * 1000));
    return localTime.toISOString();
  },

  // Helper method to generate user recommendations
  generateUserRecommendations(user: any, args: SlackGetUserInfoArgs): string[] {
    const recommendations = [];

    // Profile recommendations
    if (user.profile) {
      const completeness = this.calculateProfileCompleteness(user.profile);
      
      if (completeness < 50) {
        recommendations.push('Consider completing user profile for better team visibility');
      }
      
      if (!user.profile.display_name) {
        recommendations.push('Adding a display name helps with team recognition');
      }
      
      if (!user.profile.title) {
        recommendations.push('Adding a job title provides context for team members');
      }
      
      if (!user.profile.image_72 && !user.profile.avatar_hash) {
        recommendations.push('Adding a profile picture improves team communication');
      }
      
      if (!user.profile.status_text && !user.profile.status_emoji) {
        recommendations.push('Setting a status helps communicate availability');
      }
    }

    // Security recommendations
    if (!user.has_2fa) {
      recommendations.push('Enable two-factor authentication for enhanced security');
    }

    // Presence recommendations
    if (user.presence_info) {
      if (user.presence_info.connection_count === 0) {
        recommendations.push('User appears to be offline - consider alternative communication methods');
      }
      
      if (user.presence_info.last_activity) {
        const hoursAgo = Math.floor((Date.now() / 1000 - user.presence_info.last_activity) / 3600);
        if (hoursAgo > 24) {
          recommendations.push('User has been inactive for over 24 hours - consider asynchronous communication');
        }
      }
    }

    // Account status recommendations
    if (user.is_restricted || user.is_ultra_restricted) {
      recommendations.push('User has restricted access - verify permissions for collaboration');
    }

    if (user.deleted) {
      recommendations.push('User account is deactivated - contact may not be possible');
    }

    return recommendations;
  },
};
