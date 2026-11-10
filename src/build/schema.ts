import type { Spec } from '../spec/schema';

/** schema.org JSON-LD for the site and whoever stands behind it. */
export function buildStructuredData(spec: Spec): string {
  const site = spec.site;
  const graph: Array<Record<string, unknown>> = [];
  const ownerId = `${site.url}/#owner`;

  if (spec.owner) {
    graph.push({
      '@type': spec.owner.type === 'person' ? 'Person' : 'Organization',
      '@id': ownerId,
      name: spec.owner.name,
      url: spec.owner.url ?? site.url,
      ...(spec.owner.jobTitle && spec.owner.type === 'person' ? { jobTitle: spec.owner.jobTitle } : {}),
      ...(spec.owner.description ? { description: spec.owner.description } : {}),
      ...(spec.owner.sameAs.length > 0 ? { sameAs: spec.owner.sameAs } : {}),
    });
  }

  graph.push({
    '@type': 'WebSite',
    '@id': `${site.url}/#website`,
    name: site.name,
    url: site.url,
    description: site.description,
    inLanguage: site.language,
    ...(spec.owner ? { publisher: { '@id': ownerId } } : {}),
  });

  return `${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2)}\n`;
}
