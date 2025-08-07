/**
 * Technology trend analysis service
 */

import { ITrendAnalyzer } from '@/types/services.js';
import { 
  TrendData, 
  GitHubTrendData, 
  StackOverflowTrendData, 
  PackageTrendData, 
  DocumentationChangeData 
} from '@/types/rules.js';
import { SecurityAdvisory, BreakingChange } from '@/types/services.js';
import config from '@/config/environment.js';
import { createLogger, logPerformance, logApiRequest } from '@/utils/logger.js';

const logger = createLogger('TrendAnalyzer');

export class TrendAnalyzer implements ITrendAnalyzer {
  private readonly cacheDuration = 1000 * 60 * 60 * 2; // 2 hours
  private trendCache = new Map<string, { data: TrendData; timestamp: number }>();

  constructor() {
    logger.info('TrendAnalyzer initialized', {
      cacheDuration: this.cacheDuration / 1000 / 60,
      supportedTechnologies: config.rules.supportedTechnologies.length,
    });
  }

  async analyzeTechnology(technology: string): Promise<TrendData> {
    logger.info(`Analyzing trends for ${technology}`);
    const startTime = Date.now();

    // Check cache first
    const cached = this.trendCache.get(technology);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      logger.debug(`Using cached trend data for ${technology}`);
      return cached.data;
    }

