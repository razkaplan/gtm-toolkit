import pc from 'picocolors';
import { countBySeverity, sortDiagnostics, type Diagnostic } from '../types';

export type Format = 'stylish' | 'json' | 'github';

export const FORMATS: Format[] = ['stylish', 'json', 'github'];

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function summaryLine(diagnostics: Diagnostic[]): string {
  const { errors, warnings } = countBySeverity(diagnostics);
  if (errors === 0 && warnings === 0) return pc.green('✓ No problems');
  const text = `${errors > 0 ? '✖' : '⚠'} ${plural(errors + warnings, 'problem')} (${plural(errors, 'error')}, ${plural(warnings, 'warning')})`;
  return errors > 0 ? pc.red(text) : pc.yellow(text);
}

export function formatStylish(diagnostics: Diagnostic[]): string {
  const sorted = sortDiagnostics(diagnostics);
  const out: string[] = [];
  let current: string | undefined;
  const width = Math.max(0, ...sorted.map((d) => `${d.line ?? ''}:${d.column ?? ''}`.length));
  for (const d of sorted) {
    if (d.file !== current) {
      if (current !== undefined) out.push('');
      out.push(pc.underline(d.file));
      current = d.file;
    }
    const position = d.line ? `${d.line}:${d.column ?? 1}` : '';
    const label = d.severity === 'error' ? pc.red('error') : pc.yellow('warn ');
    out.push(`  ${pc.dim(position.padEnd(width))}  ${label}  ${d.message}  ${pc.dim(d.rule)}`);
    if (d.hint) out.push(`  ${' '.repeat(width)}         ${pc.dim(d.hint)}`);
  }
  if (sorted.length > 0) out.push('');
  out.push(summaryLine(sorted));
  return out.join('\n');
}

function escapeData(value: string): string {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function escapeProperty(value: string): string {
  return escapeData(value).replace(/:/g, '%3A').replace(/,/g, '%2C');
}

/** GitHub Actions workflow commands: findings show up inline on the pull request diff. */
export function formatGithub(diagnostics: Diagnostic[]): string {
  const out = sortDiagnostics(diagnostics).map((d) => {
    const props = [`file=${escapeProperty(d.file)}`];
    if (d.line) props.push(`line=${d.line}`);
    if (d.column) props.push(`col=${d.column}`);
    props.push(`title=${escapeProperty(d.rule)}`);
    const body = d.hint ? `${d.message} ${d.hint}` : d.message;
    return `::${d.severity === 'error' ? 'error' : 'warning'} ${props.join(',')}::${escapeData(body)}`;
  });
  const { errors, warnings } = countBySeverity(diagnostics);
  out.push(`${plural(errors, 'error')}, ${plural(warnings, 'warning')}`);
  return out.join('\n');
}

export function formatDiagnostics(diagnostics: Diagnostic[], format: Format): string {
  if (format === 'json') {
    return JSON.stringify({ ...countBySeverity(diagnostics), diagnostics: sortDiagnostics(diagnostics) }, null, 2);
  }
  return format === 'github' ? formatGithub(diagnostics) : formatStylish(diagnostics);
}

/** A plain text table. Columns are sized to their widest cell. */
export function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, index) => Math.max(header.length, ...rows.map((row) => (row[index] ?? '').length)));
  const line = (cells: string[]): string => cells.map((cell, index) => (cell ?? '').padEnd(widths[index])).join('  ').trimEnd();
  return [pc.dim(line(headers)), ...rows.map(line)].join('\n');
}
