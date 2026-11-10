import type { ContentItem } from '../content/load';
import type { Spec } from '../spec/schema';

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function link(title: string, url: string, description?: string): string {
  return `- [${oneLine(title)}](${url})${description ? `: ${oneLine(description)}` : ''}`;
}

/**
 * llms.txt, following llmstxt.org: an H1, a blockquote summary, free prose,
 * then H2 sections of links. Positioning goes in the prose, because the first
 * thing a model should learn about a site is what it is and what it is not.
 */
export function buildLlms(spec: Spec, items: ContentItem[]): string {
  const out: string[] = [`# ${spec.site.name}`, '', `> ${oneLine(spec.site.description)}`, ''];

  const positioning = spec.positioning;
  if (positioning) {
    out.push(oneLine(positioning.oneLiner), '');
    if (positioning.notThis.length > 0) {
      out.push('Not to be confused with:', '', ...positioning.notThis.map((entry) => `- ${oneLine(entry)}`), '');
    }
  }

  const routes = spec.content.routes.filter(
    (route): route is Exclude<typeof route, string> => typeof route !== 'string' && route.llms !== false && Boolean(route.title),
  );
  if (routes.length > 0) {
    out.push('## Pages', '', ...routes.map((route) => link(route.title as string, `${spec.site.url}${route.path}`, route.description)), '');
  }

  for (const [name, collection] of Object.entries(spec.content.collections)) {
    if (collection.llms === false) continue;
    const entries = items.filter((item) => item.collection === name && !item.draft && !item.noindex && item.title);
    if (entries.length === 0) continue;
    if (collection.type === 'article') entries.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.url.localeCompare(b.url));
    else entries.sort((a, b) => a.url.localeCompare(b.url));
    out.push(
      `## ${collection.label ?? name}`,
      '',
      ...entries.map((item) => link(item.title as string, `${spec.site.url}${item.url}`, item.description)),
      '',
    );
  }

  return out.join('\n');
}
