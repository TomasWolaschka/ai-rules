/**
 * AI-powered rule generation service
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { IRuleGenerator, ResearchData, RuleSynthesisData, WebSearchResult } from '@/types/services.js';
import { RuleGenerationConfig, TrendData } from '@/types/rules.js';
import config from '@/config/environment.js';
import { createLogger, logPerformance, logApiRequest } from '@/utils/logger.js';

const logger = createLogger('RuleGenerator');

export class RuleGenerator implements IRuleGenerator {
  private browser: Browser | null = null;
  private searchProviders: SearchProvider[] = [];

  constructor() {
    this.initializeSearchProviders();
    logger.info('RuleGenerator initialized', {
      searchProviders: this.searchProviders.length,
      generationTimeout: config.rules.generationTimeoutMs,
    });
  }

  private initializeSearchProviders(): void {
    // Brave Search API
    if (config.api.braveSearch.apiKey) {
      this.searchProviders.push({
        name: 'brave',
        search: this.searchBrave.bind(this),
        priority: 1,
      });
    }

    // GitHub API for code examples and trends
    if (config.api.github.token) {
      this.searchProviders.push({
        name: 'github',
        search: this.searchGitHub.bind(this),
        priority: 2,
      });
    }

    // Stack Overflow API
    if (config.api.stackoverflow.apiKey) {
      this.searchProviders.push({
        name: 'stackoverflow',
        search: this.searchStackOverflow.bind(this),
        priority: 3,
      });
    }

    // Web scraping fallback
    this.searchProviders.push({
      name: 'web-scraping',
      search: this.searchWeb.bind(this),
      priority: 4,
    });

    logger.debug('Search providers initialized', {
      providers: this.searchProviders.map(p => ({ name: p.name, priority: p.priority })),
    });
  }

  async generateRules(ruleConfig: RuleGenerationConfig): Promise<string> {
    const startTime = Date.now();
    logger.info(`Starting rule generation for ${ruleConfig.technology} ${ruleConfig.year}`);

    try {
      // 1. Conduct comprehensive research
      const researchData = await this.conductResearch(ruleConfig.technology, ruleConfig.year);

      // 2. Prepare synthesis data
      const synthesisData: RuleSynthesisData = {
        technology: ruleConfig.technology,
        year: ruleConfig.year,
        researchData,
        communityInsights: await this.gatherCommunityInsights(ruleConfig.technology),
        trends: ruleConfig.trends,
        additionalContext: ruleConfig.additionalContext,
      };

      // 3. Synthesize comprehensive rules
      const rules = await this.synthesizeRules(synthesisData);

      const duration = Date.now() - startTime;
      logPerformance('rule-generation', duration, {
        technology: ruleConfig.technology,
        year: ruleConfig.year,
        contentLength: rules.length,
      });

      logger.info(`Rule generation completed successfully for ${ruleConfig.technology}`, {
        duration,
        rulesLength: rules.length,
        linesGenerated: rules.split('\n').length,
      });

      return rules;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Rule generation failed for ${ruleConfig.technology}`, error as Error, {
        duration,
        year: ruleConfig.year,
      });
      throw error;
    }
  }

  async conductResearch(technology: string, year: number): Promise<ResearchData> {
    logger.info(`Conducting research for ${technology} ${year}`);
    const startTime = Date.now();

    const researchQueries = this.generateResearchQueries(technology, year);
    const results: ResearchData = {
      bestPractices: [],
      styleGuides: [],
      security: [],
      performance: [],
    };

    try {
      // Parallel research across all categories
      const [bestPractices, styleGuides, security, performance] = await Promise.all([
        this.searchMultipleProviders(researchQueries.bestPractices),
        this.searchMultipleProviders(researchQueries.styleGuides),
        this.searchMultipleProviders(researchQueries.security),
        this.searchMultipleProviders(researchQueries.performance),
      ]);

      results.bestPractices = bestPractices;
      results.styleGuides = styleGuides;
      results.security = security;
      results.performance = performance;

      const duration = Date.now() - startTime;
      logPerformance('research-conduct', duration, {
        technology,
        year,
        totalResults: Object.values(results).flat().length,
      });

      logger.info(`Research completed for ${technology}`, {
        bestPractices: results.bestPractices.length,
        styleGuides: results.styleGuides.length,
        security: results.security.length,
        performance: results.performance.length,
        duration,
      });

      return results;
    } catch (error) {
      logger.error(`Research failed for ${technology}`, error as Error, { year });
      throw error;
    }
  }

  async synthesizeRules(data: RuleSynthesisData): Promise<string> {
    logger.info(`Synthesizing rules for ${data.technology} ${data.year}`);
    const startTime = Date.now();

    try {
      // Analyze and categorize research data
      const categories = this.categorizeResearchData(data.researchData);
      
      // Build comprehensive rule document
      const ruleDocument = this.buildRuleDocument({
        technology: data.technology,
        year: data.year,
        categories,
        trends: data.trends,
        communityInsights: data.communityInsights,
        additionalContext: data.additionalContext,
      });

      const duration = Date.now() - startTime;
      logPerformance('rule-synthesis', duration, {
        technology: data.technology,
        year: data.year,
        documentLength: ruleDocument.length,
      });

      return ruleDocument;
    } catch (error) {
      logger.error(`Rule synthesis failed for ${data.technology}`, error as Error);
      throw error;
    }
  }

  private generateResearchQueries(technology: string, year: number): ResearchQueries {
    return {
      bestPractices: [
        `${technology} best practices ${year}`,
        `${technology} coding standards ${year}`,
        `modern ${technology} development guidelines`,
        `${technology} clean code principles`,
      ],
      styleGuides: [
        `${technology} style guide ${year}`,
        `${technology} coding conventions`,
        `${technology} code formatting standards`,
        `${technology} linting rules`,
      ],
      security: [
        `${technology} security best practices ${year}`,
        `${technology} security vulnerabilities`,
        `secure ${technology} development`,
        `${technology} security guidelines`,
      ],
      performance: [
        `${technology} performance optimization ${year}`,
        `${technology} performance best practices`,
        `fast ${technology} development`,
        `${technology} benchmarks ${year}`,
      ],
    };
  }

  private async searchMultipleProviders(queries: string[]): Promise<WebSearchResult[]> {
    const allResults: WebSearchResult[] = [];

    for (const query of queries) {
      for (const provider of this.searchProviders) {
        try {
          const results = await provider.search(query);
          allResults.push(...results);
        } catch (error) {
          logger.warn(`Search failed for provider ${provider.name}`, error as Error, { query });
        }
      }
    }

    // Deduplicate and rank results
    return this.deduplicateResults(allResults)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, config.webScraping.maxPagesPerSearch);
  }

  private async searchBrave(query: string): Promise<WebSearchResult[]> {
    if (!config.api.braveSearch.apiKey) return [];

    const startTime = Date.now();
    try {
      const response = await fetch(
        `${config.api.braveSearch.baseUrl}/web/search?q=${encodeURIComponent(query)}&count=10`,
        {
          headers: {
            'X-Subscription-Token': config.api.braveSearch.apiKey,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(config.api.braveSearch.timeout),
        }
      );

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status}`);
      }

      const data = await response.json();
      const results: WebSearchResult[] = data.web?.results?.map((result: any) => ({
        title: result.title,
        url: result.url,
        snippet: result.description,
        source: 'brave',
        relevanceScore: this.calculateRelevanceScore(result, query),
      })) || [];

      logApiRequest('GET', config.api.braveSearch.baseUrl, response.status, Date.now() - startTime);
      return results;
    } catch (error) {
      logApiRequest('GET', config.api.braveSearch.baseUrl, undefined, Date.now() - startTime, error as Error);
      logger.error('Brave Search API error', error as Error, { query });
      return [];
    }
  }

  private async searchGitHub(query: string): Promise<WebSearchResult[]> {
    if (!config.api.github.token) return [];

    const startTime = Date.now();
    try {
      const response = await fetch(
        `${config.api.github.baseUrl}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=10`,
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
      const results: WebSearchResult[] = data.items?.map((repo: any) => ({
        title: repo.full_name,
        url: repo.html_url,
        snippet: repo.description || 'No description available',
        source: 'github',
        relevanceScore: this.calculateGitHubRelevanceScore(repo, query),
      })) || [];

      logApiRequest('GET', config.api.github.baseUrl, response.status, Date.now() - startTime);
      return results;
    } catch (error) {
      logApiRequest('GET', config.api.github.baseUrl, undefined, Date.now() - startTime, error as Error);
      logger.error('GitHub API error', error as Error, { query });
      return [];
    }
  }

  private async searchStackOverflow(query: string): Promise<WebSearchResult[]> {
    if (!config.api.stackoverflow.apiKey) return [];

    const startTime = Date.now();
    try {
      const response = await fetch(
        `${config.api.stackoverflow.baseUrl}/search?order=desc&sort=relevance&intitle=${encodeURIComponent(query)}&site=stackoverflow&key=${config.api.stackoverflow.apiKey}`,
        {
          signal: AbortSignal.timeout(config.api.stackoverflow.timeout),
        }
      );

      if (!response.ok) {
        throw new Error(`Stack Overflow API error: ${response.status}`);
      }

      const data = await response.json();
      const results: WebSearchResult[] = data.items?.map((item: any) => ({
        title: item.title,
        url: item.link,
        snippet: item.body_markdown ? item.body_markdown.substring(0, 200) : 'No snippet available',
        source: 'stackoverflow',
        relevanceScore: this.calculateStackOverflowRelevanceScore(item, query),
      })) || [];

      logApiRequest('GET', config.api.stackoverflow.baseUrl, response.status, Date.now() - startTime);
      return results;
    } catch (error) {
      logApiRequest('GET', config.api.stackoverflow.baseUrl, undefined, Date.now() - startTime, error as Error);
      logger.error('Stack Overflow API error', error as Error, { query });
      return [];
    }
  }

  private async searchWeb(query: string): Promise<WebSearchResult[]> {
    logger.debug(`Performing web scraping search for: ${query}`);

    if (!this.browser) {
      this.browser = await puppeteer.launch(config.webScraping.puppeteerOptions);
    }

    const page = await this.browser.newPage();
    await page.setUserAgent(config.webScraping.userAgent);

    try {
      // Use DuckDuckGo as fallback search engine
      await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
        waitUntil: 'networkidle0',
        timeout: config.webScraping.timeoutMs,
      });

      await page.waitForSelector('[data-testid="result"]', { timeout: 5000 });

      const results = await page.evaluate(() => {
        const resultElements = document.querySelectorAll('[data-testid="result"]');
        const results: any[] = [];

        resultElements.forEach((element, index) => {
          if (index >= 10) return; // Limit to 10 results

          const titleElement = element.querySelector('h2 a');
          const snippetElement = element.querySelector('[data-testid="result-snippet"]');

          if (titleElement && snippetElement) {
            results.push({
              title: titleElement.textContent?.trim() || '',
              url: titleElement.getAttribute('href') || '',
              snippet: snippetElement.textContent?.trim() || '',
              source: 'web-scraping',
            });
          }
        });

        return results;
      });

      return results.map((result: any) => ({
        ...result,
        relevanceScore: this.calculateRelevanceScore(result, query),
      }));
    } catch (error) {
      logger.error('Web scraping search failed', error as Error, { query });
      return [];
    } finally {
      await page.close();
    }
  }

  private calculateRelevanceScore(result: any, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    const titleLower = result.title?.toLowerCase() || '';
    const snippetLower = result.snippet?.toLowerCase() || '';

    // Title relevance (weighted heavily)
    if (titleLower.includes(queryLower)) score += 10;
    const titleWords = queryLower.split(' ');
    titleWords.forEach(word => {
      if (titleLower.includes(word)) score += 3;
    });

    // Snippet relevance
    if (snippetLower.includes(queryLower)) score += 5;
    titleWords.forEach(word => {
      if (snippetLower.includes(word)) score += 1;
    });

    return Math.min(score, 20); // Cap at 20
  }

  private calculateGitHubRelevanceScore(repo: any, query: string): number {
    let score = this.calculateRelevanceScore(repo, query);
    
    // Bonus for popular repositories
    if (repo.stargazers_count > 1000) score += 5;
    if (repo.stargazers_count > 10000) score += 5;
    
    // Bonus for recent updates
    const lastUpdate = new Date(repo.updated_at);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) score += 3;
    
    return score;
  }

  private calculateStackOverflowRelevanceScore(item: any, query: string): number {
    let score = this.calculateRelevanceScore(item, query);
    
    // Bonus for high-score questions
    if (item.score > 10) score += 3;
    if (item.score > 100) score += 5;
    
    // Bonus for answered questions
    if (item.is_answered) score += 3;
    if (item.accepted_answer_id) score += 2;
    
    return score;
  }

  private deduplicateResults(results: WebSearchResult[]): WebSearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = result.url || result.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private categorizeResearchData(data: ResearchData): CategorizedData {
    return {
      codeQuality: [...data.bestPractices, ...data.styleGuides],
      security: data.security,
      performance: data.performance,
      modernFeatures: data.bestPractices.filter(r => 
        r.title.includes('modern') || r.title.includes('new') || r.title.includes('latest')
      ),
    };
  }

  private buildRuleDocument(params: RuleDocumentParams): string {
    const { technology, year, categories, trends, communityInsights, additionalContext } = params;
    
    let document = '';

    // Header
    document += `# ${technology.toUpperCase()} Development Best Practices (${year})\n\n`;
    document += `*Generated on ${new Date().toISOString().split('T')[0]} by AI Rules Management System*\n\n`;

    // Executive Summary
    document += this.buildExecutiveSummary(technology, trends);

    // Code Quality Section
    document += this.buildCodeQualitySection(categories.codeQuality);

    // Security Section
    document += this.buildSecuritySection(categories.security);

    // Performance Section
    document += this.buildPerformanceSection(categories.performance);

    // Modern Features Section
    document += this.buildModernFeaturesSection(categories.modernFeatures);

    // Community Insights Section
    document += this.buildCommunityInsightsSection(communityInsights);

    // References Section
    document += this.buildReferencesSection([
      ...categories.codeQuality,
      ...categories.security,
      ...categories.performance,
      ...categories.modernFeatures,
    ]);

    // Additional Context
    if (additionalContext) {
      document += `\n## Additional Context\n\n${additionalContext}\n\n`;
    }

    // Metadata Footer
    document += this.buildMetadataFooter(technology, year, trends);

    return document;
  }

  private buildExecutiveSummary(technology: string, trends: TrendData): string {
    return `## Executive Summary

This document provides comprehensive ${technology} development best practices for ${new Date().getFullYear()}, 
based on current industry trends, community feedback, and emerging patterns.

**Key Trends:**
- GitHub repository activity: ${trends.githubTrends.totalRepos.toLocaleString()} active repositories
- Stack Overflow discussions: ${trends.stackOverflowTrends.totalQuestions.toLocaleString()} recent questions
- Update priority: ${(trends.updatePriority * 100).toFixed(0)}% (${trends.updatePriority > 0.7 ? 'High' : trends.updatePriority > 0.4 ? 'Medium' : 'Low'})

`;
  }

  private buildCodeQualitySection(results: WebSearchResult[]): string {
    let section = '## Code Quality and Standards\n\n';
    
    section += '### Best Practices\n\n';
    const bestPractices = results.filter(r => 
      r.title.toLowerCase().includes('best practice') || 
      r.title.toLowerCase().includes('standard')
    ).slice(0, 5);

    bestPractices.forEach((result, index) => {
      section += `${index + 1}. **${result.title}**\n`;
      section += `   ${result.snippet}\n`;
      section += `   [Source: ${result.source}](${result.url})\n\n`;
    });

    return section;
  }

  private buildSecuritySection(results: WebSearchResult[]): string {
    let section = '## Security Guidelines\n\n';
    
    section += '### Security Best Practices\n\n';
    const securityPractices = results.slice(0, 5);

    securityPractices.forEach((result, index) => {
      section += `${index + 1}. **${result.title}**\n`;
      section += `   ${result.snippet}\n`;
      section += `   [Source: ${result.source}](${result.url})\n\n`;
    });

    return section;
  }

  private buildPerformanceSection(results: WebSearchResult[]): string {
    let section = '## Performance Optimization\n\n';
    
    section += '### Performance Guidelines\n\n';
    const performanceGuidelines = results.slice(0, 5);

    performanceGuidelines.forEach((result, index) => {
      section += `${index + 1}. **${result.title}**\n`;
      section += `   ${result.snippet}\n`;
      section += `   [Source: ${result.source}](${result.url})\n\n`;
    });

    return section;
  }

  private buildModernFeaturesSection(results: WebSearchResult[]): string {
    let section = '## Modern Development Features\n\n';
    
    if (results.length === 0) {
      section += '*No specific modern feature information found during research.*\n\n';
      return section;
    }

    section += '### Latest Features and Patterns\n\n';
    results.slice(0, 3).forEach((result, index) => {
      section += `${index + 1}. **${result.title}**\n`;
      section += `   ${result.snippet}\n`;
      section += `   [Source: ${result.source}](${result.url})\n\n`;
    });

    return section;
  }

  private buildCommunityInsightsSection(insights: any): string {
    let section = '## Community Insights\n\n';
    
    if (insights.popularRepos?.length > 0) {
      section += '### Popular Repositories\n\n';
      insights.popularRepos.slice(0, 5).forEach((repo: any, index: number) => {
        section += `${index + 1}. [${repo.name}](${repo.url}) - ${repo.description}\n`;
      });
      section += '\n';
    }

    if (insights.discussions?.length > 0) {
      section += '### Recent Discussions\n\n';
      insights.discussions.slice(0, 3).forEach((discussion: any, index: number) => {
        section += `${index + 1}. [${discussion.title}](${discussion.url}) (${discussion.platform})\n`;
      });
      section += '\n';
    }

    return section;
  }

  private buildReferencesSection(allResults: WebSearchResult[]): string {
    let section = '## References\n\n';
    
    const uniqueUrls = new Set();
    const references = allResults
      .filter(result => {
        if (uniqueUrls.has(result.url)) return false;
        uniqueUrls.add(result.url);
        return true;
      })
      .slice(0, 20);

    references.forEach((result, index) => {
      section += `${index + 1}. [${result.title}](${result.url}) (${result.source})\n`;
    });

    section += '\n';
    return section;
  }

  private buildMetadataFooter(technology: string, year: number, trends: TrendData): string {
    return `---

**Metadata:**
- Technology: ${technology}
- Target Year: ${year}
- Generated: ${new Date().toISOString()}
- Last Trend Analysis: ${trends.lastAnalyzed}
- Update Priority: ${(trends.updatePriority * 100).toFixed(1)}%
- AI Rules Management System v${config.mcp.version}

*This document is automatically generated and should be reviewed by experienced developers.*
`;
  }

  private async gatherCommunityInsights(technology: string): Promise<any> {
    // Simplified community insights gathering
    // In a full implementation, this would gather more comprehensive data
    return {
      popularRepos: [],
      totalRepos: 0,
      discussions: [],
      influencers: [],
    };
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    logger.info('RuleGenerator cleanup completed');
  }
}

interface SearchProvider {
  name: string;
  search: (query: string) => Promise<WebSearchResult[]>;
  priority: number;
}

interface ResearchQueries {
  bestPractices: string[];
  styleGuides: string[];
  security: string[];
  performance: string[];
}

interface CategorizedData {
  codeQuality: WebSearchResult[];
  security: WebSearchResult[];
  performance: WebSearchResult[];
  modernFeatures: WebSearchResult[];
}

interface RuleDocumentParams {
  technology: string;
  year: number;
  categories: CategorizedData;
  trends: TrendData;
  communityInsights: any;
  additionalContext?: string;
}