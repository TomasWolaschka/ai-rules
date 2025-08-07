/**
 * MCP Server implementation for AI Rules Management
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import {
  MCPToolName,
  RuleGenerationRequest,
  RuleUpdateRequest,
  ContextInjectionRequest,
  TrendAnalysisRequest,
  MCPToolResponse,
} from '@/types/mcp.js';

import { RuleGenerator } from '@/services/RuleGenerator.js';
import { TrendAnalyzer } from '@/services/TrendAnalyzer.js';
import { ContextInjector } from '@/services/ContextInjector.js';
import { RuleVersionManager } from '@/services/RuleVersionManager.js';

import config from '@/config/environment.js';
import { createLogger } from '@/utils/logger.js';

const logger = createLogger('MCPServer');

export class AIRulesManagementServer {
  private server: Server;
  private ruleGenerator: RuleGenerator;
  private trendAnalyzer: TrendAnalyzer;
  private contextInjector: ContextInjector;
  private versionManager: RuleVersionManager;

  constructor() {
    this.server = new Server(
      {
        name: config.mcp.name,
        version: config.mcp.version,
        description: config.mcp.description,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    // Initialize services
    this.ruleGenerator = new RuleGenerator();
    this.trendAnalyzer = new TrendAnalyzer();
    this.contextInjector = new ContextInjector();
    this.versionManager = new RuleVersionManager();

    this.setupRequestHandlers();
    
    logger.info('AI Rules Management MCP Server initialized', {
      version: config.mcp.version,
      timeout: config.mcp.requestTimeout,
    });
  }

  private setupRequestHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: MCPToolName.GENERATE_BEST_PRACTICES,
            description: 'Generate updated best practices via AI research and analysis',
            inputSchema: {
              type: 'object',
              properties: {
                technology: {
                  type: 'string',
                  description: 'Programming language or framework (e.g., python, react, java)',
                  enum: config.rules.supportedTechnologies,
                },
                year: {
                  type: 'string',
                  description: 'Target year for best practices (e.g., 2025)',
                  pattern: '^\\d{4}$',
                },
                context: {
                  type: 'string',
                  description: 'Additional context for generation (optional)',
                },
              },
              required: ['technology', 'year'],
            },
          },
          {
            name: MCPToolName.UPDATE_RULE_FILE,
            description: 'Update rule file with new content and archive old version',
            inputSchema: {
              type: 'object',
              properties: {
                ruleType: {
                  type: 'string',
                  description: 'Type of rule to update (e.g., python-best-practices)',
                },
                content: {
                  type: 'string',
                  description: 'New rule content in Markdown format',
                },
                version: {
                  type: 'string',
                  description: 'Version identifier (e.g., 2025-01)',
                  pattern: '^\\d{4}-\\d{2}$',
                },
              },
              required: ['ruleType', 'content', 'version'],
            },
          },
          {
            name: MCPToolName.INJECT_CONTEXT_RULES,
            description: 'Inject relevant rules into context based on prompt analysis',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'User prompt to analyze for technology patterns',
                },
                technologies: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: config.rules.supportedTechnologies,
                  },
                  description: 'Technologies to prioritize (optional)',
                },
              },
              required: ['prompt'],
            },
          },
          {
            name: MCPToolName.ANALYZE_TECHNOLOGY_TRENDS,
            description: 'Analyze current technology trends for rule updates',
            inputSchema: {
              type: 'object',
              properties: {
                technology: {
                  type: 'string',
                  description: 'Specific technology to analyze (optional, analyzes all if not provided)',
                  enum: config.rules.supportedTechnologies,
                },
              },
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      try {
        logger.info(`MCP tool called: ${name}`, { args });

        switch (name) {
          case MCPToolName.GENERATE_BEST_PRACTICES:
            return await this.handleGenerateBestPractices(args as RuleGenerationRequest);

          case MCPToolName.UPDATE_RULE_FILE:
            return await this.handleUpdateRuleFile(args as RuleUpdateRequest);

          case MCPToolName.INJECT_CONTEXT_RULES:
            return await this.handleInjectContextRules(args as ContextInjectionRequest);

          case MCPToolName.ANALYZE_TECHNOLOGY_TRENDS:
            return await this.handleAnalyzeTrends(args as TrendAnalysisRequest);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`MCP tool error: ${name}`, error as Error, { args });

        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        } as MCPToolResponse;
      }
    });
  }

  private async handleGenerateBestPractices(
    args: RuleGenerationRequest
  ): Promise<MCPToolResponse> {
    const { technology, year, context = '' } = args;

    logger.info(`Generating best practices for ${technology} ${year}`, { context });

    // Validate technology
    if (!config.rules.supportedTechnologies.includes(technology)) {
      throw new Error(`Unsupported technology: ${technology}`);
    }

    // Validate year
    const yearNum = parseInt(year);
    const currentYear = new Date().getFullYear();
    if (yearNum < currentYear - 1 || yearNum > currentYear + 5) {
      throw new Error(`Invalid year: ${year}. Must be between ${currentYear - 1} and ${currentYear + 5}`);
    }

    try {
      // Analyze current trends for the technology
      const trends = await this.trendAnalyzer.analyzeTechnology(technology);

      // Generate comprehensive best practices
      const bestPractices = await this.ruleGenerator.generateRules({
        technology,
        year: yearNum,
        trends,
        additionalContext: context,
        includeExamples: true,
        includeReferences: true,
      });

      logger.info(`Successfully generated best practices for ${technology}`, {
        contentLength: bestPractices.length,
        lines: bestPractices.split('\n').length,
      });

      return {
        content: [
          {
            type: 'text',
            text: bestPractices,
          },
        ],
      };
    } catch (error) {
      logger.error(`Failed to generate best practices for ${technology}`, error as Error);
      throw error;
    }
  }

  private async handleUpdateRuleFile(args: RuleUpdateRequest): Promise<MCPToolResponse> {
    const { ruleType, content, version } = args;

    logger.info(`Updating rule file: ${ruleType} to version ${version}`);

    try {
      // Archive current rule
      await this.versionManager.archiveCurrentRule(ruleType, version);

      // Deploy new rule
      await this.versionManager.deployNewRule(ruleType, content, version);

      const message = `Successfully updated ${ruleType} to version ${version}`;
      logger.info(message, {
        ruleType,
        version,
        contentLength: content.length,
      });

      return {
        content: [
          {
            type: 'text',
            text: message,
          },
        ],
      };
    } catch (error) {
      const errorMessage = `Failed to update rule: ${error instanceof Error ? error.message : 'Unknown error'}`;
      logger.error(errorMessage, error as Error, { ruleType, version });
      throw new Error(errorMessage);
    }
  }

  private async handleInjectContextRules(
    args: ContextInjectionRequest
  ): Promise<MCPToolResponse> {
    const { prompt, technologies = [] } = args;

    logger.info('Processing context rule injection', {
      promptLength: prompt.length,
      specifiedTechnologies: technologies,
    });

    try {
      // Analyze prompt for technology detection
      const detectedTechs = await this.contextInjector.analyzePromptTechnologies(prompt);

      // Combine detected and specified technologies
      const allTechs = [...new Set([...detectedTechs, ...technologies])];

      // Load and format relevant rules
      const contextContent = await this.contextInjector.generateContextInjection(allTechs);

      logger.info('Context rules injected successfully', {
        detectedTechnologies: detectedTechs,
        totalTechnologies: allTechs,
        contextLength: contextContent.length,
      });

      return {
        content: [
          {
            type: 'text',
            text: contextContent,
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to inject context rules', error as Error, { prompt: prompt.substring(0, 100) });
      throw error;
    }
  }

  private async handleAnalyzeTrends(args: TrendAnalysisRequest): Promise<MCPToolResponse> {
    const { technology } = args;

    logger.info(`Analyzing technology trends`, { technology });

    try {
      const trends = technology
        ? await this.trendAnalyzer.analyzeTechnology(technology)
        : await this.trendAnalyzer.analyzeAllTechnologies();

      const trendsJson = JSON.stringify(trends, null, 2);

      logger.info('Technology trends analyzed successfully', {
        technology,
        trendsSize: trendsJson.length,
        technologiesAnalyzed: technology ? 1 : Object.keys(trends).length,
      });

      return {
        content: [
          {
            type: 'text',
            text: trendsJson,
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to analyze technology trends', error as Error, { technology });
      throw error;
    }
  }

  async start(): Promise<void> {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('AI Rules Management MCP server started successfully', {
        transport: 'stdio',
        tools: Object.values(MCPToolName).length,
      });

      // Log available tools for debugging
      logger.debug('Available MCP tools', {
        tools: Object.values(MCPToolName),
      });

    } catch (error) {
      logger.error('Failed to start MCP server', error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      // Perform cleanup if needed
      logger.info('Shutting down AI Rules Management MCP server');
    } catch (error) {
      logger.error('Error during MCP server shutdown', error as Error);
    }
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new AIRulesManagementServer();
  
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    await server.stop();
    process.exit(0);
  });

  server.start().catch(error => {
    logger.error('Failed to start server', error);
    process.exit(1);
  });
}

export { AIRulesManagementServer };