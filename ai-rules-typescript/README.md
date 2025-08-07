# AI Rules Management System (TypeScript)

An autonomous AI-powered rule management system that generates, updates, and maintains development best practices through Model Context Protocol (MCP) integration. This system solves the problem of manual rule updates and provides clean context injection without terminal pollution.

## 🚀 Features

- **Autonomous Rule Generation**: AI-powered research and synthesis of development best practices
- **Clean Context Injection**: MCP-based rule delivery without stdout pollution
- **Automated Scheduling**: 6-month update cycles with emergency security updates
- **Technology Trend Analysis**: Real-time monitoring of GitHub, Stack Overflow, and package trends
- **Version Management**: Automatic archiving and rollback capabilities
- **Real-time Notifications**: WebSocket-based updates and alerts
- **Queue-based Processing**: Background job processing with Bull and Redis
- **Enterprise Monitoring**: Prometheus metrics and Grafana dashboards
- **Docker Deployment**: Complete containerized setup with multi-service orchestration

## 🏗️ Architecture

### Core Services

- **MCP Server**: Model Context Protocol server for clean rule delivery
- **RuleGenerator**: AI-powered rule generation through web research
- **TrendAnalyzer**: Technology trend analysis and security monitoring  
- **ContextInjector**: Smart rule injection based on prompt analysis
- **QueueService**: Background job processing with Bull/Redis
- **NotificationService**: Real-time WebSocket notifications
- **SchedulerService**: Automated cron-based task scheduling

### Technology Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Queue System**: Bull with Redis
- **Web Scraping**: Puppeteer with rate limiting
- **Real-time**: WebSocket server with subscription management
- **Monitoring**: Winston logging, Prometheus metrics
- **Deployment**: Docker with multi-stage builds

## 📋 Prerequisites

- Node.js 20+
- Redis 6+
- Docker & Docker Compose (for containerized deployment)
- API Keys (optional but recommended):
  - GitHub Personal Access Token
  - Brave Search API Key
  - Stack Overflow API Key

## 🛠️ Installation

### Local Development

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd ai-rules-typescript
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start Redis**
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

4. **Build and Run**
   ```bash
   npm run build
   npm start
   
   # Or for development with hot reload:
   npm run dev
   ```

### Docker Deployment

1. **Basic Setup**
   ```bash
   # Start core services (app + Redis)
   docker-compose up -d
   ```

2. **With Monitoring Stack**
   ```bash
   # Include Prometheus and Grafana
   docker-compose --profile monitoring up -d
   ```

3. **Production Setup with Proxy**
   ```bash
   # Full production setup with Nginx
   docker-compose --profile monitoring --profile proxy up -d
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAUDE_PROJECT_DIR` | Root project directory | `/home/tomaswolaschka/workspace/ai-rules` |
| `RULE_BASE_PATH` | Directory containing rule files | `${CLAUDE_PROJECT_DIR}/ai-rules` |
| `GITHUB_TOKEN` | GitHub API token for trend analysis | - |
| `BRAVE_SEARCH_API_KEY` | Brave Search API key | - |
| `UPDATE_FREQUENCY_MONTHS` | Rule update frequency | `6` |
| `LOG_LEVEL` | Logging level | `info` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |

### MCP Server Configuration

Add to Claude Code's MCP settings:

```json
{
  "mcpServers": {
    "ai-rules-management": {
      "command": "node",
      "args": ["/path/to/ai-rules-typescript/dist/rule-management-server.js"],
      "env": {
        "CLAUDE_PROJECT_DIR": "/home/tomaswolaschka/workspace/ai-rules"
      }
    }
  }
}
```

## 📝 Usage

### MCP Tools

The system provides four main MCP tools:

1. **`generate_best_practices`**: Generate updated best practices for a technology
   ```json
   {
     "technology": "python",
     "year": "2025",
     "context": "Focus on async programming"
   }
   ```

2. **`update_rule_file`**: Deploy new rule content with versioning
   ```json
   {
     "ruleType": "python-best-practices",
     "content": "# Updated Python Rules\n...",
     "version": "2025-01"
   }
   ```

3. **`inject_context_rules`**: Clean context injection without terminal pollution
   ```json
   {
     "prompt": "Help me write a Python Flask application",
     "technologies": ["python", "flask"]
   }
   ```

4. **`analyze_technology_trends`**: Get current technology trend analysis
   ```json
   {
     "technology": "react"
   }
   ```

### Manual Operations

```bash
# Check system status
curl http://localhost:3000/health

# View queue statistics
curl http://localhost:3000/queues/stats

# Trigger manual rule update
curl -X POST http://localhost:3000/rules/generate \
  -H "Content-Type: application/json" \
  -d '{"technology": "python", "priority": "high"}'
```

### WebSocket Notifications

Connect to `ws://localhost:8080` for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Notification:', message);
});

