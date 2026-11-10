# Migrate from 0.5

Move from gtm-toolkit 0.5 to version 2: what replaced gtm.config.js, how the commands map, which features were removed and why.

Version 2 is a rewrite. The package name is the same, the model is different: 0.5 was a set of SEO commands around a config file, and 2 is a go-to-market spec with checks and generated outputs. [The essay about the rebuild](https://www.gtmascode.dev/blog/2026-11-10-human-in-the-loop-agent-rebuilt-my-site) explains why.

## Upgrade

```bash
npm install --save-dev gtm-toolkit@2
npx gtm init
```

`init` finds an existing `gtm.config.js` and carries over the site name, URL, description and the AI crawler setting. It writes the new files next to your old config and overwrites nothing. Node 20 or newer is required.

## Config

| 0.5 `gtm.config.js` | 2 `gtm/gtm.yaml` |
| --- | --- |
| `seo.siteName` | `site.name` |
| `seo.siteUrl` | `site.url` (origin only, no trailing slash) |
| `seo.defaultDescription` | `site.description` |
| `seo.keywords`, `seo.secondaryKeywords` | `keywords` per topic in `gtm/topics.yaml` |
| `content.contentPath`, `content.blogPath` | `content.collections.<name>.path` and `.url` |
| `robots.allowAIBots` | `crawlers.ai.training`, `.search`, `.user` |
| `robots.customRules` | `crawlers.disallow` and `crawlers.agents` |
| `robots.sitemapUrl` | derived from `site.url` |
| `analytics.*`, `geo.*`, `ai.*`, `framework` | removed |

Delete `gtm.config.js` once `gtm validate` passes.

## Commands

| 0.5 | 2 |
| --- | --- |
| `gtm-toolkit init` | `gtm init` (not interactive, never overwrites) |
| `gtm-toolkit generate --robots --sitemap` | `gtm build` |
| `gtm-toolkit generate --meta` | removed: it printed a success message and wrote nothing |
| `gtm-toolkit lint` | `gtm lint` |
| `gtm-toolkit audit` | `gtm check` |
| `gtm-toolkit analyze`, `suggestions`, `fix` | removed |
| | new: `gtm validate`, `gtm coverage`, `gtm diff`, `gtm rules`, `gtm explain` |

The binary is `gtm`. `gtm-toolkit` is kept as an alias.

## Regenerate robots.txt and the sitemap

Do this first. Two bugs in 0.5 are worth checking your live site for.

**Sitemap URLs were guessed from titles.** 0.5 built each URL by slugifying the post title. If your routes use file names, the sitemap listed URLs that do not exist. It also skipped the file whenever it was already there, so it never updated. Version 2 builds URLs from file names and the collection's `url` pattern, and rewrites the file on every build.

**robots.txt blocked more than it meant to.** 0.5 disallowed `/_next/`, `/api/` and every `.json` file for all crawlers, and set `Crawl-delay` for Googlebot, which does not support it. Blocking `/_next/` hides scripts and styles from crawlers that render pages. Version 2 disallows only what you list.

```bash
npx gtm build
git diff public/robots.txt public/sitemap.xml
```

Read the diff. If old URLs were indexed or linked, add redirects for them.

## Lint rules

Rule ids are now names:

| 0.5 | 2 |
| --- | --- |
| `SEO-001` title | `seo/title`, `seo/title-length` |
| `SEO-002` date | `seo/date` |
| `SEO-003` category from a fixed list | removed. Use `topic` and `messaging/refs` |
| `SEO-004` summary | `seo/description`, `seo/description-length` |
| `SEO-005` read time | removed |
| `SEO-006` file name | `seo/slug` |
| `SEO-010` single H1 | `seo/single-h1` |
| `SEO-011` heading hierarchy | `seo/heading-order` |
| `SEO-012` keyword in opening | `messaging/topic-keywords` |
| `SEO-013` internal link | `seo/min-internal-links`, and `seo/internal-links` checks that targets exist |
| `SEO-014` link text | `seo/link-text` |
| `SEO-020` alt text | `seo/image-alt` |
| `SEO-031` placeholders | `seo/placeholder` (code blocks are now ignored) |
| `SEO-040` sentence length | removed |
| `SEO-051` Markdown syntax | `seo/markdown-fence` |
| `SEO-052` keyword density | removed |

Three differences in behavior:

- Keywords and categories are no longer built in. 0.5 checked every site against the keywords "gtm as code" and "modern marketing" unless you overrode them, and accepted four fixed categories.
- Findings carry line and column numbers.
- Default lengths changed: titles 20 to 65 characters, descriptions 70 to 160. Set your own with `[severity, { min, max }]`.

## What was removed

- **`analyze`, `suggestions`, `fix`.** These produced prompts to paste into an assistant. In version 2 the assistant gets its context from `GTM.md` and its feedback from `gtm check`. See [Brief your coding agents](agents.md).
- **Google Search Console and Gemini integrations.** They wrapped other products' APIs and were the reason the install pulled in `googleapis`. Keyword research belongs in a tool built for it. The result goes in `topics.yaml`.
- **GA4 and PostHog snippet injection.** Editing your layout file to add a tracking script is outside what a content toolkit should do.
- **Framework detection.** Version 2 reads Markdown and writes files. It does not need to know your framework.

Runtime dependencies went from 11 packages to 7.

## Programmatic API

The exports changed completely. `lintContent(markdown, filename)` is now `lintContent(root, spec, items)`, and generators take a loaded spec. See the [API reference](../reference/api.md).
