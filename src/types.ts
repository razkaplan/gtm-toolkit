// Core configuration types
export interface GTMConfig {
  framework: 'nextjs' | 'nuxt' | 'astro' | 'custom';
  analytics: {
    ga4?: {
      measurementId: string;
      enabled: boolean;
    };
    posthog?: {
      apiKey: string;
      host: string;
      enabled: boolean;
    };
    gsc?: {
      credentialsPath?: string;
      siteUrl?: string;
      enabled: boolean;
    };
  };
  seo: {
    siteName: string;
    siteUrl: string;
    defaultTitle: string;
    defaultDescription: string;
    twitterHandle?: string;
    facebookAppId?: string;
  };
  content: {
    blogPath?: string;
    contentPath?: string;
    outputPath?: string;
    extensions?: string[];
  };
  robots: {
    allowAIBots: boolean;
    customRules: string[];
    sitemapUrl: string;
  };
  geo: {
    enabled: boolean;
    optimizeForAI: boolean;
    structuredData: boolean;
  };
  ai?: {
    apiKey?: string;
    model?: string;
  };
}

export interface ContentFile {
  path: string;
  content: string;
  frontmatter: Record<string, any>;
  body: string;
  lastModified: Date;
}

// SEO Linting types
export interface SEOLintRuleResult {
  passed: boolean;
  message: string;
  suggestion?: string;
  line?: number;
}

export interface SEOLintRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  check: (content: string, frontmatter: any, filename?: string) => SEOLintRuleResult;
}

export interface SEOLintResult extends SEOLintRuleResult {
  rule: string;
  name: string;
  severity: 'error' | 'warning' | 'info';
}

export interface SEOLintSummary {
  errors: number;
  warnings: number;
  passed: number;
}

export interface SEOLintReport {
  file: string;
  results: SEOLintResult[];
  score: number;
  summary: SEOLintSummary;
}

export interface AuditResult {
  file: string;
  issues: number;
  score: number;
}

export interface GenerateOptions {
  robots?: boolean;
  sitemap?: boolean;
  meta?: boolean;
  all?: boolean;
}

export interface AnalyzeOptions {
  competitor?: string;
  gaps?: boolean;
  keywords?: string;
  output?: string;
}

// Analytics types
export interface AnalyticsEvent {
  name: string;
  parameters: Record<string, any>;
  value?: number;
}

export interface AnalyticsConfig {
  provider: 'ga4' | 'posthog';
  config: Record<string, any>;
}

// Content types
export interface ContentFrontmatter {
  title: string;
  description: string;
  date: string;
  category?: string;
  tags?: string[];
  slug?: string;
  image?: string;
  canonical?: string;
}

export interface ContentAnalysis {
  wordCount: number;
  readingTime: number;
  keywords: string[];
  headingStructure: Array<{ level: number; text: string }>;
  links: Array<{ url: string; text: string; external: boolean }>;
  images: Array<{ src: string; alt: string; title?: string }>;
}

// AI integration types
export interface CompetitorAnalysis {
  url: string;
  title: string;
  description: string;
  keywords: string[];
  contentTopics: string[];
  technicalSEO: {
    metaTags: Record<string, string>;
    structuredData: any[];
    performance: {
      loadTime: number;
      coreWebVitals: Record<string, number>;
    };
  };
  contentGaps: string[];
  opportunities: string[];
}

export interface ContentGapAnalysis {
  missingTopics: string[];
  competitorTopics: Record<string, string[]>;
  suggestedContent: Array<{
    topic: string;
    title: string;
    outline: string[];
    priority: 'high' | 'medium' | 'low';
  }>;
}

// Framework adapter types
export interface FrameworkAdapter {
  name: string;
  detect: () => boolean;
  install: (config: GTMConfig) => Promise<void>;
  generateFiles: (config: GTMConfig) => Promise<string[]>;
}
