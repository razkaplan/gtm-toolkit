import { execFileSync } from 'node:child_process';
import type { ContentItem } from './content/load';
import { parseSpecFiles } from './spec/load';
import type { Spec } from './spec/schema';

export interface Change {
  /** Dotted path, with id-keyed lists shown as personas[technical-founder]. */
  path: string;
  kind: 'added' | 'removed' | 'changed';
  before?: unknown;
  after?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasIds(list: unknown[]): list is Array<Record<string, unknown> & { id: string }> {
  return list.length > 0 && list.every((entry) => isRecord(entry) && typeof entry.id === 'string');
}

function walk(before: unknown, after: unknown, path: string, out: Change[]): void {
  if (before === undefined && after === undefined) return;
  if (before === undefined) {
    out.push({ path, kind: 'added', after });
    return;
  }
  if (after === undefined) {
    out.push({ path, kind: 'removed', before });
    return;
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    if ((hasIds(before) || before.length === 0) && (hasIds(after) || after.length === 0)) {
      const left = new Map((before as Array<{ id: string }>).map((entry) => [entry.id, entry]));
      const right = new Map((after as Array<{ id: string }>).map((entry) => [entry.id, entry]));
      for (const id of new Set([...left.keys(), ...right.keys()])) walk(left.get(id), right.get(id), `${path}[${id}]`, out);
      return;
    }
    if ([...before, ...after].every((entry) => typeof entry !== 'object' || entry === null)) {
      for (const entry of before) if (!after.includes(entry)) out.push({ path, kind: 'removed', before: entry });
      for (const entry of after) if (!before.includes(entry)) out.push({ path, kind: 'added', after: entry });
      return;
    }
    if (JSON.stringify(before) !== JSON.stringify(after)) out.push({ path, kind: 'changed', before, after });
    return;
  }
  if (isRecord(before) && isRecord(after)) {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      walk(before[key], after[key], path ? `${path}.${key}` : key, out);
    }
    return;
  }
  if (JSON.stringify(before) !== JSON.stringify(after)) out.push({ path, kind: 'changed', before, after });
}

/** A semantic diff of two specs: what changed in the strategy, not which lines moved. */
export function diffSpecs(before: Spec, after: Spec): Change[] {
  const out: Change[] = [];
  walk(before, after, '', out);
  return out;
}

export interface Impact {
  /** The id that was removed, as "persona:x", "topic:x" or "pillar:x". */
  removed: string;
  /** Content files that still reference it. */
  files: string[];
}

/** Content that still points at something the diff removed. */
export function impactOf(changes: Change[], items: ContentItem[]): Impact[] {
  const out: Impact[] = [];
  const kinds: Array<[RegExp, string, (item: ContentItem) => string[]]> = [
    [/^personas\[([^\]]+)\]$/, 'persona', (item) => item.personas],
    [/^topics\[([^\]]+)\]$/, 'topic', (item) => item.topics],
    [/^messaging\.pillars\[([^\]]+)\]$/, 'pillar', (item) => item.pillars],
  ];
  for (const change of changes) {
    if (change.kind !== 'removed') continue;
    for (const [pattern, noun, pick] of kinds) {
      const match = pattern.exec(change.path);
      if (!match) continue;
      const files = items.filter((item) => pick(item).includes(match[1])).map((item) => item.file);
      if (files.length > 0) out.push({ removed: `${noun}:${match[1]}`, files });
    }
  }
  return out;
}

function git(root: string, args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Read the spec as it was at a git ref. Undefined when it did not exist or did not parse. */
export function specAtRef(root: string, ref: string, dir = 'gtm'): Spec | undefined {
  let listing: string;
  try {
    listing = git(root, ['ls-tree', '-r', '--name-only', ref, '--', dir]);
  } catch (error) {
    throw new Error(`git could not read "${ref}": ${(error as { stderr?: string }).stderr?.trim() || (error as Error).message}`);
  }
  const files: Record<string, string> = {};
  for (const file of listing.split('\n').filter(Boolean)) {
    if (/\.ya?ml$/.test(file)) files[file] = git(root, ['show', `${ref}:${file}`]);
  }
  return parseSpecFiles(files, dir);
}

/** Content files changed against a ref, plus anything uncommitted or untracked. */
export function changedFiles(root: string, base: string): string[] {
  const out = new Set<string>();
  const collect = (args: string[]): void => {
    try {
      for (const file of git(root, args).split('\n')) if (file.trim()) out.add(file.trim());
    } catch {
      // A missing ref or a repo without commits just contributes nothing.
    }
  };
  collect(['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`]);
  collect(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']);
  collect(['ls-files', '--others', '--exclude-standard']);
  return [...out];
}
