# MCP Server Configuration Guide - AI Rules Management

## Overview

This guide provides detailed configuration instructions for setting up Claude Code as an MCP server for the AI Rules Management system. It covers both development and production configurations for Python and Node.js/TypeScript implementations.

## Claude Code MCP Server Basics

### What is Claude Code MCP Server?

Claude Code can function as an MCP (Model Context Protocol) server, exposing its tools and capabilities to MCP clients. When configured as an MCP server:

- Claude Code runs `claude mcp serve` to start the server
- External applications can call Claude's tools via MCP protocol
- Tools like Read, Edit, Write, Bash, and custom functions become available
- Enables programmatic access to Claude's capabilities

### MCP Server vs MCP Client

**Claude as MCP Server:**
```bash
claude mcp serve  # Claude provides tools to other applications
```

**Claude as MCP Client:**
```json
{
  "mcpServers": {
    "my-server": {
      "command": "python",
      "args": ["my_server.py"]
    }
  }
}
```

## Configuration Files

### 1. Claude Desktop Configuration (claude_desktop_config.json)

Location: `~/.claude/claude_desktop_config.json` or similar platform-specific location

```json
{
  "mcpServers": {
    "ai-rules-management": {
      "command": "claude",
      "args": ["mcp", "serve"],
      "env": {
        "CLAUDE_PROJECT_DIR": "/home/tomaswolaschka/workspace/ai-rules",
        "GITHUB_TOKEN": "${GITHUB_TOKEN}",
        "BRAVE_SEARCH_API_KEY": "${BRAVE_SEARCH_API_KEY}",
        "STACKOVERFLOW_API_KEY": "${STACKOVERFLOW_API_KEY}"
      }
    }
  },
  "globalShortcut": "Ctrl+Shift+C"
}
```

### 2. Custom MCP Server Configuration

For custom Python/Node.js MCP servers that call Claude Code:

```json
{
  "mcpServers": {
    "claude-code-backend": {
      "command": "claude",
      "args": ["mcp", "serve"],
      "env": {
        "CLAUDE_WORKSPACE": "/home/tomaswolaschka/workspace/ai-rules"
      }
    },
    "rule-management-service": {
      "command": "python",
      "args": ["/home/tomaswolaschka/workspace/ai-rules/src/rule_management_server.py"],
      "env": {
        "RULE_BASE_PATH": "/home/tomaswolaschka/workspace/ai-rules",
        "UPDATE_FREQUENCY_MONTHS": "6",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

## Environment Variables

### Core Environment Variables

```bash
# Project paths
export CLAUDE_PROJECT_DIR="/home/tomaswolaschka/workspace/ai-rules"
export RULE_BASE_PATH="/home/tomaswolaschka/workspace/ai-rules/ai-rules"
export ARCHIVE_PATH="/home/tomaswolaschka/workspace/ai-rules/archive"
export METADATA_PATH="/home/tomaswolaschka/workspace/ai-rules/metadata"

# API Keys (store in secure environment)
export GITHUB_TOKEN="ghp_your_token_here"
export BRAVE_SEARCH_API_KEY="your_brave_search_key"
export STACKOVERFLOW_API_KEY="your_stackoverflow_key"

# Service Configuration
export UPDATE_FREQUENCY_MONTHS="6"
export LOG_LEVEL="INFO"
export NOTIFICATION_PORT="8080"

# Database (for Node.js implementation)
export REDIS_URL="redis://localhost:6379"
export DATABASE_URL="postgresql://user:pass@localhost:5432/rules_db"
```

### Secure Environment Variable Management

Create `.env` file (never commit to git):
```bash
# .env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BRAVE_SEARCH_API_KEY=BSA-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STACKOVERFLOW_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:pass@localhost:5432/rules_db
```

Load with:
```bash
# For Python
python-dotenv
pip install python-dotenv

