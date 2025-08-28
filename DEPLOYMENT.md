# Enhanced MCP Slack SDK - Deployment Guide

## Quick Start Deployment

### Prerequisites
- Node.js 18+
- Slack workspace with admin access
- Environment variables configured

### 1. Environment Setup

```bash
# Clone and install
git clone <repository-url>
cd slack_mcp
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Slack credentials
```

### 2. Required Environment Variables

```env
# Required
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret

# Optional
SLACK_USER_TOKEN=xoxp-your-user-token
NODE_ENV=production
HTTP_PORT=3000
```

### 3. Slack App Configuration

1. **Create Slack App**: https://api.slack.com/apps
2. **OAuth Scopes** (Bot Token):
   ```
   channels:history, channels:read, channels:write
   chat:write, files:read, files:write
   groups:history, groups:read, groups:write
   im:history, im:read, im:write
   pins:read, pins:write
   reactions:read, reactions:write
   search:read, users:read, users:read.email
   users.profile:read, team:read, bookmarks:read
   ```
3. **Install App** to workspace
4. **Copy tokens** to `.env`

## Production Deployment Options

### Option 1: Docker Deployment (Recommended)

```bash
# Build image
docker build -f deployment/docker/Dockerfile -t slack-mcp-server .

# Run container
docker run -d \
  --name slack-mcp \
  -p 3000:3000 \
  --env-file .env \
  slack-mcp-server
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  slack-mcp:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "dist/healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Option 2: PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Build project
npm run build

# Start with PM2
pm2 start dist/index.js --name slack-mcp

# Save PM2 configuration
pm2 save
pm2 startup
```

### Option 3: Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/slack-mcp.service
```

```ini
[Unit]
Description=Enhanced MCP Slack SDK
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/slack_mcp
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/path/to/slack_mcp/.env

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable slack-mcp
sudo systemctl start slack-mcp
sudo systemctl status slack-mcp
```

## Cloud Platform Deployments

### AWS EC2

```bash
# Launch EC2 instance (Ubuntu 22.04)
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Deploy application
git clone <repository-url>
cd slack_mcp
npm install
npm run build

# Configure environment
cp .env.example .env
# Edit .env with production values

# Start with PM2
npm install -g pm2
pm2 start dist/index.js --name slack-mcp
pm2 save
pm2 startup
```

### AWS ECS (Fargate)

```json
{
  "family": "slack-mcp-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "slack-mcp",
      "image": "your-account.dkr.ecr.region.amazonaws.com/slack-mcp:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "SLACK_BOT_TOKEN",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:slack-bot-token"
        }
      ]
    }
  ]
}
```

### Google Cloud Run

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/slack-mcp', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/slack-mcp']
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'slack-mcp'
      - '--image'
      - 'gcr.io/$PROJECT_ID/slack-mcp'
      - '--platform'
      - 'managed'
      - '--region'
      - 'us-central1'
      - '--allow-unauthenticated'
```

### Heroku

```bash
# Install Heroku CLI
# Login and create app
heroku login
heroku create your-slack-mcp-app

# Set environment variables
heroku config:set SLACK_BOT_TOKEN=xoxb-your-token
heroku config:set SLACK_SIGNING_SECRET=your-secret
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

## Monitoring & Health Checks

### Health Check Endpoint

```bash
# Check application health
curl http://localhost:3000/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-08-28T16:48:30.761Z",
  "uptime": 3600,
  "version": "2.0.1"
}
```

### Logging Configuration

```env
# Environment variables for logging
SLACK_LOG_LEVEL=INFO  # DEBUG, INFO, WARN, ERROR
LOG_FORMAT=json       # json, text
LOG_FILE=/var/log/slack-mcp.log
```

### Monitoring Setup

```bash
# Install monitoring tools
npm install -g @datadog/datadog-ci
npm install -g newrelic

# Configure monitoring
export DD_API_KEY=your-datadog-key
export NEW_RELIC_LICENSE_KEY=your-newrelic-key
```

## Security Considerations

### Environment Security
```bash
# Secure .env file
chmod 600 .env
chown app:app .env

# Use secrets management
# AWS: AWS Secrets Manager
# GCP: Secret Manager
# Azure: Key Vault
```

### Network Security
```bash
# Firewall rules (UFW example)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3000/tcp  # Application
sudo ufw enable

# Reverse proxy (Nginx)
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Scaling & Performance

### Horizontal Scaling
```bash
# Multiple instances with load balancer
# PM2 cluster mode
pm2 start dist/index.js -i max --name slack-mcp-cluster

# Docker Swarm
docker service create \
  --name slack-mcp \
  --replicas 3 \
  --publish 3000:3000 \
  slack-mcp-server
```

### Performance Tuning
```env
# Environment variables for performance
SLACK_API_TIMEOUT_MS=30000
SLACK_API_MAX_RETRIES=3
REDIS_URL=redis://localhost:6379  # For caching
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :3000
   # Kill process
   kill -9 <PID>
   ```

2. **Permission Errors**
   ```bash
   # Fix file permissions
   chmod +x start-mcp.js
   chown -R app:app /path/to/slack_mcp
   ```

3. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   node --max-old-space-size=4096 dist/index.js
   ```

### Log Analysis
```bash
# View application logs
tail -f /var/log/slack-mcp.log

# PM2 logs
pm2 logs slack-mcp

# Docker logs
docker logs slack-mcp
```

## Backup & Recovery

### Configuration Backup
```bash
# Backup configuration
tar -czf slack-mcp-backup.tar.gz .env package.json dist/

# Restore configuration
tar -xzf slack-mcp-backup.tar.gz
```

### Database Backup (if using)
```bash
# Redis backup
redis-cli BGSAVE

# MongoDB backup
mongodump --db slack-mcp --out backup/
```

## Maintenance

### Updates
```bash
# Update dependencies
npm update

# Rebuild application
npm run build

# Restart service
pm2 restart slack-mcp
# or
sudo systemctl restart slack-mcp
```

### Health Monitoring
```bash
# Automated health check script
#!/bin/bash
HEALTH_URL="http://localhost:3000/health"
if ! curl -f $HEALTH_URL > /dev/null 2>&1; then
    echo "Health check failed, restarting service"
    pm2 restart slack-mcp
fi
```

## Support

- **Documentation**: See README.md and API_REFERENCE.md
- **Issues**: GitHub Issues
- **Logs**: Check application logs for detailed error information
- **Health**: Monitor `/health` endpoint for service status
