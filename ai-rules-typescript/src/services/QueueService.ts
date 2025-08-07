/**
 * Background job queue service using Bull and Redis
 */

import Queue, { Job, JobOptions, ProcessCallbackFunction } from 'bull';
import { JobData, JobResult } from '@/types/services.js';
import config from '@/config/environment.js';
import { createLogger, logQueueJob } from '@/utils/logger.js';

const logger = createLogger('QueueService');

export class QueueService {
  private ruleGenerationQueue: Queue<JobData>;
  private trendAnalysisQueue: Queue<JobData>;
  private emergencyUpdateQueue: Queue<JobData>;
  
  constructor() {
    // Initialize queues with Redis connection
    this.ruleGenerationQueue = new Queue('rule-generation', {
      redis: config.queue.redis.url,
      defaultJobOptions: config.queue.defaultJobOptions,
    });

    this.trendAnalysisQueue = new Queue('trend-analysis', {
      redis: config.queue.redis.url,
      defaultJobOptions: {
        ...config.queue.defaultJobOptions,
        priority: 5, // Lower priority than rule generation
      },
    });

    this.emergencyUpdateQueue = new Queue('emergency-updates', {
      redis: config.queue.redis.url,
      defaultJobOptions: {
        ...config.queue.defaultJobOptions,
        priority: 1, // Highest priority
        attempts: 5,
      },
    });

    this.setupQueueProcessors();
    this.setupQueueEventHandlers();

    logger.info('QueueService initialized', {
      redisUrl: config.queue.redis.url,
      queues: ['rule-generation', 'trend-analysis', 'emergency-updates'],
      defaultJobOptions: config.queue.defaultJobOptions,
    });
  }

  private setupQueueProcessors(): void {
    // Rule generation processor
    this.ruleGenerationQueue.process(
      config.queue.processors.ruleGeneration.concurrency,
      this.processRuleGeneration.bind(this)
    );

    // Trend analysis processor
    this.trendAnalysisQueue.process(2, this.processTrendAnalysis.bind(this));

    // Emergency updates processor (single concurrent job for safety)
    this.emergencyUpdateQueue.process(1, this.processEmergencyUpdate.bind(this));

    logger.debug('Queue processors configured', {
      ruleGeneration: { concurrency: config.queue.processors.ruleGeneration.concurrency },
      trendAnalysis: { concurrency: 2 },
      emergencyUpdates: { concurrency: 1 },
    });
  }

  private setupQueueEventHandlers(): void {
    // Rule Generation Queue Events
    this.ruleGenerationQueue.on('completed', (job: Job<JobData>, result: JobResult) => {
      logQueueJob('rule-generation', job.id!, 'completed', {
        technology: job.data.technology,
        processingTime: result.processingTime,
        rulesGenerated: result.rulesGenerated,
      });
    });

    this.ruleGenerationQueue.on('failed', (job: Job<JobData>, err: Error) => {
      logQueueJob('rule-generation', job.id!, 'failed', {
        technology: job.data.technology,
        error: err.message,
        attempts: job.attemptsMade,
      });
    });

    this.ruleGenerationQueue.on('stalled', (job: Job<JobData>) => {
      logQueueJob('rule-generation', job.id!, 'retrying', {
        technology: job.data.technology,
        attempts: job.attemptsMade,
      });
    });

    // Trend Analysis Queue Events
    this.trendAnalysisQueue.on('completed', (job: Job<JobData>, result: JobResult) => {
      logQueueJob('trend-analysis', job.id!, 'completed', {
        technology: job.data.technology,
        processingTime: result.processingTime,
      });
    });

    this.trendAnalysisQueue.on('failed', (job: Job<JobData>, err: Error) => {
      logQueueJob('trend-analysis', job.id!, 'failed', {
        technology: job.data.technology,
        error: err.message,
      });
    });

    // Emergency Updates Queue Events
    this.emergencyUpdateQueue.on('completed', (job: Job<JobData>, result: JobResult) => {
      logQueueJob('emergency-updates', job.id!, 'completed', {
        technology: job.data.technology,
        updateType: job.data.updateType,
        processingTime: result.processingTime,
      });
    });

    this.emergencyUpdateQueue.on('failed', (job: Job<JobData>, err: Error) => {
      logQueueJob('emergency-updates', job.id!, 'failed', {
        technology: job.data.technology,
        updateType: job.data.updateType,
        error: err.message,
        attempts: job.attemptsMade,
      });
    });

    logger.debug('Queue event handlers configured');
  }