// Subscribe to specific channels
ws.send(JSON.stringify({
  type: 'subscribe',
  data: { channels: ['rule-updates', 'emergency-alerts'] }
}));
```

## 🔄 Automated Processes

### Scheduled Tasks

- **Daily Trend Analysis** (2 AM UTC): Analyze trends for all technologies
- **Weekly Rule Check** (Sunday 3 AM UTC): Generate rules for high-priority technologies
- **Monthly Comprehensive Update** (1st of month, 1 AM UTC): Full rule generation cycle
- **System Health Check** (Every 15 minutes): Monitor queue health and system status
- **Cache Cleanup** (Daily 4 AM UTC): Clean old archives and clear caches
- **Security Advisory Check** (Every 6 hours): Emergency updates for security issues

### Emergency Updates

The system automatically monitors for:
- Critical security advisories
- Breaking changes in major frameworks
- High-priority community issues

Emergency updates bypass normal scheduling and get immediate processing.

## 📊 Monitoring

### Metrics Endpoint

Prometheus metrics available at `http://localhost:9090/metrics`:

- Rule generation success/failure rates
- Queue processing times and status
- WebSocket connection counts
- API request rates and errors
- System resource usage

### Health Checks

```bash
# Application health
curl http://localhost:3000/health

# Queue health
curl http://localhost:3000/queues/health

# Service status
curl http://localhost:3000/status
```

### Grafana Dashboards

If using the monitoring stack, Grafana dashboards are available at `http://localhost:3001`:
- System Overview
- Rule Generation Metrics  
- Queue Performance
- WebSocket Activity
- Error Rates and Alerts

## 🐛 Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   ```bash
   # Check Redis status
   docker ps | grep redis
   # Restart Redis
   docker-compose restart redis
   ```

2. **High Memory Usage**
   ```bash
   # Clear caches
   curl -X POST http://localhost:3000/cache/clear
   # Restart application
   docker-compose restart ai-rules-app
   ```

3. **Queue Stuck Jobs**
   ```bash
   # Check queue status
   curl http://localhost:3000/queues/stats
   # Clean failed jobs
   curl -X POST http://localhost:3000/queues/clean
   ```

4. **WebSocket Connection Issues**
   ```bash
   # Check WebSocket server
   curl -i -N -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        -H "Sec-WebSocket-Key: test" \
        -H "Sec-WebSocket-Version: 13" \
        http://localhost:8080/
   ```

### Logs

```bash
# Application logs
docker-compose logs ai-rules-app

# Follow logs in real-time  
docker-compose logs -f ai-rules-app

# Local development logs
tail -f logs/combined.log
tail -f logs/error.log
```

## 🔧 Development

### Project Structure

```
src/
├── config/           # Environment configuration
├── services/         # Core business logic services
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── rule-management-server.ts  # Main MCP server entry point
```

### Available Scripts

```bash
npm run build        # Build TypeScript
npm run dev          # Development with hot reload
npm run test         # Run tests
npm run lint         # ESLint
npm run format       # Prettier
npm run typecheck    # TypeScript type checking
npm run clean        # Clean build artifacts
```

### API Integration

To add new research sources:

1. Implement search provider in `RuleGenerator.ts`
2. Add API configuration in `environment.ts`
3. Update trend analysis in `TrendAnalyzer.ts`
4. Add new environment variables to `.env.example`

## 🔐 Security

- JWT-based authentication for administrative endpoints
- Rate limiting on all public APIs
- Input validation with Zod schemas
- Secure WebSocket connections with client limits
- Docker security best practices
- No secrets in container images

## 🚀 Deployment

### Production Checklist

- [ ] Set strong `JWT_SECRET` in environment
- [ ] Configure API keys for external services
- [ ] Set up SSL/TLS certificates for Nginx
- [ ] Configure log rotation and monitoring
- [ ] Set up backup strategy for Redis and rule archives
- [ ] Configure firewall rules for exposed ports
- [ ] Set resource limits in docker-compose.yml
- [ ] Configure health check endpoints for load balancers

### Scaling

For high-load environments:

1. **Horizontal Scaling**: Run multiple app instances behind a load balancer
2. **Redis Cluster**: Use Redis cluster for high availability
3. **Queue Separation**: Split queues across multiple Redis instances  
4. **Resource Limits**: Adjust Docker memory/CPU limits based on load

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [troubleshooting section](#-troubleshooting)
- Review application logs for error details
- Monitor system metrics in Grafana
- Check queue status and health endpoints

## 🎯 Roadmap

- [ ] Machine learning-based trend prediction
- [ ] Integration with more package registries (npm, PyPI, Maven)
- [ ] Custom rule templates and generators
- [ ] Multi-tenant support for different projects
- [ ] Advanced analytics and reporting dashboard
- [ ] Mobile app for notifications and monitoring