# For Node.js
npm install dotenv
```

## Python Implementation Configuration

### 1. MCP Server Setup

```python
# config/settings.py
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Project paths
    PROJECT_ROOT = Path(os.getenv('CLAUDE_PROJECT_DIR', '/home/tomaswolaschka/workspace/ai-rules'))
    RULE_BASE_PATH = PROJECT_ROOT / 'ai-rules'
    ARCHIVE_PATH = PROJECT_ROOT / 'archive'
    METADATA_PATH = PROJECT_ROOT / 'metadata'
    
    # API configuration
    GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
    BRAVE_SEARCH_API_KEY = os.getenv('BRAVE_SEARCH_API_KEY')
    STACKOVERFLOW_API_KEY = os.getenv('STACKOVERFLOW_API_KEY')
    
    # Update settings
    UPDATE_FREQUENCY_MONTHS = int(os.getenv('UPDATE_FREQUENCY_MONTHS', '6'))
    ARCHIVE_RETENTION_MONTHS = int(os.getenv('ARCHIVE_RETENTION_MONTHS', '24'))
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = PROJECT_ROOT / 'logs' / 'rule_management.log'
    
    # Service settings
    NOTIFICATION_PORT = int(os.getenv('NOTIFICATION_PORT', '8080'))
    METRICS_PORT = int(os.getenv('METRICS_PORT', '9090'))

settings = Settings()
```

### 2. FastMCP Server Configuration

```python
# src/rule_management_server.py
from mcp.server.fastmcp import FastMCP
from config.settings import settings
import logging

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(settings.LOG_FILE),
        logging.StreamHandler()
    ]
)

# Initialize FastMCP server with configuration
mcp = FastMCP(
    name="ai-rules-management",
    version="1.0.0",
    description="Autonomous AI rule management system"
)

# Configure MCP server settings
mcp.server.request_timeout = 300  # 5 minutes for long-running operations
mcp.server.max_request_size = 10 * 1024 * 1024  # 10MB max request size

if __name__ == "__main__":
    # Create necessary directories
    settings.ARCHIVE_PATH.mkdir(parents=True, exist_ok=True)
    settings.METADATA_PATH.mkdir(parents=True, exist_ok=True)
    (settings.PROJECT_ROOT / 'logs').mkdir(parents=True, exist_ok=True)
    
    # Start MCP server
    mcp.run()
```

### 3. Scheduler Configuration

```python
# config/scheduler.yaml
scheduler:
  timezone: "UTC"
  
jobs:
  major_update:
    cron: "0 2 1 1,7 *"  # 1st January and 1st July at 2 AM UTC
    function: "perform_major_update"
    max_instances: 1
    
  weekly_analysis:
    cron: "0 1 * * 0"    # Every Sunday at 1 AM UTC
    function: "perform_weekly_analysis"
    max_instances: 1
    
  daily_check:
    cron: "0 3 * * *"    # Every day at 3 AM UTC
    function: "perform_daily_emergency_check"
    max_instances: 1

technologies:
  - python
  - javascript
  - java
  - react
  - git
  - node

rule_generation:
  timeout_seconds: 300
  max_retries: 3
  retry_delay_seconds: 60
```

## Node.js/TypeScript Implementation Configuration

### 1. Environment Configuration

```typescript
// src/config/environment.ts
import { config } from 'dotenv';
import { z } from 'zod';

config(); // Load .env file

