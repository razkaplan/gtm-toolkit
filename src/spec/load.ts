import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { LineCounter, parseDocument, type Document } from 'yaml';
import type { Diagnostic } from '../types';
import { SECTION_FILES, specSchema, type SectionName, type Spec } from './schema';

export const DEFAULT_SPEC_DIR = 'gtm';
export const ROOT_FILE = 'gtm.yaml';

export interface LoadOptions {
  /** Directory to start from. Defaults to process.cwd(). */
  cwd?: string;
  /** Spec directory, relative to the project root. Defaults to "gtm". */
  dir?: string;
}

interface ParsedFile {
  /** Path relative to the project root. */
  file: string;
  doc: Document.Parsed;
  lines: LineCounter;
}

export interface LoadResult {
  /** Absolute project root: the directory that contains the spec directory. */
  root: string;
  /** Spec directory relative to root. */
  dir: string;
  /** Present when the spec parsed and matched the schema. */
  spec?: Spec;
  /** Syntax and schema problems. Empty when spec is present. */
  diagnostics: Diagnostic[];
  /** Spec files that were read, relative to root. */
  files: string[];
  /** Look up where a value was declared, for precise messages. */
  locate(path: ReadonlyArray<string | number>): { file: string; line?: number; column?: number };
}

/** Walk up from cwd until a directory holding `<dir>/gtm.yaml` is found. */
export function findRoot(cwd: string = process.cwd(), dir: string = DEFAULT_SPEC_DIR): string | undefined {
  let current = resolve(cwd);
  for (;;) {
    if (existsSync(join(current, dir, ROOT_FILE))) return current;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function parseYamlFile(root: string, file: string, diagnostics: Diagnostic[]): ParsedFile {
  const lines = new LineCounter();
  const doc = parseDocument(readFileSync(join(root, file), 'utf8'), { lineCounter: lines, prettyErrors: true });
  for (const error of doc.errors) {
    const pos = error.linePos?.[0];
    diagnostics.push({
      rule: 'spec/yaml-syntax',
      severity: 'error',
      message: error.message.split('\n')[0],
      file,
      line: pos?.line,
      column: pos?.col,
    });
  }
  return { file, doc, lines };
}

function positionOf(parsed: ParsedFile, path: ReadonlyArray<string | number>): { line?: number; column?: number } {
  // Walk as deep as the document goes: a missing key reports its parent.
  for (let depth = path.length; depth >= 0; depth -= 1) {
    const node = depth === 0 ? parsed.doc.contents : parsed.doc.getIn(path.slice(0, depth), true);
    const range = (node as { range?: [number, number, number] } | null | undefined)?.range;
    if (range) {
      const pos = parsed.lines.linePos(range[0]);
      return { line: pos.line, column: pos.col };
    }
  }
  return {};
}

export function loadSpec(options: LoadOptions = {}): LoadResult {
  const dir = options.dir ?? DEFAULT_SPEC_DIR;
  const start = resolve(options.cwd ?? process.cwd());
  const root = findRoot(start, dir);
  const diagnostics: Diagnostic[] = [];

  if (!root) {
    return {
      root: start,
      dir,
      diagnostics: [
        {
          rule: 'spec/not-found',
          severity: 'error',
          message: `No ${dir}/${ROOT_FILE} found in ${start} or any parent directory.`,
          file: `${dir}/${ROOT_FILE}`,
          hint: 'Run `gtm init` to create one.',
        },
      ],
      files: [],
      locate: () => ({ file: `${dir}/${ROOT_FILE}` }),
    };
  }

  const rootFile = parseYamlFile(root, `${dir}/${ROOT_FILE}`, diagnostics);
  const raw = (rootFile.doc.toJS() ?? {}) as Record<string, unknown>;
  const sections = new Map<SectionName, ParsedFile>();

  for (const section of SECTION_FILES) {
    const yaml = [`${dir}/${section}.yaml`, `${dir}/${section}.yml`].find((candidate) => existsSync(join(root, candidate)));
    if (!yaml) continue;
    const parsed = parseYamlFile(root, yaml, diagnostics);
    if (raw && typeof raw === 'object' && section in raw) {
      diagnostics.push({
        rule: 'spec/duplicate-section',
        severity: 'error',
        message: `"${section}" is declared both in ${dir}/${ROOT_FILE} and in ${yaml}.`,
        file: yaml,
        hint: 'Keep one of them.',
      });
      continue;
    }
    sections.set(section, parsed);
    const value = parsed.doc.toJS() as unknown;
    if (value !== null && value !== undefined) raw[section] = value;
  }

  const files = [rootFile.file, ...[...sections.values()].map((parsed) => parsed.file)];

  const locate: LoadResult['locate'] = (path) => {
    const [head, ...rest] = path;
    const section = typeof head === 'string' ? sections.get(head as SectionName) : undefined;
    if (section) return { file: section.file, ...positionOf(section, rest) };
    return { file: rootFile.file, ...positionOf(rootFile, path) };
  };

  if (diagnostics.length > 0) return { root, dir, diagnostics, files, locate };

  const result = specSchema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const path = issue.path.filter((part): part is string | number => typeof part !== 'symbol');
      const where = locate(path);
      const label = path.length > 0 ? path.join('.') : 'spec';
      const unknownKeys = issue.code === 'unrecognized_keys' ? (issue as { keys?: string[] }).keys : undefined;
      diagnostics.push({
        rule: 'spec/schema',
        severity: 'error',
        message: unknownKeys
          ? `${label}: unknown ${unknownKeys.length > 1 ? 'keys' : 'key'} ${unknownKeys.map((key) => `"${key}"`).join(', ')}`
          : `${label}: ${/received undefined$/.test(issue.message) ? 'is required' : issue.message}`,
        ...where,
      });
    }
    return { root, dir, diagnostics, files, locate };
  }

  return { root, dir, spec: result.data, diagnostics, files, locate };
}

/** Parse a spec that is already in memory. Used by `gtm diff` to read old revisions. */
export function parseSpecFiles(files: Record<string, string>, dir: string = DEFAULT_SPEC_DIR): Spec | undefined {
  const rootText = files[`${dir}/${ROOT_FILE}`];
  if (rootText === undefined) return undefined;
  const raw = (parseDocument(rootText).toJS() ?? {}) as Record<string, unknown>;
  for (const section of SECTION_FILES) {
    const body = files[`${dir}/${section}.yaml`] ?? files[`${dir}/${section}.yml`];
    if (body === undefined || section in raw) continue;
    const value = parseDocument(body).toJS() as unknown;
    if (value !== null && value !== undefined) raw[section] = value;
  }
  const result = specSchema.safeParse(raw);
  return result.success ? result.data : undefined;
}
