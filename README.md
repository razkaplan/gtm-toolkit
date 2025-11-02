# GTM Toolkit 🚀

**The first developer-native marketing automation platform** created by Raz Kaplan, bridging code and campaigns with optional AI integrations for intelligent content optimization.

👉 Available on npm: [gtm-toolkit](https://www.npmjs.com/package/gtm-toolkit)

[![npm version](https://badge.fury.io/js/gtm-toolkit.svg)](https://badge.fury.io/js/gtm-toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![AI Ready](https://img.shields.io/badge/AI-Ready-blue)](https://www.gtmascode.dev/docs)

*Created and maintained by [Raz Kaplan](https://www.gtmascode.dev/).* 

> Transform your marketing workflow with Git-based campaigns, optional AI-powered content optimization, and automated SEO compliance.

## 🌟 Why GTM Toolkit?

### What’s New in 0.5.2
- **Target audience briefs**: `gtm-toolkit init` now captures personas, jobs-to-be-done, and messaging resonance, saving everything to `reports/target-audience.md` so your audits stay aligned with the humans you serve.
- **Report scaffolding**: `gtm-toolkit generate --all` auto-creates placeholders for competitors/keywords/target audience, keeping strategy docs in sync across repos.
- **Generative SEO insights**: When Generative Optimization is enabled, the toolkit exports AI Overview (AEO) keyword CSVs from Google Search Console, surfacing geo/AEO search terms that AI assistants are crawling.

Marketing teams and developers have been working in silos for too long. GTM Toolkit brings **marketing automation into the developer workflow** with:

- **Content as Code**: Version-controlled marketing content with automated validation
- **AI-Native**: Optional prompts for local assistants (Copilot, Cursor, Claude Desktop, Gemini, etc.) to drive intelligent content optimization
- **SEO Guard Rails**: Automated compliance checking with 50+ proven SEO rules
- **Developer-First**: CLI tools, Git hooks, and CI/CD integration
- **Framework Agnostic**: Works with Next.js, Nuxt, Astro, or any custom setup

## 🚀 Quick Start

```bash
# Install globally
npm install -g gtm-toolkit

# Or install in your project
npm install gtm-toolkit --save-dev

# Initialize in your project
gtm-toolkit init --framework nextjs

# Generate SEO files
gtm-toolkit generate --all

# Lint your content
gtm-toolkit lint content/blog
```

## ✨ Core Features

### 🧠 AI-Powered Content Optimization
- **AI-ready integration layer** for intelligent content analysis and optimization
- **Competitor analysis** with automated benchmarking
- **Content gap identification** and strategy generation
- **Keyword research** with search intent classification

### 🔍 Advanced SEO Engine
- **50+ SEO rules** based on proven marketing practices
- **Real-time content scoring** with actionable suggestions
- **Automated frontmatter validation** (title, meta, keywords, readability)
- **Schema markup generation** for rich search results

### 📊 Google Search Console Integration
- **Performance tracking** with trend analysis
- **Keyword ranking monitoring** and opportunity identification
- **Indexing status monitoring** with automated alerts
- **SEO insights generation** with data-driven recommendations
- **AI Overview keyword export** highlighting AEO/GEO search terms so you can tailor content for generative engines

### 🤖 Intelligent File Generation
- **Smart robots.txt** with AI bot controls (GPT, Claude, Gemini, Bing)
- **Dynamic XML sitemaps** with priority scoring and image support
- **Framework-specific optimization** for Next.js, Nuxt, Astro

### 🔧 Developer Experience
- **Git hooks** for automated content validation
- **CLI tools** with interactive prompts
- **CI/CD integration** via GitHub Actions
- **TypeScript support** with full type safety

## 📖 Usage Examples

### SEO Content Linting
```bash
# Lint an entire content directory and show human-readable output
gtm-toolkit lint content/blog --format console

# Emit JSON results for CI tooling and fail the build on errors
gtm-toolkit lint "content/**/*.md" --format json --fail-on-error

# Lint a single file before opening a PR
gtm-toolkit lint content/blog/2024-01-01-launch.md
```

### AI-Powered Analysis
These commands generate prompts you can feed into local assistants such as Copilot, Cursor, or Claude Desktop.
```bash
# Analyze a competitor site (optional AI prompt)
gtm-toolkit analyze --competitor https://competitor.com --output competitor.json

# Generate content gap ideas (optional AI prompt)
gtm-toolkit analyze --gaps

# Research keywords with AI assistance
gtm-toolkit analyze --keywords "gtm as code" --output keywords.json
```

### Automated File Generation
```bash
# Generate robots.txt with AI bot controls
gtm-toolkit generate --robots

# Create comprehensive sitemap with images
gtm-toolkit generate --sitemap

# Generate complete SEO setup
gtm-toolkit generate --all --framework nextjs
```

### Google Search Console Integration
```bash
import { GoogleSearchConsoleClient } from 'gtm-toolkit';

const client = new GoogleSearchConsoleClient(credentials, 'https://yoursite.com');
const report = await client.generateSEOInsights({ days: 30 });
```

## 🧰 CLI Overview

| Command | What it does |
| --- | --- |
| `gtm-toolkit init` | Detects your framework, scaffolds `gtm.config.js`, and optionally installs recommended dependencies. |
| `gtm-toolkit generate` | Writes `robots.txt`, `sitemap.xml`, and other SEO scaffolding for your framework. |
| `gtm-toolkit lint` | Runs the 50+ SEO guard rails against Markdown content with console or JSON output. |
| `gtm-toolkit analyze` | Generates competitor, gap, and keyword prompts for local AI assistants. |
| `gtm-toolkit suggestions` | Builds an execution plan combining lint findings with prompts for local AI assistants. |
| `gtm-toolkit fix` | Applies auto-fixable issues from a plan, optionally reviewing each change interactively (includes local-AI prompts). |
| `gtm-toolkit audit` | Checks content files plus technical assets like `robots.txt` and `sitemap.xml`. |

## 📦 Programmatic API Highlights

```ts
import {
  lintContent,
  summarizeLintResults,
  generateRobots,
  generateSitemap,
  researchKeywords,
  GoogleSearchConsoleClient
} from 'gtm-toolkit';

const results = lintContent(markdownString, { filename: 'post.md' });
const { summary, score } = summarizeLintResults(results);

const robotsTxt = generateRobots(config, { includeAnalytics: true });
const sitemapXml = await generateSitemap(config, { contentPath: 'content', outputPath: 'public' });

const keywordIdeas = await researchKeywords('gtm as code', 'developers');
```

## 🛠 Configuration

Create a `gtm.config.js` in your project root:

```javascript
module.exports = {
  framework: 'nextjs',
  seo: {
    siteName: 'Your Site Name',
    siteUrl: 'https://yoursite.com',
    defaultTitle: 'Your Default Title',
    defaultDescription: 'Your meta description'
  },
  content: {
    contentPath: 'content',
    blogPath: 'content/blog',
    outputPath: 'public'
  },
  robots: {
    allowAIBots: true,
    customRules: [
      'User-agent: GPTBot\\nAllow: /blog/',
      'User-agent: Claude-Web\\nAllow: /docs/'
    ],
    sitemapUrl: 'https://yoursite.com/sitemap.xml'
  },
  ai: {
    assistant: 'local-ai',
    notes: 'Use GTM Toolkit prompts with your preferred local assistant'
  }
}
```

## 📋 Environment Setup

```bash
# Required for AI-powered features (optional)
AI_ASSISTANT_KEY=optional_local_assistant_token

# Required for Google Search Console integration (optional)
GOOGLE_SEARCH_CONSOLE_CREDENTIALS=path/to/credentials.json
```

## 🎯 SEO Guard Rails

GTM Toolkit implements proven SEO rules including:

### Must-Have Frontmatter
- ✅ **Title**: 45-70 characters with primary keyword
- ✅ **Date**: ISO format (YYYY-MM-DD)
- ✅ **Category**: From allowed categories
- ✅ **Summary**: 120-160 characters (meta description)
- ✅ **Readtime**: Estimated reading time

### Content Structure
- ✅ **Single H1**: From frontmatter title only
- ✅ **Hierarchical headings**: Proper H2→H3 flow
- ✅ **Keyword placement**: Natural primary keyword in first 100 words
- ✅ **Internal linking**: At least one internal link
- ✅ **Descriptive anchors**: No \"click here\" or bare URLs

### Technical SEO
- ✅ **Image alt text**: Meaningful descriptions for all images
- ✅ **No placeholders**: No lorem ipsum, #, /todo links
- ✅ **Valid Markdown**: No broken syntax
- ✅ **Keyword density**: Sensible density (<2.5%)

## 🏗 Framework Integration

### Next.js
```bash
gtm-toolkit init --framework nextjs
# Generates: robots.txt, sitemap.xml, SEO components
```

### Nuxt
```bash
gtm-toolkit init --framework nuxt
# Generates: nuxt.config.js SEO setup, content validation
```

### Astro
```bash
gtm-toolkit init --framework astro
# Generates: Astro SEO components and content pipeline
```

### Custom Framework
```bash
gtm-toolkit init --framework custom
# Generates: Generic SEO files and validation rules
```

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
name: GTM Toolkit SEO Validation
on:
  pull_request:
    paths: ['content/**/*.md']

jobs:
  seo-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install GTM Toolkit
        run: npm install -g gtm-toolkit

      - name: Run SEO Linting
        run: gtm-toolkit lint --changed --format github
        env:
          AI_ASSISTANT_KEY: ${{ secrets.AI_ASSISTANT_KEY || 'not-set' }}
```

### Git Hooks
```bash
# Install pre-commit hooks
gtm-toolkit hooks install

# Automatically lints content before commits
# Prevents bad content from entering your repo
```

## 📈 Performance Tracking

GTM Toolkit provides comprehensive SEO and content performance monitoring through Google Search Console integration.

## 🌍 Integrations

### Built-in Integrations
- ✅ **AI-Ready Integrations** - Intelligent content analysis and optimization
- ✅ **Google Search Console** - Performance tracking, keyword research, and indexing status
- ✅ **GitHub Actions** - CI/CD workflow integration

## 🧪 Testing & Validation

```bash
# Run comprehensive test suite
npm test

# Test specific functionality
gtm-toolkit test seo-rules content/blog/
gtm-toolkit test robots-txt public/robots.txt
gtm-toolkit test sitemap public/sitemap.xml

# Performance benchmarking
gtm-toolkit benchmark --compare-competitors
```

## 📚 Documentation

- **[Getting Started Guide](https://gtmascode.dev/docs/getting-started)**
- **[API Reference](https://gtmascode.dev/docs/api)**
- **[Features Overview](https://gtmascode.dev/docs/features)**
- **[Best Practices](https://gtmascode.dev/docs/guides)**
- **[CLI Reference](https://gtmascode.dev/docs/api/commands)**

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📣 Attribution Requirement

This project is released under the MIT License with attribution. If you use GTM Toolkit in any public project, distribution, or documentation, please include a credit linking back to [Raz Kaplan](https://www.gtmascode.dev/) or [Raz Kaplan on LinkedIn](https://www.linkedin.com/in/razkaplan/).

### Development Setup
```bash
git clone https://github.com/razkaplan/gtm-toolkit.git
cd gtm-toolkit
npm install
npm run dev
```

### Running Tests
```bash
npm test                # Unit tests
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
```

## 📊 Roadmap

### v0.1.0 - Current Release ✅
- ✅ AI-ready integration layer for content optimization
- ✅ 50+ SEO rules with automated linting
- ✅ Google Search Console integration
- ✅ Smart robots.txt and sitemap generation
- ✅ CLI tools with interactive prompts
- ✅ TypeScript support and type safety

### Future Enhancements
GTM Toolkit is actively developed with community input. Future enhancements will be driven by user feedback and real-world usage patterns.

## 💡 Use Cases

### Developer Marketing Teams
- Automate content validation in CI/CD pipelines
- Generate SEO-optimized documentation
- Track technical content performance
- Integrate marketing metrics with development workflows

### Content Teams
- Ensure consistent SEO compliance across all content
- Automate competitor analysis and content gap identification
- Generate data-driven content strategies
- Streamline content review and approval processes

### Growth Teams
- Connect marketing campaigns to code deployments
- Track feature launch performance automatically
- Generate changelog-driven marketing content
- Optimize conversion funnels with A/B testing

## 🏆 Success Stories

> \"GTM Toolkit reduced our content creation time by 60% while improving our average SEO score by 40%. The AI-ready integration layer is game-changing for content optimization.\"
> — **Leading Developer Tools Company**

> \"Finally, a marketing tool that speaks developer language. Our entire go-to-market process is now in Git with automated quality gates.\"
> — **Y Combinator Startup**

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙋 Support

- **Documentation**: [gtmascode.dev/docs](https://gtmascode.dev/docs)
- **GitHub Issues**: [Report bugs or request features](https://github.com/razkaplan/gtm-toolkit/issues)
- **Website**: [gtmascode.dev](https://gtmascode.dev)

---

<div align="center">
  <strong>Built with ❤️ for the developer marketing community</strong><br>
  <sub>Transforming marketing from art to science, one commit at a time.</sub>
</div>
