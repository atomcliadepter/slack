
import { WebClient } from '@slack/web-api';
import { getSlackConfig } from '@/config/env';
import { logger } from '@/utils/logger';
import { ErrorHandler } from '@/utils/error';

/**
 * Enhanced Slack Web API Client with retry logic and error handling
 */
class EnhancedSlackClient {
  private client: WebClient;
  private userClient: WebClient | null = null;
  private config: ReturnType<typeof getSlackConfig>;

  constructor() {
    this.config = getSlackConfig();
    this.client = new WebClient(this.config.token, {
      logLevel: this.config.logLevel as any,
      timeout: this.config.timeout,
      retryConfig: {
        retries: this.config.maxRetries,
      },
    });

    // Initialize user client if user token is available
    if (this.config.userToken) {
      this.userClient = new WebClient(this.config.userToken, {
        logLevel: this.config.logLevel as any,
        timeout: this.config.timeout,
        retryConfig: {
          retries: this.config.maxRetries,
        },
      });
    }

    logger.info('Slack client initialized', {
      logLevel: this.config.logLevel,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });
  }

  /**
   * Get the underlying WebClient instance
   */
  getClient(): WebClient {
    return this.client;
  }

  /**
   * Get the user WebClient instance for operations requiring user token
   */
  getUserClient(): WebClient {
    if (!this.userClient) {
      throw new Error('User token not configured. Set SLACK_USER_TOKEN environment variable.');
    }
    return this.userClient;
  }

  /**
   * Test the connection to Slack API
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.client.auth.test();
      logger.info('Slack connection test successful', {
        user: result.user,
        team: result.team,
        url: result.url,
      });
      return true;
    } catch (error) {
      logger.error('Slack connection test failed:', ErrorHandler.handleError(error));
      return false;
    }
  }

  /**
   * Get workspace information
   */
  async getWorkspaceInfo() {
    try {
      const [authTest, teamInfo] = await Promise.all([
        this.client.auth.test(),
        this.client.team.info(),
      ]);

      return {
        success: true,
        workspace: {
          id: authTest.team_id,
          name: teamInfo.team?.name,
          domain: teamInfo.team?.domain,
          url: authTest.url,
          bot: {
            id: authTest.user_id,
            name: authTest.user,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: ErrorHandler.handleError(error),
      };
    }
  }

  /**
   * Get channel information by ID or name
   */
  async getChannelInfo(channel: string) {
    try {
      // If channel doesn't start with #, try to find it by name
      if (!channel.startsWith('C') && !channel.startsWith('D') && !channel.startsWith('G')) {
        const channelName = channel.startsWith('#') ? channel.slice(1) : channel;
        const conversations = await this.client.conversations.list({
          types: 'public_channel,private_channel',
          limit: 1000,
        });

        const foundChannel = conversations.channels?.find(
          (ch) => ch.name === channelName
        );

        if (!foundChannel) {
          throw new Error(`Channel '${channel}' not found`);
        }

        channel = foundChannel.id!;
      }

      const result = await this.client.conversations.info({
        channel,
      });

      return {
        success: true,
        channel: result.channel,
      };
    } catch (error) {
      return {
        success: false,
        error: ErrorHandler.handleError(error),
      };
    }
  }

  /**
   * Get user information by ID or username
   */
  async getUserInfo(user: string) {
    try {
      // If user doesn't start with U, try to find by username
      if (!user.startsWith('U')) {
        const username = user.startsWith('@') ? user.slice(1) : user;
        const users = await this.client.users.list({});
        
        const foundUser = users.members?.find(
          (u) => u.name === username || u.real_name === username
        );

        if (!foundUser) {
          throw new Error(`User '${user}' not found`);
        }

        user = foundUser.id!;
      }

      const result = await this.client.users.info({
        user,
      });

      return {
        success: true,
        user: result.user,
      };
    } catch (error) {
      return {
        success: false,
        error: ErrorHandler.handleError(error),
      };
    }
  }

  /**
   * Resolve channel ID from name or ID
   */
  async resolveChannelId(channel: string): Promise<string> {
    if (channel.startsWith('C') || channel.startsWith('D') || channel.startsWith('G')) {
      return channel;
    }

    const channelInfo = await this.getChannelInfo(channel);
    if (!channelInfo.success || !channelInfo.channel) {
      throw new Error(`Could not resolve channel: ${channel}`);
    }

    return channelInfo.channel.id!;
  }

  /**
   * Resolve user ID from username or ID
   */
  async resolveUserId(user: string): Promise<string> {
    if (user.startsWith('U')) {
      return user;
    }

    const userInfo = await this.getUserInfo(user);
    if (!userInfo.success || !userInfo.user) {
      throw new Error(`Could not resolve user: ${user}`);
    }

    return userInfo.user.id!;
  }
}

// Singleton instance
export const slackClient = new EnhancedSlackClient();
