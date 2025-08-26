import { getLogConfig } from '@/config/env';

/**
 * Logger configuration interface
 */
interface LoggerConfig {
  level?: string;
  format?: 'json' | 'text';
  includeTimestamp?: boolean;
  filterSensitive?: boolean;
}

/**
 * Enhanced logging utility with structured logging support
 */
class Logger {
  private config: ReturnType<typeof getLogConfig>;
  private name: string;
  private loggerConfig: LoggerConfig;

  constructor(name: string = 'default', config: LoggerConfig = {}) {
    this.config = getLogConfig();
    this.name = name;
    this.loggerConfig = {
      level: config.level || this.config.level,
      format: config.format || 'json',
      includeTimestamp: config.includeTimestamp !== false,
      filterSensitive: config.filterSensitive || false,
      ...config
    };
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const baseLog: any = {
      level,
      message,
    };

    if (this.loggerConfig.includeTimestamp) {
      baseLog.timestamp = new Date().toISOString();
    }

    if (this.name !== 'default') {
      baseLog.logger = this.name;
    }

    if (meta) {
      let filteredMeta = meta;
      if (this.loggerConfig.filterSensitive) {
        filteredMeta = this.filterSensitiveData(meta);
      }
      Object.assign(baseLog, filteredMeta);
    }

    if (this.loggerConfig.format === 'json') {
      return JSON.stringify(baseLog, null, this.config.isDevelopment ? 2 : 0);
    } else {
      const timestamp = baseLog.timestamp ? `[${baseLog.timestamp}] ` : '';
      const logger = baseLog.logger ? `[${baseLog.logger}] ` : '';
      return `${timestamp}${logger}${level}: ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`;
    }
  }

  private filterSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    
    const filtered = { ...data };
    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'authorization'];
    
    for (const key in filtered) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        filtered[key] = '[FILTERED]';
      }
      if (typeof filtered[key] === 'string' && filtered[key].includes('xoxb-')) {
        filtered[key] = filtered[key].replace(/xoxb-[^\s&]+/g, 'xoxb-[FILTERED]');
      }
    }
    
    return filtered;
  }

  private shouldLog(level: string): boolean {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const currentLevelIndex = levels.indexOf(this.loggerConfig.level || 'INFO');
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

  // Performance logging methods
  time(label: string): void {
    console.time(label);
  }

  timeEnd(label: string): void {
    console.timeEnd(label);
  }

  // Tool execution logging
  logToolExecution(tool: string, args: any, duration?: number): void {
    this.info(`Tool executed: ${tool}`, { 
      tool, 
      args, 
      duration: duration ? `${duration}ms` : undefined 
    });
  }

  logToolError(tool: string, error: string, args: any): void {
    this.error(`Tool failed: ${tool}`, { tool, error, args });
  }
}

/**
 * Create a new logger instance
 */
export function createLogger(name: string, config?: LoggerConfig): Logger {
  return new Logger(name, config);
}

// Default logger instance
export const logger = new Logger();
