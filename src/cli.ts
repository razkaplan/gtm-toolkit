#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createInitCommand } from './commands/init';
import { createGenerateCommand } from './commands/generate';
import { createAnalyzeCommand } from './commands/analyze';
import { createAuditCommand } from './commands/audit';
import { createSuggestionsCommand } from './commands/suggestions';
import { createFixCommand } from './commands/fix';

const program = new Command();

program
  .name('gtm-toolkit')
  .description('Continuous Marketing Automation Toolkit - SEO, GEO, and Analytics')
  .version('0.1.0');

// ASCII Art Banner
const banner = `
${chalk.cyan('GTM Toolkit')} ${chalk.gray('v0.1.0')}
${chalk.gray('Continuous Marketing Automation')}
`;

console.log(banner);

// Add all commands
program.addCommand(createInitCommand());
program.addCommand(createGenerateCommand());
program.addCommand(createAnalyzeCommand());
program.addCommand(createAuditCommand());
program.addCommand(createSuggestionsCommand());
program.addCommand(createFixCommand());

program.parse();