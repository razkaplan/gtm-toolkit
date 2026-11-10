import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import pc from 'picocolors';
import { buildArtifacts, planArtifacts, writeArtifacts, type PlannedArtifact } from './build';
import { loadContent, type ContentItem } from './content/load';
import { coverage, type CoverageReport } from './coverage';
import { changedFiles, diffSpecs, impactOf, specAtRef, type Change } from './diff';
import { init } from './init';
import { RULES, checkRuleConfig, getRule, lintContent, resolveRule } from './lint';
import { FORMATS, formatDiagnostics, summaryLine, table, type Format } from './report/format';
import { loadSpec, type LoadResult } from './spec/load';
import type { Spec } from './spec/schema';
import { SPEC_RULES, validateSpec } from './spec/validate';
import { countBySeverity, type Diagnostic } from './types';

export interface GlobalOptions {
  cwd?: string;
  dir?: string;
}

interface Loaded extends LoadResult {
  spec: Spec;
}

const print = (text = ''): void => {
  process.stdout.write(`${text}\n`);
};

function asFormat(value: string | undefined, allowed: readonly string[] = FORMATS): string {
  const format = value ?? 'stylish';
  if (!allowed.includes(format)) throw new UsageError(`Unknown format "${format}". Use one of: ${allowed.join(', ')}.`);
  return format;
}

export class UsageError extends Error {}

/** Load the spec or print why it could not be loaded. */
function load(options: GlobalOptions, format: Format): Loaded | undefined {
  const loaded = loadSpec({ cwd: options.cwd, dir: options.dir });
  if (!loaded.spec) {
    print(formatDiagnostics(loaded.diagnostics, format));
    return undefined;
  }
  return loaded as Loaded;
}

function specDiagnostics(loaded: Loaded): Diagnostic[] {
  return [...validateSpec(loaded, (path) => existsSync(join(loaded.root, path))), ...checkRuleConfig(loaded)];
}

function exitCode(diagnostics: Diagnostic[], maxWarnings?: number): number {
  const { errors, warnings } = countBySeverity(diagnostics);
  if (errors > 0) return 1;
  if (maxWarnings !== undefined && warnings > maxWarnings) return 1;
  return 0;
}

// ---------------------------------------------------------------- validate

export function validateCommand(options: GlobalOptions & { format?: string }): number {
  const format = asFormat(options.format) as Format;
  const loaded = load(options, format);
  if (!loaded) return 1;
  const diagnostics = specDiagnostics(loaded);
  if (format === 'stylish') {
    const spec = loaded.spec;
    const count = (n: number, noun: string): string => `${n} ${noun}${n === 1 ? '' : 's'}`;
    print(
      pc.dim(
        `${count(loaded.files.length, 'spec file')}: ${count(spec.personas.length, 'persona')}, ` +
          `${count(spec.messaging?.pillars.length ?? 0, 'pillar')}, ${count(spec.topics.length, 'topic')}, ${count(spec.competitors.length, 'competitor')}`,
      ),
    );
  }
  print(formatDiagnostics(diagnostics, format));
  return exitCode(diagnostics);
}

// -------------------------------------------------------------------- lint

export interface LintCommandOptions extends GlobalOptions {
  format?: string;
  changed?: string | boolean;
  maxWarnings?: string;
  quiet?: boolean;
}

function selectFiles(loaded: Loaded, items: ContentItem[], paths: string[], options: LintCommandOptions): string[] | undefined {
  let only: Set<string> | undefined;
  if (paths.length > 0) {
    const base = resolve(options.cwd ?? process.cwd());
    const wanted = paths.map((path) => relative(loaded.root, resolve(base, path)).replace(/\\/g, '/'));
    only = new Set(items.filter((item) => wanted.some((path) => item.file === path || item.file.startsWith(`${path.replace(/\/$/, '')}/`))).map((item) => item.file));
    if (only.size === 0) throw new UsageError(`No content files matched: ${paths.join(', ')}. Files must belong to a collection in gtm.yaml.`);
  }
  if (options.changed) {
    const changed = new Set(changedFiles(loaded.root, typeof options.changed === 'string' ? options.changed : 'origin/HEAD'));
    const pool = only ?? new Set(items.map((item) => item.file));
    only = new Set([...pool].filter((file) => changed.has(file)));
  }
  return only ? [...only] : undefined;
}

