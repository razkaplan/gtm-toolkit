import type { Command } from 'commander';
import { z } from 'zod';
import { AI_CRAWLERS } from './build/crawlers';
import { RULES } from './lint';
import { sectionSchemas, specSchema } from './spec/schema';
import { SPEC_RULES } from './spec/validate';
import { VERSION } from './version';

/** JSON Schemas for the spec files, for editors and for the docs. */
export function jsonSchemas(): Record<string, unknown> {
  const out: Record<string, unknown> = { gtm: z.toJSONSchema(specSchema, { io: 'input' }) };
  for (const [name, schema] of Object.entries(sectionSchemas)) out[name] = z.toJSONSchema(schema, { io: 'input' });
  return out;
}

/**
 * Everything the documentation needs, read from the running code. The docs are
 * generated from this, so they cannot describe a flag that does not exist.
 */
export function reference(program: Command): Record<string, unknown> {
  return {
    version: VERSION,
    commands: program.commands
      .filter((command) => command.name() !== 'reference')
      .map((command) => ({
        name: command.name(),
        description: command.description(),
        usage: `gtm ${command.name()} ${command.usage()}`.trim(),
        arguments: command.registeredArguments.map((argument) => ({
          name: argument.name(),
          description: argument.description,
          required: argument.required,
          variadic: argument.variadic,
        })),
        options: command.options.map((option) => ({ flags: option.flags, description: option.description, default: option.defaultValue })),
      })),
    globalOptions: program.options.map((option) => ({ flags: option.flags, description: option.description })),
    rules: RULES.map((rule) => ({
      id: rule.id,
      description: rule.description,
      rationale: rule.rationale,
      severity: rule.defaultSeverity,
      options: rule.defaultOptions,
      appliesTo: rule.appliesTo ?? ['article', 'doc', 'page'],
    })),
    specRules: SPEC_RULES,
    crawlers: AI_CRAWLERS,
    schemas: jsonSchemas(),
  };
}
