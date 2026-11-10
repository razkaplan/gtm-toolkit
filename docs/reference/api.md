# Programmatic API

Use GTM Toolkit as a library: load and validate the spec, lint content, build the outputs, compute coverage and diff strategy changes from TypeScript.

Everything the CLI does is a function over a loaded spec and a list of content items. Import from `gtm-toolkit`. Types are included.

```ts
import { loadSpec, loadContent, lintContent, buildArtifacts, coverage } from "gtm-toolkit"

const loaded = loadSpec()
if (!loaded.spec) throw new Error(loaded.diagnostics.map((d) => d.message).join("\n"))

const items = loadContent(loaded.root, loaded.spec)
const findings = lintContent(loaded.root, loaded.spec, items)
const files = buildArtifacts(loaded.spec, items)
const report = coverage(loaded.spec, items)
```

The package is CommonJS and reads from disk. Use it in build scripts, tests and server code, not in a browser bundle.

## Loading

### loadSpec(options?)

Finds `gtm/gtm.yaml` in `options.cwd` (default: the current directory) or the nearest parent, reads it and the section files next to it, and validates the result against the schema.

```ts
const { spec, root, dir, files, diagnostics, locate } = loadSpec({ cwd: process.cwd(), dir: "gtm" })
```

| Property | Meaning |
| --- | --- |
| `spec` | The parsed spec with defaults applied, or `undefined` if it is missing or invalid |
| `root` | Absolute project root: the directory that contains the spec directory |
| `diagnostics` | YAML and schema errors. Empty when `spec` is present |
| `files` | The spec files that were read, relative to `root` |
| `locate(path)` | File, line and column where a value was declared, for example `locate(["personas", 0, "id"])` |

It never throws for a missing or broken spec. Check `spec`.

### loadContent(root, spec)

Reads every file of every collection and returns `ContentItem[]`, sorted by file path. Each item has the parsed frontmatter and the normalized fields the rules use: `file`, `url`, `slug`, `collection`, `type`, `title`, `description`, `date`, `updated`, `draft`, `noindex`, `topics`, `personas`, `pillars`, `answers`, `body` and `data` (the raw frontmatter).

`published(items)` filters out drafts.

## Checking

### validateSpec(loaded, collectionExists)

The semantic checks behind `gtm validate`. Pass the result of `loadSpec` and a function that says whether a collection folder exists.

```ts
import { existsSync } from "node:fs"
import { join } from "node:path"
import { checkRuleConfig, validateSpec } from "gtm-toolkit"

const problems = [
  ...validateSpec(loaded, (dir) => existsSync(join(loaded.root, dir))),
  ...checkRuleConfig(loaded),      // lint settings that name a rule that does not exist
]
```

### lintContent(root, spec, items, options?)

Runs the content rules and returns `Diagnostic[]`, sorted by file and line. `options.only` limits the report to some files while still reading all content, so cross-file rules stay correct.

```ts
const findings = lintContent(root, spec, items, { only: ["content/blog/2026-03-01-new.md"] })
```

### Diagnostic

```ts
interface Diagnostic {
  rule: string                    // "seo/internal-links", "spec/unknown-ref", "build/stale"
  severity: "error" | "warn"
  message: string
  file: string                    // relative to the project root
  line?: number
  column?: number
  hint?: string
}
```

`countBySeverity(diagnostics)` returns `{ errors, warnings }`. `formatDiagnostics(diagnostics, "stylish" | "json" | "github")` returns the same text the CLI prints.

### RULES

The rule registry: `id`, `description`, `rationale`, `defaultSeverity`, `defaultOptions` and `appliesTo` for each rule. `getRule(id)` returns one. `resolveRule(spec, rule, file)` returns the severity and options in effect for a file after `lint.rules` and `lint.overrides`.

## Building

### buildArtifacts(spec, items, specDir?)

Returns the generated files without touching the disk:

```ts
const artifacts = buildArtifacts(spec, items)
// [{ name: "robots", path: "public/robots.txt", content: "..." }, ...]
```

Output is deterministic. Outputs set to `false` in the spec are left out.

### planArtifacts(root, artifacts) and writeArtifacts(root, planned)

`planArtifacts` compares each artifact with the file on disk and adds `status`: `"unchanged"`, `"changed"` or `"missing"`, plus `firstDiff` for a changed file. `writeArtifacts` writes the ones that are not unchanged.

```ts
const planned = planArtifacts(root, buildArtifacts(spec, items))
const stale = planned.filter((artifact) => artifact.status !== "unchanged")
if (stale.length > 0) writeArtifacts(root, planned)
```

### Individual builders

`buildRobots(spec, specDir)`, `buildSitemap(spec, items)`, `buildLlms(spec, items)`, `buildContext(spec, items, specDir)` and `buildStructuredData(spec)` each return one file as a string.

`sitemapEntries(spec, items)` returns `{ url, lastmod? }[]`, for frameworks that want the sitemap as data:

```ts
// app/sitemap.ts, if you prefer a route over a generated file
import { loadContent, loadSpec, sitemapEntries } from "gtm-toolkit"

export default function sitemap() {
  const { spec, root } = loadSpec()
  if (!spec) return []
  return sitemapEntries(spec, loadContent(root, spec)).map((entry) => ({ url: entry.url, lastModified: entry.lastmod }))
}
```

`AI_CRAWLERS` is the list of known AI user-agents with `operator` and `purpose`. `crawlerDecisions(spec)` returns the resolved policy for each one.

## Measuring

### coverage(spec, items)

```ts
const report = coverage(spec, items)

report.totals      // { published, tagged, untagged }
report.personas    // [{ id, name, items, newest? }]
report.topics      // same shape
report.pillars     // same shape. A page counts toward the pillar of its topic
report.questions   // [{ question, askedBy: "persona:<id>" | "topic:<id>", answeredBy: string[] }]
report.untagged    // files of published articles with no topic and no persona
```

### diffSpecs(before, after)

A semantic diff of two specs. Lists of things with ids are compared by id, so a reordered file is not a change.

```ts
import { diffSpecs, impactOf, specAtRef } from "gtm-toolkit"

const before = specAtRef(root, "origin/main")          // the spec as it was at a git ref
if (before) {
  const changes = diffSpecs(before, spec)
  // [{ path: "personas[founder].name", kind: "changed", before: "Founder", after: "Technical founder" }]
  const stranded = impactOf(changes, items)
  // [{ removed: "topic:old-topic", files: ["content/blog/..."] }]
}
```

## Other exports

| Export | Purpose |
| --- | --- |
| `specSchema` | The zod schema for the whole spec |
| `jsonSchemas()` | JSON Schema for each spec file |
| `init({ root, ... })` | What `gtm init` runs. Returns the files written and skipped |
| `scanMarkdown(body)` | The line-based scanner the rules use: headings, links, images and prose with code removed |
| `findTerm(text, term)` | The whole-word, case-insensitive match used by the vocabulary rules |
| `VERSION` | The installed version |

Types: `Spec`, `Persona`, `Topic`, `Positioning`, `Messaging`, `Competitor`, `Collection`, `ContentItem`, `Diagnostic`, `Rule`, `Artifact`, `PlannedArtifact`, `CoverageReport`, `Change`, `Impact`.
