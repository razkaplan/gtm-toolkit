# Impossible Changes

This file captures the documentation updates needed for scenarios where aligning the implementation would require a larger redesign than is practical right now.

## `generateRobots` / `generateSitemap` samples
- **Why not change the code?** The generators rely on a full `GTMConfig` object that threads through CLI usage, file generation, and analytics defaults. Reworking them to accept the simplified option objects shown in the docs would mean redesigning configuration management, type definitions, and multiple command flows.
- **Doc update needed:** Update API and README samples to show `generateRobots(config, options)` and `generateSitemap(config, options)` usage, emphasising that a `GTMConfig` instance (e.g., from `gtm.config.js`) must be supplied, and that `customRules` should be `RobotRule[]` objects, not raw strings.

## `GoogleSearchConsoleClient` constructor example
- **Why not change the code?** Supporting a `serviceAccountKey` path directly would require adding async file IO, optional JSON parsing, and additional error handling. The current code expects credentials to be provided as an already-loaded object, which keeps the client synchronous and tree-shakable.
- **Doc update needed:** Revise the docs to show loading the JSON first (e.g., `const credentials = JSON.parse(fs.readFileSync('path', 'utf8'));`) and then calling `new GoogleSearchConsoleClient(credentials, 'https://example.com')`, followed by `getSearchAnalytics` without passing `siteUrl` again.

## `gtm-toolkit analyze --ai` CLI sample
- **Why not change the code?** Adding a generic `--ai` flag that analyses an arbitrary path would require new content-loading flows and UX decisions. The current command focuses on specific actions (`--competitor`, `--gaps`, `--keywords`) that map cleanly to existing code.
- **Doc update needed:** Replace the `--ai` example with the supported flags (e.g., `gtm-toolkit analyze --keywords "gtm as code"`), or add a note that `--ai` is not available and point users to the existing sub-features.
