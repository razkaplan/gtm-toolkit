#!/usr/bin/env node
/**
 * Runtime and integration checks for gtm-toolkit.
 *
 * Run with: npm run runtime-check
 */

const { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } = require('fs');
const { tmpdir } = require('os');
const { join, resolve } = require('path');
const { spawnSync } = require('child_process');

async function main() {
  const root = resolve(__dirname, '..');
  const distEntry = join(root, 'dist', 'index.js');

  if (!existsSync(distEntry)) {
    throw new Error('Build artifacts not found. Run `npm run build` before runtime checks.');
  }

  const {
    lintContent,
    generateRobots,
    generateSitemap,
    researchKeywords
  } = require(distEntry);

  const tempRoot = mkdtempSync(join(tmpdir(), 'gtm-runtime-'));
  const contentDir = join(tempRoot, 'content');
  const blogDir = join(contentDir, 'blog');
  const publicDir = join(tempRoot, 'public');

  mkdirSync(blogDir, { recursive: true });
  mkdirSync(publicDir, { recursive: true });

  const sampleMarkdown = `---
title: "Modern Marketing as Code"
date: "2025-01-15"
category: "gtm"
summary: "Modern marketing playbooks for GTM as code with telemetry and growth reviews baked in."
Readtime: "5 min read"
tags:
  - marketing
  - gtm as code
---

# Embrace GTM as Code

Content as code unlocks velocity. Build guard rails, invest in telemetry, and keep growth loops observable.

## Why it matters

Marketing teams ship faster when campaigns live beside product code.

[Learn more](/docs/overview).`;

  const markdownPath = join(blogDir, '2025-01-15-modern-marketing.md');
  writeFileSync(markdownPath, sampleMarkdown, 'utf8');

  // SDK smoke checks ---------------------------------------------------------
  const lintResults = lintContent(sampleMarkdown, 'runtime-check.md');
  if (!Array.isArray(lintResults) || lintResults.length === 0) {
    throw new Error('lintContent returned no results');
  }

  const baseConfig = {
    framework: 'nextjs',
    analytics: {},
    seo: {
      siteName: 'Runtime Test Site',
      siteUrl: 'https://runtime.test',
      defaultTitle: 'Runtime Test',
      defaultDescription: 'Runtime checks for gtm-toolkit'
    },
    content: {
      contentPath: contentDir,
      blogPath: blogDir,
      outputPath: publicDir
    },
    robots: {
      allowAIBots: true,
      customRules: [],
      sitemapUrl: 'https://runtime.test/sitemap.xml'
    },
    geo: {
      enabled: true,
      optimizeForAI: true,
      structuredData: true
    }
  };

  const robotsTxt = generateRobots(baseConfig, { outputPath: publicDir, includeAnalytics: true });
  if (!robotsTxt.includes('User-agent')) {
    throw new Error('generateRobots did not produce expected output');
  }

  await generateSitemap(baseConfig, {
    contentPath: contentDir,
    outputPath: publicDir,
    staticPages: ['/', '/about']
  });

  const sitemapPath = join(publicDir, 'sitemap.xml');
  if (!existsSync(sitemapPath)) {
    throw new Error('generateSitemap did not create sitemap.xml');
  }

  const keywordResults = await researchKeywords({
    seedKeywords: ['gtm toolkit'],
    siteUrl: 'https://runtime.test'
  });
  if (!Array.isArray(keywordResults) || keywordResults.length === 0) {
    throw new Error('researchKeywords returned no keyword suggestions');
  }

  // CLI integration checks ---------------------------------------------------
  const configFile = join(tempRoot, 'gtm.config.js');
  writeFileSync(
    configFile,
    `module.exports = ${JSON.stringify(baseConfig, null, 2)};`,
    'utf8'
  );

  const lintStdout = runCli(
    ['lint', 'content/blog', '--format', 'json'],
    tempRoot,
    root
  );
  extractJSON(lintStdout); // throws if invalid JSON

  runCli(['generate', '--robots', '--sitemap'], tempRoot, root);

  const robotsFile = join(publicDir, 'robots.txt');
  if (!existsSync(robotsFile)) {
    throw new Error('CLI generate did not output robots.txt');
  }

  runCli(['analyze', '--keywords', 'gtm as code'], tempRoot, root);

  runCli(
    ['suggestions', 'content', '--no-ai', '--format', 'json', '--preview'],
    tempRoot,
    root
  );

  // Report success -----------------------------------------------------------
  console.log('✅ Runtime and integration checks completed successfully.');

  // Clean up temp artefacts
  rmSync(tempRoot, { recursive: true, force: true });
}

function runCli(args, cwd, root) {
  const result = spawnSync(
    process.execPath,
    [join(root, 'dist', 'cli.js'), ...args],
    {
      cwd,
      encoding: 'utf8'
    }
  );

  if (result.status !== 0) {
    const errorOutput = result.stderr || result.stdout || '<no output>';
    throw new Error(`CLI command failed (${args.join(' ')}):\n${errorOutput}`);
  }

  return result.stdout || '';
}

function extractJSON(output) {
  const lines = output.split(/\r?\n/);
  const startIndex = lines.findIndex(line => {
    const clean = stripAnsi(line).trim();
    return clean.startsWith('{') || clean.startsWith('[');
  });

  if (startIndex === -1) {
    throw new Error('JSON payload not found in CLI output');
  }

  const jsonText = lines
    .slice(startIndex)
    .map(line => stripAnsi(line))
    .join('\n')
    .trim();

  return JSON.parse(jsonText);
}

function stripAnsi(input) {
  return input.replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '');
}

main().catch(error => {
  console.error('❌ Runtime checks failed:', error);
  process.exit(1);
});
