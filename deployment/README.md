# Deployment Configurations

This directory contains production-ready deployment configurations for the Enhanced MCP Slack SDK.

## Directory Structure

```
deployment/
├── docker/
│   ├── Dockerfile          # Production Docker image
│   └── docker-compose.yml  # Multi-service Docker setup
├── k8s/
│   └── deployment.yaml     # Kubernetes manifests
├── helm/
│   ├── Chart.yaml         # Helm chart definition
│   └── values.yaml        # Helm configuration values
└── monitoring/
    ├── prometheus.yml     # Prometheus configuration
    └── alert_rules.yml    # Alerting rules
```

## Quick Deployment

### Docker Compose (Recommended for Development)
```bash
cd deployment/docker
docker-compose up -d
```

### Kubernetes
```bash
kubectl apply -f deployment/k8s/deployment.yaml
```

### Helm
```bash
helm install slack-mcp deployment/helm/
```

## Configuration

### Environment Variables
Update secrets in:
- `k8s/deployment.yaml` - Kubernetes secrets
- `helm/values.yaml` - Helm values
- `../../.env` - Docker Compose environment

### Required Secrets
- `SLACK_BOT_TOKEN`: Your Slack bot token
- `SLACK_SIGNING_SECRET`: Your Slack signing secret

## Monitoring

The monitoring setup includes:
- **Prometheus**: Metrics collection
- **Alert Rules**: Critical service alerts
- **Health Checks**: Application health monitoring

### Metrics Endpoints
- Application: `http://slack-mcp:3000/metrics`
- Health: `http://slack-mcp:3000/health`

## Scaling

### Horizontal Pod Autoscaler (HPA)
```bash
kubectl autoscale deployment slack-mcp --cpu-percent=80 --min=2 --max=10
```

### Manual Scaling
```bash
# Kubernetes
kubectl scale deployment slack-mcp --replicas=5

# Docker Compose
docker-compose up -d --scale slack-mcp=3
```

## Security

- Non-root container execution
- Resource limits configured
- Secrets management via Kubernetes/Docker secrets
- Network policies (configure as needed)

## Troubleshooting

### Check Logs
```bash
# Docker
docker-compose logs slack-mcp

# Kubernetes
kubectl logs -l app=slack-mcp

# Helm
kubectl logs -l app.kubernetes.io/name=slack-mcp
```

### Health Check
```bash
curl http://localhost:3000/health
```
