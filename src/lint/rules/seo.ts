import { posix } from 'node:path';
import type { FileRule, ProjectRule, Rule } from '../types';

interface Range {
  min: number;
  max: number;
}

const title: FileRule = {
  id: 'seo/title',
  scope: 'file',
  description: 'Every page has a title in its frontmatter.',
  rationale: 'The title becomes the <title> tag, the search result headline and the link text in llms.txt. A page without one is invisible everywhere at once.',
  defaultSeverity: 'error',
  defaultOptions: {},
  check({ item, report }) {
    if (!item.title) report({ message: 'Missing `title` in frontmatter.', line: 1 });
  },
};

const titleLength: FileRule<Range> = {
  id: 'seo/title-length',
  scope: 'file',
  description: 'Titles fit the space search results give them.',
  rationale: 'Search engines cut titles at roughly 60 characters. Very short titles waste the most valuable line you own.',
  defaultSeverity: 'warn',
  defaultOptions: { min: 20, max: 65 },
  check({ item, options, report }) {
    if (!item.title) return;
    const length = [...item.title].length;
    if (length < options.min || length > options.max) {
      report({
        message: `Title is ${length} characters. Aim for ${options.min} to ${options.max}.`,
        line: item.keyLines.title,
      });
    }
  },
};

const description: FileRule = {
  id: 'seo/description',
  scope: 'file',
  description: 'Every page has a description (or summary) in its frontmatter.',
  rationale: 'The description is the meta description, the social card text and the one sentence an assistant reads in llms.txt before deciding whether to fetch the page.',
  defaultSeverity: 'error',
  defaultOptions: {},
  check({ item, report }) {
    if (!item.description) {
      report({ message: 'Missing `description` in frontmatter.', line: 1, hint: '`summary` and `excerpt` are accepted too.' });
    }
  },
};

const descriptionLength: FileRule<Range> = {
  id: 'seo/description-length',
  scope: 'file',
  description: 'Descriptions are long enough to say something and short enough to survive truncation.',
  rationale: 'Search results show about 160 characters. Past that the sentence is cut mid-thought; far below it you are leaving the pitch to the crawler.',
  defaultSeverity: 'warn',
  defaultOptions: { min: 70, max: 160 },
  check({ item, options, report }) {
    if (!item.description) return;
    const length = [...item.description].length;
    if (length < options.min || length > options.max) {
      report({
        message: `Description (\`${item.descriptionKey}\`) is ${length} characters. Aim for ${options.min} to ${options.max}.`,
        line: item.descriptionKey ? item.keyLines[item.descriptionKey] : undefined,
      });
    }
  },
};

const date: FileRule = {
  id: 'seo/date',
  scope: 'file',
  description: 'Articles carry a real date in YYYY-MM-DD form.',
  rationale: 'The date feeds the sitemap lastmod, the Article structured data and the ordering in llms.txt. A date that does not parse silently drops the page out of all three.',
  defaultSeverity: 'error',
  defaultOptions: {},
  appliesTo: ['article'],
  check({ item, report }) {
    if (item.rawDate === undefined) {
      report({ message: 'Missing `date` in frontmatter.', line: 1, hint: 'Use YYYY-MM-DD.' });
    } else if (!item.date) {
      report({ message: `Date "${item.rawDate}" is not a valid YYYY-MM-DD date.`, line: item.keyLines.date });
    }
  },
};

const slug: FileRule = {
  id: 'seo/slug',
  scope: 'file',
  description: 'URLs are lowercase words separated by hyphens.',
  rationale: 'Mixed case and underscores produce duplicate URLs and links that break when someone retypes them. Changing a live URL needs a redirect, so catch it before publishing.',
  defaultSeverity: 'warn',
  defaultOptions: {},
  check({ item, report }) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)) {
      report({ message: `Slug "${item.slug}" should be lowercase letters, digits and single hyphens.` });
    }
  },
};

