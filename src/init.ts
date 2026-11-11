import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, posix, sep } from 'node:path';

export interface InitOptions {
  root: string;
  dir?: string;
  name?: string;
  url?: string;
  description?: string;
  /** Write gtm.yaml only, without the strategy files. */
  minimal?: boolean;
}

export interface InitResult {
  written: string[];
  skipped: string[];
  notes: string[];
}


const COLLECTION_GUESSES: Array<{ path: string; name: string; url: string; type: 'article' | 'doc'; label: string }> = [
  { path: 'content/blog', name: 'blog', url: '/blog/{slug}', type: 'article', label: 'Blog' },
  { path: 'src/content/blog', name: 'blog', url: '/blog/{slug}', type: 'article', label: 'Blog' },
  { path: 'content/posts', name: 'blog', url: '/blog/{slug}', type: 'article', label: 'Blog' },
  { path: '_posts', name: 'blog', url: '/blog/{slug}', type: 'article', label: 'Blog' },
  { path: 'content/docs', name: 'docs', url: '/docs/{path}', type: 'doc', label: 'Docs' },
  { path: 'src/content/docs', name: 'docs', url: '/docs/{path}', type: 'doc', label: 'Docs' },
  { path: 'docs', name: 'docs', url: '/docs/{path}', type: 'doc', label: 'Docs' },
];

function quote(value: string): string {
  return JSON.stringify(value);
}

