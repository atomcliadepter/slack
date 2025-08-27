# Enhanced MCP Slack SDK - Deployment Guide

## Overview

This guide covers deployment options for the Enhanced MCP Slack SDK v2.0.0, from local development to production environments.

## Prerequisites

### System Requirements
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Docker 20.10.0 or higher (for containerized deployment)
- Kubernetes 1.20+ (for Kubernetes deployment)

### Slack Requirements
- Slack workspace with admin permissions
- Slack app with appropriate OAuth scopes
- Bot token and signing secret

## Local Development

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd enhanced-mcp-slack-sdk

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure environment variables
nano .env

# Build the project
npm run build

# Start development server
npm run dev
```

### Environment Configuration
Create a `.env` file with the following variables:

```env
# Required Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret

# Optional Slack Configuration
SLACK_USER_TOKEN=xoxp-your-user-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

# Application Configuration
NODE_ENV=development
HTTP_PORT=3000
SLACK_SOCKET_MODE=false
SLACK_LOG_LEVEL=INFO
SLACK_API_TIMEOUT_MS=30000
SLACK_API_MAX_RETRIES=3

# MCP Configuration
MCP_SERVER_NAME=enhanced-slack-mcp-server
MCP_SERVER_VERSION=2.0.0

# Optional Configuration
REDIS_URL=redis://localhost:6379
AWS_REGION=us-east-1
AWS_PROFILE=default
```

### Development Scripts
```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## Docker Deployment

### Single Container
```bash
# Build Docker image
docker build -t enhanced-mcp-slack-sdk .

# Run container
docker run -d \
  --name mcp-slack-sdk \
  -p 3000:3000 \
  --env-file .env \
  enhanced-mcp-slack-sdk
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  enhanced-mcp-slack-sdk:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SLACK_LOG_LEVEL=INFO
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "dist/healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Multi-Stage Production Build
```dockerfile
# Dockerfile.prod
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runtime

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js

CMD ["npm", "start"]
```

## Kubernetes Deployment

### Namespace and ConfigMap
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mcp-slack-sdk

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-slack-config
  namespace: mcp-slack-sdk
data:
  NODE_ENV: "production"
  HTTP_PORT: "3000"
  SLACK_LOG_LEVEL: "INFO"
  SLACK_API_TIMEOUT_MS: "30000"
  SLACK_API_MAX_RETRIES: "3"
  MCP_SERVER_NAME: "enhanced-slack-mcp-server"
  MCP_SERVER_VERSION: "2.0.0"
```

### Secrets
```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: slack-secrets
  namespace: mcp-slack-sdk
type: Opaque
data:
  bot-token: <base64-encoded-bot-token>
  signing-secret: <base64-encoded-signing-secret>
  user-token: <base64-encoded-user-token>
  app-token: <base64-encoded-app-token>
```

### Deployment
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: enhanced-mcp-slack-sdk
  namespace: mcp-slack-sdk
  labels:
    app: enhanced-mcp-slack-sdk
spec:
  replicas: 3
  selector:
    matchLabels:
      app: enhanced-mcp-slack-sdk
  template:
    metadata:
      labels:
        app: enhanced-mcp-slack-sdk
    spec:
      containers:
      - name: enhanced-mcp-slack-sdk
        image: enhanced-mcp-slack-sdk:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: mcp-slack-config
        env:
        - name: SLACK_BOT_TOKEN
          valueFrom:
            secretKeyRef:
              name: slack-secrets
              key: bot-token
        - name: SLACK_SIGNING_SECRET
          valueFrom:
            secretKeyRef:
              name: slack-secrets
              key: signing-secret
        - name: SLACK_USER_TOKEN
          valueFrom:
            secretKeyRef:
              name: slack-secrets
              key: user-token
        - name: SLACK_APP_TOKEN
          valueFrom:
            secretKeyRef:
              name: slack-secrets
              key: app-token
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - node
            - dist/healthcheck.js
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          exec:
            command:
            - node
            - dist/healthcheck.js
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
```

### Service and Ingress
```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: enhanced-mcp-slack-sdk-service
  namespace: mcp-slack-sdk
spec:
  selector:
    app: enhanced-mcp-slack-sdk
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: enhanced-mcp-slack-sdk-ingress
  namespace: mcp-slack-sdk
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - mcp-slack-sdk.yourdomain.com
    secretName: mcp-slack-sdk-tls
  rules:
  - host: mcp-slack-sdk.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: enhanced-mcp-slack-sdk-service
            port:
              number: 80
```

### Redis Deployment
```yaml
# k8s/redis.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: mcp-slack-sdk
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-data
          mountPath: /data
        command: ["redis-server", "--appendonly", "yes"]
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: mcp-slack-sdk
spec:
  selector:
    app: redis
  ports:
  - protocol: TCP
    port: 6379
    targetPort: 6379

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: mcp-slack-sdk
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