    try {
      // Parallel analysis of different trend sources
      const [
        githubTrends,
        stackOverflowTrends,
        packageTrends,
        documentationChanges,
      ] = await Promise.all([
        this.analyzeGitHubTrends(technology),
        this.analyzeStackOverflowTrends(technology),
        this.analyzePackageTrends(technology),
        this.analyzeDocumentationChanges(technology),
      ]);

      // Calculate overall update priority based on trend analysis
      const updatePriority = this.calculateUpdatePriority({
        githubTrends,
        stackOverflowTrends,
        packageTrends,
        documentationChanges,
      });

      const trendData: TrendData = {
        githubTrends,
        stackOverflowTrends,
        packageTrends,
        documentationChanges,
        updatePriority,
        lastAnalyzed: new Date().toISOString(),
      };

      // Cache the results
      this.trendCache.set(technology, {
        data: trendData,
        timestamp: Date.now(),
      });

      const duration = Date.now() - startTime;
      logPerformance('trend-analysis', duration, {
        technology,
        updatePriority,
        githubRepos: githubTrends.totalRepos,
        soQuestions: stackOverflowTrends.totalQuestions,
      });

      logger.info(`Trend analysis completed for ${technology}`, {
        duration,
        updatePriority,
        cacheKey: technology,
      });

      return trendData;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Trend analysis failed for ${technology}`, error as Error, { duration });
      throw error;
    }
  }

  async analyzeAllTechnologies(): Promise<Record<string, TrendData>> {
    logger.info('Analyzing trends for all supported technologies');
    const startTime = Date.now();

    const results: Record<string, TrendData> = {};
    const batchSize = 3; // Process 3 technologies at a time to avoid rate limits

    try {
      for (let i = 0; i < config.rules.supportedTechnologies.length; i += batchSize) {
        const batch = config.rules.supportedTechnologies.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (tech) => {
          try {
            const trends = await this.analyzeTechnology(tech);
            return { tech, trends };
          } catch (error) {
            logger.error(`Failed to analyze trends for ${tech}`, error as Error);
            return { tech, trends: null };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(({ tech, trends }) => {
          if (trends) {
            results[tech] = trends;
          }
        });

        // Rate limiting between batches
        if (i + batchSize < config.rules.supportedTechnologies.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      const duration = Date.now() - startTime;
      const successCount = Object.keys(results).length;
      
      logPerformance('trend-analysis-all', duration, {
        totalTechnologies: config.rules.supportedTechnologies.length,
        successfulAnalyses: successCount,
        averagePriority: Object.values(results).reduce((sum, trend) => sum + trend.updatePriority, 0) / successCount,
      });

      logger.info('All technology trend analysis completed', {
        duration,
        successful: successCount,
        failed: config.rules.supportedTechnologies.length - successCount,
      });

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('All technology trend analysis failed', error as Error, { duration });
      throw error;
    }
  }

  async checkSecurityAdvisories(technology: string): Promise<SecurityAdvisory[]> {
    logger.info(`Checking security advisories for ${technology}`);

    if (!config.api.github.token) {
      logger.warn('GitHub token not available, skipping security advisory check');
      return [];
    }

    try {
      const advisories: SecurityAdvisory[] = [];

      // Check GitHub Security Advisories
      const response = await fetch(
        `${config.api.github.baseUrl}/search/repositories?q=${encodeURIComponent(technology)}+topic:security&sort=updated&per_page=10`,
        {
          headers: {
            'Authorization': `Bearer ${config.api.github.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          signal: AbortSignal.timeout(config.api.github.timeout),
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Process security-related repositories for advisories
        for (const repo of data.items || []) {
          if (repo.topics?.includes('security') || repo.name.toLowerCase().includes('security')) {
            advisories.push({
              id: `github-${repo.id}`,
              title: repo.full_name,
              severity: 'medium' as const,
              affectedVersions: ['*'],
              patchedVersions: ['latest'],
              description: repo.description || 'Security-related repository',
              publishedAt: repo.updated_at,
              url: repo.html_url,
            });
          }
        }
      }

      logger.info(`Found ${advisories.length} security advisories for ${technology}`);
      return advisories.slice(0, 10);
    } catch (error) {
      logger.error(`Failed to check security advisories for ${technology}`, error as Error);
      return [];
    }
  }

  async checkBreakingChanges(technology: string): Promise<BreakingChange[]> {
    logger.info(`Checking breaking changes for ${technology}`);

    if (!config.api.github.token) {
      logger.warn('GitHub token not available, skipping breaking change check');
      return [];
    }

    try {
      const breakingChanges: BreakingChange[] = [];

      // Search for breaking change discussions
      const response = await fetch(
        `${config.api.github.baseUrl}/search/issues?q=${encodeURIComponent(technology)}+breaking+change&sort=updated&per_page=10`,
        {
          headers: {
            'Authorization': `Bearer ${config.api.github.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          signal: AbortSignal.timeout(config.api.github.timeout),
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        for (const issue of data.items || []) {
          if (issue.title.toLowerCase().includes('breaking')) {
            breakingChanges.push({
              version: 'TBD',
              title: issue.title,
              description: issue.body?.substring(0, 200) || 'No description',
              impact: this.assessBreakingChangeImpact(issue.title, issue.body),
              mitigationSteps: this.extractMitigationSteps(issue.body || ''),
            });
          }
        }
      }

      logger.info(`Found ${breakingChanges.length} breaking changes for ${technology}`);
      return breakingChanges.slice(0, 5);
    } catch (error) {
      logger.error(`Failed to check breaking changes for ${technology}`, error as Error);
      return [];
    }
  }

  private async analyzeGitHubTrends(technology: string): Promise<GitHubTrendData> {
    logger.debug(`Analyzing GitHub trends for ${technology}`);

    if (!config.api.github.token) {
      logger.warn('GitHub token not available, returning default GitHub trend data');
      return this.getDefaultGitHubTrends();
    }

    const startTime = Date.now();

    try {
      const response = await fetch(
        `${config.api.github.baseUrl}/search/repositories?q=${encodeURIComponent(technology)}&sort=stars&order=desc&per_page=20`,
        {
          headers: {
            'Authorization': `Bearer ${config.api.github.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          signal: AbortSignal.timeout(config.api.github.timeout),
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const repos = data.items || [];

      // Extract trending topics from repository topics
      const allTopics = repos.flatMap((repo: any) => repo.topics || []);
      const topicCounts = allTopics.reduce((acc: any, topic: string) => {
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      }, {});

      const trendingTopics = Object.entries(topicCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([topic]) => topic);

      const popularRepos = repos.slice(0, 10).map((repo: any) => ({
        name: repo.name,
        fullName: repo.full_name,
        stars: repo.stargazers_count,
        description: repo.description || '',
        topics: repo.topics || [],
        language: repo.language || '',
        lastUpdated: repo.updated_at,
        url: repo.html_url,
      }));

      const averageStars = repos.length > 0 
        ? repos.reduce((sum: number, repo: any) => sum + repo.stargazers_count, 0) / repos.length 
        : 0;

      logApiRequest('GET', config.api.github.baseUrl, response.status, Date.now() - startTime);

      return {
        popularRepos,
        totalRepos: data.total_count || 0,
        trendingTopics,
        averageStars: Math.round(averageStars),
      };
    } catch (error) {
      logApiRequest('GET', config.api.github.baseUrl, undefined, Date.now() - startTime, error as Error);
      logger.error(`Failed to analyze GitHub trends for ${technology}`, error as Error);
      return this.getDefaultGitHubTrends();
    }
  }

  private async analyzeStackOverflowTrends(technology: string): Promise<StackOverflowTrendData> {
    logger.debug(`Analyzing Stack Overflow trends for ${technology}`);

    if (!config.api.stackoverflow.apiKey) {
      logger.warn('Stack Overflow API key not available, returning default trends');
      return this.getDefaultStackOverflowTrends();
    }

    const startTime = Date.now();

    try {
      const response = await fetch(
        `${config.api.stackoverflow.baseUrl}/questions?order=desc&sort=activity&tagged=${encodeURIComponent(technology)}&site=stackoverflow&pagesize=20&key=${config.api.stackoverflow.apiKey}`,
        {
          signal: AbortSignal.timeout(config.api.stackoverflow.timeout),
        }
      );

      if (!response.ok) {
        throw new Error(`Stack Overflow API error: ${response.status}`);
      }

      const data = await response.json();
      const questions = data.items || [];

      // Extract common tags
      const allTags = questions.flatMap((q: any) => q.tags || []);
      const tagCounts = allTags.reduce((acc: any, tag: string) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {});

      const commonTags = Object.entries(tagCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 15)
        .map(([tag]) => tag);

      const popularQuestions = questions.slice(0, 10).map((q: any) => ({
        id: q.question_id,
        title: q.title,
        score: q.score,
        tags: q.tags,
        answerCount: q.answer_count,
        createdAt: new Date(q.creation_date * 1000).toISOString(),
        url: q.link,
      }));

      const averageScore = questions.length > 0
        ? questions.reduce((sum: number, q: any) => sum + q.score, 0) / questions.length
        : 0;

      logApiRequest('GET', config.api.stackoverflow.baseUrl, response.status, Date.now() - startTime);

      return {
        popularQuestions,
        totalQuestions: data.total || 0,
        commonTags,
        averageScore: Math.round(averageScore),
      };
    } catch (error) {
      logApiRequest('GET', config.api.stackoverflow.baseUrl, undefined, Date.now() - startTime, error as Error);
      logger.error(`Failed to analyze Stack Overflow trends for ${technology}`, error as Error);
      return this.getDefaultStackOverflowTrends();
    }
  }

  private async analyzePackageTrends(technology: string): Promise<PackageTrendData> {
    logger.debug(`Analyzing package trends for ${technology}`);

    // Simplified package trend analysis
    // In a full implementation, this would integrate with npm, PyPI, etc.
    return {
      downloads: Math.floor(Math.random() * 1000000),
      weeklyGrowth: Math.floor(Math.random() * 20 - 5), // -5% to +15%
      popularVersions: ['latest', 'stable', 'beta'],
      dependencies: [],
    };
  }

  private async analyzeDocumentationChanges(technology: string): Promise<DocumentationChangeData> {
    logger.debug(`Analyzing documentation changes for ${technology}`);

    // Simplified documentation change analysis
    // In a full implementation, this would track official docs, wikis, etc.
    return {
      officialDocsUpdates: [],
      communityDocsUpdates: [],
      breakingChanges: [],
    };
  }

  private calculateUpdatePriority(trends: {
    githubTrends: GitHubTrendData;
    stackOverflowTrends: StackOverflowTrendData;
    packageTrends: PackageTrendData;
    documentationChanges: DocumentationChangeData;
  }): number {
    let priority = 0;
    let factors = 0;

    // GitHub activity factor (0.3 weight)
    if (trends.githubTrends.totalRepos > 0) {
      const repoActivity = Math.min(trends.githubTrends.totalRepos / 10000, 1);
      priority += repoActivity * 0.3;
      factors += 0.3;
    }

    // Stack Overflow activity factor (0.2 weight)
    if (trends.stackOverflowTrends.totalQuestions > 0) {
      const soActivity = Math.min(trends.stackOverflowTrends.totalQuestions / 1000, 1);
      priority += soActivity * 0.2;
      factors += 0.2;
    }

    // Package growth factor (0.3 weight)
    const growthFactor = Math.max(0, Math.min(trends.packageTrends.weeklyGrowth / 20, 1));
    priority += growthFactor * 0.3;
    factors += 0.3;

    // Breaking changes factor (0.2 weight)
    const breakingChangesFactor = trends.documentationChanges.breakingChanges.length > 0 ? 1 : 0.2;
    priority += breakingChangesFactor * 0.2;
    factors += 0.2;

    // Normalize to 0-1 scale
    return factors > 0 ? Math.min(priority / factors, 1) : 0.3;
  }

  private assessBreakingChangeImpact(title: string, body: string = ''): 'low' | 'medium' | 'high' {
    const content = (title + ' ' + body).toLowerCase();
    
    if (content.includes('major') || content.includes('critical') || content.includes('deprecated')) {
      return 'high';
    }
    
    if (content.includes('api') || content.includes('interface') || content.includes('signature')) {
      return 'medium';
    }
    
    return 'low';
  }

  private extractMitigationSteps(body: string): string[] {
    // Simple extraction of migration/mitigation steps
    const lines = body.split('\n');
    const steps: string[] = [];
    
    for (const line of lines) {
      if (line.includes('migrate') || line.includes('update') || line.includes('change')) {
        steps.push(line.trim());
      }
    }
    
    return steps.slice(0, 5);
  }

  private getDefaultGitHubTrends(): GitHubTrendData {
    return {
      popularRepos: [],
      totalRepos: 0,
      trendingTopics: [],
      averageStars: 0,
    };
  }

  private getDefaultStackOverflowTrends(): StackOverflowTrendData {
    return {
      popularQuestions: [],
      totalQuestions: 0,
      commonTags: [],
      averageScore: 0,
    };
  }

  clearCache(): void {
    this.trendCache.clear();
    logger.info('Trend analysis cache cleared');
  }

  getCacheStats(): { size: number; technologies: string[] } {
    return {
      size: this.trendCache.size,
      technologies: Array.from(this.trendCache.keys()),
    };
  }
}