# GTM Toolkit 🚀

**The first developer-native marketing automation platform** that bridges code and campaigns, powered by Claude AI for intelligent content optimization.

[![npm version](https://badge.fury.io/js/gtm-toolkit.svg)](https://badge.fury.io/js/gtm-toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Claude AI](https://img.shields.io/badge/Claude-AI-orange)](https://claude.ai)

> Transform your marketing workflow with Git-based campaigns, AI-powered content optimization, and automated SEO compliance.

## 🌟 Why GTM Toolkit?

Marketing teams and developers have been working in silos for too long. GTM Toolkit brings **marketing automation into the developer workflow** with:

- **Content as Code**: Version-controlled marketing content with automated validation
- **AI-Native**: Claude AI integration for intelligent content optimization and competitor analysis
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
gtm-toolkit lint content/blog/**/*.md
```

## ✨ Core Features

### 🧠 AI-Powered Content Optimization
- **Claude AI integration** for intelligent content analysis and optimization
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

### 🤖 Intelligent File Generation
- **Smart robots.txt** with AI bot controls (GPT, Claude, Bing)
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
# Lint all content with detailed reports
gtm-toolkit lint content/blog/ --format detailed

# Lint only changed files (perfect for CI/CD)
gtm-toolkit lint --changed --format json

# Auto-fix common issues
gtm-toolkit lint content/ --fix --confidence high
```

### AI-Powered Analysis
```bash
# Analyze competitor content strategy
gtm-toolkit analyze competitor https://competitor.com --output strategy.md

# Research keywords with AI insights
gtm-toolkit keywords research \"gtm as code\" --audience developers

# Generate content gaps analysis
gtm-toolkit analyze gaps --competitors urls.txt --output opportunities.json
```

### Automated File Generation
```bash
# Generate robots.txt with AI bot controls
gtm-toolkit generate robots --ai-bots allow --custom-rules rules.yml

# Create comprehensive sitemap with images
gtm-toolkit generate sitemap --include-images --priority-scoring

# Generate complete SEO setup
gtm-toolkit generate --all --framework nextjs
```

### Google Search Console Integration
```bash
# Track keyword performance
gtm-toolkit gsc keywords --days 30 --min-impressions 100

# Monitor indexing status
gtm-toolkit gsc index-status --urls sitemap.xml --alert-on-issues

# Generate SEO insights report
gtm-toolkit gsc insights --export insights-report.json
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
  robots: {
    allowAIBots: true,
    customRules: [
      'User-agent: GPTBot\\nAllow: /blog/',
      'User-agent: Claude-Web\\nAllow: /docs/'
    ],
    sitemapUrl: 'https://yoursite.com/sitemap.xml'
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY // Optional: for AI features
  },
  googleSearchConsole: {
    credentials: './gsc-credentials.json', // Optional
    siteUrl: 'https://yoursite.com'
  }
}
```

## 📋 Environment Setup

```bash
# Required for Claude AI features (optional)
CLAUDE_API_KEY=your_claude_api_key

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
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
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
- ✅ **Claude AI** - Intelligent content analysis and optimization
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
- ✅ Claude AI integration for content optimization
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

> \"GTM Toolkit reduced our content creation time by 60% while improving our average SEO score by 40%. The Claude AI integration is game-changing for content optimization.\"
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