const envSchema = z.object({
  // Project paths
  CLAUDE_PROJECT_DIR: z.string().default('/home/tomaswolaschka/workspace/ai-rules'),
  RULE_BASE_PATH: z.string().optional(),
  ARCHIVE_PATH: z.string().optional(),
  METADATA_PATH: z.string().optional(),
  
  // API keys
  GITHUB_TOKEN: z.string().optional(),
  BRAVE_SEARCH_API_KEY: z.string().optional(),
  STACKOVERFLOW_API_KEY: z.string().optional(),
  
  // Service configuration
  UPDATE_FREQUENCY_MONTHS: z.string().default('6'),
  ARCHIVE_RETENTION_MONTHS: z.string().default('24'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Ports
  HTTP_PORT: z.string().default('3000'),
  NOTIFICATION_PORT: z.string().default('8080'),
  METRICS_PORT: z.string().default('9090'),
  
  // Database
  REDIS_URL: z.string().default('redis://localhost:6379'),
  DATABASE_URL: z.string().optional(),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

export const env = envSchema.parse(process.env);

export const config = {
  project: {
    rootDir: env.CLAUDE_PROJECT_DIR,
    ruleBasePath: env.RULE_BASE_PATH || `${env.CLAUDE_PROJECT_DIR}/ai-rules`,
    archivePath: env.ARCHIVE_PATH || `${env.CLAUDE_PROJECT_DIR}/archive`,
    metadataPath: env.METADATA_PATH || `${env.CLAUDE_PROJECT_DIR}/metadata`,
  },
  
  api: {
    github: env.GITHUB_TOKEN,
    braveSearch: env.BRAVE_SEARCH_API_KEY,
    stackoverflow: env.STACKOVERFLOW_API_KEY,
  },
  
  update: {
    frequencyMonths: parseInt(env.UPDATE_FREQUENCY_MONTHS),
    retentionMonths: parseInt(env.ARCHIVE_RETENTION_MONTHS),
  },
  
  server: {
    httpPort: parseInt(env.HTTP_PORT),
    notificationPort: parseInt(env.NOTIFICATION_PORT),
    metricsPort: parseInt(env.METRICS_PORT),
  },
  
  database: {
    redisUrl: env.REDIS_URL,
    postgresUrl: env.DATABASE_URL,
  },
  
  logging: {
    level: env.LOG_LEVEL,
    isDevelopment: env.NODE_ENV === 'development',
  }
};
```

### 2. MCP Server Configuration

```typescript
// src/config/mcp-server.ts
import { ServerConfiguration } from '@modelcontextprotocol/sdk';
import { config } from './environment.js';

export const mcpServerConfig: ServerConfiguration = {
  name: 'ai-rules-management',
  version: '1.0.0',
  description: 'Autonomous AI rule management system with TypeScript',
  
  capabilities: {
    tools: {},
    resources: {},
    prompts: {}
  },
  
  // Request timeout for long-running operations
  requestTimeout: 300000, // 5 minutes
  
  // Maximum request size (10MB)
  maxRequestSize: 10 * 1024 * 1024,
  
  // Connection settings
  connection: {
    retries: 3,
    retryDelay: 1000,
  }
};

export const queueConfig = {
  redis: {
    host: new URL(config.database.redisUrl).hostname,
    port: parseInt(new URL(config.database.redisUrl).port),
    password: new URL(config.database.redisUrl).password,
    db: 0,
  },
  
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
  
  processors: {
    ruleGeneration: {
      concurrency: 3,
      timeout: 300000, // 5 minutes
    }
  }
};
```

### 3. Service Configuration

```yaml
# config/services.yaml
mcp_server:
  name: "ai-rules-management"
  version: "1.0.0"
  timeout_ms: 300000
  max_request_size_mb: 10

rule_generation:
  timeout_seconds: 300
  max_retries: 3
  technologies:
    - python
    - javascript
    - typescript
    - java
    - react
    - node
    - git
    - docker
    - kubernetes

web_scraping:
  timeout_seconds: 30
  max_pages_per_search: 10
  user_agent: "AI-Rules-Management/1.0 (Research Bot)"
  rate_limit_ms: 1000

trend_analysis:
  github:
    min_stars: 1000
    max_repos_per_tech: 20
    include_topics: true
  
  stackoverflow:
    min_score: 5
    max_questions_per_tech: 50
    
queue_processing:
  redis:
    max_retries: 3
    retry_delay_ms: 2000
  
  jobs:
    rule_generation:
      concurrency: 3
      timeout_ms: 300000
      priority_levels:
        high: 1
        medium: 2 
        low: 3

notifications:
  websocket:
    port: 8080
    heartbeat_interval_ms: 30000
    max_clients: 100
  
  alerts:
    rate_limit_per_hour: 10
    channels:
      - websocket
      - console

monitoring:
  metrics:
    port: 9090
    collection_interval_ms: 5000
  
  health_checks:
    interval_ms: 60000
    timeout_ms: 5000
    
logging:
  level: "info"
  format: "json"
  file: "logs/ai-rules-management.log"
  max_size_mb: 100
  max_files: 5
```

## Development vs Production Configuration

### Development Configuration

```json
{
  "mcpServers": {
    "ai-rules-dev": {
      "command": "ts-node",
      "args": ["--esm", "src/rule-management-server.ts"],
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug",
        "CLAUDE_PROJECT_DIR": "/home/tomaswolaschka/workspace/ai-rules"
      },
      "cwd": "/home/tomaswolaschka/workspace/ai-rules"
    }
  }
}
```

### Production Configuration

```json
{
  "mcpServers": {
    "ai-rules-prod": {
      "command": "node",
      "args": ["dist/rule-management-server.js"],
      "env": {
        "NODE_ENV": "production",
        "LOG_LEVEL": "info",
        "CLAUDE_PROJECT_DIR": "/opt/ai-rules",
        "REDIS_URL": "redis://redis-server:6379",
        "DATABASE_URL": "postgresql://user:pass@postgres:5432/rules_db"
      },
      "cwd": "/opt/ai-rules"
    }
  }
}
```

## Docker Configuration

### Python Dockerfile

```dockerfile
# Dockerfile.python
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs archive metadata

# Set environment variables
ENV PYTHONPATH=/app
ENV CLAUDE_PROJECT_DIR=/app

# Expose ports
EXPOSE 8080 9090

# Run MCP server
CMD ["python", "src/rule_management_server.py"]
```

### Node.js Dockerfile

```dockerfile
# Dockerfile.nodejs
FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    chromium

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p logs archive metadata

# Set environment variables
ENV NODE_ENV=production
ENV CLAUDE_PROJECT_DIR=/app

# Expose ports
EXPOSE 3000 8080 9090

# Run application
CMD ["node", "dist/app.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  ai-rules-python:
    build:
      context: .
      dockerfile: Dockerfile.python
    ports:
      - "8080:8080"
      - "9090:9090"
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - BRAVE_SEARCH_API_KEY=${BRAVE_SEARCH_API_KEY}
      - LOG_LEVEL=info
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped

  ai-rules-nodejs:
    build:
      context: .
      dockerfile: Dockerfile.nodejs
    ports:
      - "3000:3000"
      - "8081:8080"
      - "9091:9090"
    environment:
      - NODE_ENV=production
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - BRAVE_SEARCH_API_KEY=${BRAVE_SEARCH_API_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

## Testing Configuration

### MCP Server Testing

```bash
# Test MCP server connection
claude --mcp-config test-config.json --prompt "Test MCP connection"

# Test specific MCP functions
claude --mcp-config test-config.json --prompt "Call generate_best_practices with technology=python year=2025"

# Test with MCP Inspector
mcp inspector http://localhost:3000/mcp
```

### Environment Testing

```python
# tests/test_config.py
import pytest
from config.settings import settings

def test_environment_variables():
    assert settings.PROJECT_ROOT.exists()
    assert settings.RULE_BASE_PATH.exists()
    assert settings.UPDATE_FREQUENCY_MONTHS == 6
    
def test_api_keys():
    # In CI/CD, these might be mock values
    assert settings.GITHUB_TOKEN is not None
    assert len(settings.GITHUB_TOKEN) > 10
```

## Troubleshooting

### Common Configuration Issues

1. **MCP Server Not Starting**
   - Check Claude Code installation: `claude --version`
   - Verify config file location and syntax
   - Check environment variables and paths

2. **Permission Issues**
   - Ensure correct file permissions: `chmod +x script.py`
   - Check directory write permissions
   - Verify user permissions for Claude Code

3. **API Key Issues**
   - Verify API key format and validity
   - Check rate limiting and quotas
   - Test API connectivity independently

4. **Path Resolution Issues**
   - Use absolute paths in configuration
   - Verify working directory settings
   - Check cross-platform path compatibility

### Debug Configuration

```json
{
  "mcpServers": {
    "ai-rules-debug": {
      "command": "python",
      "args": ["-u", "src/rule_management_server.py", "--debug"],
      "env": {
        "LOG_LEVEL": "DEBUG",
        "PYTHONUNBUFFERED": "1"
      }
    }
  }
}
```

This comprehensive configuration guide provides all the necessary details for setting up, configuring, and troubleshooting the AI Rules Management MCP server implementation.

---

*MCP Server Configuration Guide v1.0 - Created August 2025*