/**
 * Rule management and generation type definitions
 */

export interface Rule {
  id: string;
  type: string;
  technology: string;
  version: string;
  content: string;
  metadata: RuleMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleMetadata {
  generatedBy: 'ai' | 'manual' | 'hybrid';
  sources: string[];
  trends: TrendData;
  validationStatus: 'validated' | 'pending' | 'outdated';
  tags: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface TrendData {
  githubTrends: GitHubTrendData;
  stackOverflowTrends: StackOverflowTrendData;
  packageTrends: PackageTrendData;
  documentationChanges: DocumentationChangeData;
  updatePriority: number; // 0-1 scale
  lastAnalyzed: string;
}

export interface GitHubTrendData {
  popularRepos: GitHubRepo[];
  totalRepos: number;
  trendingTopics: string[];
  averageStars: number;
}

export interface GitHubRepo {
  name: string;
  fullName: string;
  stars: number;
  description: string;
  topics: string[];
  language: string;
  lastUpdated: string;
  url: string;
}

export interface StackOverflowTrendData {
  popularQuestions: StackOverflowQuestion[];
  totalQuestions: number;
  commonTags: string[];
  averageScore: number;
}

export interface StackOverflowQuestion {
  id: number;
  title: string;
  score: number;
  tags: string[];
  answerCount: number;
  createdAt: string;
  url: string;
}

export interface PackageTrendData {
  downloads: number;
  weeklyGrowth: number;
  popularVersions: string[];
  dependencies: PackageDependency[];
}

export interface PackageDependency {
  name: string;
  version: string;
  downloads: number;
}

export interface DocumentationChangeData {
  officialDocsUpdates: DocUpdate[];
  communityDocsUpdates: DocUpdate[];
  breakingChanges: BreakingChange[];
}

export interface DocUpdate {
  source: string;
  title: string;
  date: string;
  significance: 'major' | 'minor' | 'patch';
  url: string;
}

export interface BreakingChange {
  version: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  mitigationSteps: string[];
}

export interface RuleGenerationConfig {
  technology: string;
  year: number;
  trends: TrendData;
  additionalContext?: string;
  includeExamples?: boolean;
  includeReferences?: boolean;
}

export interface RuleArchiveEntry {
  ruleType: string;
  version: string;
  archivedAt: string;
  archiveFile: string;
  reason: 'scheduled_update' | 'emergency_update' | 'manual_archive';
}

export interface ContextRule {
  name: string;
  technology: string;
  content: string;
  priority: number;
  lastUsed: string;
  usageCount: number;
}

export interface RuleInjectionResult {
  contextContent: string;
  rulesApplied: string[];
  totalSize: number;
  technologiesDetected: string[];
}

export const SUPPORTED_TECHNOLOGIES = [
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
] as const;

export type SupportedTechnology = typeof SUPPORTED_TECHNOLOGIES[number];

export const RULE_UPDATE_PRIORITIES = {
  EMERGENCY: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
} as const;

export type RuleUpdatePriority = typeof RULE_UPDATE_PRIORITIES[keyof typeof RULE_UPDATE_PRIORITIES];