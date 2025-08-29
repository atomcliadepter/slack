import { MCPTool } from '@/registry/toolRegistry';
import { slackClient } from '@/utils/slackClient';
import { Validator } from '@/utils/validator';
import { ErrorHandler } from '@/utils/error';
import { logger } from '@/utils/logger';
import { z } from 'zod';

const inputSchema = z.object({
  include_analytics: z.boolean().optional().default(true).describe('Include emoji analytics'),
  include_recommendations: z.boolean().optional().default(true).describe('Include recommendations'),
  filter_custom: z.boolean().optional().default(false).describe('Only show custom emojis'),
  detailed_analysis: z.boolean().optional().default(false).describe('Include detailed emoji analysis')
});

export const slackEmojiListTool: MCPTool = {
  name: 'slack_emoji_list',
  description: 'List workspace emojis with analytics and usage insights',
  inputSchema: {
    type: 'object',
    properties: {
      include_analytics: {
        type: 'boolean',
        description: 'Include emoji analytics',
        default: true
      },
      include_recommendations: {
        type: 'boolean',
        description: 'Include recommendations',
        default: true
      },
      filter_custom: {
        type: 'boolean',
        description: 'Only show custom emojis',
        default: false
      },
      detailed_analysis: {
        type: 'boolean',
        description: 'Include detailed emoji analysis',
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
        filter_custom,
        detailed_analysis
      } = validatedArgs;

      // Get emoji list
      const emojiResponse = await (slackClient as any).emoji.list();
      const allEmojis = emojiResponse.emoji || {};

      // Filter emojis if requested
      let emojis = allEmojis;
      if (filter_custom) {
        emojis = Object.fromEntries(
          Object.entries(allEmojis).filter(([name, url]) => 
            typeof url === 'string' && url.startsWith('https://')
          )
        );
      }

      // Enhance emoji data
      const enhancedEmojis = Object.entries(emojis).map(([name, url]) => ({
        name,
        url: url as string,
        is_custom: typeof url === 'string' && url.startsWith('https://'),
        is_alias: typeof url === 'string' && url.startsWith('alias:'),
        alias_target: typeof url === 'string' && url.startsWith('alias:') ? url.replace('alias:', '') : null,
        category: this.categorizeEmoji(name)
      }));

      const result: any = {
        success: true,
        data: {
          emojis: enhancedEmojis,
          total_count: enhancedEmojis.length,
          custom_count: enhancedEmojis.filter(e => e.is_custom).length,
          alias_count: enhancedEmojis.filter(e => e.is_alias).length
        }
      };

      // Add analytics
      if (include_analytics) {
        const customEmojis = enhancedEmojis.filter(e => e.is_custom);
        const aliases = enhancedEmojis.filter(e => e.is_alias);
        
        // Categorize emojis
        const categories = enhancedEmojis.reduce((acc: any, emoji) => {
          acc[emoji.category] = (acc[emoji.category] || 0) + 1;
          return acc;
        }, {});

        result.data.analytics = {
          emoji_distribution: {
            total_emojis: enhancedEmojis.length,
            custom_emojis: customEmojis.length,
            emoji_aliases: aliases.length,
            custom_percentage: enhancedEmojis.length > 0 ? 
              (customEmojis.length / enhancedEmojis.length * 100).toFixed(1) + '%' : '0%'
          },
          category_breakdown: categories,
          workspace_culture: {
            emoji_diversity_score: Object.keys(categories).length * 10, // 0-100 scale
            custom_emoji_adoption: customEmojis.length > 10 ? 'high' : 
                                  customEmojis.length > 3 ? 'medium' : 'low',
            alias_usage: aliases.length > 5 ? 'active' : 'minimal'
          }
        };

        // Detailed analysis
        if (detailed_analysis) {
          const namePatterns = {
            company_branded: customEmojis.filter(e => 
              e.name.includes('logo') || e.name.includes('brand') || e.name.includes('company')
            ).length,
            team_specific: customEmojis.filter(e => 
              e.name.includes('team') || e.name.includes('dept') || e.name.includes('group')
            ).length,
            reaction_emojis: customEmojis.filter(e => 
              e.name.includes('yes') || e.name.includes('no') || e.name.includes('maybe') ||
              e.name.includes('approve') || e.name.includes('reject')
            ).length,
            fun_emojis: customEmojis.filter(e => 
              e.name.includes('party') || e.name.includes('celebrate') || e.name.includes('fun')
            ).length
          };

          result.data.analytics.detailed_analysis = {
            naming_patterns: namePatterns,
            emoji_health: {
              broken_aliases: aliases.filter(alias => 
                !enhancedEmojis.find(e => e.name === alias.alias_target)
              ).length,
              duplicate_names: this.findDuplicateNames(enhancedEmojis),
              naming_consistency: this.analyzeNamingConsistency(enhancedEmojis)
            },
            usage_insights: {
              most_common_prefixes: this.getMostCommonPrefixes(customEmojis),
              average_name_length: customEmojis.length > 0 ?
                Math.round(customEmojis.reduce((sum, e) => sum + e.name.length, 0) / customEmojis.length) : 0
            }
          };
        }
      }

      // Add recommendations
      if (include_recommendations) {
        const recommendations = [];
        const customCount = enhancedEmojis.filter(e => e.is_custom).length;
        const aliasCount = enhancedEmojis.filter(e => e.is_alias).length;
        
        if (customCount === 0) {
          recommendations.push('No custom emojis found - consider adding branded or team-specific emojis');
        } else if (customCount > 100) {
          recommendations.push('Many custom emojis - consider organizing or removing unused ones');
        }
        
        if (aliasCount > customCount * 0.3) {
          recommendations.push('High alias usage - review for broken or unnecessary aliases');
        }
        
        if (result.data.analytics?.workspace_culture?.emoji_diversity_score < 30) {
          recommendations.push('Low emoji diversity - encourage more varied emoji usage');
        }
        
        if (result.data.analytics?.detailed_analysis?.emoji_health?.broken_aliases > 0) {
          recommendations.push(`${result.data.analytics.detailed_analysis.emoji_health.broken_aliases} broken aliases found - clean up needed`);
        }

        result.data.recommendations = recommendations;
      }

      const duration = Date.now() - startTime;
      logger.logToolExecution('slack_emoji_list', args, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.handleError(error);
      logger.logToolError('slack_emoji_list', errorMessage, args);
      
      return ErrorHandler.createErrorResponse(error, {
        tool: 'slack_emoji_list',
        args,
        execution_time_ms: duration,
      });
    }
  },

  // Helper methods
  categorizeEmoji(name: string): string {
    if (name.includes('party') || name.includes('celebrate') || name.includes('tada')) return 'celebration';
    if (name.includes('approve') || name.includes('check') || name.includes('yes')) return 'approval';
    if (name.includes('reject') || name.includes('no') || name.includes('x')) return 'rejection';
    if (name.includes('logo') || name.includes('brand') || name.includes('company')) return 'branding';
    if (name.includes('team') || name.includes('dept') || name.includes('group')) return 'team';
    if (name.includes('sad') || name.includes('cry') || name.includes('angry')) return 'negative';
    if (name.includes('happy') || name.includes('smile') || name.includes('joy')) return 'positive';
    return 'other';
  },

  findDuplicateNames(emojis: any[]): number {
    const names = emojis.map(e => e.name);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    return new Set(duplicates).size;
  },

  analyzeNamingConsistency(emojis: any[]): string {
    const hasUnderscores = emojis.filter(e => e.name.includes('_')).length;
    const hasDashes = emojis.filter(e => e.name.includes('-')).length;
    const total = emojis.length;
    
    if (total === 0) return 'no_data';
    
    const underscoreRatio = hasUnderscores / total;
    const dashRatio = hasDashes / total;
    
    if (underscoreRatio > 0.8) return 'consistent_underscores';
    if (dashRatio > 0.8) return 'consistent_dashes';
    if (underscoreRatio < 0.2 && dashRatio < 0.2) return 'consistent_no_separators';
    return 'inconsistent';
  },

  getMostCommonPrefixes(emojis: any[]): string[] {
    const prefixes: { [key: string]: number } = {};
    
    emojis.forEach(emoji => {
      const parts = emoji.name.split(/[-_]/);
      if (parts.length > 1) {
        const prefix = parts[0];
        prefixes[prefix] = (prefixes[prefix] || 0) + 1;
      }
    });
    
    return Object.entries(prefixes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([prefix]) => prefix);
  }
};
