import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UsageError, buildCommand, checkCommand, coverageCommand, diffCommand, explainCommand, lintCommand, rulesCommand, validateCommand } from '../src/commands';
import { init } from '../src/init';
import { RULES } from '../src/lint';
import { jsonSchemas, reference } from '../src/reference';
import { loadSpec } from '../src/spec/load';
import { SPEC_RULES, validateSpec } from '../src/spec/validate';
import { post, project } from './helpers';

let output = '';
beforeEach(() => {
  output = '';
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    output += String(chunk);
    return true;
  });
});
afterEach(() => vi.restoreAllMocks());

const BROKEN = post({ title: 'Short', date: '2026-01-06' }, 'See [the plan](/nope).\n');

describe('commands', () => {
  it('validate exits 0 on a sound spec and 1 on a broken one', () => {
    expect(validateCommand({ cwd: project() })).toBe(0);
    expect(output).toContain('No problems');
    expect(validateCommand({ cwd: project({ 'gtm/personas.yaml': '- id: Bad Id\n  name: x\n' }) })).toBe(1);
    expect(validateCommand({ cwd: mkdtempSync(join(tmpdir(), 'gtm-empty-')) })).toBe(1);
    expect(output).toContain('Run `gtm init`');
  });

  it('lint exits 1 on errors, and 0 on warnings unless --max-warnings says otherwise', () => {
    const broken = project({ 'content/blog/2026-01-06-case.md': BROKEN });
    expect(lintCommand([], { cwd: broken })).toBe(1);
    expect(output).toContain('content/blog/2026-01-06-case.md');
    expect(output).toContain('seo/internal-links');

    const warned = project({ 'content/blog/2026-01-06-case.md': post({ title: 'Short', description: 'd'.repeat(80), date: '2026-01-06' }) });
    expect(lintCommand([], { cwd: warned })).toBe(0);
    expect(lintCommand([], { cwd: warned, maxWarnings: '0' })).toBe(1);
    expect(lintCommand([], { cwd: warned, maxWarnings: '0', quiet: true })).toBe(0);
  });

  it('lint narrows to the paths it is given and rejects paths outside every collection', () => {
    const root = project({ 'content/blog/2026-01-06-case.md': BROKEN });
    expect(lintCommand(['content/docs'], { cwd: root })).toBe(0);
    expect(lintCommand(['content/blog/2026-01-06-case.md'], { cwd: root })).toBe(1);
    expect(() => lintCommand(['README.md'], { cwd: root })).toThrow(UsageError);
  });

  it('lint --format json and github are machine-readable', () => {
    const root = project({ 'content/blog/2026-01-06-case.md': BROKEN });
    lintCommand([], { cwd: root, format: 'json' });
    const report = JSON.parse(output);
    expect(report.errors).toBe(2);
    expect(report.diagnostics[0]).toMatchObject({ file: 'content/blog/2026-01-06-case.md', severity: 'error' });

    output = '';
    lintCommand([], { cwd: root, format: 'github' });
    expect(output).toContain('::error file=content/blog/2026-01-06-case.md,line=6,col=5,title=seo/internal-links::Link target /nope does not exist.');
    expect(() => lintCommand([], { cwd: root, format: 'xml' })).toThrow(UsageError);
  });

  it('build writes files, then --check passes until something drifts', () => {
    const root = project();
    expect(buildCommand({ cwd: root, check: true })).toBe(1);
    expect(buildCommand({ cwd: root, dryRun: true })).toBe(0);
    expect(existsSync(join(root, 'GTM.md'))).toBe(false);
    expect(buildCommand({ cwd: root })).toBe(0);
    expect(buildCommand({ cwd: root, check: true })).toBe(0);

    writeFileSync(join(root, 'content/blog/2026-01-09-new.md'), post({ title: 'A brand new article appears', description: 'n'.repeat(80), date: '2026-01-09' }));
    output = '';
    expect(buildCommand({ cwd: root, check: true })).toBe(1);
    expect(output).toContain('public/sitemap.xml');
    expect(output).toContain('Run `gtm build` and commit the result.');
  });

  it('check runs all three stages', () => {
    const root = project();
    expect(checkCommand({ cwd: root })).toBe(1);
    expect(output).toMatch(/✓ validate\s+ok/);
    expect(output).toMatch(/✖ build/);
    buildCommand({ cwd: root });
    output = '';
    expect(checkCommand({ cwd: root })).toBe(0);
    expect(output).toContain('No problems');
  });

  it('coverage prints the open questions as a backlog', () => {
    expect(coverageCommand({ cwd: project(), format: 'md' })).toBe(0);
    expect(output).toContain('### Questions: 0 of 3 answered');
    expect(output).toContain('- [ ] What is GTM as code? (persona:founder)');
  });

  it('diff compares the working tree with a git ref', () => {
    const root = project();
    const git = (...args: string[]) => execFileSync('git', ['-c', 'user.email=t@t.co', '-c', 'user.name=t', ...args], { cwd: root, stdio: 'pipe' });
    git('init', '-q');
    git('add', '-A');
    git('commit', '-qm', 'init');
    expect(diffCommand('HEAD', { cwd: root })).toBe(0);
    expect(output).toContain('No spec changes since HEAD.');
    writeFileSync(join(root, 'gtm/topics.yaml'), readFileSync(join(root, 'gtm/topics.yaml'), 'utf8').replace('id: gtm-as-code', 'id: renamed'));
    output = '';
    diffCommand('HEAD', { cwd: root, format: 'md' });
    expect(output).toContain('`- topics[gtm-as-code]`');
    expect(output).toContain('`topic:gtm-as-code`: content/blog/2026-01-05-what-gtm-as-code-means.md');
    expect(() => diffCommand('no-such-ref', { cwd: root })).toThrow(UsageError);
  });

  it('rules and explain describe every rule', () => {
    expect(rulesCommand({ cwd: project() })).toBe(0);
    for (const rule of RULES) expect(output).toContain(rule.id);
    for (const id of [...RULES.map((rule) => rule.id), ...SPEC_RULES.map((rule) => rule.id)]) expect(explainCommand(id)).toBe(0);
    expect(() => explainCommand('seo/nope')).toThrow(UsageError);
  });
});

