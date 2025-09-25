# GTM Toolkit Public API

This document describes the public API for GTM Toolkit. Only use the functions and types documented here - internal implementation details are subject to change.

## Installation

```bash
npm install gtm-toolkit
```

## Core Functions

### SEO Linting

```typescript
import { lintContent, SEOLintResult, SEOLintRule } from 'gtm-toolkit';

const content = '---\ntitle: "My Post"\n---\n\n# Content here';
const results: SEOLintResult[] = await lintContent(content, 'blog-post.md');
```

### Keyword Research

```typescript
import { researchKeywords, KeywordResearchResult } from 'gtm-toolkit';

const keywords = await researchKeywords({
  seedKeywords: ['seo', 'marketing'],
  siteUrl: 'https://example.com'
});
```

### File Generation

```typescript
import { generateRobots, generateSitemap } from 'gtm-toolkit';

// Generate robots.txt
const robotsContent = await generateRobots({
  siteUrl: 'https://example.com',
  allowAI: true,
  customRules: ['Disallow: /admin/']
});

// Generate sitemap.xml
const sitemapContent = await generateSitemap({
  baseUrl: 'https://example.com',
  contentDir: './content/blog',
  priority: { blog: 0.8, pages: 0.6 }
});
```

### Claude AI Integration

```typescript
import { ClaudeContentOptimizer, ContentAnalysisResult } from 'gtm-toolkit';

const optimizer = new ClaudeContentOptimizer({
  apiKey: process.env.CLAUDE_API_KEY
});

const analysis: ContentAnalysisResult = await optimizer.analyzeContent(
  'Your content here',
  { targetKeywords: ['seo', 'content optimization'] }
);
```

### Google Search Console

```typescript
import { GoogleSearchConsoleClient, GSCResult } from 'gtm-toolkit';

const gsc = new GoogleSearchConsoleClient({
  serviceAccountKey: './credentials.json'
});

const data: GSCResult = await gsc.getSearchAnalytics({
  siteUrl: 'https://example.com',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

## Types

```typescript
import type {
  GTMConfig,
  ContentFile,
  AuditResult,
  GenerateOptions,
  AnalyzeOptions,
  OptimizationSuggestion
} from 'gtm-toolkit';
```

## Version

```typescript
import { VERSION } from 'gtm-toolkit';
console.log(`GTM Toolkit v${VERSION}`);
```

## CLI Usage

The CLI is the primary interface for most users:

```bash
# Initialize project
gtm-toolkit init

# Lint content
gtm-toolkit lint content/

# Generate SEO files
gtm-toolkit generate --all

# AI analysis
gtm-toolkit analyze --ai content/blog/
```

## Configuration

Create a `gtm-toolkit.config.js` file:

```javascript
module.exports = {
  content: {
    directory: 'content/blog',
    extensions: ['.md', '.mdx']
  },
  seo: {
    rules: {
      enabled: 'all'
    }
  },
  ai: {
    provider: 'claude',
    model: 'claude-3-sonnet-20240229'
  }
};
```

## Support

- 📖 [Full Documentation](https://gtmascode.dev/docs)
- 🐛 [Report Issues](https://github.com/razkaplan/gtm-toolkit/issues)
- 💬 [Discussions](https://github.com/razkaplan/gtm-toolkit/discussions)

---

**Note:** This library exposes only the essential public API. Internal modules, utilities, and implementation details are not exported and should not be relied upon. Always use the documented API above.