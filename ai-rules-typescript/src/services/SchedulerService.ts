/**
 * Automated scheduling service using node-cron
 */

import cron from 'node-cron';
import { SchedulerConfig, ScheduledJob } from '@/types/services.js';
import config from '@/config/environment.js';
import { createLogger, logPerformance } from '@/utils/logger.js';

const logger = createLogger('SchedulerService');

interface ScheduledTask {
  name: string;
  cronExpression: string;
  task: cron.ScheduledTask;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
}

export class SchedulerService {
  private scheduledTasks = new Map<string, ScheduledTask>();
  private queueService: any; // Will be dynamically imported
  private trendAnalyzer: any; // Will be dynamically imported
  private notificationService: any; // Will be dynamically imported

  constructor() {
    logger.info('SchedulerService initialized', {
      timezone: 'UTC',
      supportedTechnologies: config.rules.supportedTechnologies.length,
      updateFrequency: `${config.rules.updateFrequencyMonths} months`,
    });
  }

  async start(): Promise<void> {
    logger.info('Starting scheduler service');

    try {
      // Dynamically import services to avoid circular dependencies
      const { QueueService } = await import('./QueueService.js');
      const { TrendAnalyzer } = await import('./TrendAnalyzer.js');
      const { NotificationService } = await import('./NotificationService.js');

      this.queueService = new QueueService();
      this.trendAnalyzer = new TrendAnalyzer();
      this.notificationService = new NotificationService();

      // Set up scheduled tasks
      await this.setupScheduledTasks();

      logger.info('Scheduler service started successfully', {
        scheduledTasks: this.scheduledTasks.size,
      });
    } catch (error) {
      logger.error('Failed to start scheduler service', error as Error);
      throw error;
    }
  }

