#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { generateCommand } from './commands/generate';
import { analyzeCommand } from './commands/analyze';
import { auditCommand } from './commands/audit';
import { createSuggestionsCommand } from './commands/suggestions';
import { createFixCommand } from './commands/fix';
import { createLintCommand } from './commands/lint';

const program = new Command();
const version = require('../package.json').version as string;

program
  .name('gtm-toolkit')
  .description('Continuous Marketing Automation Toolkit - SEO, GEO, and Analytics')
  .version(version);

// ASCII Art Banner
const banner = `
${chalk.cyan('GTM Toolkit')} ${chalk.gray(`v${version}`)}
${chalk.gray('Continuous Marketing Automation')}
`;

console.log(banner);

program
  .command('init')
  .description('Initialize GTM Toolkit in your project')
  .option('-f, --framework <type>', 'specify framework (nextjs, nuxt, astro)', 'nextjs')
  .option('--analytics <type>', 'analytics provider (ga4, posthog, both)', 'both')
  .option('--skip-install', 'skip npm package installation')
  .action(initCommand);

program
  .command('generate')
  .alias('gen')
  .description('Generate SEO and marketing files')
  .option('-r, --robots', 'generate robots.txt')
  .option('-s, --sitemap', 'generate sitemap.xml')
  .option('-m, --meta', 'generate meta tags template')
  .option('--all', 'generate all files')
  .action(generateCommand);

program
  .command('analyze')
  .description('Analyze content and competitors using AI-driven workflows')
  .option('-c, --competitor <url>', 'analyze competitor site')
  .option('-g, --gaps', 'find content gaps')
  .option('-k, --keywords <topic>', 'research keywords for a topic')
  .option('-o, --output <file>', 'output file for analysis results')
  .action(analyzeCommand);

program
  .command('audit')
  .description('Audit SEO compliance and performance')
  .option('-c, --content', 'audit content SEO')
  .option('-t, --technical', 'audit technical SEO')
  .option('--all', 'run all audits')
  .action(auditCommand);

program.addCommand(createLintCommand());
program.addCommand(createSuggestionsCommand());
program.addCommand(createFixCommand());

program.parse();