export function lintCommand(paths: string[], options: LintCommandOptions): number {
  const format = asFormat(options.format) as Format;
  const loaded = load(options, format);
  if (!loaded) return 1;
  const items = loadContent(loaded.root, loaded.spec);
  const only = selectFiles(loaded, items, paths, options);
  let diagnostics = lintContent(loaded.root, loaded.spec, items, { only });
  if (options.quiet) diagnostics = diagnostics.filter((d) => d.severity === 'error');
  if (format === 'stylish') {
    const count = only ? only.length : items.filter((item) => loaded.spec.content.collections[item.collection]?.lint !== false).length;
    print(pc.dim(`${count} content ${count === 1 ? 'file' : 'files'}, ${RULES.length} rules`));
  }
  print(formatDiagnostics(diagnostics, format));
  const max = options.maxWarnings === undefined ? undefined : Number(options.maxWarnings);
  if (max !== undefined && Number.isNaN(max)) throw new UsageError('--max-warnings takes a number.');
  return exitCode(diagnostics, max);
}

// ------------------------------------------------------------------- build

export interface BuildCommandOptions extends GlobalOptions {
  check?: boolean;
  dryRun?: boolean;
  format?: string;
}

function staleDiagnostics(planned: PlannedArtifact[]): Diagnostic[] {
  return planned
    .filter((artifact) => artifact.status !== 'unchanged')
    .map((artifact) => ({
      rule: 'build/stale',
      severity: 'error' as const,
      file: artifact.path,
      line: artifact.firstDiff?.line,
      message:
        artifact.status === 'missing'
          ? 'Generated file is missing.'
          : `Generated file is out of date${artifact.firstDiff ? `: expected "${artifact.firstDiff.expected.slice(0, 80)}"` : ''}.`,
      hint: 'Run `gtm build` and commit the result.',
    }));
}

function plan(loaded: Loaded): PlannedArtifact[] {
  const items = loadContent(loaded.root, loaded.spec);
  return planArtifacts(loaded.root, buildArtifacts(loaded.spec, items, loaded.dir));
}

export function buildCommand(options: BuildCommandOptions): number {
  const format = asFormat(options.format) as Format;
  const loaded = load(options, format);
  if (!loaded) return 1;
  const planned = plan(loaded);

  if (options.check) {
    const diagnostics = staleDiagnostics(planned);
    if (format === 'stylish' && diagnostics.length === 0) print(pc.green(`✓ ${planned.length} generated files are up to date`));
    else print(formatDiagnostics(diagnostics, format));
    return exitCode(diagnostics);
  }

  if (!options.dryRun) writeArtifacts(loaded.root, planned);
  if (format === 'json') {
    print(JSON.stringify(planned.map(({ name, path, status }) => ({ name, path, status })), null, 2));
    return 0;
  }
  const verb = {
    unchanged: ['unchanged', pc.dim],
    changed: [options.dryRun ? 'would update' : 'updated', pc.yellow],
    missing: [options.dryRun ? 'would create' : 'created', pc.green],
  } as const;
  for (const artifact of planned) {
    const [label, color] = verb[artifact.status];
    print(`  ${color(label.padEnd(12))}  ${artifact.path}`);
  }
  return 0;
}

// ---------------------------------------------------------------- coverage

function coverageMarkdown(report: CoverageReport): string {
  const rows = (title: string, list: CoverageReport['personas']): string[] =>
    list.length === 0 ? [] : [`### ${title}`, '', '| id | name | pieces | newest |', '| --- | --- | ---: | --- |', ...list.map((row) => `| ${row.id} | ${row.name} | ${row.items} | ${row.newest ?? ''} |`), ''];
  const open = report.questions.filter((question) => question.answeredBy.length === 0);
  return [
    '## GTM coverage',
    '',
    `${report.totals.tagged} of ${report.totals.published} published articles are tagged with a topic or persona.`,
    '',
    ...rows('Personas', report.personas),
    ...rows('Topics', report.topics),
    ...rows('Pillars', report.pillars),
    `### Questions: ${report.questions.length - open.length} of ${report.questions.length} answered`,
    '',
    ...open.map((question) => `- [ ] ${question.question} (${question.askedBy})`),
    '',
  ].join('\n');
}

