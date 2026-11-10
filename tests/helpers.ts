import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { loadContent, type ContentItem } from '../src/content/load';
import { loadSpec, type LoadResult } from '../src/spec/load';
import type { Spec } from '../src/spec/schema';

export const ROOT_YAML = `version: 2
site:
  name: Acme
  url: https://www.acme.dev
  description: Acme makes rockets for coyotes.
content:
  collections:
    blog:
      path: content/blog
      url: "/blog/{slug}"
      type: article
      label: Blog
    docs:
      path: content/docs
      url: "/docs/{path}"
      type: doc
      label: Docs
  routes:
    - path: /
      title: Home
    - /blog
    - path: /pricing
      title: Pricing
      description: What it costs.
`;

export const PERSONAS_YAML = `- id: founder
  name: Technical founder
  questions:
    - "What is GTM as code?"
- id: marketer
  name: Product marketer
  questions:
    - "How do I keep messaging consistent?"
`;

export const MESSAGING_YAML = `pillars:
  - id: in-repo
    title: Strategy lives in the repo
    claim: Positioning belongs next to the code it describes.
    proof:
      - "This site is built from its own spec."
    personas: [founder]
vocabulary:
  prefer:
    - term: GTM as code
      insteadOf: ["GTM-as-code", "marketing as code"]
  avoid:
    - term: leverage
      reason: Say what the thing does.
    - term: "—"
      reason: House style.
`;

export const TOPICS_YAML = `- id: gtm-as-code
  name: GTM as code
  pillar: in-repo
  personas: [founder, marketer]
  keywords: ["GTM as code", "go-to-market as code"]
  questions:
    - "Is GTM as code only for developers?"
`;

export function post(frontmatter: Record<string, unknown>, body = 'Some opening words about the subject.\n\nSee the [pricing page](/pricing).\n'): string {
  const lines = Object.entries(frontmatter).map(([key, value]) => `${key}: ${typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value)}`);
  return `---\n${lines.join('\n')}\n---\n\n${body}`;
}

export const GOOD_POST = post({
  title: 'What GTM as code means for a small team',
  description: 'A plain explanation of GTM as code: what goes in the repo, what gets checked, and what a small team gets back for the effort.',
  date: '2026-01-05',
  topic: 'gtm-as-code',
  persona: 'founder',
});

/** Write a throwaway project to disk and return its root. */
export function project(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'gtm-test-'));
  const all: Record<string, string> = {
    'gtm/gtm.yaml': ROOT_YAML,
    'gtm/personas.yaml': PERSONAS_YAML,
    'gtm/messaging.yaml': MESSAGING_YAML,
    'gtm/topics.yaml': TOPICS_YAML,
    'content/blog/2026-01-05-what-gtm-as-code-means.md': GOOD_POST,
    'content/docs/index.md': post({ title: 'Acme documentation overview', description: 'Start here: how to install Acme, how the pieces fit together, and where to go next once it runs.' }, 'Welcome.\n'),
    'public/logo.png': 'png',
    ...files,
  };
  for (const [file, body] of Object.entries(all)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), body, 'utf8');
  }
  return root;
}

export function open(files: Record<string, string> = {}): { root: string; loaded: LoadResult; spec: Spec; items: ContentItem[] } {
  const root = project(files);
  const loaded = loadSpec({ cwd: root });
  if (!loaded.spec) throw new Error(`fixture spec is invalid: ${JSON.stringify(loaded.diagnostics, null, 2)}`);
  return { root, loaded, spec: loaded.spec, items: loadContent(root, loaded.spec) };
}
