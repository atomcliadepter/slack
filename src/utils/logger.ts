
import { getLogConfig } from '@/config/env';

/**
 * Enhanced logging utility with structured logging support
 */
class Logger {
  private config: ReturnType<typeof getLogConfig>;

  constructor() {
    this.config = getLogConfig();
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const baseLog = {
      timestamp,
      level,
      message,
    };

    if (meta) {
      return JSON.stringify({ ...baseLog, ...meta }, null, this.config.isDevelopment ? 2 : 0);
    }

    return JSON.stringify(baseLog, null, this.config.isDevelopment ? 2 : 0);
  }

  private shouldLog(level: string): boolean {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog('DEBUG')) {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog('INFO')) {
      console.info(this.formatMessage('INFO', message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog('WARN')) {
      console.warn(this.formatMessage('WARN', message, meta));
    }
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog('ERROR')) {
      console.error(this.formatMessage('ERROR', message, meta));
    }
  }

  /**
   * Log tool execution
   */
  logToolExecution(toolName: string, args: any, duration?: number): void {
    this.info(`Tool executed: ${toolName}`, {
      tool: toolName,
      args,
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  /**
   * Log tool error
   */
  logToolError(toolName: string, error: string, args?: any): void {
    this.error(`Tool failed: ${toolName}`, {
      tool: toolName,
      error,
      args,
    });
  }

  /**
   * Log Slack API call
   */
  logSlackAPI(method: string, params: any, success: boolean, duration?: number): void {
    const level = success ? 'INFO' : 'ERROR';
    const message = `Slack API: ${method} ${success ? 'succeeded' : 'failed'}`;
    
    if (level === 'INFO') {
      this.info(message, {
        method,
        params,
        duration: duration ? `${duration}ms` : undefined,
      });
    } else {
      this.error(message, {
        method,
        params,
        duration: duration ? `${duration}ms` : undefined,
      });
    }
  }
}

// Singleton instance
export const logger = new Logger();
