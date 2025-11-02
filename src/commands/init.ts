import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { globSync } from 'glob';
import { GTMConfig } from '../types';
import { saveConfig } from '../core/config';
import { detectFramework } from '../utils/framework-detector';
import { installDependencies } from '../utils/package-manager';

interface InitCommandOptions {
  framework?: string;
  analytics?: 'ga4' | 'posthog' | 'both';
  skipInstall?: boolean;
}

type AnalyticsSelection = Array<'ga4' | 'posthog'>;

export async function initCommand(options: InitCommandOptions = {}) {
  console.log(chalk.blue('\n🚀 Initializing GTM Toolkit...\n'));

  // Detect current framework
  const detectedFramework = detectFramework();
  const rawFramework = options.framework || detectedFramework || 'nextjs';
  const validFrameworks: GTMConfig['framework'][] = ['nextjs', 'nuxt', 'astro', 'custom'];
  const framework: GTMConfig['framework'] = validFrameworks.includes(rawFramework as GTMConfig['framework'])
    ? (rawFramework as GTMConfig['framework'])
    : 'custom';

  console.log(chalk.gray(`Detected framework: ${framework}`));

  const detectedMetadata = await scanSiteMetadata();

  const siteName = await promptWithDetection({
    label: 'site name',
    detectedValue: detectedMetadata.siteName,
    promptMessage: 'What is your site name?',
    defaultValue: 'My Website'
  });

  const siteUrl = await promptForSiteUrl(detectedMetadata.siteUrl);

  const defaultTitle = await promptWithDetection({
    label: 'default title',
    detectedValue: detectedMetadata.defaultTitle || detectedMetadata.siteName,
    promptMessage: 'Default page title?',
    defaultValue: siteName
  });

  const defaultDescription = await promptWithDetection({
    label: 'meta description',
    detectedValue: detectedMetadata.defaultDescription,
    promptMessage: 'Default meta description?',
    defaultValue: 'A website built with GTM Toolkit'
  });

  const generalAnswers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'allowAIBots',
      message: 'Allow AI bots (GPT, Claude, Gemini) to crawl your site?',
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
    },
    {
      type: 'input',
      name: 'gscCredentialsPath',
      message: 'Path to Google Search Console service account JSON (leave blank to skip):',
      default: '',
      filter: (input: string) => input.trim()
    }
  ]);

  const audienceInsights = await inquirer.prompt([
    {
      type: 'input',
      name: 'primaryAudience',
      message: 'Who is your primary target audience?',
      default: 'Growth marketers and product teams',
      filter: (input: string) => input.trim()
    },
    {
      type: 'input',
      name: 'corePersonas',
      message: 'List the core personas you are serving (comma separated):',
      default: 'Marketing Manager, Product Marketing Lead, SEO Strategist',
      filter: (input: string) => input.trim()
    },
    {
      type: 'input',
      name: 'topJobsToBeDone',
      message: 'What are the top jobs-to-be-done or needs you solve for them?',
      default: 'Prove content ROI, accelerate SEO testing, operationalize AI workflows',
      filter: (input: string) => input.trim()
    },
    {
      type: 'input',
      name: 'messagingSummary',
      message: 'Share the core marketing message you currently use:',
      default: 'We help modern marketing teams operationalize GTM experiments with AI-assisted SEO, analytics, and content automation.',
      filter: (input: string) => input.trim(),
      validate: (input: string) => input.trim().length > 0 || 'Please describe your current messaging.'
    },
    {
      type: 'confirm',
      name: 'messageResonates',
      message: 'Does this message resonate with the audience you described?',
      default: true
    },
    {
      type: 'input',
      name: 'messageAdjustments',
      message: 'What adjustments are needed so the messaging resonates better?',
      when: answers => !answers.messageResonates,
      filter: (input: string) => input.trim()
    }
  ]);

  // Additional analytics configuration
  const analyticsConfig: GTMConfig['analytics'] = {};
  const analyticsOption = options.analytics;
  const defaultSelection: AnalyticsSelection = analyticsOption === 'both'
    ? ['ga4', 'posthog']
    : analyticsOption
      ? [analyticsOption]
      : [];

  const { analyticsProviders } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'analyticsProviders',
      message: 'Which analytics providers would you like to configure?',
      choices: [
        { name: 'Google Analytics 4', value: 'ga4' },
        { name: 'PostHog', value: 'posthog' }
      ],
      default: defaultSelection
    }
  ]);

  const selectedAnalytics = (analyticsProviders as AnalyticsSelection) || [];

  if (selectedAnalytics.includes('ga4')) {
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

  if (selectedAnalytics.includes('posthog')) {
    const posthogConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiKey',
        message: 'PostHog API key:',
        validate: (input: string) => input.length > 8 || 'Please enter a valid API key'
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

  let gscCredentialsPath: string | null = null;
  if (generalAnswers.gscCredentialsPath) {
    try {
      const resolvedPath = path.resolve(generalAnswers.gscCredentialsPath);
      const exists = await fs.pathExists(resolvedPath);
      if (!exists) {
        console.warn(chalk.yellow(`\n⚠️  GSC credentials file not found at ${resolvedPath}. Skipping copy.`));
      } else {
        const secretsDir = path.resolve('secrets');
        await fs.ensureDir(secretsDir);
        const targetPath = path.join(secretsDir, 'gsc-service-account.json');
        await fs.copy(resolvedPath, targetPath);
        gscCredentialsPath = './secrets/gsc-service-account.json';
        console.log(chalk.green(`\n🔐 Google Search Console credentials copied to ${gscCredentialsPath} (git-ignored).`));
      }
    } catch (error) {
      console.warn(chalk.yellow(`\n⚠️  Failed to copy GSC credentials: ${(error as Error).message}`));
    }
  } else {
    const { pasteGscCredentials } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'pasteGscCredentials',
        message: 'Would you like to paste your Google Search Console JSON credentials now?',
        default: false
      }
    ]);

    if (pasteGscCredentials) {
      const { gscJson } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'gscJson',
          message: 'Paste the full JSON for your service account credentials, then save and close the editor:',
          validate: (input: string) => {
            try {
              JSON.parse(input);
              return true;
            } catch (error) {
              return `Invalid JSON: ${(error as Error).message}`;
            }
          }
        }
      ]);

      try {
        const secretsDir = path.resolve('secrets');
        await fs.ensureDir(secretsDir);
        const targetPath = path.join(secretsDir, 'gsc-service-account.json');
        const parsed = JSON.parse(gscJson);
        await fs.writeJSON(targetPath, parsed, { spaces: 2 });
        gscCredentialsPath = './secrets/gsc-service-account.json';
        console.log(chalk.green(`\n🔐 Google Search Console credentials saved to ${gscCredentialsPath} (git-ignored).`));
      } catch (error) {
        console.warn(chalk.yellow(`\n⚠️  Failed to save GSC credentials: ${(error as Error).message}`));
      }
    }
  }

  // Build configuration
  const config: GTMConfig = {
    framework,
    analytics: analyticsConfig,
    seo: {
      siteName,
      siteUrl,
      defaultTitle,
      defaultDescription
    },
    content: {
      contentPath: generalAnswers.contentPath,
      blogPath: `${generalAnswers.contentPath}/blog`,
      outputPath: framework === 'nextjs' ? 'public' : 'dist'
    },
    robots: {
      allowAIBots: generalAnswers.allowAIBots,
      customRules: [],
      sitemapUrl: `${siteUrl}/sitemap.xml`
    },
    geo: {
      enabled: generalAnswers.enableGEO,
      optimizeForAI: generalAnswers.enableGEO,
      structuredData: true
    }
  };

  if (gscCredentialsPath) {
    config.analytics.gsc = {
      credentialsPath: gscCredentialsPath,
      siteUrl,
      enabled: true
    };
  }

  await applySiteMetadata({
    siteName,
    siteUrl,
    defaultTitle,
    defaultDescription
  });

  try {
    await ensureTargetAudienceDoc({
      siteName,
      siteUrl,
      targetAudience: audienceInsights.primaryAudience,
      personas: audienceInsights.corePersonas,
      jobsToBeDone: audienceInsights.topJobsToBeDone,
      messagingSummary: audienceInsights.messagingSummary,
      messageResonates: audienceInsights.messageResonates,
      messageAdjustments: audienceInsights.messageAdjustments || ''
    });
  } catch (error) {
    console.warn(chalk.yellow(`\n⚠️  Failed to save target audience brief: ${(error as Error).message}`));
  }

  let ga4Status: 'detected' | 'injected' | 'pending' | null = null;
  if (analyticsConfig.ga4?.measurementId) {
    ga4Status = await ensureGa4Tracking(analyticsConfig.ga4.measurementId);
  }

  const spinner = ora('Saving configuration...').start();

  try {
    // Save configuration
    await saveConfig(config);
    spinner.succeed('Configuration saved');

    // Install dependencies if not skipped
    if (!options.skipInstall) {
      const dependenciesToInstall = resolveRecommendedDependencies(framework, selectedAnalytics);

      if (dependenciesToInstall.length > 0) {
        const installSpinner = ora(`Installing ${dependenciesToInstall.length} recommended dependencies...`).start();
        installDependencies(dependenciesToInstall);
        installSpinner.succeed('Dependencies installed');
      } else {
        console.log(chalk.gray('\nNo additional dependencies detected for automatic installation.'));
      }
    }

    console.log(chalk.green('\n✅ GTM Toolkit initialized successfully!\n'));
    console.log(chalk.gray('Next steps:'));
    console.log(chalk.gray('• Run `gtm-toolkit generate --all` to create SEO files'));
    console.log(chalk.gray('• Run `gtm-toolkit audit --all` to check your setup'));

    if (analyticsConfig.ga4 && ga4Status === 'pending') {
      console.log(chalk.blue(`\n📊 Google Analytics 4 Setup Guide:`));
      console.log(chalk.gray('https://support.google.com/analytics/answer/9744165'));
    } else if (analyticsConfig.ga4) {
      console.log(chalk.green('\n📊 Google Analytics 4 tracking verified.'));
    }

    if (analyticsConfig.posthog) {
      console.log(chalk.blue(`\n📈 PostHog Setup Guide:`));
      console.log(chalk.gray('https://posthog.com/docs/integrate'));
    }

    if (gscCredentialsPath) {
      console.log(chalk.gray(`\n🔑 GSC credentials saved at ${gscCredentialsPath}. Configure your runtime with:`));
      console.log(chalk.gray(`   export GSC_CREDENTIALS_FILE=${gscCredentialsPath}`));
    }

  } catch (error) {
    spinner.fail('Failed to initialize GTM Toolkit');
    console.error(chalk.red(error));
    process.exit(1);
  }
}