export function coverageCommand(options: GlobalOptions & { format?: string }): number {
  const format = asFormat(options.format, ['stylish', 'json', 'md']);
  const loaded = load(options, format === 'json' ? 'json' : 'stylish');
  if (!loaded) return 1;
  const report = coverage(loaded.spec, loadContent(loaded.root, loaded.spec));

  if (format === 'json') {
    print(JSON.stringify(report, null, 2));
    return 0;
  }
  if (format === 'md') {
    print(coverageMarkdown(report));
    return 0;
  }

  const section = (title: string, list: CoverageReport['personas']): void => {
    if (list.length === 0) return;
    print(pc.bold(title));
    print(
      table(
        ['id', 'pieces', 'newest'],
        list.map((row) => [row.id, row.items === 0 ? pc.red('0') : String(row.items), row.newest ?? '']),
      ),
    );
    print();
  };
  print(`${report.totals.tagged} of ${report.totals.published} published articles are tagged with a topic or persona.`);
  print();
  section('Personas', report.personas);
  section('Topics', report.topics);
  section('Pillars', report.pillars);
  const open = report.questions.filter((question) => question.answeredBy.length === 0);
  print(pc.bold(`Questions: ${report.questions.length - open.length} of ${report.questions.length} answered`));
  for (const question of open) print(`  ${pc.yellow('○')} ${question.question} ${pc.dim(question.askedBy)}`);
  for (const question of report.questions.filter((entry) => entry.answeredBy.length > 0)) {
    print(`  ${pc.green('●')} ${question.question} ${pc.dim(question.answeredBy.join(', '))}`);
  }
  return 0;
}

// -------------------------------------------------------------------- diff

function show(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 90 ? `${text.slice(0, 87)}...` : text;
}

function diffLines(changes: Change[], markdown: boolean): string[] {
  const mark = { added: '+', removed: '-', changed: '~' } as const;
  const color = { added: pc.green, removed: pc.red, changed: pc.yellow } as const;
  return changes.map((change) => {
    const detail =
      change.kind === 'added' ? show(change.after) : change.kind === 'removed' ? show(change.before) : `${show(change.before)} → ${show(change.after)}`;
    return markdown ? `- \`${mark[change.kind]} ${change.path}\` ${detail}` : `  ${color[change.kind](mark[change.kind])} ${pc.bold(change.path)}  ${detail}`;
  });
}

export function diffCommand(base: string | undefined, options: GlobalOptions & { format?: string }): number {
  const format = asFormat(options.format, ['stylish', 'json', 'md']);
  const loaded = load(options, format === 'json' ? 'json' : 'stylish');
  if (!loaded) return 1;
  const ref = base ?? 'HEAD';
  let before: Spec | undefined;
  try {
    before = specAtRef(loaded.root, ref, loaded.dir);
  } catch (error) {
    throw new UsageError((error as Error).message);
  }
  if (!before) {
    print(`No valid spec at ${ref}. Everything in ${loaded.dir}/ is new.`);
    return 0;
  }
  const changes = diffSpecs(before, loaded.spec);
  const impact = impactOf(changes, loadContent(loaded.root, loaded.spec));

  if (format === 'json') {
    print(JSON.stringify({ base: ref, changes, impact }, null, 2));
    return 0;
  }
  if (changes.length === 0) {
    print(format === 'md' ? `No GTM spec changes since \`${ref}\`.` : pc.dim(`No spec changes since ${ref}.`));
    return 0;
  }
  if (format === 'md') {
    print([`## GTM spec changes since \`${ref}\``, '', ...diffLines(changes, true)].join('\n'));
    if (impact.length > 0) {
      print(['', '### Content that still references removed ids', '', ...impact.map((entry) => `- \`${entry.removed}\`: ${entry.files.join(', ')}`)].join('\n'));
    }
    return 0;
  }
  print(pc.dim(`Spec changes since ${ref}:`));
  for (const line of diffLines(changes, false)) print(line);
  if (impact.length > 0) {
    print();
    print(pc.bold('Content that still references removed ids:'));
    for (const entry of impact) print(`  ${pc.red(entry.removed)}  ${entry.files.join(', ')}`);
  }
  return 0;
}

// ------------------------------------------------------------------- check

