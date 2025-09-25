import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { GTMConfig } from '../types';
import { saveConfig } from '../core/config';
import { detectFramework } from '../utils/framework-detector';
import { installDependencies } from '../utils/package-manager';

export async function initCommand(options: any) {
  console.log(chalk.blue('\n🚀 Initializing GTM Toolkit...\n'));

  // Detect current framework
  const detectedFramework = detectFramework();
  const framework = options.framework || detectedFramework || 'nextjs';

  console.log(chalk.gray(`Detected framework: ${framework}`));

  // Interactive configuration
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'siteName',
      message: 'What is your site name?',
      default: 'My Website'
    },
    {
      type: 'input',
      name: 'siteUrl',
      message: 'What is your site URL?',
      default: 'https://example.com',
      validate: (input: string) => {
        try {
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL';
        }
      }
    },
    {
      type: 'input',
      name: 'defaultTitle',
      message: 'Default page title?',
      default: 'My Website'
    },
    {
      type: 'input',
      name: 'defaultDescription',
      message: 'Default meta description?',
      default: 'A website built with GTM Toolkit'
    },
    {
      type: 'checkbox',
      name: 'analytics',
      message: 'Which analytics providers would you like to set up?',
      choices: [
        { name: 'Google Analytics 4', value: 'ga4' },
        { name: 'PostHog', value: 'posthog' }
      ],
      default: options.analytics === 'both' ? ['ga4', 'posthog'] : [options.analytics]
    },
    {
      type: 'confirm',
      name: 'allowAIBots',
      message: 'Allow AI bots (GPT, Claude, Bard) to crawl your site?',
      default: true
    },
    {
      type: 'confirm',
      name: 'enableGEO',
      message: 'Enable Generative Engine Optimization features?',
      default: true
    },
    {
      type: 'input',
      name: 'contentPath',
      message: 'Where is your content located?',
      default: framework === 'nextjs' ? 'content' : 'src/content'
    }
  ]);

  // Additional analytics configuration
  const analyticsConfig: any = {};

  if (answers.analytics.includes('ga4')) {
    const ga4Config = await inquirer.prompt([
      {
        type: 'input',
        name: 'measurementId',
        message: 'Enter your GA4 Measurement ID (G-XXXXXXXXXX):',
        validate: (input: string) => input.startsWith('G-') || 'Must start with G-'
      }
    ]);
    analyticsConfig.ga4 = { ...ga4Config, enabled: true };
  }

  if (answers.analytics.includes('posthog')) {
    const posthogConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiKey',
        message: 'Enter your PostHog API key:'
      },
      {
        type: 'input',
        name: 'host',
        message: 'PostHog host:',
        default: 'https://app.posthog.com'
      }
    ]);
    analyticsConfig.posthog = { ...posthogConfig, enabled: true };
  }

  // Build configuration
  const config: GTMConfig = {
    framework: framework as any,
    analytics: analyticsConfig,
    seo: {
      siteName: answers.siteName,
      siteUrl: answers.siteUrl,
      defaultTitle: answers.defaultTitle,
      defaultDescription: answers.defaultDescription
    },
    content: {
      contentPath: answers.contentPath,
      blogPath: `${answers.contentPath}/blog`,
      outputPath: framework === 'nextjs' ? 'public' : 'dist'
    },
    robots: {
      allowAIBots: answers.allowAIBots,
      customRules: [],
      sitemapUrl: `${answers.siteUrl}/sitemap.xml`
    },
    geo: {
      enabled: answers.enableGEO,
      optimizeForAI: answers.enableGEO,
      structuredData: true
    }
  };

  const spinner = ora('Saving configuration...').start();

  try {
    // Save configuration
    await saveConfig(config);
    spinner.succeed('Configuration saved');

    // Install dependencies if not skipped
    if (!options.skipInstall) {
      const installSpinner = ora('Installing dependencies...').start();
      await installDependencies(framework, answers.analytics);
      installSpinner.succeed('Dependencies installed');
    }

    console.log(chalk.green('\n✅ GTM Toolkit initialized successfully!\n'));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.gray('• Run `gtm-toolkit generate --all` to create SEO files'));
    console.log(chalk.gray('• Run `gtm-toolkit audit --all` to check your setup'));

    if (analyticsConfig.ga4) {
      console.log(chalk.blue(`\n📊 Google Analytics 4 Setup Guide:`));
      console.log(chalk.gray('https://support.google.com/analytics/answer/9744165'));
    }

    if (analyticsConfig.posthog) {
      console.log(chalk.blue(`\n📈 PostHog Setup Guide:`));
      console.log(chalk.gray('https://posthog.com/docs/integrate'));
    }

  } catch (error) {
    spinner.fail('Failed to initialize GTM Toolkit');
    console.error(chalk.red(error));
    process.exit(1);
  }
}