async function ensureGa4Tracking(measurementId: string): Promise<'detected' | 'injected' | 'pending'> {
  const projectRoot = process.cwd();
  const scanPatterns = [
    'app/**/*.{ts,tsx,js,jsx}',
    'pages/**/*.{ts,tsx,js,jsx}',
    'src/app/**/*.{ts,tsx,js,jsx}',
    'src/pages/**/*.{ts,tsx,js,jsx}'
  ];
  const filesToScan = scanPatterns.flatMap(pattern =>
    globSync(pattern, {
      cwd: projectRoot,
      ignore: ['node_modules/**', '.next/**', 'dist/**', 'build/**']
    })
  );

  const matchingFiles: string[] = [];
  const mismatchedIds: Array<{ file: string; id: string }> = [];

  for (const relativePath of filesToScan) {
    const fullPath = path.resolve(projectRoot, relativePath);
    const content = await fs.readFile(fullPath, 'utf8');
    const ids = content.match(/G-[A-Z0-9]+/gi) || [];
    ids.forEach(id => {
      if (id.toUpperCase() === measurementId.toUpperCase()) {
        matchingFiles.push(relativePath);
      } else {
        mismatchedIds.push({ file: relativePath, id });
      }
    });
  }

  if (matchingFiles.length > 0) {
    console.log(chalk.green(`\n✅ Found GA4 tracking (${measurementId}) in:`));
    matchingFiles.forEach(file => console.log(chalk.green(`   • ${file}`)));
    if (mismatchedIds.length > 0) {
      console.log(chalk.yellow('\n⚠️ Detected additional GA measurement IDs:'));
      mismatchedIds.forEach(entry => {
        console.log(chalk.yellow(`   • ${entry.id} in ${entry.file}`));
      });
    }
    return 'detected';
  }

  if (mismatchedIds.length > 0) {
    console.log(chalk.yellow('\n⚠️ Detected GA tracking IDs that do not match the one you provided:'));
    mismatchedIds.forEach(entry => {
      console.log(chalk.yellow(`   • ${entry.id} in ${entry.file}`));
    });
  }

  const candidateFiles = [
    'app/layout.tsx',
    'app/layout.jsx',
    'app/layout.ts',
    'app/layout.js',
    'src/app/layout.tsx',
    'src/app/layout.jsx',
    'src/app/layout.ts',
    'src/app/layout.js'
  ];

  for (const relativePath of candidateFiles) {
    const fullPath = path.resolve(projectRoot, relativePath);
    if (!await fs.pathExists(fullPath)) {
      continue;
    }

    const fileContent = await fs.readFile(fullPath, 'utf8');
    if (fileContent.includes(measurementId) || fileContent.includes('gtm-toolkit-ga4')) {
      console.log(chalk.green(`\n✅ GA4 tracking already detected in ${relativePath}.`));
      return 'detected';
    }

    const { shouldInject } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldInject',
        message: `No GA4 tracking snippet found in ${relativePath}. Insert it automatically?`,
        default: true
      }
    ]);

    if (!shouldInject) {
      console.log(chalk.yellow('\n⚠️ GA4 snippet was not inserted. Add the tracking code manually using the generated measurement ID.'));
      return 'pending';
    }

    let updatedContent = addNextScriptImport(fileContent);
    updatedContent = injectGa4Snippet(updatedContent, measurementId);

    await fs.writeFile(fullPath, updatedContent, 'utf8');
    console.log(chalk.green(`\n✅ GA4 tracking snippet inserted into ${relativePath}.`));
    return 'injected';
  }

  console.log(chalk.yellow('\n⚠️ Unable to locate a compatible layout file for automatic GA4 injection. Please add the tracking snippet manually.'));
  return 'pending';
}

