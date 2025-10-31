// Public API - Only expose what users need
// Core functionality
export {
  lintContent,
  createLintReport,
  summarizeLintResults,
  type SEOLintResult,
  type SEOLintRule
} from './core/seo-rules';
export {
  researchKeywords,
  type KeywordResearchResult,
  type ResearchKeywordsOptions
} from './core/keywords-research';

// Generators
export { generateRobots, type RobotsConfig } from './generators/robots-generator';
export { generateSitemap, type SitemapConfig } from './generators/sitemap-generator';

// AI Integration helpers
export {
  createContentAnalysisInstruction,
  createCompetitorInstruction,
  createGapAnalysisInstruction,
  createKeywordResearchInstruction,
  createFixSuggestionInstruction,
  createContentBriefInstruction,
  type LocalAIInstruction
} from './ai/claude-integration';

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