  // Job processing methods
  private async processRuleGeneration(job: Job<JobData>): Promise<JobResult> {
    const startTime = Date.now();
    const { technology, updateType, context, priority } = job.data;

    logQueueJob('rule-generation', job.id!, 'started', {
      technology,
      updateType,
      priority,
    });

    try {
      // Import services dynamically to avoid circular dependencies
      const { RuleGenerator } = await import('./RuleGenerator.js');
      const { TrendAnalyzer } = await import('./TrendAnalyzer.js');
      const { RuleVersionManager } = await import('./RuleVersionManager.js');

      const ruleGenerator = new RuleGenerator();
      const trendAnalyzer = new TrendAnalyzer();
      const versionManager = new RuleVersionManager();

      // Analyze current trends
      const trends = await trendAnalyzer.analyzeTechnology(technology);

      // Generate new rules
      const rules = await ruleGenerator.generateRules({
        technology,
        year: new Date().getFullYear(),
        trends,
        additionalContext: context,
        includeExamples: true,
        includeReferences: true,
      });

      // Create version string
      const version = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

      // Archive current rule and deploy new one
      const ruleType = `${technology}-best-practices`;
      await versionManager.archiveCurrentRule(ruleType, version);
      await versionManager.deployNewRule(ruleType, rules, version);

      // Cleanup resources
      await ruleGenerator.cleanup();

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        message: `Successfully generated and deployed rules for ${technology}`,
        ruleVersion: version,
        rulesGenerated: 1,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`Rule generation failed for ${technology}`, error as Error, {
        jobId: job.id,
        processingTime,
        updateType,
      });

      return {
        success: false,
        message: `Rule generation failed for ${technology}: ${errorMessage}`,
        processingTime,
        error: errorMessage,
      };
    }
  }

  private async processTrendAnalysis(job: Job<JobData>): Promise<JobResult> {
    const startTime = Date.now();
    const { technology } = job.data;

    logQueueJob('trend-analysis', job.id!, 'started', { technology });

    try {
      const { TrendAnalyzer } = await import('./TrendAnalyzer.js');
      const trendAnalyzer = new TrendAnalyzer();

      const trends = technology 
        ? await trendAnalyzer.analyzeTechnology(technology)
        : await trendAnalyzer.analyzeAllTechnologies();

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        message: `Trend analysis completed for ${technology || 'all technologies'}`,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`Trend analysis failed for ${technology || 'all technologies'}`, error as Error, {
        jobId: job.id,
        processingTime,
      });

      return {
        success: false,
        message: `Trend analysis failed: ${errorMessage}`,
        processingTime,
        error: errorMessage,
      };
    }
  }

  private async processEmergencyUpdate(job: Job<JobData>): Promise<JobResult> {
    const startTime = Date.now();
    const { technology, updateType, context, priority } = job.data;

    logQueueJob('emergency-updates', job.id!, 'started', {
      technology,
      updateType,
      priority,
    });

    try {
      // Emergency updates get immediate processing with enhanced logging
      logger.warn(`Processing emergency update for ${technology}`, {
        updateType,
        context,
        jobId: job.id,
      });

      // Use the same rule generation process but with emergency priority
      const result = await this.processRuleGeneration(job);

      // Send emergency notification
      try {
        const { NotificationService } = await import('./NotificationService.js');
        const notificationService = new NotificationService();
        
        await notificationService.sendAlert({
          type: 'emergency-update-completed',
          message: `Emergency update completed for ${technology}`,
          technologies: [technology],
          timestamp: new Date(),
          severity: 'high',
          successful: result.success ? 1 : 0,
          failed: result.success ? 0 : 1,
        });
      } catch (notificationError) {
        logger.error('Failed to send emergency update notification', notificationError as Error);
      }

      const processingTime = Date.now() - startTime;

      return {
        ...result,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`Emergency update failed for ${technology}`, error as Error, {
        jobId: job.id,
        processingTime,
        updateType,
      });

      return {
        success: false,
        message: `Emergency update failed for ${technology}: ${errorMessage}`,
        processingTime,
        error: errorMessage,
      };
    }
  }

  // Public API methods
  async addRuleGenerationJob(jobData: JobData, options?: JobOptions): Promise<Job<JobData>> {
    logger.info(`Adding rule generation job for ${jobData.technology}`, {
      updateType: jobData.updateType,
      priority: jobData.priority,
      triggeredBy: jobData.triggeredBy,
    });

    const job = await this.ruleGenerationQueue.add(jobData, {
      priority: this.getPriorityNumber(jobData.priority),
      ...options,
    });

    return job;
  }

  async addTrendAnalysisJob(jobData: JobData, options?: JobOptions): Promise<Job<JobData>> {
    logger.info(`Adding trend analysis job for ${jobData.technology || 'all technologies'}`, {
      priority: jobData.priority,
      triggeredBy: jobData.triggeredBy,
    });

    const job = await this.trendAnalysisQueue.add(jobData, {
      priority: this.getPriorityNumber(jobData.priority),
      ...options,
    });

    return job;
  }

  async addEmergencyUpdateJob(jobData: JobData, options?: JobOptions): Promise<Job<JobData>> {
    logger.warn(`Adding EMERGENCY update job for ${jobData.technology}`, {
      updateType: jobData.updateType,
      context: jobData.context,
      triggeredBy: jobData.triggeredBy,
    });

    const job = await this.emergencyUpdateQueue.add(jobData, {
      priority: 1, // Always highest priority
      ...options,
    });

    return job;
  }

  // Queue status and management
  async getQueueStats(): Promise<{
    ruleGeneration: any;
    trendAnalysis: any;
    emergencyUpdates: any;
  }> {
    const [ruleGenStats, trendStats, emergencyStats] = await Promise.all([
      this.ruleGenerationQueue.getJobCounts(),
      this.trendAnalysisQueue.getJobCounts(),
      this.emergencyUpdateQueue.getJobCounts(),
    ]);

    return {
      ruleGeneration: ruleGenStats,
      trendAnalysis: trendStats,
      emergencyUpdates: emergencyStats,
    };
  }

  async pauseQueue(queueName: 'rule-generation' | 'trend-analysis' | 'emergency-updates'): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.pause();
    logger.info(`Queue paused: ${queueName}`);
  }

  async resumeQueue(queueName: 'rule-generation' | 'trend-analysis' | 'emergency-updates'): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.resume();
    logger.info(`Queue resumed: ${queueName}`);
  }

  async cleanQueue(queueName: 'rule-generation' | 'trend-analysis' | 'emergency-updates'): Promise<void> {
    const queue = this.getQueueByName(queueName);
    await queue.clean(24 * 60 * 60 * 1000); // Clean jobs older than 24 hours
    logger.info(`Queue cleaned: ${queueName}`);
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down queue service');

    await Promise.all([
      this.ruleGenerationQueue.close(),
      this.trendAnalysisQueue.close(),
      this.emergencyUpdateQueue.close(),
    ]);

    logger.info('Queue service shutdown complete');
  }

  // Helper methods
  private getPriorityNumber(priority: 'low' | 'medium' | 'high'): number {
    const priorityMap = {
      low: 10,
      medium: 5,
      high: 1,
    };
    return priorityMap[priority];
  }

  private getQueueByName(name: string): Queue<JobData> {
    switch (name) {
      case 'rule-generation':
        return this.ruleGenerationQueue;
      case 'trend-analysis':
        return this.trendAnalysisQueue;
      case 'emergency-updates':
        return this.emergencyUpdateQueue;
      default:
        throw new Error(`Unknown queue name: ${name}`);
    }
  }

  // Utility methods for job management
  async retryFailedJobs(queueName: 'rule-generation' | 'trend-analysis' | 'emergency-updates'): Promise<number> {
    const queue = this.getQueueByName(queueName);
    const failedJobs = await queue.getFailed();
    
    let retriedCount = 0;
    for (const job of failedJobs) {
      await job.retry();
      retriedCount++;
    }

    logger.info(`Retried ${retriedCount} failed jobs in ${queueName}`);
    return retriedCount;
  }

  async getJobById(
    queueName: 'rule-generation' | 'trend-analysis' | 'emergency-updates',
    jobId: string
  ): Promise<Job<JobData> | null> {
    const queue = this.getQueueByName(queueName);
    return await queue.getJob(jobId);
  }
}