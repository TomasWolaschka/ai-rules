/**
 * MCP (Model Context Protocol) related type definitions
 */

export interface RuleGenerationRequest {
  technology: string;
  year: string;
  context?: string;
}

export interface RuleUpdateRequest {
  ruleType: string;
  content: string;
  version: string;
}

export interface ContextInjectionRequest {
  prompt: string;
  technologies?: string[];
}

export interface TrendAnalysisRequest {
  technology?: string;
}

export interface MCPToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPServerCapabilities {
  tools: Record<string, any>;
  resources: Record<string, any>;
  prompts: Record<string, any>;
}

export interface MCPServerConfiguration {
  name: string;
  version: string;
  description?: string;
  capabilities: MCPServerCapabilities;
  requestTimeout?: number;
  maxRequestSize?: number;
}

export enum MCPToolName {
  GENERATE_BEST_PRACTICES = 'generate_best_practices',
  UPDATE_RULE_FILE = 'update_rule_file',
  INJECT_CONTEXT_RULES = 'inject_context_rules',
  ANALYZE_TECHNOLOGY_TRENDS = 'analyze_technology_trends',
}

export type MCPToolHandler<T = any, R = MCPToolResponse> = (args: T) => Promise<R>;