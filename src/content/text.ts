/**
 * Text helpers shared by the spec validator and the content rules. Deliberately
 * line-based and dependency-free: every finding needs a line number, and the
 * rules only care about prose, headings, links and images.
 */

const WORD_CHAR = /[\p{L}\p{N}]/u;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive, whole-word when the term starts or ends with a letter or digit. */
export function termPattern(term: string): RegExp {
  const trimmed = term.trim();
  const head = WORD_CHAR.test(trimmed[0] ?? '') ? '(?<![\\p{L}\\p{N}])' : '';
  const tail = WORD_CHAR.test(trimmed[trimmed.length - 1] ?? '') ? '(?![\\p{L}\\p{N}])' : '';
  const body = escapeRegExp(trimmed).replace(/\s+/g, '\\s+');
  return new RegExp(`${head}${body}${tail}`, 'giu');
}

/** Index of the first match, or -1. */
export function findTerm(text: string, term: string): number {
  const match = termPattern(term).exec(text);
  return match ? match.index : -1;
}

export interface ProseLine {
  /** 1-based line in the source file. */
  line: number;
  /** The line with inline code blanked out, so columns still line up. */
  text: string;
  /** `text` with URLs blanked too: what a reader actually reads. Vocabulary rules use this. */
  copy: string;
}

export interface Heading {
  level: number;
  text: string;
  line: number;
}

export interface Link {
  text: string;
  url: string;
  line: number;
  column: number;
}

export interface Image {
  alt: string;
  src: string;
  line: number;
  column: number;
}

export interface ScannedMarkdown {
  prose: ProseLine[];
  headings: Heading[];
  links: Link[];
  images: Image[];
  /** Line of a code fence that is never closed. */
  unclosedFence?: number;
  words: number;
}

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const INLINE_LINK = /(!?)\[((?:[^\]\\]|\\.)*)\]\(\s*<?([^)\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
const HTML_IMG = /<img\b[^>]*>/gi;

function blank(match: string): string {
  return ' '.repeat(match.length);
}

/**
 * @param body markdown without frontmatter
 * @param firstLine line number of the first body line in the source file
 */
export function scanMarkdown(body: string, firstLine = 1): ScannedMarkdown {
  const out: ScannedMarkdown = { prose: [], headings: [], links: [], images: [], words: 0 };
  let fence: { marker: string; line: number } | undefined;

  body.split(/\r?\n/).forEach((raw, index) => {
    const line = firstLine + index;
    const fenceMatch = FENCE.exec(raw);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) fence = { marker, line };
      else if (marker[0] === fence.marker[0] && marker.length >= fence.marker.length) fence = undefined;
      return;
    }
    if (fence) return;

    const text = raw.replace(/`[^`\n]*`/g, blank);
    const copy = text
      .replace(INLINE_LINK, (all: string, _bang: string, label: string) => {
        const start = all.indexOf(label);
        return ' '.repeat(start) + label + ' '.repeat(all.length - start - label.length);
      })
      .replace(/<[^>]+>/g, blank)
      .replace(/\b(?:https?:\/\/|www\.)\S+/gi, blank);
    out.prose.push({ line, text, copy });

    const heading = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(text);
    if (heading) out.headings.push({ level: heading[1].length, text: heading[2].trim(), line });

    for (const match of text.matchAll(INLINE_LINK)) {
      const column = (match.index ?? 0) + 1;
      if (match[1] === '!') out.images.push({ alt: match[2].trim(), src: match[3], line, column });
      else out.links.push({ text: match[2].trim(), url: match[3], line, column });
    }
    for (const match of text.matchAll(HTML_IMG)) {
      const alt = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(match[0]);
      const src = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(match[0]);
      out.images.push({
        alt: (alt?.[1] ?? alt?.[2] ?? '').trim(),
        src: src?.[1] ?? src?.[2] ?? '',
        line,
        column: (match.index ?? 0) + 1,
      });
    }

    const visible = text.replace(INLINE_LINK, (_all, _bang, label: string) => label).replace(/[#>*_~|-]/g, ' ');
    out.words += visible.split(/\s+/).filter(Boolean).length;
  });

  if (fence) out.unclosedFence = fence.line;
  return out;
}

/** The first `count` words of the prose, for "does the opening mention X" checks. */
export function opening(scanned: ScannedMarkdown, count: number): string {
  const words: string[] = [];
  for (const line of scanned.prose) {
    if (/^\s{0,3}#{1,6}\s/.test(line.text)) continue;
    for (const word of line.text.split(/\s+/)) {
      if (!word) continue;
      words.push(word);
      if (words.length >= count) return words.join(' ');
    }
  }
  return words.join(' ');
}
