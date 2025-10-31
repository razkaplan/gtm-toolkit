
## [Unreleased] - 2025-10-23

### Major Features
- Added Google Search Console AEO keyword export. When Generative Optimization is enabled, `gtm-toolkit generate` now builds `reports/ai-overview-keywords.csv`, filtering queries with purpose-built regex to surface AI-overview behaviour.

### Analytics & Tracking
- GA4 detection now scans all `app/` and `pages/` entry points; flags mismatching IDs and optionally injects the `next/script` snippet automatically.
- Updated AI bot prompt copy to reference Gemini instead of Bard.

### CLI Improvements
- `gtm-toolkit generate` runs a full audit before generation, so teams can review gaps prior to writing new files.
- `gtm-toolkit analyze` prints an entry-points summary (competitor, gaps, keywords) when invoked, preventing empty runs.

### Workflow & Quality
- Added `npm run security-check` to the standard test suite (alongside lint/build/runtime-check).
- Temporary integration test directory is pruned before the security scan to keep the repo clean.
- Replaced all third-party authorship references; README now credits Raz Kaplan explicitly and introduces an MIT license with attribution links.
- Replaced previous Claude-specific helpers with local AI instruction builders; CLI now outputs prompts users can paste into Copilot, Cursor, Claude Desktop, etc.

### Community Callout
- This release still has a handful of UX rough edges (init metadata detection, analytics setup, strategy docs). I’m aware they need polish and would love help from contributors—issues and PRs are very welcome.

### Next Steps for Docs & Marketing
- Document the new AEO CSV workflow and how to interpret AI-overview keyword reports.
- Publish a how-to on automatic GA4 detection/insertion so teams know what happens during init.
- Highlight the audit-first generation flow in the release post, framing it as a quality gate for SEO ops.
