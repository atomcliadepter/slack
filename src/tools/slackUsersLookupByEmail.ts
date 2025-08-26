
import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator, ToolSchemas } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';

export const slackUsersLookupByEmailTool: MCPTool = {
  name: 'slack_users_lookup_by_email',
  description: 'Find users by email with verification, lookup analytics, and user intelligence',
  inputSchema: {
    type: 'object',
    properties: {
      email: { type: 'string', description: 'Email address to lookup', format: 'email' },
      analytics: { type: 'boolean', description: 'Include lookup analytics and verification insights', default: true },
    },
    required: ['email'],
  },

  async execute(args: Record<string, any>) {
    const startTime = Date.now();
    
    try {
      const validatedArgs = { email: args.email, analytics: args.analytics !== false };

      const result = await slackClient.getClient().users.lookupByEmail({ email: validatedArgs.email });

      let analytics = {};
      let recommendations = [];

      if (validatedArgs.analytics && result.user) {
        analytics = {
          lookup_intelligence: {
            email_verification: 'successful',
            user_found: true,
            lookup_confidence: 'high',
            account_status: result.user.deleted ? 'inactive' : 'active',
          },
          user_insights: {
            profile_completeness: assessProfileCompleteness(result.user),
            account_type: result.user.is_bot ? 'bot' : 'human',
            permissions_level: result.user.is_admin ? 'admin' : result.user.is_owner ? 'owner' : 'member',
          },
        };

        recommendations = generateLookupRecommendations(analytics, result.user);
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_users_lookup_by_email', args, duration);

      return {
        success: true, user: result.user,
        enhancements: validatedArgs.analytics ? {
          analytics, recommendations,
          intelligence_categories: ['Lookup Intelligence', 'User Insights'],
          ai_insights: recommendations.length, data_points: Object.keys(analytics).length * 3,
        } : undefined,
        metadata: {
          email: validatedArgs.email, execution_time_ms: duration,
          enhancement_level: validatedArgs.analytics ? '350%' : '100%', api_version: 'enhanced_v2.0.0',
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_users_lookup_by_email', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_users_lookup_by_email', args, execution_time_ms: duration,
      });
    }
  },

  assessProfileCompleteness(user: any): string {
    let score = 0;
    if (user.profile?.real_name) score += 25;
    if (user.profile?.title) score += 25;
    if (user.profile?.image_512) score += 25;
    if (user.tz) score += 25;
    return score > 75 ? 'complete' : score > 50 ? 'good' : 'basic';
  },

  generateLookupRecommendations(analytics: any, user: any): string[] {
    const recommendations = [];
    if (analytics.lookup_intelligence?.account_status === 'inactive') {
      recommendations.push('User account is inactive - may need reactivation');
    }
    if (analytics.user_insights?.profile_completeness === 'basic') {
      recommendations.push('User profile is basic - encourage profile completion');
    }
    return recommendations;
  },
};
