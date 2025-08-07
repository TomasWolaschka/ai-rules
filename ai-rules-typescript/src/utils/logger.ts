/**
 * Centralized logging utility using Winston
 */

import winston from 'winston';
import { join } from 'path';
import config from '@/config/environment.js';

// Create logs directory if it doesn't exist
import { mkdirSync } from 'fs';
try {
  mkdirSync(config.project.logsPath, { recursive: true });
} catch (error) {
  // Directory might already exist
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Add metadata if present
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
      log += `\nMetadata: ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.monitoring.logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'ai-rules-management',
    environment: config.isProduction ? 'production' : 'development',
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    
    // File output for all logs
    new winston.transports.File({
      filename: join(config.project.logsPath, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: join(config.project.logsPath, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3,
    }),
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: join(config.project.logsPath, 'exceptions.log'),
    }),
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: join(config.project.logsPath, 'rejections.log'),
    }),
  ],
});

// Create child loggers for different components
export const createLogger = (component: string): winston.Logger => {
  return logger.child({ component });
};

// Export default logger
export default logger;

// Export common logging functions
export const logInfo = (message: string, meta?: any): void => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error, meta?: any): void => {
  logger.error(message, { error: error?.message, stack: error?.stack, ...meta });
};

export const logWarn = (message: string, meta?: any): void => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: any): void => {
  logger.debug(message, meta);
};

// Performance logging helper
export const logPerformance = (
  operation: string,
  durationMs: number,
  meta?: any
): void => {
  logger.info(`Performance: ${operation} completed in ${durationMs}ms`, meta);
};

// API request logging helper
export const logApiRequest = (
  method: string,
  url: string,
  statusCode?: number,
  durationMs?: number,
  error?: Error
): void => {
  const level = error || (statusCode && statusCode >= 400) ? 'error' : 'info';
  const message = `API ${method} ${url}`;
  
  const meta: any = {
    method,
    url,
    statusCode,
    durationMs,
  };
  
  if (error) {
    meta.error = error.message;
    meta.stack = error.stack;
  }
  
  logger[level](message, meta);
};

// Rule generation logging helper
export const logRuleGeneration = (
  technology: string,
  operation: string,
  success: boolean,
  durationMs?: number,
  meta?: any
): void => {
  const level = success ? 'info' : 'error';
  const message = `Rule generation: ${operation} for ${technology} ${success ? 'succeeded' : 'failed'}`;
  
  logger[level](message, {
    technology,
    operation,
    success,
    durationMs,
    ...meta,
  });
};

// Queue job logging helper
export const logQueueJob = (
  jobType: string,
  jobId: string | number,
  status: 'started' | 'completed' | 'failed' | 'retrying',
  meta?: any
): void => {
  const level = status === 'failed' ? 'error' : 'info';
  const message = `Queue job ${jobType}[${jobId}] ${status}`;
  
  logger[level](message, {
    jobType,
    jobId,
    status,
    ...meta,
  });
};