function readJson(file: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function origin(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.protocol.startsWith('http') ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

/** Settings worth carrying over from a 0.x gtm.config.js. */
function legacy(root: string): { name?: string; url?: string; description?: string; blockAI?: boolean } | undefined {
  const file = join(root, 'gtm.config.js');
  if (!existsSync(file)) return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require(file) as { seo?: Record<string, unknown>; robots?: { allowAIBots?: boolean } };
    return {
      name: typeof config.seo?.siteName === 'string' ? config.seo.siteName : undefined,
      url: origin(config.seo?.siteUrl),
      description: typeof config.seo?.defaultDescription === 'string' ? config.seo.defaultDescription : undefined,
      blockAI: config.robots?.allowAIBots === false,
    };
  } catch {
    return {};
  }
}

export function init(options: InitOptions): InitResult {
  const dir = options.dir ?? 'gtm';
  // Version 2 is not on npm, so there is no CDN copy of the schemas. Point editors at the installed package.
  const SCHEMA_BASE = posix.relative(dir.split(sep).join('/'), 'node_modules/gtm-toolkit/schemas');
  const result: InitResult = { written: [], skipped: [], notes: [] };
  const pkg = readJson(join(options.root, 'package.json'));
  const old = legacy(options.root);

  const name = options.name ?? old?.name ?? (typeof pkg?.name === 'string' ? pkg.name : 'My Product');
  const url = origin(options.url) ?? old?.url ?? origin(pkg?.homepage) ?? 'https://www.example.com';
  const description =
    options.description ?? old?.description ?? (typeof pkg?.description === 'string' && pkg.description ? pkg.description : 'One or two sentences on what this is and who it is for.');

  const seen = new Set<string>();
  const collections = COLLECTION_GUESSES.filter((guess) => {
    if (seen.has(guess.name) || !existsSync(join(options.root, guess.path))) return false;
    seen.add(guess.name);
    return true;
  });
  const publicDir = ['public', 'static'].find((candidate) => existsSync(join(options.root, candidate))) ?? 'public';
  const ai = old?.blockAI ? 'disallow' : 'allow';

  const collectionYaml =
    collections.length > 0
      ? collections
          .map((entry) =>
            [`    ${entry.name}:`, `      path: ${entry.path}`, `      url: ${quote(entry.url)}`, `      type: ${entry.type}`, `      label: ${entry.label}`].join('\n'),
          )
          .join('\n')
      : ['    {}', '    # blog:', '    #   path: content/blog', '    #   url: "/blog/{slug}"', '    #   type: article', '    #   label: Blog'].join('\n');

  const files: Record<string, string> = {
    'gtm.yaml': `# yaml-language-server: $schema=${SCHEMA_BASE}/gtm.schema.json
# The root of your go-to-market spec. Strategy lives in the files next to this one.
version: 2

site:
  name: ${quote(name)}
  url: ${url}
  description: ${quote(description)}

# Who stands behind the site. Feeds structured data and GTM.md.
# owner:
#   type: organization   # or: person
#   name: ${quote(name)}
#   sameAs:
#     - https://www.linkedin.com/company/your-company

content:
  publicDir: ${publicDir}
  # Markdown that becomes pages. {slug} is the file name, {path} the path inside the folder.
  collections:
${collectionYaml}
  # Pages that are not markdown: landing pages, app routes. They join the sitemap
  # and count as valid link targets.
  routes:
    - path: /
      title: Home

crawlers:
  # Paths closed to every crawler.
  disallow: []
  # Three separate decisions. All default to allow.
  ai:
    training: ${ai}   # may models learn from this site?
    search: ${ai}     # may AI search engines index it?
    user: ${ai}       # may assistants fetch a page when a person asks?

# Files \`gtm build\` writes. Set any of them to false to skip it.
outputs:
  robots: ${publicDir}/robots.txt
  sitemap: ${publicDir}/sitemap.xml
  llms: ${publicDir}/llms.txt
  context: GTM.md

lint:
  # Tune or switch off rules. \`gtm rules\` lists them all.
  rules: {}
  #   seo/title-length: [warn, { min: 30, max: 60 }]
  #   messaging/untagged: error
`,
    'positioning.yaml': `# yaml-language-server: $schema=${SCHEMA_BASE}/positioning.schema.json
# What you are, for whom, and why you instead of the alternative.
# Replace every line. A fake positioning statement is worse than none.
category: "The category you want to be filed under"
oneLiner: "What it is and who it is for, in one sentence a stranger would understand."
problem: "The problem, in the words of the people who have it."
audience:
  - primary-buyer
differentiators:
  - id: first-difference
    claim: "The one thing you do that the alternative does not."
    proof: []   # a number, a link, a named customer. Empty proof is a warning.
# What you are not. People and language models both need the disambiguation.
notThis: []
`,
    'personas.yaml': `# yaml-language-server: $schema=${SCHEMA_BASE}/personas.schema.json
# The people you write for. Tag content with \`persona: <id>\` in frontmatter.
- id: primary-buyer
  name: "Primary buyer"
  role: "Their job title"
  jobs:
    - "What they are trying to get done"
  pains:
    - "What makes that hard today"
  triggers:
    - "The event that sends them looking for a solution"
  # What they type into a search box or ask an assistant.
  # \`gtm coverage\` lists the ones no published page answers yet.
  questions:
    - "A real question you have heard them ask"
`,
    'messaging.yaml': `# yaml-language-server: $schema=${SCHEMA_BASE}/messaging.schema.json
# What you say, how you prove it, and the words you use.
pillars:
  - id: first-pillar
    title: "The first thing you want to be known for"
    claim: "The claim, stated plainly."
    proof: []
    personas:
      - primary-buyer

boilerplate:
  short: "Up to 160 characters. Reused in meta descriptions and bios."

vocabulary:
  # Spellings you own. \`gtm lint\` flags the variants.
  prefer: []
  #   - term: "your product name"
  #     insteadOf: ["Your Product Name", "yourproduct"]
  # Words you decided not to use, and why.
  avoid: []
  #   - term: "leverage"
  #     reason: "Say what the thing does."

# Plain-language guidance for anyone, or anything, writing for you.
voice: []
`,
    'topics.yaml': `# yaml-language-server: $schema=${SCHEMA_BASE}/topics.schema.json
# What you want to be found for. The keyword source of truth.
# Tag content with \`topic: <id>\` in frontmatter.
- id: first-topic
  name: "A topic you want to own"
  pillar: first-pillar
  personas:
    - primary-buyer
  keywords:
    - "the phrase people search for"
  questions:
    - "A question this topic should answer"
`,
    'competitors.yaml': `# yaml-language-server: $schema=${SCHEMA_BASE}/competitors.schema.json
# The alternatives, stated fairly. This is what your agents will repeat.
[]
# - id: status-quo
#   name: "Doing it by hand"
#   kind: status-quo        # direct | adjacent | status-quo
#   summary: "How people solve this today."
#   weDiffer: "The honest difference."
`,
  };

  mkdirSync(join(options.root, dir), { recursive: true });
  for (const [file, body] of Object.entries(files)) {
    if (options.minimal && file !== 'gtm.yaml') continue;
    const relative = `${dir}/${file}`;
    if (existsSync(join(options.root, relative))) {
      result.skipped.push(relative);
      continue;
    }
    writeFileSync(join(options.root, relative), body, 'utf8');
    result.written.push(relative);
  }

  if (old) result.notes.push('Found gtm.config.js from 0.x and carried over the site name, URL, description and AI crawler setting. You can delete it.');
  if (url === 'https://www.example.com') result.notes.push(`Set site.url in ${dir}/gtm.yaml before you build: every generated URL uses it.`);
  if (collections.length === 0) result.notes.push(`No content folder was detected. Declare yours under content.collections in ${dir}/gtm.yaml.`);
  return result;
}