const singleH1: FileRule = {
  id: 'seo/single-h1',
  scope: 'file',
  description: 'The frontmatter title is the only H1.',
  rationale: 'The page template renders the title as the H1. A second "# Heading" in the body gives the page two competing subjects.',
  defaultSeverity: 'error',
  defaultOptions: {},
  check({ item, report }) {
    if (!item.title) return;
    for (const heading of item.scanned.headings) {
      if (heading.level === 1) report({ message: `Extra H1 "${heading.text}". Start body headings at H2.`, line: heading.line });
    }
  },
};

const headingOrder: FileRule = {
  id: 'seo/heading-order',
  scope: 'file',
  description: 'Headings do not skip levels.',
  rationale: 'Screen readers, search engines and language models all use the heading tree as the outline of the page. An H2 followed by an H4 is a hole in the outline.',
  defaultSeverity: 'warn',
  defaultOptions: {},
  check({ item, report }) {
    let previous = 1;
    for (const heading of item.scanned.headings) {
      if (heading.level > previous + 1) {
        report({ message: `Heading jumps from H${previous} to H${heading.level}: "${heading.text}".`, line: heading.line });
      }
      previous = heading.level;
    }
  },
};

const imageAlt: FileRule = {
  id: 'seo/image-alt',
  scope: 'file',
  description: 'Images have alt text.',
  rationale: 'Alt text is what a blind reader hears, what an image search indexes and all a text-only model ever sees of your chart.',
  defaultSeverity: 'error',
  defaultOptions: {},
  check({ item, report }) {
    for (const image of item.scanned.images) {
      if (!image.alt) report({ message: `Image ${image.src || '(no src)'} has no alt text.`, line: image.line, column: image.column });
    }
  },
};

const VAGUE = /^(click here|here|this|link|read more|more|learn more|this link|this post|this article)$/i;

const linkText: FileRule = {
  id: 'seo/link-text',
  scope: 'file',
  description: 'Link text says where the link goes.',
  rationale: 'Anchor text is how crawlers and assistants learn what the target page is about. "Click here" teaches them nothing, and neither does a pasted URL.',
  defaultSeverity: 'warn',
  defaultOptions: {},
  check({ item, report }) {
    for (const link of item.scanned.links) {
      if (VAGUE.test(link.text) || /^(https?:\/\/|www\.)\S+$/i.test(link.text)) {
        report({ message: `Link text "${link.text}" does not describe its target.`, line: link.line, column: link.column });
      }
    }
  },
};

function stripSuffix(url: string): string {
  const path = url.split('#')[0].split('?')[0];
  return path.length > 1 ? path.replace(/\/$/, '') : path;
}

const internalLinks: FileRule = {
  id: 'seo/internal-links',
  scope: 'file',
  description: 'Internal links and images point at something that exists.',
  rationale: 'A link to a page that 404s wastes the click and the crawl. The toolkit knows every URL the site serves, so it can check before a reader does.',
  defaultSeverity: 'error',
  defaultOptions: {},
  check({ item, site, report }) {
    const targets = [
      ...item.scanned.links.map((link) => ({ url: link.url, line: link.line, column: link.column, kind: 'Link' })),
      ...item.scanned.images.map((image) => ({ url: image.src, line: image.line, column: image.column, kind: 'Image' })),
    ];
    for (const target of targets) {
      const url = target.url;
      if (!url || url.startsWith('#') || url.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(url)) continue;
      if (url.startsWith('/')) {
        const path = stripSuffix(url);
        if (site.urls.has(path) || site.hasAsset(path)) continue;
        report({
          message: `${target.kind} target ${path} does not exist.`,
          line: target.line,
          column: target.column,
          hint: 'If it is a real page that is not markdown, declare it under content.routes in gtm.yaml.',
        });
      } else {
        const file = posix.normalize(posix.join(posix.dirname(item.file), stripSuffix(url)));
        if (!site.hasFile(file)) {
          report({ message: `${target.kind} target ${url} does not exist (resolved to ${file}).`, line: target.line, column: target.column });
        }
      }
    }
  },
};

