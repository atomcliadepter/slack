export const getHealthStatus = () => ({
  status: 'healthy',
  version: '2.0.0',
  tools: 33,
  uptime: Math.floor(process.uptime()),
  memory: process.memoryUsage(),
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development'
});
