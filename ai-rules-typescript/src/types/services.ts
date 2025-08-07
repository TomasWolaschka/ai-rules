/**
 * Service interfaces and types
 */

import { TrendData, RuleGenerationConfig, ContextRule, RuleInjectionResult } from './rules.js';

export interface IRuleGenerator {
  generateRules(config: RuleGenerationConfig): Promise<string>;
  conductResearch(technology: string, year: number): Promise<ResearchData>;
  synthesizeRules(data: RuleSynthesisData): Promise<string>;
}

export interface ITrendAnalyzer {
  analyzeTechnology(technology: string): Promise<TrendData>;
  analyzeAllTechnologies(): Promise<Record<string, TrendData>>;
  checkSecurityAdvisories(technology: string): Promise<SecurityAdvisory[]>;
  checkBreakingChanges(technology: string): Promise<BreakingChange[]>;
}

export interface IContextInjector {
  analyzePromptTechnologies(prompt: string): Promise<string[]>;
  generateContextInjection(technologies: string[]): Promise<string>;
  loadRelevantRules(technologies: string[]): Promise<Map<string, string>>;
  recordRuleUsage(ruleName: string, technology: string): void;
}

export interface IRuleVersionManager {
  archiveCurrentRule(ruleType: string, version: string): Promise<void>;
  deployNewRule(ruleType: string, content: string, version: string): Promise<void>;
  getRuleHistory(ruleType: string): Promise<RuleHistoryEntry[]>;
  rollbackToVersion(ruleType: string, version: string): Promise<void>;
}

export interface INotificationService {
  sendAlert(alert: NotificationAlert): Promise<void>;
  sendSummary(summary: NotificationSummary): Promise<void>;
  getConnectedClients(): number;
  broadcastUpdate(update: RuleUpdateNotification): Promise<void>;
}

export interface IMetricsService {
  trackRuleGeneration<T>(
    technology: string,
    updateType: string,
    operation: () => Promise<T>
  ): Promise<T>;
  recordRuleUsage(ruleName: string, technology: string, injectionType: string): void;
  recordContextInjectionSize(technologyCount: number, ruleCount: number, sizeBytes: number): void;
  updateQueueMetrics(queueStatus: QueueStatus): void;
  getMetrics(): Promise<string>;
  getMetricsJSON(): Promise<any>;
}

export interface ResearchData {
  bestPractices: WebSearchResult[];
  styleGuides: WebSearchResult[];
  security: WebSearchResult[];
  performance: WebSearchResult[];
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevanceScore: number;
}

export interface RuleSynthesisData {
  technology: string;
  year: number;
  researchData: ResearchData;
  communityInsights: CommunityInsights;
  trends: TrendData;
  additionalContext?: string;
}

export interface CommunityInsights {
  popularRepos: any[];
  totalRepos: number;
  discussions: Discussion[];
  influencers: Influencer[];
}

export interface Discussion {
  platform: 'github' | 'stackoverflow' | 'reddit' | 'hacker_news';
  title: string;
  url: string;
  score: number;
  comments: number;
  date: string;
}

export interface Influencer {
  name: string;
  platform: string;
  followers: number;
  recentPosts: Post[];
}

export interface Post {
  title: string;
  url: string;
  date: string;
  engagement: number;
}

export interface RuleHistoryEntry {
  version: string;
  date: string;
  author: string;
  changes: string[];
  filePath: string;
}

export interface NotificationAlert {
  type: string;
  message?: string;
  error?: string;
  technologies?: string[];
  trends?: any;
  timestamp: Date;
  successful?: number;
  failed?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface NotificationSummary {
  type: string;
  totalProcessed: number;
  successful: number;
  failed: number;
  technologies: string[];
  duration: number;
  timestamp: Date;
}

export interface RuleUpdateNotification {
  ruleType: string;
  technology: string;
  version: string;
  updateType: 'major' | 'minor' | 'emergency';
  changes: string[];
  timestamp: Date;
}

export interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  total: number;
}

export interface SecurityAdvisory {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedVersions: string[];
  patchedVersions: string[];
  description: string;
  publishedAt: string;
  url: string;
}

export interface BreakingChange {
  version: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  mitigationSteps: string[];
  deprecationDate?: string;
  removalDate?: string;
}

export interface JobData {
  technology: string;
  priority: 'low' | 'medium' | 'high';
  updateType: 'major' | 'minor' | 'emergency';
  context?: string;
  triggeredBy: 'schedule' | 'manual' | 'emergency';
}

export interface JobResult {
  success: boolean;
  message: string;
  ruleVersion?: string;
  rulesGenerated?: number;
  processingTime?: number;
  error?: string;
}

export interface SchedulerConfig {
  timezone: string;
  jobs: Record<string, ScheduledJob>;
  technologies: string[];
}

export interface ScheduledJob {
  cron: string;
  function: string;
  maxInstances: number;
  enabled: boolean;
  description?: string;
}