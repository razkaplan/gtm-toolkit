import type { ContentItem, ContentType } from '../content/load';
import type { Severity, Spec } from '../spec/schema';

export interface Report {
  message: string;
  line?: number;
  column?: number;
  hint?: string;
}

export interface SiteIndex {
  /** Every URL the site serves: collection items plus declared routes. */
  urls: Set<string>;
  /** Does this path exist under the public directory or as a generated output? */
  hasAsset(path: string): boolean;
  /** Does this project-relative file exist? */
  hasFile(file: string): boolean;
}

export interface FileRuleContext<Options> {
  spec: Spec;
  item: ContentItem;
  site: SiteIndex;
  options: Options;
  report(finding: Report): void;
}

export interface ProjectRuleContext<Options> {
  spec: Spec;
  items: ContentItem[];
  options: Options;
  /** Is this rule switched on for this file? Project rules must ask. */
  enabledFor(item: ContentItem): boolean;
  report(item: ContentItem, finding: Report): void;
}

interface RuleBase<Options> {
  id: string;
  /** One line, shown in `gtm rules`. */
  description: string;
  /** Why the rule exists. Shown by `gtm explain` and in the docs. */
  rationale: string;
  defaultSeverity: Severity;
  defaultOptions: Options;
  /** Content types the rule applies to. All when omitted. */
  appliesTo?: ContentType[];
}

export interface FileRule<Options = Record<string, never>> extends RuleBase<Options> {
  scope: 'file';
  check(context: FileRuleContext<Options>): void;
}

export interface ProjectRule<Options = Record<string, never>> extends RuleBase<Options> {
  scope: 'project';
  check(context: ProjectRuleContext<Options>): void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Rule = FileRule<any> | ProjectRule<any>;
