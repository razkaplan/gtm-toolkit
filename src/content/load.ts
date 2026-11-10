import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import picomatch from 'picomatch';
import type { Spec } from '../spec/schema';
import { scanMarkdown, type ScannedMarkdown } from './text';

export type ContentType = 'article' | 'doc' | 'page';

export interface ContentItem {
  collection: string;
  type: ContentType;
  /** Path relative to the project root, forward slashes. */
  file: string;
  slug: string;
  url: string;
  /** Raw frontmatter. */
  data: Record<string, unknown>;
  /** Line of each top-level frontmatter key. */
  keyLines: Record<string, number>;
  title?: string;
  description?: string;
  /** Which frontmatter key the description came from. */
  descriptionKey?: string;
  /** YYYY-MM-DD when the date is valid. */
  date?: string;
  /** The date exactly as written, for format checks. */
  rawDate?: string;
  /** YYYY-MM-DD of the last substantive edit. */
  updated?: string;
  draft: boolean;
  noindex: boolean;
  personas: string[];
  topics: string[];
  pillars: string[];
  answers: string[];
  body: string;
  /** Line number of the first body line. */
  bodyLine: number;
  scanned: ScannedMarkdown;
}

const DESCRIPTION_KEYS = ['description', 'summary', 'excerpt'];

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number') return String(value);
  return undefined;
}

function asList(...values: unknown[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (Array.isArray(value)) out.push(...value.map((entry) => String(entry).trim()).filter(Boolean));
    else if (typeof value === 'string' && value.trim()) out.push(value.trim());
  }
  return [...new Set(out)];
}

/** Dates arrive as JS Dates (unquoted YAML) or strings. Normalise to YYYY-MM-DD or nothing. */
export function isoDate(value: unknown): string | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString().slice(0, 10);
  if (typeof value !== 'string') return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(value.trim());
  if (!match) return undefined;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== `${match[1]}-${match[2]}-${match[3]}`) return undefined;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function keyLines(raw: string): { lines: Record<string, number>; bodyLine: number } {
  const lines: Record<string, number> = {};
  const rows = raw.split(/\r?\n/);
  if (rows[0]?.trim() !== '---') return { lines, bodyLine: 1 };
  for (let index = 1; index < rows.length; index += 1) {
    if (/^(---|\.\.\.)\s*$/.test(rows[index])) return { lines, bodyLine: index + 2 };
    const key = /^([A-Za-z_][\w-]*)\s*:/.exec(rows[index]);
    if (key) lines[key[1]] = index + 1;
  }
  return { lines, bodyLine: 1 };
}

export function urlFor(pattern: string, relativePath: string): { slug: string; url: string } {
  const withoutExt = relativePath.replace(/\.(md|mdx)$/i, '');
  const slug = posix.basename(withoutExt);
  const path = withoutExt === 'index' ? '' : withoutExt.replace(/\/index$/, '');
  let url = pattern.replace('{slug}', slug).replace('{path}', path);
  url = url.replace(/\/{2,}/g, '/');
  if (url.length > 1) url = url.replace(/\/$/, '');
  return { slug, url };
}

export function parseContentFile(
  root: string,
  file: string,
  collection: string,
  type: ContentType,
  urlPattern: string,
  relativePath: string,
): ContentItem {
  const raw = readFileSync(join(root, file), 'utf8');
  let data: Record<string, unknown> = {};
  let body = raw;
  try {
    const parsed = matter(raw);
    data = (parsed.data ?? {}) as Record<string, unknown>;
    body = parsed.content;
  } catch {
    // Broken frontmatter is reported by the rules as a missing title.
  }
  const { lines, bodyLine } = keyLines(raw);
  const descriptionKey = DESCRIPTION_KEYS.find((key) => asString(data[key]));
  const rawDate = data.date instanceof Date ? isoDate(data.date) : asString(data.date);
  const { slug, url } = urlFor(urlPattern, relativePath);

  return {
    collection,
    type,
    file,
    slug,
    url,
    data,
    keyLines: lines,
    title: asString(data.title),
    description: descriptionKey ? asString(data[descriptionKey]) : undefined,
    descriptionKey,
    date: isoDate(data.date),
    rawDate,
    updated: isoDate(data.updated ?? data.lastmod ?? data.modified),
    draft: data.draft === true,
    noindex: data.noindex === true,
    personas: asList(data.persona, data.personas),
    topics: asList(data.topic, data.topics),
    pillars: asList(data.pillar, data.pillars),
    answers: asList(data.answers),
    body,
    bodyLine,
    scanned: scanMarkdown(body, bodyLine),
  };
}

/** Read every file of every collection. Sorted by file path, so output is stable. */
export function loadContent(root: string, spec: Spec): ContentItem[] {
  const ignored = spec.lint.ignore.length > 0 ? picomatch(spec.lint.ignore) : undefined;
  const items: ContentItem[] = [];
  for (const [name, collection] of Object.entries(spec.content.collections)) {
    const base = collection.path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
    if (!existsSync(join(root, base))) continue;
    const found = fg.sync(collection.include, { cwd: join(root, base), onlyFiles: true, dot: false }).sort();
    for (const relativePath of found) {
      const file = posix.join(base, relativePath);
      if (ignored?.(file)) continue;
      items.push(parseContentFile(root, file, name, collection.type, collection.url, relativePath));
    }
  }
  return items.sort((a, b) => a.file.localeCompare(b.file));
}

/** Published items: what a crawler or a reader can actually reach. */
export function published(items: ContentItem[]): ContentItem[] {
  return items.filter((item) => !item.draft);
}
