# Changelog

## 2.0.0 (2026-11-10)

A rewrite. Version 0.5 was an SEO linter with "GTM as code" on the label. Version 2 is the thing the label promised: a go-to-market spec you declare in the repo, check in CI and compile into the files that people, search engines and AI models read.

### Why a rewrite

Running 0.5 on gtmascode.dev, the site it was built for, turned up problems that patches would not fix:

- `generate --sitemap` built URLs from post titles instead of file names, and skipped the file whenever it already existed. The sitemap it wrote for gtmascode.dev was a year stale, and 22 of its 29 URLs did not resolve.
- `generate --robots` disallowed `/_next/` and `/api/` for every crawler, which hid the site's own scripts, styles and social images, and set `Crawl-delay` for Googlebot, which ignores it.
- The README promised "50+ SEO rules". There were 16, several of them tied to hardcoded keywords and a hardcoded list of four categories from one blog.
- `generate --meta` printed a success message and did nothing. The README documented `hooks install`, `test`, `benchmark` and `lint --changed`, none of which existed, and quoted testimonials with no named source.
- `analyze` and `suggestions` produced prompts to paste into an assistant rather than results.
- There were no tests.

### Added

- **The GTM spec.** `gtm/gtm.yaml` plus `positioning.yaml`, `personas.yaml`, `messaging.yaml`, `topics.yaml` and `competitors.yaml`, validated against a schema, with JSON Schemas shipped in `schemas/` for editor autocomplete.
- **`gtm validate`**: schema errors with file and line, references between files, duplicate ids, claims with no proof, personas with no questions, and a check that the spec follows its own vocabulary.
- **`gtm lint`**: 21 rules across `seo/` and `messaging/`. Line and column on every finding, `--changed`, `--max-warnings`, `--quiet`, and `stylish`, `json` and `github` output. Per-rule severity, options and file overrides.
- **`messaging/` rules**: vocabulary to avoid and to prefer, frontmatter references checked like imports, and topic keywords read from the spec.
- **`seo/internal-links`**: internal links and images are resolved against every URL the site serves.
- **`gtm build`**: deterministic `robots.txt`, `sitemap.xml`, `llms.txt`, `GTM.md` and optional JSON-LD. `--check` fails on drift, `--dry-run` shows the plan.
- **AI crawler policy by purpose**: training, search and user-triggered fetches are three settings, with per-agent overrides.
- **`GTM.md`**: the spec compiled into one brief for coding agents and new teammates.
- **`gtm coverage`**: published content per persona, topic, pillar and question. Unanswered questions are the content backlog.
- **`gtm diff`**: a semantic diff of the strategy between git refs, and the content a removed id strands.
- **`gtm check`**: validate, lint and build check in one command for CI.
- **`gtm rules`** and **`gtm explain`**.
- A typed programmatic API, and 105 tests.

### Changed

- The config file is `gtm/gtm.yaml`. `gtm init` imports the site name, URL, description and AI crawler setting from an existing `gtm.config.js`.
- `generate` is `build`, and it owns its output: generated files are rewritten on every run.
- Rule ids are names (`seo/title-length`), not numbers (`SEO-001`).
- The binary is `gtm`. `gtm-toolkit` still works.
- Node 20 or newer.

### Removed

- `analyze`, `suggestions`, `fix` and `audit`, and the prompt builders behind them.
- The Google Search Console client, the Gemini integration and the GA4 and PostHog snippet injection. The dependency tree went from 11 runtime packages, including `googleapis` and `jsdom`, to 7 small ones.
- Hardcoded keywords and categories.

## 0.5.3 and earlier

See the [0.5.3 README on npm](https://www.npmjs.com/package/gtm-toolkit/v/0.5.3).
