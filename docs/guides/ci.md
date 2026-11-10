# Run it in CI

Add gtm check to GitHub Actions: inline annotations on pull requests, linting only changed files, a drift check for generated files and strategy diffs.

The point of a spec is that something enforces it. One command does:

```bash
npx gtm check
```

It runs `validate`, `lint` and `build --check`, and exits 1 if the spec is broken, any page has an error, or a generated file is missing or stale.

## GitHub Actions

```yaml
# .github/workflows/gtm.yml
name: GTM
on:
  pull_request:
  push:
    branches: [main]

jobs:
  gtm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx gtm check --format github
```

`--format github` prints findings as workflow commands, so each one appears as an annotation on the changed line in the pull request:

```console
::error file=content/blog/2026-01-06-launch.md,line=8,col=7,title=seo/internal-links::Link target /pricing-old does not exist.
```

## What fails the build

| Finding | Default |
| --- | --- |
| A spec file is invalid YAML or does not match the schema | fails |
| A reference points at an id that does not exist | fails |
| A content rule set to `error` reports a finding | fails |
| A generated file differs from what the spec would produce | fails |
| A rule set to `warn` reports a finding | passes |

To hold the line on warnings, cap them. The build fails when the count goes above the number:

```bash
npx gtm check --max-warnings 25
```

Set the cap to today's count and lower it as you clean up. `--quiet` hides warnings from the output without changing what fails.

## The drift check

`gtm build --check` rebuilds every output in memory and compares it with the file on disk:

```console
public/sitemap.xml
  44:1  error  Generated file is out of date: expected "  <url>".  build/stale
               Run `gtm build` and commit the result.
```

This is what catches the post that was added without regenerating the sitemap, or the crawler policy that was changed in the spec but not in `robots.txt`. The fix is always the same: run `npx gtm build` and commit.

If you would rather not commit generated files, run `gtm build` as part of your site's build instead and drop `build --check` by calling `gtm validate` and `gtm lint` separately. Committing them has one advantage: a strategy change shows up in the pull request as a diff of exactly what crawlers and agents will see.

## Lint only what changed

On a large site, report only on the files a pull request touches:

```yaml
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0          # --changed needs history to compare against
      - run: npm ci
      - run: npx gtm lint --changed origin/${{ github.base_ref }} --format github
```

`--changed [base]` selects content files that differ from the base ref, plus anything uncommitted. All content is still read, so cross-file rules such as `seo/unique-title` and `seo/internal-links` stay correct.

## Comment the strategy diff

When a pull request changes the spec, reviewers should see it as a strategy change, not a YAML change:

```yaml
      - name: Strategy diff
        run: npx gtm diff origin/${{ github.base_ref }} --format md >> "$GITHUB_STEP_SUMMARY"
```

```md
## GTM spec changes since `origin/main`

- `~ crawlers.ai.training` allow → disallow
- `- topics[warehouse-branching]` {"id":"warehouse-branching","name":"Warehouse branching"...

### Content that still references removed ids

- `topic:warehouse-branching`: content/blog/2025-06-11-branching.md
```

## Before the push

The same command works as a git hook, for a faster loop than CI:

```bash
# .git/hooks/pre-push
#!/usr/bin/env bash
npx gtm check --quiet
```

## Other CI systems

Nothing here is specific to GitHub except `--format github`. Anywhere you can run Node, `npx gtm check` exits non-zero on failure, and `--format json` gives a machine-readable report:

```json
{
  "errors": 1,
  "warnings": 0,
  "diagnostics": [
    {
      "rule": "seo/internal-links",
      "severity": "error",
      "file": "content/blog/2026-01-06-launch.md",
      "line": 8,
      "column": 7,
      "message": "Link target /pricing-old does not exist."
    }
  ]
}
```
