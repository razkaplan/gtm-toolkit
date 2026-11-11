# gtm.yaml

The root of the GTM spec: the site and its owner, content collections and routes, the AI crawler policy, the files to generate and the lint settings.

`gtm/gtm.yaml` is the one required file. It says what the site is, where the content lives and what to generate. The strategy sits in the files next to it.

```yaml
# yaml-language-server: $schema=../node_modules/gtm-toolkit/schemas/gtm.schema.json
version: 2

site:
  name: "Acme"
  url: https://www.acme.dev
  description: "Acme makes deploy previews for data pipelines."

owner:
  type: organization
  name: "Acme, Inc."
  sameAs:
    - https://www.linkedin.com/company/acme
    - https://github.com/acme

content:
  publicDir: public
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
      label: Documentation
  routes:
    - path: /
      title: Acme
      description: "Deploy previews for data pipelines."
    - path: /pricing
      title: Pricing
    - /changelog

crawlers:
  disallow: [/api/]
  ai:
    training: disallow
    search: allow
    user: allow

outputs:
  robots: public/robots.txt
  sitemap: public/sitemap.xml
  llms: public/llms.txt
  context: GTM.md
  schema: false

lint:
  rules:
    seo/title-length: [warn, { min: 30, max: 60 }]
```

The first line is optional. It points editors that support `yaml-language-server` at the JSON Schema, so they autocomplete keys and flag mistakes as you type.

## site

`site.url` is the canonical origin, with no path and no trailing slash. Every URL in the sitemap, in `llms.txt` and in structured data is built on it, so decide once whether that is the `www` host or the bare domain and use the same value everywhere.

`site.description` is reused in `llms.txt`, structured data and `GTM.md`. Write the sentence you would want a stranger, or a model, to repeat.

## owner

Who stands behind the site, as a `person` or an `organization`. It becomes the publisher in structured data, and `sameAs` lists the profiles that are the same entity, which is how search engines and models connect your site to your LinkedIn, GitHub or X account.

## content.collections

A collection is a folder of Markdown that becomes pages. The key (`blog`, `docs`) is a name you choose.

| Field | Meaning |
| --- | --- |
| `path` | The folder, relative to the project root |
| `include` | Glob inside the folder. Defaults to `**/*.{md,mdx}` |
| `url` | How a file becomes a URL. Must contain `{slug}` or `{path}` |
| `type` | `article` (dated), `doc` or `page`. Some rules only apply to articles |
| `label` | Section heading in `llms.txt` |
| `sitemap`, `llms`, `lint` | Set to `false` to leave the collection out of that output or out of linting |

`{slug}` is the file name without its extension. `{path}` is the path inside the folder without the extension, and an `index` file maps to its folder:

| Pattern | File | URL |
| --- | --- | --- |
| `/blog/{slug}` | `2026-01-05-hello.md` | `/blog/2026-01-05-hello` |
| `/docs/{path}` | `index.md` | `/docs` |
| `/docs/{path}` | `guides/ci.md` | `/docs/guides/ci` |
| `/docs/{path}` | `guides/index.md` | `/docs/guides` |

URLs are never derived from titles. If your site strips the date prefix or lowercases the slug when it routes, name the files the way the URL should read.

## content.routes

Pages that exist but are not Markdown: the home page, a pricing page, an app route. Declaring them does two things. They join the sitemap, and they count as valid targets for the `seo/internal-links` rule, so a link to `/pricing` is not reported as broken.

A route is a path, or an object when you want it in `llms.txt` too:

```yaml
routes:
  - /changelog
  - path: /pricing
    title: Pricing                 # needed for llms.txt
    description: "Plans and limits."
    lastmod: 2026-03-01
  - path: /feed.xml
    sitemap: false                 # a valid link target, but not a page to index
    llms: false
```

A route whose path is the base of a collection, such as `/blog` for `/blog/{slug}`, is dated in the sitemap by the newest item in that collection.

## crawlers

`crawlers.disallow` lists paths no crawler may fetch. Keep it short: blocking assets or image folders hides them from search.

`crawlers.ai` holds three separate decisions, each `allow` or `disallow`, and all `allow` by default:

| Key | The question it answers |
| --- | --- |
| `training` | May models be trained on this site? |
| `search` | May AI search engines index it? |
| `user` | May an assistant fetch a page when a person asks about it? |

`crawlers.agents` overrides a single user-agent. See [AI crawlers and llms.txt](../guides/ai-crawlers.md) for how to choose, and the [crawler reference](../reference/crawlers.md) for which agents are in which group.

## outputs

Where each generated file goes. Set one to `false` to skip it. `schema` is off by default: give it a path such as `lib/site-schema.json` to get a schema.org JSON-LD graph you can embed in your layout.

## lint

```yaml
lint:
  rules:
    seo/title-length: [warn, { min: 30, max: 60 }]   # severity and options
    messaging/avoid: error                            # severity only
    seo/min-internal-links: off
  ignore:
    - "content/blog/drafts/**"
  overrides:
    - files: ["content/blog/2024-*.md"]
      rules:
        seo/description-length: off
```

`rules` sets the severity of a rule everywhere. `ignore` removes files from the toolkit's view entirely. `overrides` changes rules for the files a glob matches, and later entries win. Naming a rule that does not exist is an error, so a typo cannot silently disable a check.

Every field, with its type and default, is in the [spec field reference](../reference/schema.md).
