# GTM Toolkit documentation

GTM Toolkit keeps your go-to-market strategy in the repo, lints content against it and compiles robots.txt, sitemap.xml, llms.txt and a brief for agents.

GTM Toolkit is an open-source CLI for running [GTM as code](https://www.gtmascode.dev/gtm-as-code). You declare your positioning, personas, messaging and topics as small YAML files, and the toolkit does three things with them:

1. **Checks the strategy.** `gtm validate` finds gaps in the spec itself: a pillar with no proof, a persona nobody targets, a reference to something that was renamed.
2. **Checks the content.** `gtm lint` holds every Markdown page to the spec: structure, links, vocabulary and references, with a file and a line for each finding.
3. **Compiles the outputs.** `gtm build` writes `robots.txt`, `sitemap.xml`, `llms.txt`, structured data and `GTM.md`, a brief your coding agents read before they write.

`gtm check` runs all three in CI and fails when anything has drifted.

## Install

```bash
git clone https://github.com/razkaplan/gtm-toolkit
cd gtm-toolkit && npm install && npm run build && npm pack
# then, in your project:
npm install --save-dev ../gtm-toolkit/gtm-toolkit-2.0.0.tgz
npx gtm init
```

Version 2 is not published to npm. The `gtm-toolkit` package on the registry is the old 0.5.3. Do not adopt it: build from source as above.

It needs Node 20 or newer and a project with Markdown content. It works with any site generator, because it only reads and writes files.

## Where to go next

| If you want to | Read |
| --- | --- |
| See it work in five minutes | [Quickstart](quickstart.md) |
| Understand the model before you commit to it | [Concepts](concepts.md) |
| Write the strategy files | [gtm.yaml](spec/README.md) and the pages after it |
| Put it in CI | [Run it in CI](guides/ci.md) |
| Get coding agents to write on-message copy | [Brief your coding agents](guides/agents.md) |
| Decide what AI crawlers may do | [AI crawlers and llms.txt](guides/ai-crawlers.md) |
| Add it to a site that already has years of content | [Adopt it on an existing site](guides/adopting.md) |
| Upgrade from version 0.5 | [Migrate from 0.5](guides/migrating.md) |

## What it does not do

It does not call a language model, track analytics, research keywords or publish anything. It reads files in your repository and writes files in your repository. Every decision is in a diff, and every check runs offline.

## Where it runs

[gtmascode.dev](https://www.gtmascode.dev) is built from its own `gtm/` directory. Its `robots.txt`, `sitemap.xml` and `llms.txt` are generated files, and its test gate runs `gtm check`. [The essay about rebuilding that site](https://www.gtmascode.dev/blog/2026-11-10-human-in-the-loop-agent-rebuilt-my-site) tells the story of what broke before that was true.
