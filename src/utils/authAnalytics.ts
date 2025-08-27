/**
 * Authentication Analytics Module
 * Provides analysis functions for Slack authentication and security
 */

import { logger } from './logger';

export interface ConnectionQuality {
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  factors: string[];
}

export interface TokenAnalysis {
  type: 'bot' | 'user' | 'app' | 'unknown';
  scope_level: 'basic' | 'standard' | 'advanced' | 'admin';
  capabilities: string[];
}

export interface PermissionScope {
  granted_scopes: string[];
  missing_scopes: string[];
  risk_level: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface SecurityPosture {
  overall_score: number;
  risk_factors: string[];
  security_level: 'high' | 'medium' | 'low';
  compliance_status: 'compliant' | 'partial' | 'non-compliant';
}

export interface AccessLevel {
  level: 'read-only' | 'standard' | 'elevated' | 'admin';
  permissions: string[];
  restrictions: string[];
}

export interface SecurityRecommendations {
  critical: string[];
  important: string[];
  suggested: string[];
  priority_score: number;
}

export interface WorkspaceSettings {
  security_settings: {
    two_factor_required: boolean;
    sso_enabled: boolean;
    guest_access_enabled: boolean;
  };
  compliance_features: string[];
  risk_assessment: string;
}

/**
 * Assess connection quality based on auth response
 */
export function assessConnectionQuality(authResult: any): ConnectionQuality {
  try {
    const factors: string[] = [];
    let score = 100;

    // Check if bot_id exists (indicates proper bot setup)
    if (!authResult.bot_id) {
      score -= 20;
      factors.push('Missing bot ID - may indicate configuration issues');
    }

    // Check if team information is available
    if (!authResult.team_id || !authResult.team) {
      score -= 15;
      factors.push('Incomplete team information');
    }

    // Check for enterprise installation
    if (authResult.is_enterprise_install) {
      score += 10;
      factors.push('Enterprise installation detected - enhanced security');
    }

    // Check URL presence (indicates proper workspace setup)
    if (!authResult.url) {
      score -= 10;
      factors.push('Missing workspace URL');
    }

    // Determine status based on score
    let status: 'excellent' | 'good' | 'fair' | 'poor';
    if (score >= 90) status = 'excellent';
    else if (score >= 75) status = 'good';
    else if (score >= 60) status = 'fair';
    else status = 'poor';

    if (factors.length === 0) {
      factors.push('All connection parameters optimal');
    }

    logger.info('Connection quality assessed', { score, status, factors: factors.length });

    return {
      score: Math.max(0, Math.min(100, score)),
      status,
      factors,
    };
  } catch (error) {
    logger.error('Failed to assess connection quality', { error });
    return {
      score: 0,
      status: 'poor',
      factors: ['Error during connection quality assessment'],
    };
  }
}

/**
 * Analyze token type and capabilities
 */
export function analyzeTokenType(authResult: any): TokenAnalysis {
  try {
    let type: 'bot' | 'user' | 'app' | 'unknown' = 'unknown';
    let scope_level: 'basic' | 'standard' | 'advanced' | 'admin' = 'basic';
    const capabilities: string[] = [];

    // Determine token type
    if (authResult.bot_id) {
      type = 'bot';
      capabilities.push('Bot API access');
    } else if (authResult.user_id) {
      type = 'user';
      capabilities.push('User API access');
    } else if (authResult.app_id) {
      type = 'app';
      capabilities.push('App-level access');
    }

    // Analyze scope level based on available information
    if (authResult.is_enterprise_install) {
      scope_level = 'admin';
      capabilities.push('Enterprise-level permissions');
    } else if (authResult.team_id && authResult.bot_id) {
      scope_level = 'standard';
      capabilities.push('Team-level bot permissions');
    }

    // Add capabilities based on auth result
    if (authResult.url) capabilities.push('Workspace URL access');
    if (authResult.team) capabilities.push('Team information access');

    logger.info('Token analysis completed', { type, scope_level, capabilities: capabilities.length });

    return {
      type,
      scope_level,
      capabilities,
    };
  } catch (error) {
    logger.error('Failed to analyze token type', { error });
    return {
      type: 'unknown',
      scope_level: 'basic',
      capabilities: ['Error during token analysis'],
    };
  }
}

/**
 * Analyze permission scope and identify gaps
 */
export function analyzePermissionScope(authResult: any): PermissionScope {
  try {
    const granted_scopes: string[] = [];
    const missing_scopes: string[] = [];
    const recommendations: string[] = [];

    // Analyze granted permissions based on auth result
    if (authResult.bot_id) {
      granted_scopes.push('bot:basic');
    }
    if (authResult.user_id) {
      granted_scopes.push('user:basic');
    }
    if (authResult.team_id) {
      granted_scopes.push('team:read');
    }

    // Common missing scopes for comprehensive functionality
    const desirable_scopes = [
      'channels:read',
      'channels:write',
      'chat:write',
      'users:read',
      'files:read',
      'reactions:read',
    ];

    // For this analysis, we'll assume some scopes might be missing
    // In a real implementation, this would check actual granted scopes
    missing_scopes.push(...desirable_scopes.slice(granted_scopes.length));

    // Determine risk level
    let risk_level: 'low' | 'medium' | 'high' = 'low';
    if (missing_scopes.length > 4) {
      risk_level = 'high';
      recommendations.push('Consider requesting additional scopes for full functionality');
    } else if (missing_scopes.length > 2) {
      risk_level = 'medium';
      recommendations.push('Some features may be limited due to scope restrictions');
    }

    if (granted_scopes.length === 0) {
      risk_level = 'high';
      recommendations.push('No clear permissions detected - verify token configuration');
    }

    logger.info('Permission scope analyzed', { 
      granted: granted_scopes.length, 
      missing: missing_scopes.length, 
      risk_level 
    });

    return {
      granted_scopes,
      missing_scopes,
      risk_level,
      recommendations,
    };
  } catch (error) {
    logger.error('Failed to analyze permission scope', { error });
    return {
      granted_scopes: [],
      missing_scopes: [],
      risk_level: 'high',
      recommendations: ['Error during permission analysis'],
    };
  }
}

/**
 * Assess overall security posture
 */
export function assessSecurityPosture(authResult: any, teamInfo?: any): SecurityPosture {
  try {
    const risk_factors: string[] = [];
    let overall_score = 100;

    // Check for enterprise installation
    if (!authResult.is_enterprise_install) {
      risk_factors.push('Non-enterprise installation may have fewer security controls');
      overall_score -= 10;
    }

    // Check team information availability
    if (!teamInfo || !teamInfo.team) {
      risk_factors.push('Limited team information available for security assessment');
      overall_score -= 15;
    }

    // Check for proper bot configuration
    if (!authResult.bot_id) {
      risk_factors.push('Missing bot ID may indicate improper configuration');
      overall_score -= 20;
    }

    // Determine security level
    let security_level: 'high' | 'medium' | 'low';
    if (overall_score >= 80) security_level = 'high';
    else if (overall_score >= 60) security_level = 'medium';
    else security_level = 'low';

    // Determine compliance status
    let compliance_status: 'compliant' | 'partial' | 'non-compliant';
    if (risk_factors.length === 0) compliance_status = 'compliant';
    else if (risk_factors.length <= 2) compliance_status = 'partial';
    else compliance_status = 'non-compliant';

    if (risk_factors.length === 0) {
      risk_factors.push('No significant security risks identified');
    }

    logger.info('Security posture assessed', { 
      overall_score, 
      security_level, 
      compliance_status, 
      risk_factors: risk_factors.length 
    });

    return {
      overall_score: Math.max(0, Math.min(100, overall_score)),
      risk_factors,
      security_level,
      compliance_status,
    };
  } catch (error) {
    logger.error('Failed to assess security posture', { error });
    return {
      overall_score: 0,
      risk_factors: ['Error during security assessment'],
      security_level: 'low',
      compliance_status: 'non-compliant',
    };
  }
}

/**
 * Determine access level based on permissions
 */
export function determineAccessLevel(authResult: any): AccessLevel {
  try {
    const permissions: string[] = [];
    const restrictions: string[] = [];

    // Analyze permissions based on auth result
    if (authResult.bot_id) {
      permissions.push('Bot API operations');
    }
    if (authResult.user_id) {
      permissions.push('User context operations');
    }
    if (authResult.team_id) {
      permissions.push('Team-level access');
    }

    // Determine access level
    let level: 'read-only' | 'standard' | 'elevated' | 'admin';
    if (authResult.is_enterprise_install) {
      level = 'admin';
      permissions.push('Enterprise administration');
    } else if (authResult.bot_id && authResult.team_id) {
      level = 'standard';
      permissions.push('Standard bot operations');
    } else if (authResult.user_id || authResult.bot_id) {
      level = 'elevated';
      permissions.push('Basic API access');
    } else {
      level = 'read-only';
      restrictions.push('Limited to read-only operations');
    }

    // Add common restrictions
    if (!authResult.is_enterprise_install) {
      restrictions.push('Non-enterprise limitations apply');
    }

    logger.info('Access level determined', { level, permissions: permissions.length, restrictions: restrictions.length });

    return {
      level,
      permissions,
      restrictions,
    };
  } catch (error) {
    logger.error('Failed to determine access level', { error });
    return {
      level: 'read-only',
      permissions: [],
      restrictions: ['Error during access level determination'],
    };
  }
}

/**
 * Generate security recommendations
 */
export function generateSecurityRecommendations(authResult: any, teamInfo?: any): SecurityRecommendations {
  try {
    const critical: string[] = [];
    const important: string[] = [];
    const suggested: string[] = [];
    let priority_score = 0;

    // Critical recommendations
    if (!authResult.bot_id && !authResult.user_id) {
      critical.push('Verify token configuration - no clear identity detected');
      priority_score += 30;
    }

    if (!authResult.team_id) {
      critical.push('Missing team association - verify workspace connection');
      priority_score += 25;
    }

    // Important recommendations
    if (!authResult.is_enterprise_install) {
      important.push('Consider enterprise installation for enhanced security features');
      priority_score += 15;
    }

    if (!teamInfo) {
      important.push('Enable team information access for better security monitoring');
      priority_score += 10;
    }

    // Suggested recommendations
    suggested.push('Regularly rotate authentication tokens');
    suggested.push('Monitor API usage patterns for anomalies');
    suggested.push('Implement proper error handling for authentication failures');
    priority_score += 5;

    // If no issues found, add positive recommendations
    if (critical.length === 0 && important.length === 0) {
      suggested.push('Security configuration appears optimal');
      suggested.push('Continue monitoring for security best practices');
    }

    logger.info('Security recommendations generated', { 
      critical: critical.length, 
      important: important.length, 
      suggested: suggested.length, 
      priority_score 
    });

    return {
      critical,
      important,
      suggested,
      priority_score,
    };
  } catch (error) {
    logger.error('Failed to generate security recommendations', { error });
    return {
      critical: ['Error generating security recommendations'],
      important: [],
      suggested: [],
      priority_score: 100,
    };
  }
}

/**
 * Analyze workspace settings for security insights
 */
export function analyzeWorkspaceSettings(teamData: any): WorkspaceSettings {
  try {
    const security_settings = {
      two_factor_required: false, // Would need additional API calls to determine
      sso_enabled: false, // Would need additional API calls to determine
      guest_access_enabled: false, // Would need additional API calls to determine
    };

    const compliance_features: string[] = [];
    let risk_assessment = 'medium';

    // Analyze available team data
    if (teamData) {
      if (teamData.enterprise_name) {
        compliance_features.push('Enterprise features available');
        risk_assessment = 'low';
      }

      if (teamData.domain) {
        compliance_features.push('Custom domain configured');
      }

      // In a real implementation, additional API calls would be made
      // to gather actual security settings
    }

    if (compliance_features.length === 0) {
      compliance_features.push('Basic workspace configuration');
      risk_assessment = 'medium';
    }

    logger.info('Workspace settings analyzed', { 
      compliance_features: compliance_features.length, 
      risk_assessment 
    });

    return {
      security_settings,
      compliance_features,
      risk_assessment,
    };
  } catch (error) {
    logger.error('Failed to analyze workspace settings', { error });
    return {
      security_settings: {
        two_factor_required: false,
        sso_enabled: false,
        guest_access_enabled: false,
      },
      compliance_features: ['Error during workspace analysis'],
      risk_assessment: 'high',
    };
  }
}

/**
 * Measure connection latency
 */
export function measureConnectionLatency(startTime: number): number {
  try {
    const latency = Date.now() - startTime;
    
    logger.info('Connection latency measured', { latency });
    
    return latency;
  } catch (error) {
    logger.error('Failed to measure connection latency', { error });
    return 0;
  }
}
