// Writes schemas/*.schema.json from the zod definitions, so editors can
// autocomplete and validate the spec files through yaml-language-server.
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { jsonSchemas } = require(join(root, 'dist', 'index.js'));

mkdirSync(join(root, 'schemas'), { recursive: true });
for (const [name, schema] of Object.entries(jsonSchemas())) {
  writeFileSync(join(root, 'schemas', `${name}.schema.json`), `${JSON.stringify({ title: `gtm-toolkit ${name}`, ...schema }, null, 2)}\n`);
}
chmodSync(join(root, 'dist', 'cli.js'), 0o755);
console.log(`schemas: wrote ${Object.keys(jsonSchemas()).length} files`);