  private async setupScheduledTasks(): Promise<void> {
    // Daily trend analysis (runs at 2 AM UTC)
    this.scheduleTask('daily-trend-analysis', '0 2 * * *', async () => {
      logger.info('Running scheduled daily trend analysis');
      
      try {
        // Queue trend analysis for all technologies
        await this.queueService.addTrendAnalysisJob({
          technology: '', // Empty means all technologies
          priority: 'medium',
          updateType: 'minor',
          triggeredBy: 'schedule',
        });

        logger.info('Daily trend analysis job queued successfully');
      } catch (error) {
        logger.error('Failed to queue daily trend analysis', error as Error);
        throw error;
      }
    });

    // Weekly rule generation check (runs on Sundays at 3 AM UTC)
    this.scheduleTask('weekly-rule-check', '0 3 * * 0', async () => {
      logger.info('Running scheduled weekly rule generation check');
      
      try {
        // Analyze trends for all technologies to determine update priorities
        const allTrends = await this.trendAnalyzer.analyzeAllTechnologies();
        
        const highPriorityTechnologies = Object.entries(allTrends)
          .filter(([, trends]) => trends.updatePriority > 0.7)
          .map(([tech]) => tech);

        logger.info('High priority technologies identified', {
          technologies: highPriorityTechnologies,
          totalAnalyzed: Object.keys(allTrends).length,
        });

        // Queue rule generation for high-priority technologies
        for (const technology of highPriorityTechnologies) {
          await this.queueService.addRuleGenerationJob({
            technology,
            priority: 'high',
            updateType: 'major',
            triggeredBy: 'schedule',
            context: 'Weekly automated update based on trend analysis',
          });
        }

        // Send summary notification
        if (this.notificationService) {
          await this.notificationService.sendSummary({
            type: 'weekly-rule-check',
            totalProcessed: Object.keys(allTrends).length,
            successful: highPriorityTechnologies.length,
            failed: 0,
            technologies: highPriorityTechnologies,
            duration: 0, // Will be updated by performance logging
            timestamp: new Date(),
          });
        }

        logger.info('Weekly rule check completed', {
          technologiesQueued: highPriorityTechnologies.length,
        });
      } catch (error) {
        logger.error('Failed to complete weekly rule check', error as Error);
        throw error;
      }
    });

    // Monthly comprehensive update (runs on 1st of each month at 1 AM UTC)
    this.scheduleTask('monthly-comprehensive-update', '0 1 1 * *', async () => {
      logger.info('Running scheduled monthly comprehensive update');
      
      try {
        const startTime = Date.now();
        let successful = 0;
        let failed = 0;

        // Queue rule generation for all technologies
        for (const technology of config.rules.supportedTechnologies) {
          try {
            await this.queueService.addRuleGenerationJob({
              technology,
              priority: 'medium',
              updateType: 'major',
              triggeredBy: 'schedule',
              context: 'Monthly comprehensive update',
            });
            successful++;
          } catch (error) {
            logger.error(`Failed to queue monthly update for ${technology}`, error as Error);
            failed++;
          }
        }

        const duration = Date.now() - startTime;
        logPerformance('monthly-comprehensive-update', duration, {
          successful,
          failed,
          totalTechnologies: config.rules.supportedTechnologies.length,
        });

        // Send summary notification
        if (this.notificationService) {
          await this.notificationService.sendSummary({
            type: 'monthly-comprehensive-update',
            totalProcessed: config.rules.supportedTechnologies.length,
            successful,
            failed,
            technologies: config.rules.supportedTechnologies,
            duration,
            timestamp: new Date(),
          });
        }

        logger.info('Monthly comprehensive update completed', {
          successful,
          failed,
          duration,
        });
      } catch (error) {
        logger.error('Failed to complete monthly comprehensive update', error as Error);
        throw error;
      }
    });

    // System health check (runs every 15 minutes)
    this.scheduleTask('system-health-check', '*/15 * * * *', async () => {
      logger.debug('Running system health check');
      
      try {
        // Get queue statistics
        const queueStats = await this.queueService.getQueueStats();
        
        // Check for any queues with high failure rates
        let alertsNeeded = false;
        const alerts: string[] = [];

        Object.entries(queueStats).forEach(([queueName, stats]: [string, any]) => {
          if (stats.failed > 10) {
            alerts.push(`High failure count in ${queueName}: ${stats.failed} failed jobs`);
            alertsNeeded = true;
          }
          
          if (stats.waiting > 50) {
            alerts.push(`High waiting count in ${queueName}: ${stats.waiting} waiting jobs`);
            alertsNeeded = true;
          }
        });

        // Send alert if needed
        if (alertsNeeded && this.notificationService) {
          await this.notificationService.sendAlert({
            type: 'system-health-alert',
            message: alerts.join('; '),
            timestamp: new Date(),
            severity: 'medium',
          });
        }

        // Broadcast system status to WebSocket clients
        if (this.notificationService) {
          await this.notificationService.broadcastSystemStatus();
        }

        logger.debug('System health check completed', {
          alertsGenerated: alerts.length,
          queueStats,
        });
      } catch (error) {
        logger.error('System health check failed', error as Error);
      }
    });

    // Cache cleanup (runs daily at 4 AM UTC)
    this.scheduleTask('cache-cleanup', '0 4 * * *', async () => {
      logger.info('Running scheduled cache cleanup');
      
      try {
        // Clear trend analysis cache
        this.trendAnalyzer.clearCache();
        
        // Clean up old rule archives (older than retention period)
        const { RuleVersionManager } = await import('./RuleVersionManager.js');
        const versionManager = new RuleVersionManager();
        
        const retentionDays = config.rules.retentionMonths * 30;
        await versionManager.cleanupOldArchives(retentionDays);

        logger.info('Cache cleanup completed', {
          retentionDays,
        });
      } catch (error) {
        logger.error('Cache cleanup failed', error as Error);
      }
    });

    // Emergency security check (runs every 6 hours)
    this.scheduleTask('security-advisory-check', '0 */6 * * *', async () => {
      logger.info('Running scheduled security advisory check');
      
      try {
        const emergencyUpdates: string[] = [];

        // Check security advisories for all technologies
        for (const technology of config.rules.supportedTechnologies) {
          try {
            const advisories = await this.trendAnalyzer.checkSecurityAdvisories(technology);
            const criticalAdvisories = advisories.filter(advisory => 
              advisory.severity === 'critical' || advisory.severity === 'high'
            );

            if (criticalAdvisories.length > 0) {
              // Queue emergency update
              await this.queueService.addEmergencyUpdateJob({
                technology,
                priority: 'high',
                updateType: 'emergency',
                triggeredBy: 'schedule',
                context: `Security advisories found: ${criticalAdvisories.map(a => a.title).join(', ')}`,
              });

              emergencyUpdates.push(technology);

              logger.warn(`Emergency security update queued for ${technology}`, {
                advisoryCount: criticalAdvisories.length,
                advisories: criticalAdvisories.map(a => ({ title: a.title, severity: a.severity })),
              });
            }
          } catch (error) {
            logger.error(`Failed to check security advisories for ${technology}`, error as Error);
          }
        }

        // Send alert if emergency updates were queued
        if (emergencyUpdates.length > 0 && this.notificationService) {
          await this.notificationService.sendAlert({
            type: 'security-emergency-updates',
            message: `Emergency security updates queued for: ${emergencyUpdates.join(', ')}`,
            technologies: emergencyUpdates,
            timestamp: new Date(),
            severity: 'critical',
          });
        }

        logger.info('Security advisory check completed', {
          technologiesChecked: config.rules.supportedTechnologies.length,
          emergencyUpdatesQueued: emergencyUpdates.length,
        });
      } catch (error) {
        logger.error('Security advisory check failed', error as Error);
      }
    });

    logger.info('All scheduled tasks configured', {
      taskCount: this.scheduledTasks.size,
      tasks: Array.from(this.scheduledTasks.keys()),
    });
  }