describe('init', () => {
  it('scaffolds a spec that validates, detecting what the project already has', () => {
    const root = mkdtempSync(join(tmpdir(), 'gtm-init-'));
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'acme', description: 'Rockets.', homepage: 'https://www.acme.dev/about' }));
    const first = init({ root });
    expect(first.written).toHaveLength(6);

    const loaded = loadSpec({ cwd: root });
    expect(loaded.diagnostics).toEqual([]);
    expect(loaded.spec?.site).toMatchObject({ name: 'acme', url: 'https://www.acme.dev', description: 'Rockets.' });
    expect(validateSpec(loaded, () => true).filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('never overwrites a file', () => {
    const root = project();
    const before = readFileSync(join(root, 'gtm/gtm.yaml'), 'utf8');
    const result = init({ root });
    expect(result.skipped).toContain('gtm/gtm.yaml');
    expect(result.written).toEqual(['gtm/positioning.yaml', 'gtm/competitors.yaml']);
    expect(readFileSync(join(root, 'gtm/gtm.yaml'), 'utf8')).toBe(before);
  });

  it('carries settings over from a 0.x gtm.config.js', () => {
    const root = mkdtempSync(join(tmpdir(), 'gtm-legacy-'));
    writeFileSync(join(root, 'gtm.config.js'), 'module.exports = { seo: { siteName: "Old", siteUrl: "https://old.dev/", defaultDescription: "Old site." }, robots: { allowAIBots: false } };');
    const result = init({ root, minimal: true });
    expect(result.written).toEqual(['gtm/gtm.yaml']);
    expect(result.notes[0]).toContain('gtm.config.js');
    const spec = loadSpec({ cwd: root }).spec;
    expect(spec?.site).toMatchObject({ name: 'Old', url: 'https://old.dev', description: 'Old site.' });
    expect(spec?.crawlers.ai.training).toBe('disallow');
  });
});

describe('reference', () => {
  it('describes the real command tree', () => {
    const program = new Command();
    program.command('lint').description('Lint.').argument('[paths...]').option('--quiet', 'errors only');
    program.command('reference', { hidden: true });
    const ref = reference(program) as { commands: Array<{ name: string; options: unknown[] }>; rules: unknown[] };
    expect(ref.commands.map((command) => command.name)).toEqual(['lint']);
    expect(ref.rules).toHaveLength(RULES.length);
  });

  it('emits a JSON Schema per spec file', () => {
    const schemas = jsonSchemas() as Record<string, { type?: string; properties?: Record<string, unknown> }>;
    expect(Object.keys(schemas).sort()).toEqual(['competitors', 'gtm', 'messaging', 'personas', 'positioning', 'topics']);
    expect(schemas.gtm.properties).toHaveProperty('site');
    expect(schemas.personas.type).toBe('array');
  });

  it('keeps the README honest about how many rules exist', () => {
    const readme = readFileSync(join(__dirname, '..', 'README.md'), 'utf8');
    expect(readme).toContain(`${RULES.length} content rules`);
    expect(readme).toContain(`${SPEC_RULES.length} spec checks`);
    for (const rule of RULES) expect(readme).toContain(`\`${rule.id}\``);
  });
});