### Deployment Commands
```bash
# Apply all configurations
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n mcp-slack-sdk

# View logs
kubectl logs -f deployment/enhanced-mcp-slack-sdk -n mcp-slack-sdk

# Scale deployment
kubectl scale deployment enhanced-mcp-slack-sdk --replicas=5 -n mcp-slack-sdk

# Update deployment
kubectl set image deployment/enhanced-mcp-slack-sdk enhanced-mcp-slack-sdk=enhanced-mcp-slack-sdk:v2.1.0 -n mcp-slack-sdk
```

## Cloud Platform Deployments

### AWS ECS
```json
{
  "family": "enhanced-mcp-slack-sdk",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "enhanced-mcp-slack-sdk",
      "image": "your-account.dkr.ecr.region.amazonaws.com/enhanced-mcp-slack-sdk:latest",
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
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/enhanced-mcp-slack-sdk",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "node dist/healthcheck.js"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Google Cloud Run
```yaml
# cloudrun.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: enhanced-mcp-slack-sdk
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 100
      containers:
      - image: gcr.io/project-id/enhanced-mcp-slack-sdk:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: SLACK_BOT_TOKEN
          valueFrom:
            secretKeyRef:
              name: slack-secrets
              key: bot-token
        resources:
          limits:
            cpu: 1000m
            memory: 512Mi
```

### Azure Container Instances
```yaml
# azure-container-instance.yaml
apiVersion: 2019-12-01
location: eastus
name: enhanced-mcp-slack-sdk
properties:
  containers:
  - name: enhanced-mcp-slack-sdk
    properties:
      image: your-registry.azurecr.io/enhanced-mcp-slack-sdk:latest
      ports:
      - port: 3000
        protocol: TCP
      environmentVariables:
      - name: NODE_ENV
        value: production
      - name: SLACK_BOT_TOKEN
        secureValue: your-bot-token
      resources:
        requests:
          cpu: 0.5
          memoryInGb: 1
  osType: Linux
  restartPolicy: Always
  ipAddress:
    type: Public
    ports:
    - protocol: TCP
      port: 3000
```

## Monitoring and Observability

### Health Checks
The application includes built-in health checks:

```javascript
// Health check endpoint
GET /health

// Response
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "2.0.0",
  "environment": "production",
  "dependencies": {
    "slack": "connected",
    "redis": "connected"
  }
}
```

### Logging
Structured JSON logging with configurable levels:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "message": "Tool executed successfully",
  "tool": "slack_send_message",
  "duration": 150,
  "metadata": {
    "channel": "general",
    "user": "U1234567890"
  }
}
```

### Metrics
Key metrics to monitor:

- Request rate and response time
- Error rate by tool
- Slack API rate limit usage
- Memory and CPU utilization
- Active connections
- Cache hit/miss ratio

### Prometheus Integration
```yaml
# prometheus.yml
scrape_configs:
- job_name: 'enhanced-mcp-slack-sdk'
  static_configs:
  - targets: ['localhost:3000']
  metrics_path: '/metrics'
  scrape_interval: 15s
```

## Security Considerations

### Environment Variables
- Never commit secrets to version control
- Use secret management systems (AWS Secrets Manager, Azure Key Vault, etc.)
- Rotate tokens regularly
- Use least privilege principle for permissions

### Network Security
- Use HTTPS in production
- Implement proper firewall rules
- Use VPC/private networks when possible
- Enable DDoS protection

### Container Security
- Use non-root user in containers
- Scan images for vulnerabilities
- Keep base images updated
- Use minimal base images (Alpine Linux)

### Slack Security
- Validate webhook signatures
- Use appropriate OAuth scopes
- Monitor for suspicious activity
- Implement rate limiting

## Troubleshooting

### Common Issues

#### Connection Issues
```bash
# Check network connectivity
curl -I https://slack.com/api/auth.test

# Verify token
curl -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  https://slack.com/api/auth.test
```

#### Memory Issues
```bash
# Monitor memory usage
docker stats

# Check for memory leaks
kubectl top pods -n mcp-slack-sdk
```

#### Performance Issues
```bash
# Check application logs
docker logs enhanced-mcp-slack-sdk

# Monitor API response times
kubectl logs -f deployment/enhanced-mcp-slack-sdk -n mcp-slack-sdk | grep "execution_time"
```

### Debug Mode
Enable debug logging:

```env
SLACK_LOG_LEVEL=DEBUG
NODE_ENV=development
```

### Support Resources
- Application logs: `/app/logs/`
- Health check: `GET /health`
- Metrics: `GET /metrics`
- Documentation: `/docs/`

## Backup and Recovery

### Data Backup
- Configuration files
- Environment variables
- Application logs
- Redis data (if used)

### Recovery Procedures
1. Restore configuration
2. Verify Slack connectivity
3. Test core functionality
4. Monitor for issues

### Disaster Recovery
- Multi-region deployment
- Automated failover
- Data replication
- Regular backup testing
