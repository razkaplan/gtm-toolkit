# Quickstart

Install GTM Toolkit, scaffold a spec, write down one real messaging decision and watch the linter enforce it. About five minutes, in an existing repo.

You need Node 20 or newer and a repository with some Markdown content in it.

## 1. Install and scaffold

```bash
npm install --save-dev gtm-toolkit
npx gtm init
```

```console
  created  gtm/gtm.yaml
  created  gtm/positioning.yaml
  created  gtm/personas.yaml
  created  gtm/messaging.yaml
  created  gtm/topics.yaml
  created  gtm/competitors.yaml
```

`init` reads your `package.json` for a name, description and homepage, and looks for content in the usual places (`content/blog`, `content/docs`, `src/content/blog`, `docs`, `_posts`). It never overwrites a file, so it is safe to run again.

Open `gtm/gtm.yaml` and check two things: `site.url` is your real origin, and `content.collections` points at your content.

```yaml
site:
  name: "Acme"
  url: https://www.acme.dev
  description: "Acme makes deploy previews for data pipelines."

content:
  collections:
    blog:
      path: content/blog
      url: "/blog/{slug}"
      type: article
```

## 2. Write down one decision

The scaffold is full of placeholders. Replace them over time. For now, record one thing your team already agreed on: a word you stopped using, and the spelling of your product's name.

```yaml
# gtm/messaging.yaml
vocabulary:
  prefer:
    - term: "deploy preview"
      insteadOf: ["preview deploy", "preview environment"]
  avoid:
    - term: "leverage"
      reason: "Say what the thing does."
```

## 3. Check the spec

```bash
npx gtm validate
```

```console
6 spec files: 1 persona, 1 pillar, 1 topic, 0 competitors
gtm/messaging.yaml
  4:5   warn   Pillar "first-pillar" has no proof.  spec/unproven-claim
               Add a number, a link, a quote or a commit. A claim nobody can check is a slogan.

gtm/positioning.yaml
  10:5  warn   Differentiator "first-difference" has no proof.  spec/unproven-claim

⚠ 2 problems (0 errors, 2 warnings)
```

Warnings do not fail the command. They are the toolkit telling you where the strategy is thin.

## 4. Check your content

```bash
npx gtm lint
```

```console
content/blog/2026-01-06-launch.md
  1:1   error  Missing `description` in frontmatter.  seo/description
  8:7   error  Link target /pricing-old does not exist.  seo/internal-links
  12:4  warn   "leverage" in body.  messaging/avoid
               Say what the thing does.

✖ 3 problems (2 errors, 1 warning)
```

Every finding has a file, a line, a rule id and, where you gave one, your reason. `npx gtm explain seo/internal-links` prints why a rule exists.

On a site with a lot of existing content the first run can be long. [Adopt it on an existing site](guides/adopting.md) shows how to fence off the backlog.

## 5. Build the outputs

```bash
npx gtm build
```

```console
  created       public/robots.txt
  created       public/sitemap.xml
  created       public/llms.txt
  created       GTM.md
```

Commit these files. They are generated, so from now on you change the spec and rebuild instead of editing them.

## 6. Guard it

```bash
npx gtm check
```

```console
✓ validate   ok
✓ lint       ok
✓ build      ok
✓ No problems
```

`check` is `validate`, `lint` and `build --check` in one pass. It exits 1 if the spec is broken, a page has an error, or a generated file no longer matches what the spec would produce. Add it to CI with [this workflow](guides/ci.md).

## Next

- Fill in the real strategy: [positioning](spec/positioning.md), [personas](spec/personas.md), [messaging](spec/messaging.md).
- Point your coding agent at `GTM.md`: [Brief your coding agents](guides/agents.md).
- Tag your posts and run `npx gtm coverage` to see what your content actually covers.
