import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { ContentItem } from '../content/load';
import type { Spec } from '../spec/schema';
import { buildContext } from './context';
import { buildLlms } from './llms';
import { buildRobots } from './robots';
import { buildStructuredData } from './schema';
import { buildSitemap } from './sitemap';

export type ArtifactName = 'robots' | 'sitemap' | 'llms' | 'context' | 'schema';

export interface Artifact {
  name: ArtifactName;
  /** Path relative to the project root. */
  path: string;
  content: string;
}

export type ArtifactStatus = 'unchanged' | 'changed' | 'missing';

export interface PlannedArtifact extends Artifact {
  status: ArtifactStatus;
  /** First line that differs from the file on disk. */
  firstDiff?: { line: number; expected: string; actual: string };
}

/**
 * Compile the spec and the content into files. Pure and deterministic: the
 * same inputs always give byte-identical output, with no timestamps, which is
 * what makes `gtm build --check` a meaningful CI gate.
 */
export function buildArtifacts(spec: Spec, items: ContentItem[], specDir = 'gtm'): Artifact[] {
  const out: Artifact[] = [];
  const add = (name: ArtifactName, path: string | false, make: () => string): void => {
    if (typeof path === 'string') out.push({ name, path, content: make() });
  };
  add('robots', spec.outputs.robots, () => buildRobots(spec, specDir));
  add('sitemap', spec.outputs.sitemap, () => buildSitemap(spec, items));
  add('llms', spec.outputs.llms, () => buildLlms(spec, items));
  add('context', spec.outputs.context, () => buildContext(spec, items, specDir));
  add('schema', spec.outputs.schema, () => buildStructuredData(spec));
  return out;
}

export function planArtifacts(root: string, artifacts: Artifact[]): PlannedArtifact[] {
  return artifacts.map((artifact) => {
    const target = join(root, artifact.path);
    if (!existsSync(target)) return { ...artifact, status: 'missing' as const };
    const actual = readFileSync(target, 'utf8');
    if (actual === artifact.content) return { ...artifact, status: 'unchanged' as const };
    const expectedLines = artifact.content.split('\n');
    const actualLines = actual.split('\n');
    const length = Math.max(expectedLines.length, actualLines.length);
    for (let index = 0; index < length; index += 1) {
      if (expectedLines[index] !== actualLines[index]) {
        return {
          ...artifact,
          status: 'changed' as const,
          firstDiff: { line: index + 1, expected: expectedLines[index] ?? '', actual: actualLines[index] ?? '' },
        };
      }
    }
    return { ...artifact, status: 'changed' as const };
  });
}

export function writeArtifacts(root: string, planned: PlannedArtifact[]): void {
  for (const artifact of planned) {
    if (artifact.status === 'unchanged') continue;
    const target = join(root, artifact.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, artifact.content, 'utf8');
  }
}
