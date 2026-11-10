# Use it with Next.js

Wire GTM Toolkit into a Next.js App Router site: generated files in public/, a build step, structured data in the layout and the spec in your pages.

GTM Toolkit reads and writes files, so it works with any framework. This guide shows the setup this site uses on Next.js with the App Router. The same shape applies to Astro, Nuxt, Eleventy or a hand-rolled generator.

## 1. Point the collections at your content

```yaml
# gtm/gtm.yaml
content:
  publicDir: public
  collections:
    blog:
      path: content/blog
      url: "/blog/{slug}"       # matches app/blog/[slug]/page.tsx
      type: article
    docs:
      path: content/docs
      url: "/docs/{path}"       # matches app/docs/[[...slug]]/page.tsx
      type: doc
  routes:
    - path: /
      title: Home
    - /blog
    - /pricing
```

The `url` pattern has to produce the URL your route actually serves. If the page component reads `content/blog/<slug>.md` for `/blog/<slug>`, then `/blog/{slug}` is right. List every route that is not Markdown under `routes`, or links to it will be reported as broken.

## 2. Let the toolkit own robots.txt and the sitemap

Generated files go to `public/`, which Next.js serves from the site root.

Delete `app/robots.ts` and `app/sitemap.ts` if you have them. A file in `public/` and a route handler for the same path are two sources of truth, and the static file wins, which makes the route dead code that looks alive. This site shipped a year-old sitemap for exactly that reason.

## 3. Build before the site builds

```json
{
  "scripts": {
    "build": "gtm build && next build",
    "test": "gtm check"
  }
}
```

Running `gtm build` first regenerates the outputs on every deploy, so production can never serve a stale file. `gtm check` in the test script, and in [CI](ci.md), keeps the committed copies honest, so a strategy change shows up in the pull request diff.

## 4. Embed the structured data

Turn on the JSON-LD output:

```yaml
outputs:
  schema: lib/generated/site-schema.json
```

It contains a schema.org graph with the site and its owner. Embed it once, in the root layout:

```tsx
// app/layout.tsx
import siteSchema from "@/lib/generated/site-schema.json"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema).replace(/</g, "\\u003c") }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

The owner node has the id `<site.url>/#owner` and the site has `<site.url>/#website`. Article pages can point at them instead of repeating the details:

```tsx
const articleSchema = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: post.title,
  datePublished: post.date,
  author: { "@id": "https://www.acme.dev/#owner" },
  isPartOf: { "@id": "https://www.acme.dev/#website" },
}
```

## 5. Read the spec in your pages

The spec is data, and server components can read it at build time through the [programmatic API](../reference/api.md):

```ts
// lib/gtm.ts
import { coverage, loadContent, loadSpec } from "gtm-toolkit"

export function getGtm() {
  const loaded = loadSpec({ cwd: process.cwd() })
  if (!loaded.spec) throw new Error(loaded.diagnostics[0].message)
  const items = loadContent(loaded.root, loaded.spec)
  return { spec: loaded.spec, report: coverage(loaded.spec, items) }
}
```

Because the library reads from disk, keep it out of the client and server bundles:

```js
// next.config.mjs
const nextConfig = {
  serverExternalPackages: ["gtm-toolkit"],
}
```

On this site that one helper drives the topic filters on the [essay index](https://www.gtmascode.dev/blog), the [topic pages](https://www.gtmascode.dev/topics/gtm-as-code), the comparison table on [What is GTM as code?](https://www.gtmascode.dev/gtm-as-code) and the open-question backlog on the home page. Rename a topic in `topics.yaml` and every one of those updates on the next build.

## 6. Make unknown slugs a 404

Unrelated to the toolkit, but it protects the same thing. Set `dynamicParams = false` on content routes so a URL with no Markdown file behind it is a 404 at build time, not a page rendered from nothing:

```tsx
// app/blog/[slug]/page.tsx
export const dynamicParams = false

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}
```

## Checklist

- `site.url` matches the host you canonicalize to, and `metadataBase` in the root layout uses the same value.
- Every non-Markdown page is in `content.routes`.
- No `app/robots.ts` or `app/sitemap.ts` next to the generated files.
- `gtm check` runs in the test script and in CI.
