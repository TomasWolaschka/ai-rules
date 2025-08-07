/**
 * Environment configuration with validation using Zod
 */

import { config } from 'dotenv';
import { z } from 'zod';
import { join } from 'path';

// Load environment variables
config();

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
  UPDATE_FREQUENCY_MONTHS: z.string().regex(/^\d+$/).default('6'),
  ARCHIVE_RETENTION_MONTHS: z.string().regex(/^\d+$/).default('24'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Ports
  HTTP_PORT: z.string().regex(/^\d+$/).default('3000'),
  NOTIFICATION_PORT: z.string().regex(/^\d+$/).default('8080'),
  METRICS_PORT: z.string().regex(/^\d+$/).default('9090'),

  // Database
  REDIS_URL: z.string().default('redis://localhost:6379'),
  DATABASE_URL: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Rule generation settings
  MAX_CONCURRENT_GENERATIONS: z.string().regex(/^\d+$/).default('3'),
  RULE_GENERATION_TIMEOUT_MS: z.string().regex(/^\d+$/).default('300000'),
  WEB_SCRAPING_TIMEOUT_MS: z.string().regex(/^\d+$/).default('30000'),
  MAX_PAGES_PER_SEARCH: z.string().regex(/^\d+$/).default('10'),

  // Monitoring
  METRICS_COLLECTION_INTERVAL_MS: z.string().regex(/^\d+$/).default('5000'),
  HEALTH_CHECK_INTERVAL_MS: z.string().regex(/^\d+$/).default('60000'),

  // Security
  RATE_LIMIT_PER_HOUR: z.string().regex(/^\d+$/).default('100'),
  MAX_WEBSOCKET_CLIENTS: z.string().regex(/^\d+$/).default('100'),
  JWT_SECRET: z.string().optional(),
});

const env = envSchema.parse(process.env);

export const config = {
  // Environment
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  // Project structure
  project: {
    rootDir: env.CLAUDE_PROJECT_DIR,
    ruleBasePath: env.RULE_BASE_PATH || join(env.CLAUDE_PROJECT_DIR, 'ai-rules'),
    archivePath: env.ARCHIVE_PATH || join(env.CLAUDE_PROJECT_DIR, 'archive'),
    metadataPath: env.METADATA_PATH || join(env.CLAUDE_PROJECT_DIR, 'metadata'),
    logsPath: join(env.CLAUDE_PROJECT_DIR, 'ai-rules-typescript', 'logs'),
  },

  // External APIs
  api: {
    github: {
      token: env.GITHUB_TOKEN,
      baseUrl: 'https://api.github.com',
      timeout: 30000,
    },
    braveSearch: {
      apiKey: env.BRAVE_SEARCH_API_KEY,
      baseUrl: 'https://api.search.brave.com/res/v1',
      timeout: 30000,
    },
    stackoverflow: {
      apiKey: env.STACKOVERFLOW_API_KEY,
      baseUrl: 'https://api.stackexchange.com/2.3',
      timeout: 30000,
    },
  },

  // Rule management
  rules: {
    updateFrequencyMonths: parseInt(env.UPDATE_FREQUENCY_MONTHS),
    retentionMonths: parseInt(env.ARCHIVE_RETENTION_MONTHS),
    maxConcurrentGenerations: parseInt(env.MAX_CONCURRENT_GENERATIONS),
    generationTimeoutMs: parseInt(env.RULE_GENERATION_TIMEOUT_MS),
    supportedTechnologies: [
      'python',
      'javascript',
      'typescript',
      'java',
      'react',
      'node',
      'git',
      'docker',
      'kubernetes',
      'angular',
      'vue',
      'go',
      'rust',
      'cpp',
      'csharp',
    ],
  },

  // Web scraping
  webScraping: {
    timeoutMs: parseInt(env.WEB_SCRAPING_TIMEOUT_MS),
    maxPagesPerSearch: parseInt(env.MAX_PAGES_PER_SEARCH),
    userAgent: 'AI-Rules-Management/1.0 (Research Bot)',
    rateLimitMs: 1000,
    puppeteerOptions: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  },

  // Server configuration
  server: {
    httpPort: parseInt(env.HTTP_PORT),
    notificationPort: parseInt(env.NOTIFICATION_PORT),
    metricsPort: parseInt(env.METRICS_PORT),
    corsOrigins: env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [],
  },

  // Database
  database: {
    redis: {
      url: env.REDIS_URL,
      maxRetries: 3,
      retryDelayMs: 1000,
    },
    postgres: env.DATABASE_URL
      ? {
          url: env.DATABASE_URL,
          maxConnections: 10,
          idleTimeoutMs: 30000,
        }
      : null,
  },

  // Queue configuration
  queue: {
    redis: {
      url: env.REDIS_URL,
    },
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
    },
    processors: {
      ruleGeneration: {
        concurrency: parseInt(env.MAX_CONCURRENT_GENERATIONS),
        timeout: parseInt(env.RULE_GENERATION_TIMEOUT_MS),
      },
    },
  },

  // Monitoring and observability
  monitoring: {
    metricsCollectionIntervalMs: parseInt(env.METRICS_COLLECTION_INTERVAL_MS),
    healthCheckIntervalMs: parseInt(env.HEALTH_CHECK_INTERVAL_MS),
    logLevel: env.LOG_LEVEL,
  },

  // Security
  security: {
    rateLimitPerHour: parseInt(env.RATE_LIMIT_PER_HOUR),
    maxWebSocketClients: parseInt(env.MAX_WEBSOCKET_CLIENTS),
    jwtSecret: env.JWT_SECRET || 'default-secret-change-in-production',
  },

  // MCP Server
  mcp: {
    name: 'ai-rules-management',
    version: '1.0.0',
    description: 'Autonomous AI rule management system with TypeScript',
    requestTimeout: parseInt(env.RULE_GENERATION_TIMEOUT_MS),
    maxRequestSize: 10 * 1024 * 1024, // 10MB
  },
};

// Validate required configuration for production
if (config.isProduction) {
  const requiredForProduction = [
    config.api.github.token && 'GITHUB_TOKEN',
    config.api.braveSearch.apiKey && 'BRAVE_SEARCH_API_KEY',
    config.security.jwtSecret !== 'default-secret-change-in-production' && 'JWT_SECRET',
  ].filter(Boolean);

  if (requiredForProduction.length < 3) {
    // eslint-disable-next-line no-console
    console.warn(
      'WARNING: Some production environment variables are missing. Full functionality may not be available.'
    );
  }
}

export default config;