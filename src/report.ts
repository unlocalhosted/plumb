import { relative } from 'node:path';
import { readFileSync } from 'node:fs';
import { count, plural } from './messages.js';
import { findingContext, findingLines, renderFindingLines } from './cli-findings.js';
import { table, wrap } from './cli-table.js';

export const tool = {
  name: 'react-plumber' as const,
  version: (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }).version,
};

export type Family = 'spacing' | 'color' | 'radius' | 'type' | 'motion' | 'elevation' | 'size' | 'z' | 'opacity';
export type Origin = 'project' | 'framework' | 'inferred';
export type Tier = 'primitive' | 'semantic';

export interface Site {
  file: string;
  line: number;
  column: number;
  text: string;
  /** Stable enclosing function/component or resolved stylesheet selector. */
  anchor?: string;
  /** Whether this authored site belongs to the requested Git file scope. */
  inScope?: boolean;
  /** Authored-site identity and acceptance, independent of report grouping. */
  ledger?: { key: string; status: 'new' | 'debt' | 'exception'; why?: string };
}

export interface Condition {
  /** `state`: a component library's state the declaration applies in (`checked`, `open`, `orientation=horizontal`), beside the selector or branch that carries it. */
  kind: 'media' | 'pseudo' | 'selector' | 'container' | 'supports' | 'branch' | 'layer' | 'state';
  text: string;
}

export interface Declaration {
  prop: string;
  value: string;
  resolved?: string;
  refs: string[];
  when: Condition[];
  site: Site;
  owner: { kind: 'element' | 'component'; name: string };
  origin: 'class' | 'arbitrary' | 'stylesheet' | 'apply' | 'inline' | 'custom-property' | 'keyframes';
  sourceOrigin?: 'project' | 'framework';
  /** Class candidate supplied a value; false for compiler-defined utilities. */
  authoredValue?: boolean;
  /** Box-shadow with Tailwind ring-layer references preserved for elevation. */
  elevationValue?: string;
  /** Theme keys selected by the compiler before it inlines their values. */
  decisionRefs?: string[];
  /** Authored CSS before compiler-generated compatibility fallbacks. */
  authoredCss?: string;
  package?: string;
  opaque?: 'dynamic-value' | 'dynamic-class' | 'spread';
  /** A runtime value read symbolically: a token scaled or offset at runtime, or a constant step times a runtime number. */
  dynamic?: { kind: 'reference' | 'step'; by: string };
}

export interface Decision {
  exported?: boolean;
  /** Inline theme aliases resolve against :root; retain known mode values too. */
  resolvedModes?: { dark?: string };
  resolved?: string;
  family: Family;
  name: string;
  value: string;
  refs: string[];
  origin: Origin;
  tier: Tier;
  why: string;
  /** Shared recipe/group description, never displayed as this token's reason. */
  groupWhy?: string;
  source: { file: string; line: number };
  /** What to write instead at a finding's sites: the utility for class sites, the declaration for stylesheet and inline sites. */
  use?: { class?: string; css: string };
}

export interface Finding {
  title: string;
  because: string;
  action?: string;
  accept: string;
  /** Suggestible tokens only; decisions also retains non-choice metadata. */
  choices?: Decision[];
  /** Per-site instructions, with a token name when they belong to a choice. */
  edits?: { site: Site; text: string; token?: string }[];
  key: string;
  rule: string;
  family: string;
  severity: 'info' | 'warn' | 'error';
  sites: Site[];
  declaration: Declaration;
  decisions: Decision[];
  why: string;
  fix: string;
  /** Nondecision custom property owning this value; distinct consumer sites. */
  variable?: { name: string; useCount: number };
  /** Exact declarations behind grouped sites, for generic ledger consumers. */
  occurrences?: Declaration[];
  status?: 'new' | 'debt' | 'exception' | 'out-of-scope';
  ledgerKeys?: string[];
  component?: import('./ownership/components.js').ComponentIdentity;
}

export interface FileCounts {
  tsx: number;
  jsx: number;
  css: number;
  other: number;
}

export interface FamilyCoverage {
  fromDecisions: number;
  total: number;
  findings: number;
  debt: number;
  exceptions: number;
}

export type JudgedFamily = Exclude<Family, 'size' | 'opacity'>;
export type ProvenanceCoverage = Record<JudgedFamily, Pick<FamilyCoverage, 'fromDecisions' | 'total' | 'findings'>>;