export function checkCommand(options: LintCommandOptions): number {
  const format = asFormat(options.format) as Format;
  const loaded = load(options, format);
  if (!loaded) return 1;
  const items = loadContent(loaded.root, loaded.spec);
  const spec = specDiagnostics(loaded);
  let lint = lintContent(loaded.root, loaded.spec, items);
  if (options.quiet) lint = lint.filter((d) => d.severity === 'error');
  const stale = staleDiagnostics(planArtifacts(loaded.root, buildArtifacts(loaded.spec, items, loaded.dir)));
  const all = [...spec, ...lint, ...stale];
  const max = options.maxWarnings === undefined ? undefined : Number(options.maxWarnings);

  if (format !== 'stylish') {
    print(formatDiagnostics(all, format));
    return exitCode(all, max);
  }
  const step = (label: string, diagnostics: Diagnostic[]): void => {
    const { errors, warnings } = countBySeverity(diagnostics);
    const status = errors > 0 ? pc.red('✖') : warnings > 0 ? pc.yellow('⚠') : pc.green('✓');
    print(`${status} ${label.padEnd(10)} ${pc.dim(errors + warnings === 0 ? 'ok' : `${errors} errors, ${warnings} warnings`)}`);
  };
  step('validate', spec);
  step('lint', lint);
  step('build', stale);
  if (all.length > 0) {
    print();
    print(formatDiagnostics(all, 'stylish'));
  } else {
    print(summaryLine(all));
  }
  return exitCode(all, max);
}

// ----------------------------------------------------------- rules, explain

export function rulesCommand(options: GlobalOptions & { format?: string }): number {
  const format = asFormat(options.format, ['stylish', 'json']);
  const loaded = loadSpec({ cwd: options.cwd, dir: options.dir });
  const rows = RULES.map((rule) => ({
    id: rule.id,
    default: rule.defaultSeverity,
    current: loaded.spec ? resolveRule(loaded.spec, rule, '').severity : rule.defaultSeverity,
    appliesTo: rule.appliesTo ?? ['article', 'doc', 'page'],
    description: rule.description,
  }));
  if (format === 'json') {
    print(JSON.stringify(rows, null, 2));
    return 0;
  }
  print(table(['rule', 'severity', 'description'], rows.map((row) => [row.id, row.current, row.description])));
  print();
  print(pc.dim(`${RULES.length} content rules. \`gtm explain <rule>\` says why each exists. \`gtm validate\` runs ${SPEC_RULES.length} more on the spec itself.`));
  return 0;
}

export function explainCommand(id: string): number {
  const rule = getRule(id);
  const specRule = SPEC_RULES.find((entry) => entry.id === id);
  if (!rule && !specRule) throw new UsageError(`Unknown rule "${id}". Run \`gtm rules\` to list them.`);
  if (rule) {
    print(pc.bold(rule.id));
    print(rule.description);
    print();
    print(rule.rationale);
    print();
    print(`Default: ${rule.defaultSeverity}${rule.appliesTo ? `, applies to: ${rule.appliesTo.join(', ')}` : ''}`);
    if (Object.keys(rule.defaultOptions as object).length > 0) print(`Options: ${JSON.stringify(rule.defaultOptions)}`);
    print();
    print(pc.dim(`Configure it in gtm.yaml under lint.rules, for example:\n  ${rule.id}: off`));
  } else if (specRule) {
    print(pc.bold(specRule.id));
    print(specRule.description);
    print();
    print(`Severity: ${specRule.severity}. Reported by \`gtm validate\`.`);
  }
  return 0;
}

// -------------------------------------------------------------------- init

export function initCommand(options: GlobalOptions & { name?: string; url?: string; description?: string; minimal?: boolean }): number {
  const root = resolve(options.cwd ?? process.cwd());
  const result = init({ root, dir: options.dir, name: options.name, url: options.url, description: options.description, minimal: options.minimal });
  for (const file of result.written) print(`  ${pc.green('created')}  ${file}`);
  for (const file of result.skipped) print(`  ${pc.dim('exists ')}  ${file}`);
  for (const note of result.notes) print(`\n${pc.yellow('!')} ${note}`);
  print();
  print('Next:');
  print(`  1. Replace the placeholders in ${options.dir ?? 'gtm'}/ with your real positioning, personas and messaging.`);
  print('  2. gtm validate     check the spec');
  print('  3. gtm lint         check your content against it');
  print('  4. gtm build        write robots.txt, sitemap.xml, llms.txt and GTM.md');
  return 0;
}