  private scheduleTask(name: string, cronExpression: string, taskFunction: () => Promise<void>): void {
    logger.debug(`Scheduling task: ${name}`, { cronExpression });

    const task = cron.schedule(cronExpression, async () => {
      const scheduledTask = this.scheduledTasks.get(name);
      if (!scheduledTask || !scheduledTask.enabled) {
        logger.debug(`Skipping disabled task: ${name}`);
        return;
      }

      const startTime = Date.now();
      scheduledTask.lastRun = new Date();
      scheduledTask.runCount++;

      logger.info(`Executing scheduled task: ${name}`, {
        runCount: scheduledTask.runCount,
        lastRun: scheduledTask.lastRun.toISOString(),
      });

      try {
        await taskFunction();
        
        const duration = Date.now() - startTime;
        logPerformance(`scheduled-task-${name}`, duration, {
          runCount: scheduledTask.runCount,
          errorCount: scheduledTask.errorCount,
        });

        logger.info(`Scheduled task completed: ${name}`, {
          duration,
          runCount: scheduledTask.runCount,
        });
      } catch (error) {
        scheduledTask.errorCount++;
        const duration = Date.now() - startTime;
        
        logger.error(`Scheduled task failed: ${name}`, error as Error, {
          duration,
          runCount: scheduledTask.runCount,
          errorCount: scheduledTask.errorCount,
        });

        // Send failure notification for critical tasks
        if (this.notificationService && ['monthly-comprehensive-update', 'security-advisory-check'].includes(name)) {
          try {
            await this.notificationService.sendAlert({
              type: 'scheduled-task-failure',
              message: `Scheduled task failed: ${name}`,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date(),
              severity: 'high',
            });
          } catch (notificationError) {
            logger.error('Failed to send task failure notification', notificationError as Error);
          }
        }
      }
    }, {
      scheduled: true,
      timezone: 'UTC',
    });

    // Calculate next run time
    const nextRun = this.getNextRunTime(cronExpression);

    this.scheduledTasks.set(name, {
      name,
      cronExpression,
      task,
      enabled: true,
      nextRun,
      runCount: 0,
      errorCount: 0,
    });

    logger.info(`Task scheduled: ${name}`, {
      cronExpression,
      nextRun: nextRun?.toISOString(),
      enabled: true,
    });
  }

  private getNextRunTime(cronExpression: string): Date | undefined {
    try {
      // Simple next run calculation (in production, use a proper cron library)
      const now = new Date();
      // For simplicity, just add 1 hour as estimate
      return new Date(now.getTime() + 60 * 60 * 1000);
    } catch (error) {
      logger.warn('Could not calculate next run time', error as Error, { cronExpression });
      return undefined;
    }
  }

  // Public API methods
  enableTask(taskName: string): boolean {
    const task = this.scheduledTasks.get(taskName);
    if (!task) {
      logger.warn(`Task not found: ${taskName}`);
      return false;
    }

    task.enabled = true;
    logger.info(`Task enabled: ${taskName}`);
    return true;
  }

  disableTask(taskName: string): boolean {
    const task = this.scheduledTasks.get(taskName);
    if (!task) {
      logger.warn(`Task not found: ${taskName}`);
      return false;
    }

    task.enabled = false;
    logger.info(`Task disabled: ${taskName}`);
    return true;
  }

  getTaskStatus(): Array<{
    name: string;
    cronExpression: string;
    enabled: boolean;
    lastRun?: string;
    nextRun?: string;
    runCount: number;
    errorCount: number;
  }> {
    return Array.from(this.scheduledTasks.values()).map(task => ({
      name: task.name,
      cronExpression: task.cronExpression,
      enabled: task.enabled,
      lastRun: task.lastRun?.toISOString(),
      nextRun: task.nextRun?.toISOString(),
      runCount: task.runCount,
      errorCount: task.errorCount,
    }));
  }

  async triggerTask(taskName: string): Promise<boolean> {
    const task = this.scheduledTasks.get(taskName);
    if (!task) {
      logger.warn(`Task not found: ${taskName}`);
      return false;
    }

    logger.info(`Manually triggering task: ${taskName}`);
    
    try {
      // This will trigger the task immediately
      // Note: In production, you'd want to extract the task function to call it directly
      task.task.now();
      return true;
    } catch (error) {
      logger.error(`Failed to trigger task: ${taskName}`, error as Error);
      return false;
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down scheduler service');

    // Stop all scheduled tasks
    for (const [name, task] of this.scheduledTasks) {
      try {
        task.task.stop();
        logger.debug(`Stopped scheduled task: ${name}`);
      } catch (error) {
        logger.warn(`Error stopping task: ${name}`, error as Error);
      }
    }

    // Clear the tasks map
    this.scheduledTasks.clear();

    logger.info('Scheduler service shutdown complete');
  }
}