export interface Report {
  presets?: import('./presets/index.js').PresetSummary[];
  schemaVersion: 1;
  tool: { name: 'react-plumber'; version: string };
  root: string;
  config: { path: string | null; inferred: boolean };
  /** Configuration context, without suppressing the family's real findings. */
  configHints?: Partial<Record<Family, string>>;
  tailwind: { entry: string | null; version: string | null };
  files: FileCounts;
  findings: Finding[];
  habits?: import('./habits/index.js').HabitSummary[];
  decisions: Decision[];
  /** Numeric spacing is a base, not a named token; replaced bases do not govern values. */
  numericSpacing?: import('./decisions/spacing.js').NumericSpacing;
  notes: string[];
  /** Project theme decisions, including keys outside configured judging ladders. */
  decisionInventory?: Decision[];
  /** Whole-project reference reachability, grouped for summary consumers. */
  deadDecisions?: import('./rules/dead.js').DeadDecisionCounts;
  imitationSuggestions?: import('./imitation/index.js').ImitationSuggestion[];
  ledger?: import('./ledger/types.js').LedgerSummary;
  declarations: Declaration[];
  stylesheets: { file: string; sourceOrigin: 'project' | 'framework'; package?: string; reached: { kind: 'entry' | 'import' | 'reference' | 'side-effect' | 'module' | 'source' | 'jsx-style'; from?: string; specifier?: string }[] }[];
  moduleGraph: { modules: number; followed: number; cssFiles: number; cacheHits: number; cacheMisses: number; parseMs: number; totalMs: number };
  coverage: ProvenanceCoverage & { ownership?: import('./ownership/judge.js').OwnershipCoverage; existence: { total: number; dead: number; deadVars: number }; declarations: Record<Declaration['origin'], number>; stylesheets: Record<'entry' | 'import' | 'reference' | 'side-effect' | 'module' | 'source' | 'jsx-style', number>; inline: { sites: number; literalSites: number; opaque: number; fullyOpaque: number; spreads: number } };
  classes: { unique: number; opaque: number };
  timing: { totalMs: number; phases: { discover: number; parse: number; collect: number; load: number; compile: number; stylesheets: number; inline: number; decisions: number; provenance: number; habits?: number; ownership?: number }; cacheHits: number; cacheMisses: number };
}

// The text report is read by a person deciding what to change, so it leads with what is wrong and what to write
// instead, keeps each reason to the sentence that matters, and shows a few sites per finding. JSON keeps everything.
export function formatFinding(finding: Finding, path: (file: string) => string, verbose: boolean, repeated = true): string {
  return renderFindingLines(findingLines([finding]), path, verbose) + (repeated ? '\n\n' + findingContext([finding], path, verbose) : '');
}
const share = (part: number, total: number) => total ? ' (' + Math.round(part / total * 100) + '%)' : '';

