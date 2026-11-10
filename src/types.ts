export type DiagnosticSeverity = 'error' | 'warn';

/** One finding, from the spec validator or a content rule. */
export interface Diagnostic {
  rule: string;
  severity: DiagnosticSeverity;
  message: string;
  /** Path relative to the project root, with forward slashes. */
  file: string;
  line?: number;
  column?: number;
  hint?: string;
}

export function countBySeverity(diagnostics: Diagnostic[]): { errors: number; warnings: number } {
  let errors = 0;
  let warnings = 0;
  for (const d of diagnostics) {
    if (d.severity === 'error') errors += 1;
    else warnings += 1;
  }
  return { errors, warnings };
}

export function sortDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      (a.line ?? 0) - (b.line ?? 0) ||
      (a.column ?? 0) - (b.column ?? 0) ||
      a.rule.localeCompare(b.rule),
  );
}
