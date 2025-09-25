// Public API - Only expose what users need
// Core functionality
export { lintContent, type SEOLintResult, type SEOLintRule } from './core/seo-rules';
export { researchKeywords, type KeywordResearchResult } from './core/keywords-research';

// Generators
export { generateRobots, type RobotsConfig } from './generators/robots-generator';
export { generateSitemap, type SitemapConfig } from './generators/sitemap-generator';

// AI Integration
export { ClaudeContentOptimizer, type ContentAnalysisResult, type OptimizationSuggestion } from './ai/claude-integration';

// Google Search Console
export { GoogleSearchConsoleClient, type GSCQuery, type GSCResult } from './integrations/google-search-console';

// Essential types only
export type {
  GTMConfig,
  ContentFile,
  AuditResult,
  GenerateOptions,
  AnalyzeOptions
} from './types';

// Version info
export const VERSION = require('../package.json').version;