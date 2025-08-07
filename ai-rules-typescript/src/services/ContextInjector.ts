/**
 * Context rule injection service for clean MCP-based rule delivery
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { IContextInjector } from '@/types/services.js';
import { ContextRule, RuleInjectionResult } from '@/types/rules.js';
import config from '@/config/environment.js';
import { createLogger, logPerformance } from '@/utils/logger.js';

const logger = createLogger('ContextInjector');

export class ContextInjector implements IContextInjector {
  private ruleCache = new Map<string, ContextRule>();
  private usageStats = new Map<string, { count: number; lastUsed: string }>();
  private technologyPatterns: Map<string, RegExp[]> = new Map();

  constructor() {
    this.initializeTechnologyPatterns();
    this.loadRulesIntoCache();
    
    logger.info('ContextInjector initialized', {
      supportedTechnologies: config.rules.supportedTechnologies.length,
      ruleBasePath: config.project.ruleBasePath,
    });
  }

  private initializeTechnologyPatterns(): void {
    // Define patterns for technology detection in prompts
    const patterns: Record<string, string[]> = {
      python: [
        'python', 'py', 'pip', 'virtualenv', 'conda', 'pytest', 'django', 'flask',
        'pandas', 'numpy', 'fastapi', '__init__', 'def ', 'import ', 'from '
      ],
      javascript: [
        'javascript', 'js', 'npm', 'node', 'require', 'import', 'export',
        'function', 'const', 'let', 'var', 'async', 'await'
      ],
      typescript: [
        'typescript', 'ts', 'interface', 'type', 'enum', 'generic',
        'tsc', 'tsconfig', 'declare', ': string', ': number', ': boolean'
      ],
      react: [
        'react', 'jsx', 'tsx', 'component', 'props', 'state', 'hook',
        'useState', 'useEffect', 'render', '<div', 'className'
      ],
      java: [
        'java', 'class', 'public', 'private', 'static', 'void',
        'maven', 'gradle', 'spring', 'junit', 'package', 'import java'
      ],
      node: [
        'node', 'nodejs', 'express', 'server', 'middleware', 'app.listen',
        'req', 'res', 'next', 'package.json'
      ],
      git: [
        'git', 'commit', 'branch', 'merge', 'pull', 'push', 'clone',
        'repository', 'repo', 'github', 'gitlab', 'bitbucket'
      ],
      docker: [
        'docker', 'dockerfile', 'container', 'image', 'build', 'run',
        'compose', 'volume', 'port', 'FROM', 'RUN', 'COPY'
      ],
      kubernetes: [
        'kubernetes', 'k8s', 'kubectl', 'pod', 'deployment', 'service',
        'ingress', 'namespace', 'configmap', 'secret'
      ],
      angular: [
        'angular', 'ng', 'component', 'service', 'module', 'directive',
        '@Component', '@Injectable', 'ngOnInit', 'router'
      ],
      vue: [
        'vue', 'vuejs', 'component', 'template', 'script', 'style',
        'v-if', 'v-for', 'v-model', 'mounted', 'computed'
      ],
      go: [
        'go', 'golang', 'func', 'package', 'import', 'struct', 'interface',
        'goroutine', 'channel', 'go mod', 'go.mod'
      ],
      rust: [
        'rust', 'cargo', 'fn', 'struct', 'enum', 'impl', 'trait',
        'pub', 'mut', 'match', 'Result', 'Option'
      ],
      cpp: [
        'cpp', 'c++', 'class', 'struct', 'template', 'namespace',
        'std::', 'iostream', 'vector', 'string', '#include'
      ],
      csharp: [
        'csharp', 'c#', 'class', 'namespace', 'using', 'public', 'private',
        'static', 'void', 'string', 'int', '.NET', 'dotnet'
      ],
    };

    // Convert patterns to RegExp objects
    Object.entries(patterns).forEach(([tech, patternList]) => {
      const regexes = patternList.map(pattern => new RegExp(pattern, 'i'));
      this.technologyPatterns.set(tech, regexes);
    });

    logger.debug('Technology detection patterns initialized', {
      technologies: Object.keys(patterns).length,
      totalPatterns: Object.values(patterns).flat().length,
    });
  }

  async analyzePromptTechnologies(prompt: string): Promise<string[]> {
    logger.debug('Analyzing prompt for technology detection', {
      promptLength: prompt.length,
    });

    const startTime = Date.now();
    const detectedTechnologies: string[] = [];
    const promptLower = prompt.toLowerCase();

    // Score each technology based on pattern matches
    const technologyScores = new Map<string, number>();

    for (const [technology, patterns] of this.technologyPatterns) {
      let score = 0;

      for (const pattern of patterns) {
        const matches = promptLower.match(pattern);
        if (matches) {
          // Weight matches based on specificity and frequency
          score += matches.length * this.calculatePatternWeight(pattern.source);
        }
      }

      if (score > 0) {
        technologyScores.set(technology, score);
      }
    }

    // Sort by score and return top technologies
    const sortedTechnologies = Array.from(technologyScores.entries())
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score >= 2) // Minimum threshold
      .map(([tech]) => tech);

    detectedTechnologies.push(...sortedTechnologies);

    const duration = Date.now() - startTime;
    logPerformance('prompt-analysis', duration, {
      promptLength: prompt.length,
      technologiesDetected: detectedTechnologies.length,
      scores: Object.fromEntries(technologyScores),
    });

    logger.debug('Prompt analysis completed', {
      detectedTechnologies,
      duration,
      scores: Object.fromEntries(technologyScores),
    });

    return detectedTechnologies;
  }

  async generateContextInjection(technologies: string[]): Promise<string> {
    logger.info('Generating context injection', {
      technologies: technologies.length,
      requestedTechs: technologies,
    });

    const startTime = Date.now();

    try {
      // Load relevant rules for all technologies
      const relevantRules = await this.loadRelevantRules(technologies);

      // Build context injection content
      const contextContent = this.buildContextContent(relevantRules, technologies);

      // Record usage statistics
      technologies.forEach(tech => {
        this.recordRuleUsage(`${tech}-rules`, tech);
      });

      const duration = Date.now() - startTime;
      logPerformance('context-injection', duration, {
        technologies: technologies.length,
        rulesLoaded: relevantRules.size,
        contentSize: contextContent.length,
      });

      logger.info('Context injection generated successfully', {
        duration,
        technologies,
        rulesCount: relevantRules.size,
        contentLength: contextContent.length,
      });

      return contextContent;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Context injection generation failed', error as Error, {
        duration,
        technologies,
      });
      throw error;
    }
  }

  async loadRelevantRules(technologies: string[]): Promise<Map<string, string>> {
    logger.debug('Loading relevant rules', { technologies });

    const relevantRules = new Map<string, string>();

    for (const technology of technologies) {
      try {
        // Check cache first
        const cacheKey = `${technology}-rules`;
        if (this.ruleCache.has(cacheKey)) {
          const cachedRule = this.ruleCache.get(cacheKey)!;
          relevantRules.set(technology, cachedRule.content);
          continue;
        }

        // Load rule from filesystem
        const rulePath = this.getRuleFilePath(technology);
        const ruleContent = await this.loadRuleFile(rulePath);

        if (ruleContent) {
          relevantRules.set(technology, ruleContent);
          
          // Update cache
          this.ruleCache.set(cacheKey, {
            name: cacheKey,
            technology,
            content: ruleContent,
            priority: this.calculateRulePriority(technology),
            lastUsed: new Date().toISOString(),
            usageCount: 0,
          });
        }
      } catch (error) {
        logger.warn(`Failed to load rule for ${technology}`, error as Error);
      }
    }

    logger.debug('Rules loaded successfully', {
      requested: technologies.length,
      loaded: relevantRules.size,
      technologies: Array.from(relevantRules.keys()),
    });

    return relevantRules;
  }

  recordRuleUsage(ruleName: string, technology: string): void {
    const key = `${ruleName}-${technology}`;
    const current = this.usageStats.get(key) || { count: 0, lastUsed: new Date().toISOString() };
    
    this.usageStats.set(key, {
      count: current.count + 1,
      lastUsed: new Date().toISOString(),
    });

    // Update cache if exists
    if (this.ruleCache.has(ruleName)) {
      const rule = this.ruleCache.get(ruleName)!;
      rule.usageCount = current.count + 1;
      rule.lastUsed = new Date().toISOString();
    }

    logger.debug('Rule usage recorded', {
      ruleName,
      technology,
      totalUsage: current.count + 1,
    });
  }

  private calculatePatternWeight(pattern: string): number {
    // Give higher weight to more specific patterns
    if (pattern.length > 10) return 3;
    if (pattern.length > 5) return 2;
    return 1;
  }

  private buildContextContent(rules: Map<string, string>, technologies: string[]): string {
    let content = '';

    // Header
    content += '# Development Context Rules\n\n';
    content += `*Automatically injected for technologies: ${technologies.join(', ')}*\n\n`;

    // Add rules for each technology
    for (const [technology, ruleContent] of rules) {
      content += `## ${technology.toUpperCase()} Best Practices\n\n`;
      content += ruleContent;
      content += '\n\n---\n\n';
    }

    // Footer with metadata
    content += `*Context injected on ${new Date().toISOString()}*\n`;
    content += `*Technologies detected: ${technologies.length}*\n`;
    content += `*Rules applied: ${rules.size}*\n`;

    return content;
  }

  private getRuleFilePath(technology: string): string {
    // Try different possible rule file names and extensions
    const possibleFiles = [
      `${technology}-best-practices.md`,
      `${technology}-rules.md`,
      `${technology}.md`,
      `best-practices-${technology}.md`,
    ];

    for (const filename of possibleFiles) {
      const fullPath = join(config.project.ruleBasePath, filename);
      return fullPath; // Return first match for now
    }

    return join(config.project.ruleBasePath, `${technology}.md`);
  }

  private async loadRuleFile(filePath: string): Promise<string | null> {
    try {
      const stats = await stat(filePath);
      if (stats.isFile() && extname(filePath) === '.md') {
        const content = await readFile(filePath, 'utf-8');
        return content.trim();
      }
    } catch (error) {
      // File doesn't exist or can't be read
      logger.debug(`Rule file not found or unreadable: ${filePath}`);
    }

    return null;
  }

  private async loadRulesIntoCache(): Promise<void> {
    logger.info('Loading rules into cache');

    try {
      const ruleFiles = await readdir(config.project.ruleBasePath);
      let loaded = 0;

      for (const filename of ruleFiles) {
        if (extname(filename) === '.md') {
          const filePath = join(config.project.ruleBasePath, filename);
          const content = await this.loadRuleFile(filePath);
          
          if (content) {
            const technology = this.extractTechnologyFromFilename(filename);
            const cacheKey = `${technology}-rules`;
            
            this.ruleCache.set(cacheKey, {
              name: cacheKey,
              technology,
              content,
              priority: this.calculateRulePriority(technology),
              lastUsed: new Date().toISOString(),
              usageCount: 0,
            });
            
            loaded++;
          }
        }
      }

      logger.info('Rules loaded into cache', {
        totalFiles: ruleFiles.length,
        rulesLoaded: loaded,
        cacheSize: this.ruleCache.size,
      });
    } catch (error) {
      logger.error('Failed to load rules into cache', error as Error, {
        ruleBasePath: config.project.ruleBasePath,
      });
    }
  }

  private extractTechnologyFromFilename(filename: string): string {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.md$/, '');
    
    // Try to match with supported technologies
    for (const tech of config.rules.supportedTechnologies) {
      if (nameWithoutExt.toLowerCase().includes(tech.toLowerCase())) {
        return tech;
      }
    }

    // Fallback: use filename without extension
    return nameWithoutExt;
  }

  private calculateRulePriority(technology: string): number {
    // Assign priority based on technology popularity and usage
    const priorityMap: Record<string, number> = {
      javascript: 10,
      typescript: 10,
      python: 10,
      react: 9,
      node: 9,
      java: 8,
      git: 8,
      docker: 7,
      go: 6,
      rust: 6,
      cpp: 5,
      csharp: 5,
      angular: 4,
      vue: 4,
      kubernetes: 3,
    };

    return priorityMap[technology] || 1;
  }

  // Public methods for cache management
  clearCache(): void {
    this.ruleCache.clear();
    this.usageStats.clear();
    logger.info('Context injector cache cleared');
  }

  getCacheStats(): {
    rulesInCache: number;
    usageStats: Record<string, { count: number; lastUsed: string }>;
    mostUsedRules: Array<{ rule: string; count: number }>;
  } {
    const usageStatsObj = Object.fromEntries(this.usageStats);
    const mostUsedRules = Array.from(this.usageStats.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([rule, stats]) => ({ rule, count: stats.count }));

    return {
      rulesInCache: this.ruleCache.size,
      usageStats: usageStatsObj,
      mostUsedRules,
    };
  }

  async refreshCache(): Promise<void> {
    logger.info('Refreshing rule cache');
    this.ruleCache.clear();
    await this.loadRulesIntoCache();
  }

  getAvailableTechnologies(): string[] {
    return Array.from(this.ruleCache.values()).map(rule => rule.technology);
  }
}