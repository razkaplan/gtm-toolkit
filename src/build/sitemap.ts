import type { ContentItem } from '../content/load';
import type { Spec } from '../spec/schema';

export interface SitemapEntry {
  url: string;
  lastmod?: string;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Every indexable URL: declared routes first, then content, each group sorted. */
export function sitemapEntries(spec: Spec, items: ContentItem[]): SitemapEntry[] {
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  const push = (path: string, lastmod?: string): void => {
    if (seen.has(path)) return;
    seen.add(path);
    entries.push({ url: `${spec.site.url}${path === '/' ? '/' : path}`, lastmod });
  };

  // The newest dated item of a collection dates the route that lists it.
  const newest = new Map<string, string>();
  for (const item of items) {
    const stamp = item.updated ?? item.date;
    if (!stamp || item.draft) continue;
    const base = spec.content.collections[item.collection]?.url.split('{')[0].replace(/\/$/, '') || '/';
    if (!newest.has(base) || stamp > (newest.get(base) as string)) newest.set(base, stamp);
  }

  for (const route of spec.content.routes) {
    const path = typeof route === 'string' ? route : route.path;
    if (typeof route !== 'string' && route.sitemap === false) continue;
    const declared = typeof route === 'string' ? undefined : route.lastmod;
    push(path, declared ?? newest.get(path));
  }

  const content = items
    .filter((item) => !item.draft && !item.noindex && spec.content.collections[item.collection]?.sitemap !== false)
    .sort((a, b) => a.url.localeCompare(b.url));
  for (const item of content) push(item.url, item.updated ?? item.date);

  return entries;
}

export function buildSitemap(spec: Spec, items: ContentItem[]): string {
  const rows = sitemapEntries(spec, items).map((entry) =>
    [
      '  <url>',
      `    <loc>${escapeXml(entry.url)}</loc>`,
      ...(entry.lastmod ? [`    <lastmod>${entry.lastmod}</lastmod>`] : []),
      '  </url>',
    ].join('\n'),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...rows,
    '</urlset>',
    '',
  ].join('\n');
}