const minInternalLinks: FileRule<{ min: number }> = {
  id: 'seo/min-internal-links',
  scope: 'file',
  description: 'Articles link to at least one other page on the site.',
  rationale: 'An article with no internal links is a dead end for readers and an orphan for crawlers. One relevant link is the smallest unit of a content strategy.',
  defaultSeverity: 'warn',
  defaultOptions: { min: 1 },
  appliesTo: ['article'],
  check({ item, options, report }) {
    const internal = item.scanned.links.filter((link) => link.url.startsWith('/') && !link.url.startsWith('//')).length;
    if (internal < options.min) {
      report({ message: `${internal} internal ${internal === 1 ? 'link' : 'links'}. Add at least ${options.min}.` });
    }
  },
};

const PLACEHOLDERS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /lorem\s+ipsum/i, label: 'lorem ipsum' },
  { pattern: /\bTBD\b/, label: 'TBD' },
  { pattern: /\bFIXME\b/, label: 'FIXME' },
  { pattern: /\bTODO\b/, label: 'TODO' },
  { pattern: /\bXXX\b/, label: 'XXX' },
];

const placeholder: FileRule = {
  id: 'seo/placeholder',
  scope: 'file',
  description: 'No placeholder text or links ship.',
  rationale: 'Drafts leak. A leftover task marker, filler text or a link to "#" in production tells readers nobody read the page before it went out. Code blocks are ignored.',
  defaultSeverity: 'error',
  defaultOptions: {},
  check({ item, report }) {
    for (const row of item.scanned.prose) {
      for (const entry of PLACEHOLDERS) {
        const match = entry.pattern.exec(row.text);
        if (match) report({ message: `Placeholder text "${entry.label}".`, line: row.line, column: match.index + 1 });
      }
    }
    for (const link of item.scanned.links) {
      if (link.url === '#' || /^\/todo\b/i.test(link.url)) {
        report({ message: `Placeholder link [${link.text}](${link.url}).`, line: link.line, column: link.column });
      }
    }
  },
};

const fence: FileRule = {
  id: 'seo/markdown-fence',
  scope: 'file',
  description: 'Code fences are closed.',
  rationale: 'An unclosed fence turns the rest of the page into one grey code block. It is the most common way a post breaks in production.',
  defaultSeverity: 'error',
  defaultOptions: {},
  check({ item, report }) {
    if (item.scanned.unclosedFence) report({ message: 'Code fence is never closed.', line: item.scanned.unclosedFence });
  },
};

function unique(id: string, field: 'title' | 'description', severity: 'error' | 'warn'): ProjectRule {
  return {
    id,
    scope: 'project',
    description: `No two pages share a ${field}.`,
    rationale:
      field === 'title'
        ? 'Two pages with one title compete for the same query and are indistinguishable in a sitemap, a search result or an llms.txt index.'
        : 'A copied description usually means a copied page template. Each page deserves its own pitch.',
    defaultSeverity: severity,
    defaultOptions: {},
    check({ items, enabledFor, report }) {
      const seen = new Map<string, string>();
      for (const item of items) {
        const value = item[field]?.trim().toLowerCase();
        if (!value || item.draft || !enabledFor(item)) continue;
        const first = seen.get(value);
        if (first) {
          report(item, {
            message: `Same ${field} as ${first}.`,
            line: field === 'title' ? item.keyLines.title : item.descriptionKey ? item.keyLines[item.descriptionKey] : undefined,
          });
        } else {
          seen.set(value, item.file);
        }
      }
    },
  };
}

export const seoRules: Rule[] = [
  title,
  titleLength,
  description,
  descriptionLength,
  date,
  slug,
  singleH1,
  headingOrder,
  imageAlt,
  linkText,
  internalLinks,
  minInternalLinks,
  placeholder,
  fence,
  unique('seo/unique-title', 'title', 'error'),
  unique('seo/unique-description', 'description', 'warn'),
];
