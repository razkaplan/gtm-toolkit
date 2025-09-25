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
}

// SEO Linting types
export interface SEOLintRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  check: (content: string, frontmatter: any, filename?: string) => SEOLintResult;
}

export interface SEOLintResult {
  passed: boolean;
  message: string;
  suggestion?: string;
  line?: number;
}

export interface SEOLintReport {
  file: string;
  results: Array<SEOLintResult & { rule: string }>;
  score: number;
  summary: {
    errors: number;
    warnings: number;
    passed: number;
  };
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

// Claude integration types
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