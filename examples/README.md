# GTM Toolkit Examples

This directory contains usage examples for GTM Toolkit. These are the only implementation details users should reference.

## Basic Usage

### 1. Initialize Your Project

```bash
# Install GTM Toolkit
npm install -g gtm-toolkit

# Initialize in your project
gtm-toolkit init --framework nextjs
```

### 2. Content Linting

```javascript
// Basic SEO linting
import { lintContent } from 'gtm-toolkit';

const content = `---
title: "My Blog Post"
date: 2024-12-25
category: "tutorial"
summary: "Learn how to optimize content for search engines"
---

# My Blog Post

Content goes here...`;

const results = await lintContent(content, 'my-post.md');
console.log('SEO Score:', results.filter(r => r.passed).length);
```

### 3. Generate SEO Files

```javascript
import { generateRobots, generateSitemap } from 'gtm-toolkit';

// Generate robots.txt
const robots = await generateRobots({
  siteUrl: 'https://example.com',
  allowAI: true,
  customRules: ['Disallow: /admin/']
});

// Generate sitemap.xml
const sitemap = await generateSitemap({
  baseUrl: 'https://example.com',
  contentDir: './content',
  priority: { blog: 0.8, pages: 0.6 }
});
```

### 4. AI Content Optimization (optional)

```javascript
import { createContentAnalysisInstruction } from 'gtm-toolkit';

const instruction = createContentAnalysisInstruction(content, {
  targetKeywords: ['seo', 'optimization'],
  targetAudience: 'developers'
});

console.log('Prompt for your local assistant:', instruction.prompt);
```

### 5. CLI Usage Examples

```bash
# Lint all content
gtm-toolkit lint content/blog/

# Generate comprehensive fix suggestions
gtm-toolkit suggestions content/ --output fix-plan.md

# Apply automatic fixes
gtm-toolkit fix --auto --confidence high

# Generate all SEO files
gtm-toolkit generate --all

# Full audit with AI analysis
gtm-toolkit audit --all

# Performance tracking
gtm-toolkit track --schedule weekly
```

### 6. Configuration File

```javascript
// gtm-toolkit.config.js
module.exports = {
  content: {
    directory: 'content/blog',
    extensions: ['.md', '.mdx'],
    categories: ['tutorial', 'guide', 'news']
  },
  seo: {
    rules: { enabled: 'all' }
  },
  ai: {
    assistant: 'local-ai',
    notes: 'Use toolkit prompts with your assistant',
    features: {
      contentAnalysis: true,
      autoFix: true
    }
  }
};
```

### 7. Google Search Console Integration

```javascript
import { GoogleSearchConsoleClient } from 'gtm-toolkit';

const gsc = new GoogleSearchConsoleClient({
  serviceAccountKey: './gsc-credentials.json'
});

const keywords = await gsc.getSearchAnalytics({
  siteUrl: 'https://example.com',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});
```

## Advanced Examples

### Automated Workflow

```bash
#!/bin/bash
# content-optimization-workflow.sh

echo "🚀 Starting content optimization workflow..."

# 1. Generate baseline audit
gtm-toolkit audit --baseline --output baseline.json

# 2. Generate fix suggestions
gtm-toolkit suggestions content/ --output optimization-plan.md

# 3. Apply automatic fixes
gtm-toolkit fix --auto --confidence high --backup

# 4. Re-audit to measure improvement
gtm-toolkit audit --compare baseline.json

# 5. Generate updated SEO files
gtm-toolkit generate --all

echo "✅ Optimization complete!"
```

### CI/CD Integration

```yaml
# .github/workflows/content-optimization.yml
name: Content SEO Optimization
on:
  push:
    paths: ['content/**']

jobs:
  optimize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install GTM Toolkit
        run: npm install -g gtm-toolkit

      - name: Run SEO audit
        run: gtm-toolkit audit --format github
        env:
          AI_ASSISTANT_KEY: ${{ secrets.AI_ASSISTANT_KEY || 'not-set' }}

      - name: Generate SEO files
        run: gtm-toolkit generate --all

      - name: Commit updated files
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GTM Toolkit"
          git add public/robots.txt public/sitemap.xml
          git commit -m "Update SEO files [skip ci]" || exit 0
          git push
```

## Support

- 📖 [Full Documentation](https://gtmascode.dev/docs)
- 🐛 [Issues](https://github.com/razkaplan/gtm-toolkit/issues)
- 💬 [Discussions](https://github.com/razkaplan/gtm-toolkit/discussions)

---

**Note**: These examples show the complete public API. Internal implementation details are not exposed and should not be relied upon.
