// Generate command implementation
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { RobotsGenerator } from '../generators/robots-generator';
import { SitemapGenerator } from '../generators/sitemap-generator';
import { GTMConfig } from '../types';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { auditCommand } from './audit';
import { GoogleSearchConsoleClient } from '../integrations/google-search-console';
import { KeywordsResearchTool } from '../core/keywords-research';

interface GenerateCommandOptions {
  robots?: boolean;
  sitemap?: boolean;
  meta?: boolean;
  all?: boolean;
}

export async function generateCommand(options: GenerateCommandOptions = {}) {
  console.log(chalk.cyan('🔧 GTM Toolkit Generator'));
  
  // Load config
  let config: GTMConfig;
  try {
    if (existsSync('gtm.config.js')) {
      config = require(process.cwd() + '/gtm.config.js');
    } else {
      // Default config
      config = {
        framework: 'nextjs',
        analytics: {},
        seo: {
          siteName: 'My Site',
          siteUrl: 'https://example.com',
          defaultTitle: 'My Site',
          defaultDescription: 'My site description'
        },
        content: {},
        robots: {
          allowAIBots: true,
          customRules: [],
          sitemapUrl: 'https://example.com/sitemap.xml'
        },
        geo: {
          enabled: true,
          optimizeForAI: true,
          structuredData: true
        }
      } as GTMConfig;
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to load config:'), error);
    return;
  }

  console.log(chalk.gray('\n🧪 Running audit before generation...'));
  try {
    await auditCommand({ all: true });
    console.log(chalk.gray('📝 Audit complete. Proceeding with generation tasks...\n'));
  } catch (error) {
    console.warn(chalk.yellow('⚠️ Audit encountered an issue, continuing with generation. Details below:'));
    console.warn(chalk.yellow((error as Error).message));
  }

  try {
    // Generate robots.txt
    if (options.robots || options.all) {
      const spinner = ora('Generating robots.txt...').start();
      try {
        if (!existsSync('public')) {
          mkdirSync('public', { recursive: true });
        }
        const robotsPath = path.resolve('public', 'robots.txt');
        if (existsSync(robotsPath)) {
          spinner.info(`robots.txt already exists at ${robotsPath}. Skipping to avoid overriding.`);
        } else {
          const robotsGenerator = new RobotsGenerator(config);
          robotsGenerator.generate({
            outputPath: 'public',
            includeAnalytics: true
          });
          spinner.succeed('robots.txt generated');
        }
      } catch (error) {
        spinner.fail('Failed to generate robots.txt');
        throw error;
      }
    }

    // Generate sitemap.xml
    if (options.sitemap || options.all) {
      const spinner = ora('Generating sitemap.xml...').start();
      try {
        if (!existsSync('public')) {
          mkdirSync('public', { recursive: true });
        }
        const sitemapPath = path.resolve('public', 'sitemap.xml');
        if (existsSync(sitemapPath)) {
          spinner.info(`sitemap.xml already exists at ${sitemapPath}. Skipping to avoid overriding.`);
        } else {
          const sitemapGenerator = new SitemapGenerator(config);
          await sitemapGenerator.generate({
            contentPath: 'content',
            outputPath: 'public',
            staticPages: ['/', '/about', '/contact', '/blog', '/services']
          });
          spinner.succeed('sitemap.xml generated');
        }
      } catch (error) {
        spinner.fail('Failed to generate sitemap.xml');
        throw error;
      }
    }

    // Generate meta tags
    if (options.meta || options.all) {
      const spinner = ora('Generating meta tags template...').start();
      // Meta tags generation would go here
      spinner.succeed('Meta tags template generated');
    }

    if (config.geo?.enabled && config.analytics?.gsc?.enabled && config.analytics?.gsc?.credentialsPath) {
      const spinner = ora('Building AI overview keyword report...').start();
      try {
        const credentialsPath = path.resolve(config.analytics.gsc.credentialsPath);
        const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
        const siteUrl = config.analytics.gsc.siteUrl || config.seo.siteUrl;
        const client = new GoogleSearchConsoleClient(credentials, siteUrl);
        const reportsDir = path.resolve('reports');
        if (!existsSync(reportsDir)) {
          mkdirSync(reportsDir, { recursive: true });
        }
        const outputPath = path.join(reportsDir, 'ai-overview-keywords.csv');
        await client.exportAiOverviewKeywords({ outputPath });
        spinner.succeed(`AI overview keyword report saved to ${path.relative(process.cwd(), outputPath)}`);
      } catch (error) {
        spinner.warn('Failed to build AI overview keyword report');
        console.warn(chalk.yellow((error as Error).message));
      }
    }

    console.log(chalk.green('✅ Generation complete!'));
  } catch (error) {
    console.error(chalk.red('❌ Generation failed:'), error);
  } finally {
    try {
      await ensureStrategyDocs(config);
    } catch (docError) {
      console.warn(chalk.yellow(`⚠️  Unable to update strategy docs: ${(docError as Error).message}`));
    }
  }
}

async function ensureStrategyDocs(config: GTMConfig): Promise<void> {
  const reportsDir = path.resolve('reports');
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  const competitorsPath = path.join(reportsDir, 'competitors.md');
  if (!existsSync(competitorsPath)) {
    const competitorsTemplate = `# Competitor Inventory

List your direct and indirect competitors below. Include full URLs so GTM Toolkit and your local AI assistants can benchmark positioning accurately.

- https://competitor-one.com
- https://competitor-two.com
- https://competitor-three.com

> Update this list regularly to keep audits aligned with your go-to-market reality.
`;
    writeFileSync(competitorsPath, competitorsTemplate, 'utf8');
    console.log(chalk.green(`📄 Created competitor tracker at ${competitorsPath}`));
  } else {
    console.log(chalk.gray(`ℹ️  Found existing competitors.md at ${competitorsPath}; leaving it unchanged.`));
  }

  const keywordsPath = path.join(reportsDir, 'keywords.md');
  if (existsSync(keywordsPath)) {
    console.log(chalk.gray(`ℹ️  Found existing keywords.md at ${keywordsPath}; leaving it unchanged.`));
    return;
  }

  const gscConfig = config.analytics?.gsc;
  if (!gscConfig?.enabled || !gscConfig.credentialsPath) {
    const placeholder = `# Google Search Console Keyword Insights

GSC credentials are not connected yet.

1. Add your Search Console service account JSON to the project.
2. Update \`analytics.gsc\` inside \`gtm.config.js\` with the credentials path and site URL.
3. Re-run \`gtm-toolkit generate --all\` to pull live keyword data.

Until credentials are connected, this file is a placeholder to remind you to integrate Google Search Console.`;

    writeFileSync(keywordsPath, placeholder, 'utf8');
    console.log(chalk.yellow(`⚠️  Created placeholder keywords.md at ${keywordsPath}. Connect Google Search Console and re-run the generator for live data.`));
    return;
  }

  try {
    const credentialsPath = path.resolve(gscConfig.credentialsPath);
    const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
    const siteUrl = gscConfig.siteUrl || config.seo.siteUrl;
    const keywordsTool = new KeywordsResearchTool({
      siteUrl,
      gscCredentials: credentials
    });

    const endDate = new Date();
    const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const performance = await keywordsTool.getCurrentKeywordPerformance({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      dimensions: ['query'],
      rowLimit: 50
    });

    const tableRows = performance.slice(0, 20).map(row => {
      const ctrPercent = `${(row.ctr * 100).toFixed(2)}%`;
      const avgPosition = row.position ? row.position.toFixed(1) : 'n/a';
      return `| ${row.query} | ${row.clicks} | ${row.impressions} | ${ctrPercent} | ${avgPosition} |`;
    });

    const keywordsTemplate = `# Google Search Console Keyword Insights

Site: ${siteUrl}
Report window: ${startDate.toISOString().split('T')[0]} → ${endDate.toISOString().split('T')[0]}

These queries were pulled automatically from Google Search Console. Prioritize the terms with high impressions and low average position to guide your next optimization cycle.

| Query | Clicks | Impressions | CTR | Avg. Position |
| --- | --- | --- | --- | --- |
${tableRows.length > 0 ? tableRows.join('\n') : '| No keyword data available | 0 | 0 | 0% | n/a |'}

## Next Steps

1. Review the keyword list with your content and growth teams.
2. Map each priority keyword to a landing page or content brief.
3. Run \`gtm-toolkit analyze --keywords "<topic>"\` for AI-assistant prompts once briefs are ready.
`;

    writeFileSync(keywordsPath, keywordsTemplate, 'utf8');
    console.log(chalk.green(`📄 Created keyword insight report at ${keywordsPath}`));
  } catch (error) {
    console.error(chalk.red('❌ Failed to generate keywords.md from Google Search Console data.'));
    console.error(chalk.red((error as Error).message));
  }
}
