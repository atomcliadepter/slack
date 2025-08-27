/**
 * Comprehensive tests for slackAuthTest tool
 */

import { slackAuthTestTool } from '../../../../src/tools/slackAuthTest';
import { slackClient } from '../../../../src/utils/slackClient';
import { logger } from '../../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../../src/utils/slackClient');
jest.mock('../../../../src/utils/logger');
jest.mock('../../../../src/utils/authAnalytics');

const mockSlackClient = slackClient as jest.Mocked<typeof slackClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('slackAuthTest Tool - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful auth response
    mockSlackClient.getClient.mockReturnValue({
      auth: {
        test: jest.fn().mockResolvedValue({
          ok: true,
          url: 'https://test-workspace.slack.com/',
          team: 'Test Workspace',
          user: 'testuser',
          team_id: 'T1234567890',
          user_id: 'U1234567890',
          bot_id: 'B1234567890',
          is_enterprise_install: false,
        }),
      },
      team: {
        info: jest.fn().mockResolvedValue({
          ok: true,
          team: {
            id: 'T1234567890',
            name: 'Test Workspace',
            domain: 'test-workspace',
            enterprise_id: null,
            enterprise_name: null,
          },
        }),
      },
    } as any);
  });

  describe('Basic Authentication Testing', () => {
    it('should successfully test authentication', async () => {
      const args = {};

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('authentication_status', 'valid');
      expect(result.data).toHaveProperty('connection_details');
      expect(result.data.connection_details).toHaveProperty('workspace_url');
      expect(result.data.connection_details).toHaveProperty('team_name');
      expect(result.data.connection_details).toHaveProperty('user_name');
      expect(result.metadata).toHaveProperty('execution_time_ms');
    });

    it('should handle basic auth test without analytics', async () => {
      const args = {
        analytics: false,
        security_check: false,
        team_info: false,
      };

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data.authentication_status).toBe('valid');
      expect(result.data).not.toHaveProperty('security_analysis');
      expect(result.data).not.toHaveProperty('workspace_intelligence');
    });

    it('should include team information when requested', async () => {
      const args = {
        team_info: true,
      };

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('workspace_intelligence');
      expect(result.data.workspace_intelligence).toHaveProperty('workspace_name');
      expect(result.data.workspace_intelligence).toHaveProperty('workspace_domain');
    });
  });

  describe('Security Analysis', () => {
    it('should perform security analysis when requested', async () => {
      const args = {
        security_check: true,
      };

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('security_analysis');
      expect(result.data.security_analysis).toHaveProperty('token_type');
      expect(result.data.security_analysis).toHaveProperty('permission_scope');
      expect(result.data.security_analysis).toHaveProperty('security_posture');
    });

    it('should analyze enterprise installations', async () => {
      mockSlackClient.getClient.mockReturnValue({
        auth: {
          test: jest.fn().mockResolvedValue({
            ok: true,
            url: 'https://enterprise.slack.com/',
            team: 'Enterprise Workspace',
            user: 'enterpriseuser',
            team_id: 'T1234567890',
            user_id: 'U1234567890',
            bot_id: 'B1234567890',
            is_enterprise_install: true,
          }),
        },
        team: {
          info: jest.fn().mockResolvedValue({
            ok: true,
            team: {
              id: 'T1234567890',
              name: 'Enterprise Workspace',
              domain: 'enterprise',
              enterprise_id: 'E1234567890',
              enterprise_name: 'Enterprise Corp',
            },
          }),
        },
      } as any);

      const args = {
        security_check: true,
        team_info: true,
      };

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data.connection_details.is_enterprise_install).toBe(true);
      expect(result.data.workspace_intelligence).toHaveProperty('enterprise_info');
      expect(result.data.workspace_intelligence.enterprise_info).toHaveProperty('enterprise_name');
    });
  });

  describe('Analytics and Intelligence', () => {
    it('should provide analytics when requested', async () => {
      const args = {
        analytics: true,
      };

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('connection_details');
      expect(result.data.connection_details).toHaveProperty('connection_quality');
      expect(result.data).toHaveProperty('performance_metrics');
      expect(result.data.performance_metrics).toHaveProperty('response_time_ms');
      expect(result.data.performance_metrics).toHaveProperty('connection_latency');
    });

    it('should track performance metrics', async () => {
      const args = {
        analytics: true,
      };

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data.performance_metrics.response_time_ms).toBeGreaterThan(0);
      expect(result.data.performance_metrics.api_calls_made).toBeGreaterThanOrEqual(1);
      expect(result.data.performance_metrics.data_freshness).toBe('real-time');
    });

    it('should provide compliance tracking', async () => {
      const args = {
        security_check: true,
      };

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('compliance_tracking');
      expect(result.data.compliance_tracking).toHaveProperty('compliance_status');
      expect(result.data.compliance_tracking).toHaveProperty('last_audit_date');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid authentication', async () => {
      mockSlackClient.getClient.mockReturnValue({
        auth: {
          test: jest.fn().mockResolvedValue({
            ok: false,
            error: 'invalid_auth',
          }),
        },
      } as any);

      const args = {};

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid_auth');
    });

    it('should handle network errors', async () => {
      mockSlackClient.getClient.mockReturnValue({
        auth: {
          test: jest.fn().mockRejectedValue(new Error('Network error')),
        },
      } as any);

      const args = {};

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = new Error('ratelimited');
      (rateLimitError as any).code = 'slack_webapi_rate_limited';
      
      mockSlackClient.getClient.mockReturnValue({
        auth: {
          test: jest.fn().mockRejectedValue(rateLimitError),
        },
      } as any);

      const args = {};

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate');
    });

    it('should handle team info fetch errors gracefully', async () => {
      mockSlackClient.getClient.mockReturnValue({
        auth: {
          test: jest.fn().mockResolvedValue({
            ok: true,
            url: 'https://test-workspace.slack.com/',
            team: 'Test Workspace',
            user: 'testuser',
            team_id: 'T1234567890',
            user_id: 'U1234567890',
            bot_id: 'B1234567890',
          }),
        },
        team: {
          info: jest.fn().mockRejectedValue(new Error('Team info not available')),
        },
      } as any);

      const args = {
        team_info: true,
      };

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(true); // Should still succeed with auth test
      expect(result.data.authentication_status).toBe('valid');
      // Workspace intelligence should be empty or have limited info
    });
  });

  describe('Input Validation', () => {
    it('should handle boolean parameters correctly', async () => {
      const args = {
        analytics: 'true', // String instead of boolean
        security_check: 1, // Number instead of boolean
        team_info: false,
      };

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(true);
      // Should handle type coercion or validation appropriately
    });

    it('should handle empty arguments', async () => {
      const args = {};

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data.authentication_status).toBe('valid');
    });

    it('should handle null arguments', async () => {
      const args = {
        analytics: null,
        security_check: null,
        team_info: null,
      };

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(true);
    });
  });

  describe('Different Token Types', () => {
    it('should handle bot tokens', async () => {
      mockSlackClient.getClient.mockReturnValue({
        auth: {
          test: jest.fn().mockResolvedValue({
            ok: true,
            url: 'https://test-workspace.slack.com/',
            team: 'Test Workspace',
            user: 'testbot',
            team_id: 'T1234567890',
            user_id: 'U1234567890',
            bot_id: 'B1234567890',
          }),
        },
      } as any);

      const args = {
        analytics: true,
      };

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data.connection_details.bot_id).toBe('B1234567890');
    });

    it('should handle user tokens', async () => {
      mockSlackClient.getClient.mockReturnValue({
        auth: {
          test: jest.fn().mockResolvedValue({
            ok: true,
            url: 'https://test-workspace.slack.com/',
            team: 'Test Workspace',
            user: 'testuser',
            team_id: 'T1234567890',
            user_id: 'U1234567890',
            // No bot_id for user tokens
          }),
        },
      } as any);

      const args = {
        analytics: true,
      };

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data.connection_details.user_id).toBe('U1234567890');
      expect(result.data.connection_details.bot_id).toBeUndefined();
    });
  });

  describe('Performance Testing', () => {
    it('should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      const args = {
        analytics: true,
        security_check: true,
        team_info: true,
      };

      const result = await slackAuthTestTool.execute(args);

      const executionTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.metadata.execution_time_ms).toBeLessThan(5000);
    });

    it('should handle concurrent requests', async () => {
      const args = { analytics: true };
      
      const promises = Array(5).fill(null).map(() => 
        slackAuthTestTool.execute(args)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Tool Metadata', () => {
    it('should have correct tool name', () => {
      expect(slackAuthTestTool.name).toBe('slack_auth_test');
    });

    it('should have comprehensive description', () => {
      expect(slackAuthTestTool.description).toContain('authentication');
      expect(slackAuthTestTool.description).toContain('security');
      expect(slackAuthTestTool.description).toContain('intelligence');
    });

    it('should have proper input schema', () => {
      expect(slackAuthTestTool.inputSchema).toHaveProperty('type', 'object');
      expect(slackAuthTestTool.inputSchema).toHaveProperty('properties');
      expect(slackAuthTestTool.inputSchema.properties).toHaveProperty('analytics');
      expect(slackAuthTestTool.inputSchema.properties).toHaveProperty('security_check');
      expect(slackAuthTestTool.inputSchema.properties).toHaveProperty('team_info');
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with all features enabled', async () => {
      const args = {
        analytics: true,
        security_check: true,
        team_info: true,
      };

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('authentication_status', 'valid');
      expect(result.data).toHaveProperty('connection_details');
      expect(result.data).toHaveProperty('security_analysis');
      expect(result.data).toHaveProperty('workspace_intelligence');
      expect(result.data).toHaveProperty('performance_metrics');
      expect(result.data).toHaveProperty('compliance_tracking');
    });

    it('should provide troubleshooting information on failure', async () => {
      mockSlackClient.getClient.mockReturnValue({
        auth: {
          test: jest.fn().mockResolvedValue({
            ok: false,
            error: 'invalid_auth',
          }),
        },
      } as any);

      const args = {};

      const result = await slackAuthTestTool.execute(args);

      expect(result.success).toBe(false);
      expect(result).toHaveProperty('troubleshooting');
      expect(Array.isArray(result.troubleshooting)).toBe(true);
    });
  });
});
