
import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  // Slack Configuration
  SLACK_BOT_TOKEN: z.string().min(1, 'SLACK_BOT_TOKEN is required'),
  SLACK_USER_TOKEN: z.string().optional(),
  SLACK_APP_TOKEN: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().min(1, 'SLACK_SIGNING_SECRET is required'),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  
  // Application Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HTTP_PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
  SLACK_SOCKET_MODE: z.string().transform(val => val === 'true').default('false'),
  SLACK_LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('INFO'),
  SLACK_API_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().int().positive()).default('30000'),
  SLACK_API_MAX_RETRIES: z.string().transform(Number).pipe(z.number().int().min(0)).default('3'),
  
  // MCP Configuration
  MCP_SERVER_NAME: z.string().default('enhanced-slack-mcp-server'),
  MCP_SERVER_VERSION: z.string().default('2.0.0'),
  
  // Optional Configuration
  REDIS_URL: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_PROFILE: z.string().optional(),
});

// Validate and parse environment variables
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment configuration:');
  parseResult.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const config = parseResult.data;

// Type-safe environment configuration
export type Config = typeof config;

// Environment helpers
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

// Slack configuration helpers
export const getSlackConfig = () => ({
  token: config.SLACK_BOT_TOKEN,
  userToken: config.SLACK_USER_TOKEN,
  appToken: config.SLACK_APP_TOKEN,
  signingSecret: config.SLACK_SIGNING_SECRET,
  clientId: config.SLACK_CLIENT_ID,
  clientSecret: config.SLACK_CLIENT_SECRET,
  socketMode: config.SLACK_SOCKET_MODE,
  logLevel: config.SLACK_LOG_LEVEL,
  timeout: config.SLACK_API_TIMEOUT_MS,
  maxRetries: config.SLACK_API_MAX_RETRIES,
});

// MCP configuration helpers
export const getMCPConfig = () => ({
  name: config.MCP_SERVER_NAME,
  version: config.MCP_SERVER_VERSION,
});

// Logging configuration
export const getLogConfig = () => ({
  level: config.SLACK_LOG_LEVEL,
  isDevelopment,
  isProduction,
});
