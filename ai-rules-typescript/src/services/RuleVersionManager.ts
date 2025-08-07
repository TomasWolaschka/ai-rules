/**
 * Rule version management and deployment service
 */

import { readFile, writeFile, rename, mkdir, readdir, stat } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { IRuleVersionManager } from '@/types/services.js';
import { RuleHistoryEntry } from '@/types/services.js';
import config from '@/config/environment.js';
import { createLogger, logPerformance } from '@/utils/logger.js';

const logger = createLogger('RuleVersionManager');

export class RuleVersionManager implements IRuleVersionManager {
  constructor() {
    this.ensureDirectories();
    logger.info('RuleVersionManager initialized', {
      ruleBasePath: config.project.ruleBasePath,
      archivePath: config.project.archivePath,
      metadataPath: config.project.metadataPath,
    });
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await mkdir(config.project.ruleBasePath, { recursive: true });
      await mkdir(config.project.archivePath, { recursive: true });
      await mkdir(config.project.metadataPath, { recursive: true });
      
      logger.debug('Required directories ensured', {
        ruleBasePath: config.project.ruleBasePath,
        archivePath: config.project.archivePath,
        metadataPath: config.project.metadataPath,
      });
    } catch (error) {
      logger.error('Failed to ensure required directories', error as Error);
      throw error;
    }
  }

  async archiveCurrentRule(ruleType: string, version: string): Promise<void> {
    logger.info(`Archiving current rule: ${ruleType} to version ${version}`);
    const startTime = Date.now();

    try {
      const currentRulePath = this.getRuleFilePath(ruleType);
      
      // Check if current rule exists
      try {
        await stat(currentRulePath);
      } catch (error) {
        logger.warn(`No current rule found for ${ruleType}, skipping archive`);
        return;
      }

      // Create archive filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archiveFileName = `${ruleType}-${version}-${timestamp}.md`;
      const archivePath = join(config.project.archivePath, archiveFileName);

      // Copy current rule to archive
      const currentContent = await readFile(currentRulePath, 'utf-8');
      await writeFile(archivePath, currentContent, 'utf-8');

      // Update metadata
      await this.updateRuleMetadata(ruleType, {
        version,
        archivedAt: new Date().toISOString(),
        archiveFile: archiveFileName,
        reason: 'scheduled_update',
      });

      const duration = Date.now() - startTime;
      logPerformance('rule-archive', duration, {
        ruleType,
        version,
        archiveFileName,
        contentLength: currentContent.length,
      });

      logger.info(`Rule archived successfully: ${ruleType}`, {
        duration,
        version,
        archivePath,
        contentSize: currentContent.length,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Failed to archive rule: ${ruleType}`, error as Error, {
        duration,
        version,
      });
      throw error;
    }
  }

  async deployNewRule(ruleType: string, content: string, version: string): Promise<void> {
    logger.info(`Deploying new rule: ${ruleType} version ${version}`);
    const startTime = Date.now();

    try {
      const rulePath = this.getRuleFilePath(ruleType);
      
      // Add version header to content
      const versionedContent = this.addVersionHeader(content, version, ruleType);

      // Write new rule content
      await writeFile(rulePath, versionedContent, 'utf-8');

      // Update deployment metadata
      await this.updateDeploymentMetadata(ruleType, {
        version,
        deployedAt: new Date().toISOString(),
        contentLength: versionedContent.length,
        checksum: this.calculateChecksum(versionedContent),
      });

      const duration = Date.now() - startTime;
      logPerformance('rule-deployment', duration, {
        ruleType,
        version,
        contentLength: versionedContent.length,
        filePath: rulePath,
      });

      logger.info(`Rule deployed successfully: ${ruleType}`, {
        duration,
        version,
        filePath: rulePath,
        contentSize: versionedContent.length,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Failed to deploy rule: ${ruleType}`, error as Error, {
        duration,
        version,
        contentLength: content.length,
      });
      throw error;
    }
  }

  async getRuleHistory(ruleType: string): Promise<RuleHistoryEntry[]> {
    logger.debug(`Getting rule history for ${ruleType}`);

    try {
      const metadataPath = join(config.project.metadataPath, `${ruleType}-history.json`);
      
      try {
        const historyContent = await readFile(metadataPath, 'utf-8');
        const history = JSON.parse(historyContent) as RuleHistoryEntry[];
        
        logger.debug(`Retrieved rule history for ${ruleType}`, {
          entries: history.length,
        });
        
        return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      } catch (error) {
        // History file doesn't exist yet
        logger.debug(`No history found for ${ruleType}`);
        return [];
      }
    } catch (error) {
      logger.error(`Failed to get rule history for ${ruleType}`, error as Error);
      throw error;
    }
  }

  async rollbackToVersion(ruleType: string, version: string): Promise<void> {
    logger.info(`Rolling back ${ruleType} to version ${version}`);
    const startTime = Date.now();

    try {
      // Find the archive file for the specified version
      const archiveFiles = await readdir(config.project.archivePath);
      const targetArchive = archiveFiles.find(file => 
        file.startsWith(`${ruleType}-${version}-`) && file.endsWith('.md')
      );

      if (!targetArchive) {
        throw new Error(`Archive not found for ${ruleType} version ${version}`);
      }

      const archivePath = join(config.project.archivePath, targetArchive);
      const rulePath = this.getRuleFilePath(ruleType);

      // First, archive current version as rollback backup
      const rollbackBackupVersion = `rollback-backup-${new Date().toISOString().split('T')[0]}`;
      await this.archiveCurrentRule(ruleType, rollbackBackupVersion);

      // Copy archived version back to active rule
      const archivedContent = await readFile(archivePath, 'utf-8');
      await writeFile(rulePath, archivedContent, 'utf-8');

      // Update metadata to reflect rollback
      await this.updateRuleMetadata(ruleType, {
        version: `${version}-rollback`,
        archivedAt: new Date().toISOString(),
        archiveFile: targetArchive,
        reason: 'manual_rollback',
      });

      const duration = Date.now() - startTime;
      logPerformance('rule-rollback', duration, {
        ruleType,
        targetVersion: version,
        archiveFile: targetArchive,
        contentLength: archivedContent.length,
      });

      logger.info(`Rule rolled back successfully: ${ruleType}`, {
        duration,
        fromVersion: version,
        archiveFile: targetArchive,
        contentSize: archivedContent.length,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Failed to rollback rule: ${ruleType}`, error as Error, {
        duration,
        targetVersion: version,
      });
      throw error;
    }
  }

  private getRuleFilePath(ruleType: string): string {
    // Standardize rule file naming
    const filename = ruleType.endsWith('.md') ? ruleType : `${ruleType}.md`;
    return join(config.project.ruleBasePath, filename);
  }

  private addVersionHeader(content: string, version: string, ruleType: string): string {
    const header = `<!-- Rule Version: ${version} -->
<!-- Generated: ${new Date().toISOString()} -->
<!-- Type: ${ruleType} -->
<!-- AI Rules Management System -->

`;
    return header + content;
  }

  private calculateChecksum(content: string): string {
    // Simple checksum calculation (in production, use crypto)
    let checksum = 0;
    for (let i = 0; i < content.length; i++) {
      checksum = ((checksum << 5) - checksum + content.charCodeAt(i)) & 0xffffffff;
    }
    return checksum.toString(16);
  }

  private async updateRuleMetadata(ruleType: string, metadata: {
    version: string;
    archivedAt: string;
    archiveFile: string;
    reason: string;
  }): Promise<void> {
    try {
      const historyPath = join(config.project.metadataPath, `${ruleType}-history.json`);
      
      // Load existing history
      let history: RuleHistoryEntry[] = [];
      try {
        const historyContent = await readFile(historyPath, 'utf-8');
        history = JSON.parse(historyContent);
      } catch (error) {
        // File doesn't exist yet, start with empty history
      }

      // Add new entry
      const newEntry: RuleHistoryEntry = {
        version: metadata.version,
        date: metadata.archivedAt,
        author: 'AI Rules Management System',
        changes: [`Archived rule with reason: ${metadata.reason}`],
        filePath: metadata.archiveFile,
      };

      history.push(newEntry);

      // Keep only last 50 entries
      if (history.length > 50) {
        history = history.slice(-50);
      }

      // Save updated history
      await writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8');

      logger.debug(`Updated rule metadata for ${ruleType}`, {
        version: metadata.version,
        reason: metadata.reason,
        historyEntries: history.length,
      });
    } catch (error) {
      logger.error(`Failed to update rule metadata for ${ruleType}`, error as Error);
      // Don't throw here as this is not critical for rule deployment
    }
  }

  private async updateDeploymentMetadata(ruleType: string, metadata: {
    version: string;
    deployedAt: string;
    contentLength: number;
    checksum: string;
  }): Promise<void> {
    try {
      const deploymentPath = join(config.project.metadataPath, `${ruleType}-deployment.json`);
      
      const deploymentInfo = {
        ruleType,
        currentVersion: metadata.version,
        lastDeployment: metadata.deployedAt,
        contentLength: metadata.contentLength,
        checksum: metadata.checksum,
        deployedBy: 'AI Rules Management System',
        deploymentCount: await this.getDeploymentCount(ruleType) + 1,
      };

      await writeFile(deploymentPath, JSON.stringify(deploymentInfo, null, 2), 'utf-8');

      logger.debug(`Updated deployment metadata for ${ruleType}`, {
        version: metadata.version,
        checksum: metadata.checksum,
        deploymentCount: deploymentInfo.deploymentCount,
      });
    } catch (error) {
      logger.error(`Failed to update deployment metadata for ${ruleType}`, error as Error);
      // Don't throw here as this is not critical for rule deployment
    }
  }

  private async getDeploymentCount(ruleType: string): Promise<number> {
    try {
      const deploymentPath = join(config.project.metadataPath, `${ruleType}-deployment.json`);
      const deploymentContent = await readFile(deploymentPath, 'utf-8');
      const deploymentInfo = JSON.parse(deploymentContent);
      return deploymentInfo.deploymentCount || 0;
    } catch (error) {
      return 0;
    }
  }

  // Public methods for maintenance
  async cleanupOldArchives(retentionDays: number = 90): Promise<void> {
    logger.info(`Cleaning up archives older than ${retentionDays} days`);

    try {
      const archiveFiles = await readdir(config.project.archivePath);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let deletedCount = 0;

      for (const filename of archiveFiles) {
        if (!filename.endsWith('.md')) continue;

        const filePath = join(config.project.archivePath, filename);
        const stats = await stat(filePath);

        if (stats.mtime < cutoffDate) {
          // In a real implementation, you'd actually delete the file
          // For safety, we're just logging what would be deleted
          logger.debug(`Would delete old archive: ${filename}`, {
            lastModified: stats.mtime.toISOString(),
            ageInDays: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)),
          });
          deletedCount++;
        }
      }

      logger.info(`Archive cleanup completed`, {
        totalFiles: archiveFiles.length,
        markedForDeletion: deletedCount,
        retentionDays,
      });
    } catch (error) {
      logger.error('Archive cleanup failed', error as Error);
      throw error;
    }
  }

  async getRuleVersionInfo(ruleType: string): Promise<{
    currentVersion: string;
    lastDeployment: string;
    contentLength: number;
    checksum: string;
    deploymentCount: number;
  } | null> {
    try {
      const deploymentPath = join(config.project.metadataPath, `${ruleType}-deployment.json`);
      const deploymentContent = await readFile(deploymentPath, 'utf-8');
      const deploymentInfo = JSON.parse(deploymentContent);

      return {
        currentVersion: deploymentInfo.currentVersion,
        lastDeployment: deploymentInfo.lastDeployment,
        contentLength: deploymentInfo.contentLength,
        checksum: deploymentInfo.checksum,
        deploymentCount: deploymentInfo.deploymentCount,
      };
    } catch (error) {
      logger.debug(`No version info found for ${ruleType}`);
      return null;
    }
  }

  async listAvailableVersions(ruleType: string): Promise<string[]> {
    try {
      const archiveFiles = await readdir(config.project.archivePath);
      const versions = archiveFiles
        .filter(file => file.startsWith(`${ruleType}-`) && file.endsWith('.md'))
        .map(file => {
          // Extract version from filename: ruleType-version-timestamp.md
          const parts = file.replace('.md', '').split('-');
          if (parts.length >= 2) {
            return parts[1]; // The version part
          }
          return 'unknown';
        })
        .filter(version => version !== 'unknown');

      return [...new Set(versions)]; // Remove duplicates
    } catch (error) {
      logger.error(`Failed to list versions for ${ruleType}`, error as Error);
      return [];
    }
  }
}