#!/usr/bin/env node
/**
 * Security scan for hard-coded credentials/secrets.
 *
 * Run with: npm run security-check
 */

const { readFileSync } = require('fs');
const { join, resolve } = require('path');
const { globSync } = require('glob');

const root = resolve(__dirname, '..');

const EXCLUDED_DIRS = [
  'node_modules/**',
  'dist/**',
  '.git/**',
  '.turbo/**',
  '.next/**',
  'coverage/**'
];

const FILE_GLOB = '**/*.{ts,tsx,js,jsx,json,md,yml,yaml,env,sample}';

const PATTERNS = [
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'AWS Secret Key', regex: /(?:aws_secret_access_key|aws_secret_key)\s*[:=]\s*['"][A-Za-z0-9\/+=]{40}['"]/gi },
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z_\-]{35}/g },
  { name: 'OpenAI Key', regex: /sk-[a-zA-Z0-9]{20,}/g },
  { name: 'Slack Token', regex: /xox[baprs]-[a-zA-Z0-9-]{10,}/g },
  { name: 'Stripe Live Key', regex: /sk_live_[0-9A-Za-z]{24}/g },
  { name: 'Generic API Key Assignment', regex: /(apiKey|apikey|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/gi }
];

function main() {
  const matches = [];
  const files = globSync(FILE_GLOB, {
    cwd: root,
    ignore: EXCLUDED_DIRS,
    nodir: true
  });

  files.forEach(file => {
    const fullPath = join(root, file);
    const content = readFileSync(fullPath, 'utf8');
    PATTERNS.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.regex);
      while ((match = regex.exec(content)) !== null) {
        const line = getLineNumber(content, match.index);
        matches.push({
          file,
          line,
          pattern: pattern.name,
          snippet: getSnippet(content, match.index, match[0].length)
        });
      }
    });
  });

  if (matches.length > 0) {
    console.error('❌ Potential secrets detected:');
    matches.forEach(match => {
      console.error(
        `  • ${match.file}:${match.line} (${match.pattern}) → ${match.snippet}`
      );
    });
    process.exit(1);
  } else {
    console.log('✅ Security check passed – no hard-coded credentials detected.');
  }
}

function getLineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function getSnippet(content, index, length) {
  const snippet = content.substr(index, length);
  return snippet.replace(/\s+/g, ' ').trim();
}

main();