function addNextScriptImport(fileContent: string): string {
  if (/from ['"]next\/script['"]/.test(fileContent)) {
    return fileContent;
  }

  const lines = fileContent.split('\n');
  const useClientIndex = lines.findIndex(line => line.trim() === '\'use client\';' || line.trim() === '"use client";');
  const importLine = `import Script from 'next/script';`;

  if (useClientIndex !== -1) {
    lines.splice(useClientIndex + 1, 0, importLine);
    return lines.join('\n');
  }

  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex !== -1) {
    lines.splice(lastImportIndex + 1, 0, importLine);
    return lines.join('\n');
  }

  return `${importLine}\n${fileContent}`;
}

function injectGa4Snippet(fileContent: string, measurementId: string): string {
  if (fileContent.includes('gtm-toolkit-ga4')) {
    return fileContent;
  }

  const snippet = [
    '',
    `      <Script id="gtm-toolkit-ga4" strategy="afterInteractive" src="https://www.googletagmanager.com/gtag/js?id=${measurementId}" />`,
    `      <Script id="gtm-toolkit-ga4-inline" strategy="afterInteractive">`,
    '        { `',
    '          window.dataLayer = window.dataLayer || [];',
    '          function gtag(){window.dataLayer.push(arguments);}',
    "          gtag('js', new Date());",
    `          gtag('config', '${measurementId}');`,
    '        ` }',
    '      </Script>'
  ].join('\n');

  if (fileContent.includes('</body>')) {
    return fileContent.replace('</body>', `${snippet}\n    </body>`);
  }

  return `${fileContent}${snippet}\n`;
}

