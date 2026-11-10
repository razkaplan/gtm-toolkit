/**
 * Programmatic API. Everything the CLI does is a pure function over a loaded
 * spec and a list of content items, so the same checks run in a build script,
 * a test or an agent tool.
 */
export { loadSpec, findRoot, parseSpecFiles, type LoadOptions, type LoadResult } from './spec/load';
export {
  specSchema,
  type Spec,
  type Persona,
  type Topic,
  type Positioning,
  type Messaging,
  type Competitor,
  type Collection,
  type Policy,
  type Severity,
} from './spec/schema';
export { validateSpec, SPEC_RULES } from './spec/validate';
export { loadContent, published, isoDate, type ContentItem, type ContentType } from './content/load';
export { scanMarkdown, findTerm, type ScannedMarkdown } from './content/text';
export { lintContent, checkRuleConfig, resolveRule, getRule, RULES, type LintOptions } from './lint';
export type { Rule, FileRule, ProjectRule } from './lint/types';
export { buildArtifacts, planArtifacts, writeArtifacts, type Artifact, type ArtifactName, type PlannedArtifact } from './build';
export { buildRobots } from './build/robots';
export { buildSitemap, sitemapEntries, type SitemapEntry } from './build/sitemap';
export { buildLlms } from './build/llms';
export { buildContext } from './build/context';
export { buildStructuredData } from './build/schema';
export { AI_CRAWLERS, crawlerDecisions, type AICrawler, type CrawlerPurpose } from './build/crawlers';
export { coverage, type CoverageReport, type CoverageRow, type QuestionCoverage } from './coverage';
export { diffSpecs, impactOf, specAtRef, type Change, type Impact } from './diff';
export { init, type InitOptions, type InitResult } from './init';
export { formatDiagnostics, type Format } from './report/format';
export { countBySeverity, type Diagnostic, type DiagnosticSeverity } from './types';
export { jsonSchemas } from './reference';
export { VERSION } from './version';