export function formatText(report: Report, verbose = false): string {
  const path = (file: string) => relative(report.root, file) || '.';
  const tailwind = report.tailwind.entry === null
    ? 'plain CSS'
    : `tailwind ${report.tailwind.version ?? 'not installed'}  theme ${path(report.tailwind.entry)}`;
  const { tsx, jsx, css, other } = report.files;
  const rank = { error: 0, warn: 1, info: 2 } as const;
  const runtime = report.findings.filter(finding => finding.rule === 'provenance/opaque-inline');
  const diagnostics = report.findings.filter(finding => finding.rule === 'config/unreadable');
  const choices = report.findings.filter(finding => finding.rule === 'config/tailwind-entry');
  const unused = report.findings.filter(finding => finding.rule.startsWith('dead/'));
  const unusedTokens = unused.reduce((n, f) => n + f.sites.length, 0);
  const runtimeStyles = runtime.reduce((n, f) => n + f.sites.length, 0);
  // With a ledger, the daily view is what is new; recorded debt and exceptions are one summary line (plumber check --debt lists them).
  const known = (finding: Finding) => finding.sites.length > 0 && finding.sites.every(site => site.ledger !== undefined && site.ledger.status !== 'new');
  const recorded = report.findings.filter(known);
  const quiet = (finding: Finding) => ['config/unreadable', 'config/tailwind-entry'].includes(finding.rule) || finding.rule === 'provenance/opaque-inline' || finding.rule.startsWith('dead/') || known(finding);
  const ordered = [...report.findings].filter(finding => verbose || !quiet(finding))
    .sort((a, b) => rank[a.severity] - rank[b.severity] || b.sites.length - a.sites.length || a.rule.localeCompare(b.rule));
  const byRule = new Map<string, number>();
  for (const finding of report.findings) byRule.set(finding.rule, (byRule.get(finding.rule) ?? 0) + 1);
  const { existence, inline } = report.coverage;
  const families = (['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'z'] as const)
    .map(family => [family, (report.coverage as unknown as Record<string, FamilyCoverage | undefined>)[family]] as const)
    .filter((entry): entry is readonly [typeof entry[0], FamilyCoverage] => entry[1] !== undefined && entry[1].total > 0);

  const summary = [
    ...(diagnostics.length && !verbose ? [`unreadable  ${count(diagnostics.length, 'item')} skipped (--verbose lists parser diagnostics)`] : []),
    ...(!verbose ? choices.map(finding => `entry       ${finding.title}; ${finding.because}`) : []),
    `classes     ${count(existence.total, 'class', 'classes')} read, ${existence.dead} ${plural(existence.dead, 'does', 'do')} nothing${existence.deadVars ? `, ${count(existence.deadVars, 'undefined variable')}` : ''}`,
    ...table(families.map(([family, c]) => [family, c.fromDecisions.toLocaleString('en-US') + ' of ' + c.total.toLocaleString('en-US') + ' use your tokens' + share(c.fromDecisions, c.total), c.findings.toLocaleString('en-US') + ' off']), [{ width: 9 }, { weight: 3 }, { weight: 1, align: 'right', ink: 'dim' }], { indent: 0 }),
    `inline      ${inline.literalSites} of ${count(inline.sites, 'style attribute')} ${plural(inline.literalSites, 'has', 'have')} literal values`,
    ...(unused.length && !verbose ? [`unused      ${unused.map(f => count(f.sites.length, `${f.family === 'color' ? 'colour' : f.family === 'elevation' ? 'shadow' : f.family} token`)).join(', ')} ${plural(unusedTokens, 'is', 'are')} never used in your source; if other apps use them, set decisions.<family>.exported`] : []),
    ...(recorded.length && !verbose ? [`known       ${count(recorded.length, 'finding')} at ${count(recorded.reduce((n, f) => n + f.sites.length, 0), 'site')} ${plural(recorded.length, 'is', 'are')} recorded in the ledger (--verbose lists ${plural(recorded.length, 'it', 'them')})`] : []),
    ...(runtime.length && !verbose ? [`runtime     ${count(runtimeStyles, 'style')} in ${count(runtime.length, 'file')} ${plural(runtimeStyles, 'is', 'are')} computed at runtime and can't be checked (--verbose lists ${plural(runtimeStyles, 'it', 'them')})`] : []),
  ];
  const kinds: [string, (rule: string) => boolean][] = [
    ['values off your tokens', rule => rule.startsWith('provenance/') && rule !== 'provenance/opaque-inline'],
    ['habit breaks', rule => rule.startsWith('habits/')],
    ['broken styles', rule => rule.startsWith('existence/')],
    ['component overrides', rule => rule.startsWith('ownership/')],
    ['hand-built components', rule => rule.startsWith('imitation/')],
    ['setup gaps', rule => rule.startsWith('config/')],
    ['ledger and token changes', rule => rule.startsWith('ledger/') || rule.startsWith('decisions/')],
  ];
  const shownFindings = report.findings.filter(finding => verbose || !quiet(finding));
  const singular: Record<string, string> = { 'values off your tokens': 'value off your tokens', 'habit breaks': 'habit break', 'broken styles': 'broken style', 'component overrides': 'component override', 'hand-built components': 'hand-built component', 'setup gaps': 'setup gap', 'ledger and token changes': 'ledger or token change' };
  const rules = verbose
    ? [...byRule].sort((a, b) => b[1] - a[1]).map(([rule, n]) => `${rule} ${n}`).join(', ')
    : kinds.map(([name, match]) => [name, shownFindings.filter(finding => match(finding.rule)).length] as const).filter(([, n]) => n).map(([name, n]) => `${n.toLocaleString('en-US')} ${n === 1 ? singular[name] ?? name : name}`).join(', ');
  const details = verbose ? formatVerboseDetails(report) : '';
  return wrap(`React Plumber ${report.tool.version}  ${report.root}  ${tailwind}\n` +
    `files ${tsx} tsx, ${jsx} jsx, ${css} css, ${other} other  ${report.timing.totalMs.toFixed(1)}ms\n\n` +
    `${renderFindingLines(findingLines(ordered), path, verbose) || (recorded.length ? 'no new findings' : 'no findings')}${ordered.length ? '\n\n' + findingContext(ordered, path, verbose) : ''}\n\n` +
    `${summary.join('\n')}\n` +
    `${shownFindings.length ? `${count(shownFindings.length, 'finding')}: ${rules}\n` : ''}` +
    details);
}

export function formatVerboseDetails(report: Report): string {
  const { inline } = report.coverage;
  return [
    `declarations ${Object.entries(report.coverage.declarations).map(([origin, n]) => `${n} ${origin}`).join(', ')}`,
    `stylesheets ${Object.entries(report.coverage.stylesheets).map(([reach, n]) => `${n} ${reach}`).join(', ')}`,
    `inline ${count(inline.opaque, 'opaque declaration')} (${inline.fullyOpaque} fully opaque)  classes ${report.classes.opaque} opaque`,
    `modules ${report.moduleGraph.followed} followed outside source globs, ${count(report.moduleGraph.cssFiles, 'CSS file')} reached  ${report.moduleGraph.totalMs.toFixed(1)}ms  cache ${count(report.moduleGraph.cacheHits, 'hit')}, ${count(report.moduleGraph.cacheMisses, 'miss', 'misses')}`,
    `timing ${Object.entries(report.timing.phases).map(([phase, ms]) => `${phase} ${ms.toFixed(1)}ms`).join(', ')}  cache ${count(report.timing.cacheHits, 'hit')}, ${count(report.timing.cacheMisses, 'miss', 'misses')}`,
    ...report.notes.map(note => `note: ${note}`),
  ].join('\n') + '\n';
}