interface SiteMetadataScanResult {
  siteName?: string;
  siteUrl?: string;
  defaultTitle?: string;
  defaultDescription?: string;
}

interface DetectionPromptOptions {
  label: string;
  detectedValue?: string;
  promptMessage: string;
  defaultValue: string;
}

async function scanSiteMetadata(): Promise<SiteMetadataScanResult> {
  const result: SiteMetadataScanResult = {};

  const packageJsonPath = path.resolve('package.json');
  if (await fs.pathExists(packageJsonPath)) {
    try {
      const pkg = await fs.readJSON(packageJsonPath);
      if (typeof pkg.name === 'string' && pkg.name.trim().length > 0) {
        result.siteName = formatSiteName(pkg.name.trim());
      }
      if (typeof pkg.description === 'string' && pkg.description.trim().length > 0) {
        result.defaultDescription = pkg.description.trim();
      }
      if (typeof pkg.homepage === 'string' && pkg.homepage.trim().startsWith('http')) {
        result.siteUrl = pkg.homepage.trim();
      }
    } catch (error) {
      console.warn(chalk.yellow(`\n⚠️  Unable to parse package.json for metadata: ${(error as Error).message}`));
    }
  }

  const htmlCandidates = ['public/index.html', 'public/app.html'];
  for (const candidate of htmlCandidates) {
    const fullPath = path.resolve(candidate);
    if (!await fs.pathExists(fullPath)) {
      continue;
    }

    try {
      const content = await fs.readFile(fullPath, 'utf8');
      if (!result.defaultTitle) {
        const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
        if (titleMatch && titleMatch[1].trim()) {
          result.defaultTitle = titleMatch[1].trim();
        }
      }

      if (!result.defaultDescription) {
        const descriptionMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        if (descriptionMatch && descriptionMatch[1].trim()) {
          result.defaultDescription = descriptionMatch[1].trim();
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`\n⚠️  Failed to inspect ${candidate}: ${(error as Error).message}`));
    }
  }

  const layoutCandidates = [
    'app/layout.tsx',
    'app/layout.jsx',
    'app/layout.ts',
    'app/layout.js',
    'src/app/layout.tsx',
    'src/app/layout.jsx',
    'src/app/layout.ts',
    'src/app/layout.js',
    'app/head.tsx',
    'app/head.jsx',
    'app/root.tsx',
    'app/root.jsx',
    'src/app/root.tsx',
    'src/app/root.jsx',
    'pages/_document.tsx',
    'pages/_document.jsx',
    'src/pages/_document.tsx',
    'src/pages/_document.jsx',
    'app/routes/_index.tsx',
    'app/routes/_index.jsx'
  ];

  for (const candidate of layoutCandidates) {
    const fullPath = path.resolve(candidate);
    if (!await fs.pathExists(fullPath)) {
      continue;
    }

    try {
      const content = await fs.readFile(fullPath, 'utf8');

      if (!result.defaultTitle) {
        const titleMatch = content.match(/title:\s*['"`]([^'"`]+)['"`]/i);
        if (titleMatch && titleMatch[1].trim()) {
          result.defaultTitle = titleMatch[1].trim();
        }
      }

      if (!result.defaultDescription) {
        const descMatch =
          content.match(/description:\s*['"`]([^'"`]+)['"`]/i) ||
          content.match(/name:\s*['"`]description['"`]\s*,\s*content:\s*['"`]([^'"`]+)['"`]/i);
        if (descMatch && descMatch[1].trim()) {
          result.defaultDescription = descMatch[1].trim();
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`\n⚠️  Failed to inspect ${candidate}: ${(error as Error).message}`));
    }
  }

  if (!result.siteUrl) {
    const sitemapConfigs = [
      'next-sitemap.config.js',
      'next-sitemap.config.cjs',
      'next-sitemap.config.mjs',
      'next-sitemap.config.ts'
    ];

    for (const candidate of sitemapConfigs) {
      const fullPath = path.resolve(candidate);
      if (!await fs.pathExists(fullPath)) {
        continue;
      }

      try {
        const content = await fs.readFile(fullPath, 'utf8');
        const siteUrlMatch = content.match(/siteUrl\s*:\s*['"`]([^'"`]+)['"`]/i);
        if (siteUrlMatch && siteUrlMatch[1].trim()) {
          result.siteUrl = siteUrlMatch[1].trim();
          break;
        }
      } catch (error) {
        console.warn(chalk.yellow(`\n⚠️  Failed to inspect ${candidate}: ${(error as Error).message}`));
      }
    }
  }

  if (!result.defaultTitle && result.siteName) {
    result.defaultTitle = result.siteName;
  }

  return result;
}

async function promptWithDetection(options: DetectionPromptOptions): Promise<string> {
  const detected = options.detectedValue?.trim();

  if (detected) {
    console.log(chalk.gray(`Detected ${options.label}: ${detected}`));
  }

  const { value } = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message: options.promptMessage,
      default: detected || options.defaultValue,
      filter: (input: string) => input.trim(),
      validate: (input: string) => input.trim().length > 0 || `Please provide a ${options.label}.`
    }
  ]);

  return value.trim();
}

async function promptForSiteUrl(detectedValue?: string): Promise<string> {
  const detected = detectedValue?.trim();

  if (detected) {
    console.log(chalk.gray(`Detected site URL: ${detected}`));
  }

  const { siteUrl } = await inquirer.prompt([
    {
      type: 'input',
      name: 'siteUrl',
      message: 'What is your site URL?',
      default: detected || 'https://example.com',
      filter: (input: string) => input.trim(),
      validate: (input: string) => {
        try {
          // eslint-disable-next-line no-new
          new URL(input);
          return true;
        } catch {
          return 'Please enter a valid URL (include http or https).';
        }
      }
    }
  ]);

  return siteUrl.trim();
}

async function applySiteMetadata(metadata: {
  siteName: string;
  siteUrl: string;
  defaultTitle: string;
  defaultDescription: string;
}): Promise<void> {
  const updates: string[] = [];
  const indexHtmlPath = path.resolve('public', 'index.html');

  if (await fs.pathExists(indexHtmlPath)) {
    try {
      const original = await fs.readFile(indexHtmlPath, 'utf8');
      let updated = original;

      if (metadata.defaultTitle) {
        if (/<title>[\s\S]*?<\/title>/i.test(updated)) {
          updated = updated.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.defaultTitle)}</title>`);
        } else {
          updated = updated.replace(/<head([^>]*)>/i, `<head$1>\n  <title>${escapeHtml(metadata.defaultTitle)}</title>`);
        }
      }

      if (metadata.defaultDescription) {
        if (/<meta\s+name=["']description["'][^>]*>/i.test(updated)) {
          updated = updated.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${escapeHtml(metadata.defaultDescription)}">`);
        } else {
          updated = updated.replace(/<head([^>]*)>/i, `<head$1>\n  <meta name="description" content="${escapeHtml(metadata.defaultDescription)}">`);
        }
      }

      if (updated !== original) {
        await fs.writeFile(indexHtmlPath, updated, 'utf8');
        updates.push('public/index.html');
      }
    } catch (error) {
      console.warn(chalk.yellow(`\n⚠️  Failed to update public/index.html with metadata: ${(error as Error).message}`));
    }
  }

  const remixCandidates = [
    'app/root.tsx',
    'app/root.jsx',
    'src/app/root.tsx',
    'src/app/root.jsx'
  ];

  for (const candidate of remixCandidates) {
    const fullPath = path.resolve(candidate);
    if (!await fs.pathExists(fullPath)) {
      continue;
    }

    try {
      const original = await fs.readFile(fullPath, 'utf8');
      let updated = original;

      if (metadata.defaultTitle) {
        const titlePattern = /(\{\s*title:\s*['"`])([^'"`]+)(['"`]\s*[},])/;
        updated = updated.replace(titlePattern, (_match, prefix, _old, suffix) => `${prefix}${escapeJsString(metadata.defaultTitle)}${suffix}`);
      }

      if (metadata.defaultDescription) {
        const descPattern = /(name:\s*['"`]description['"`]\s*,\s*content:\s*['"`])([^'"`]+)(['"`])/i;
        updated = updated.replace(descPattern, (_match, prefix, _old, suffix) => `${prefix}${escapeJsString(metadata.defaultDescription)}${suffix}`);
      }

      if (updated !== original) {
        await fs.writeFile(fullPath, updated, 'utf8');
        updates.push(candidate);
      }
    } catch (error) {
      console.warn(chalk.yellow(`\n⚠️  Failed to update ${candidate} with metadata: ${(error as Error).message}`));
    }
  }

  if (updates.length > 0) {
    console.log(chalk.gray(`\n🛠️  Updated site metadata in ${updates.join(', ')}.`));
  }
}

async function ensureTargetAudienceDoc(options: {
  siteName: string;
  siteUrl: string;
  targetAudience: string;
  personas: string;
  jobsToBeDone: string;
  messagingSummary: string;
  messageResonates: boolean;
  messageAdjustments: string;
}): Promise<void> {
  const reportsDir = path.resolve('reports');
  await fs.ensureDir(reportsDir);

  const audiencePath = path.join(reportsDir, 'target-audience.md');

  const template = `# Target Audience Brief

**Site:** ${options.siteName}
**URL:** ${options.siteUrl}

## Primary Audience

${options.targetAudience || 'Not specified'}

## Core Personas

${options.personas.split(',').map(persona => `- ${persona.trim()}`).filter(Boolean).join('\n') || '- (Add personas here)'}

## Jobs To Be Done / Key Needs

${options.jobsToBeDone || 'Describe why this audience needs your solution.'}

## Core Messaging

${options.messagingSummary.trim()}

## Resonance Check

- Current messaging resonates: ${options.messageResonates ? 'Yes ✅' : 'Needs work ⚠️'}
${options.messageResonates ? '' : `- Adjustment notes: ${options.messageAdjustments || 'Add adjustments here.'}`}

---

Update this brief whenever you run new persona interviews, revisit ICP assumptions, or shift positioning. GTM Toolkit commands reference this document to keep audits and AI prompts aligned with the humans you build for.
`;

  await fs.writeFile(audiencePath, template, 'utf8');
  console.log(chalk.green(`\n🧭 Target audience brief saved to ${audiencePath}`));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case '\'':
        return '&#39;';
      default:
        return char;
    }
  });
}

function escapeJsString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/"/g, '\\"');
}

function formatSiteName(value: string): string {
  const cleaned = value.replace(/[@./\\]+/g, ' ').replace(/[-_]+/g, ' ');
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
    .trim();
}

function resolveRecommendedDependencies(framework: GTMConfig['framework'], analyticsProviders: AnalyticsSelection): string[] {
  const dependencies = new Set<string>();

  if (framework === 'nextjs') {
    dependencies.add('next-sitemap');
  }

  if (analyticsProviders.includes('posthog')) {
    dependencies.add('posthog-js');
  }

  if (analyticsProviders.includes('ga4')) {
    dependencies.add('react-ga4');
  }

  return Array.from(dependencies);
}
