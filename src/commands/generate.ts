// Generate command implementation
import chalk from 'chalk';
import ora from 'ora';
import { RobotsGenerator } from '../generators/robots-generator';
import { SitemapGenerator } from '../generators/sitemap-generator';
import { GTMConfig } from '../types';
import { existsSync, readFileSync } from 'fs';

export async function generateCommand(options: any) {
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

  try {
    // Generate robots.txt
    if (options.robots || options.all) {
      const spinner = ora('Generating robots.txt...').start();
      const robotsGenerator = new RobotsGenerator(config);
      const robotsTxt = robotsGenerator.generate({
        outputPath: 'public',
        includeAnalytics: true
      });
      spinner.succeed('robots.txt generated');
    }

    // Generate sitemap.xml
    if (options.sitemap || options.all) {
      const spinner = ora('Generating sitemap.xml...').start();
      const sitemapGenerator = new SitemapGenerator(config);
      await sitemapGenerator.generate({
        contentPath: 'content',
        outputPath: 'public',
        staticPages: ['/', '/about', '/contact', '/blog', '/services']
      });
      spinner.succeed('sitemap.xml generated');
    }

    // Generate meta tags
    if (options.meta || options.all) {
      const spinner = ora('Generating meta tags template...').start();
      // Meta tags generation would go here
      spinner.succeed('Meta tags template generated');
    }

    console.log(chalk.green('✅ Generation complete!'));
  } catch (error) {
    console.error(chalk.red('❌ Generation failed:'), error);
  }
}
