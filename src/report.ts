import { relative } from 'node:path';
import { readFileSync } from 'node:fs';

export const tool = {
  name: 'plumb' as const,
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
  kind: 'media' | 'pseudo' | 'selector' | 'container' | 'supports' | 'branch' | 'layer';
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
  /** Theme keys selected by the compiler before it inlines their values. */
  decisionRefs?: string[];
  /** Authored CSS before compiler-generated compatibility fallbacks. */
  authoredCss?: string;
  package?: string;
  opaque?: 'dynamic-value' | 'dynamic-class' | 'spread';
}

export interface Decision {
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
  schemaVersion: 1;
  tool: { name: 'plumb'; version: string };
  root: string;
  config: { path: string | null; inferred: boolean };
  tailwind: { entry: string | null; version: string | null };
  files: FileCounts;
  findings: Finding[];
  habits?: import('./habits/index.js').HabitSummary[];
  decisions: Decision[];
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
const SITES_SHOWN = 5;
const WHY_WIDTH = 72;

function brief(why: string, decision?: Decision): string {
  if (!why) return '';
  const sentences = why.split(/(?<=[.!?])\s+/).filter(Boolean);
  const amount = decision?.resolved?.match(/^-?[\d.]+/)?.[0];
  const tail = decision?.name.split('-').at(-1);
  const pick = sentences.find(sentence => amount !== undefined && new RegExp(`(^|\\D)${amount.replace('.', '\\.')}(\\D|$)`).test(sentence))
    ?? sentences.find(sentence => tail !== undefined && new RegExp(`\\b${tail}\\b`, 'i').test(sentence))
    ?? sentences[0]!;
  const text = pick.replace(/\.$/, '');
  return text.length > WHY_WIDTH ? `${text.slice(0, WHY_WIDTH - 1).trimEnd()}…` : text;
}

const count = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
const share = (part: number, total: number) => total ? ` (${Math.round(part / total * 100)}%)` : '';

function formatFinding(finding: Finding, path: (file: string) => string, verbose: boolean): string {
  // What is wrong, why it matters, what to write instead, where, and how to keep it if it is intended (docs/MESSAGES.md).
  const title = finding.title || finding.why.replace(/\.$/, '');
  const lines = [`${title}${verbose ? `  [${finding.rule}]` : ''}  ${count(finding.sites.length, 'site')}`];
  const because = finding.because || '';
  if (because && because !== title) lines.push(`  ${because}`);
  const choices = finding.choices ?? finding.decisions;
  if (choices.length) {
    // One finding groups every syntax and property that wrote the same amount (gap-10, py-10, margin: 10px), so a
    // row names the token once: its utility suffix, which each site prefixes as it already does, and its variable.
    const rows = choices.map(decision => {
      const css = decision.use?.css.replace(/^[\w-]+:\s*/, '');
      const suffix = decision.use?.class?.replace(/^.*?-(?=mu-|[^-]*$)/, '') ?? undefined;
      const token = decision.use?.class && decision.name.startsWith('--spacing-') ? decision.name.slice('--spacing-'.length) : suffix;
      return { amount: decision.resolved ?? decision.value, token: token ?? (css ? '' : decision.name), css: css ?? '', why: brief(decision.why, decision) };
    });
    const width = (key: 'amount' | 'token' | 'css') => Math.max(...rows.map(row => row[key].length));
    const [amountWidth, tokenWidth, cssWidth] = [width('amount'), width('token'), width('css')];
    rows.forEach((row, i) => lines.push(`  ${i ? '   ' : 'use'}  ${row.amount.padEnd(amountWidth)}  ${tokenWidth ? `${row.token.padEnd(tokenWidth)}  ` : ''}${row.css.padEnd(cssWidth)}${row.why ? `  ${row.why}` : ''}`.trimEnd()));
  } else {
    const action = finding.action ?? finding.fix;
    if (action) lines.push(`  ${action}`);
  }
  const shown = finding.sites.slice(0, SITES_SHOWN).map(site => ({ at: `${path(site.file)}:${site.line}:${site.column}`, text: site.text }));
  const atWidth = Math.min(64, Math.max(...shown.map(site => site.at.length)));
  for (const site of shown) lines.push(`  ${site.at.padEnd(atWidth)}  ${site.text}`);
  if (finding.sites.length > SITES_SHOWN) lines.push(`  … ${count(finding.sites.length - SITES_SHOWN, 'more site')}  (--json lists every site)`);
  if (finding.accept && finding.severity !== 'info') {
    const accept = finding.sites.length > 1 ? finding.accept.replace(/--site \S+/, '--site <file:line>') : finding.accept;
    lines.push(`  intended?  ${accept}`);
  }
  return lines.join('\n');
}

export function formatText(report: Report, verbose = false): string {
  const path = (file: string) => relative(report.root, file) || '.';
  const tailwind = report.tailwind.entry === null
    ? 'plain CSS'
    : `tailwind ${report.tailwind.version ?? 'not installed'}  theme ${path(report.tailwind.entry)}`;
  const { tsx, jsx, css, other } = report.files;
  const rank = { error: 0, warn: 1, info: 2 } as const;
  const runtime = report.findings.filter(finding => finding.rule === 'provenance/opaque-inline');
  const unused = report.findings.filter(finding => finding.rule.startsWith('dead/'));
  const quiet = (finding: Finding) => finding.rule === 'provenance/opaque-inline' || finding.rule.startsWith('dead/');
  const ordered = [...report.findings].filter(finding => verbose || !quiet(finding))
    .sort((a, b) => rank[a.severity] - rank[b.severity] || b.sites.length - a.sites.length || a.rule.localeCompare(b.rule));
  const byRule = new Map<string, number>();
  for (const finding of report.findings) byRule.set(finding.rule, (byRule.get(finding.rule) ?? 0) + 1);
  const { existence, inline } = report.coverage;
  const families = (['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'z'] as const)
    .map(family => [family, (report.coverage as unknown as Record<string, FamilyCoverage | undefined>)[family]] as const)
    .filter((entry): entry is readonly [typeof entry[0], FamilyCoverage] => entry[1] !== undefined && entry[1].total > 0);
  const numberWidth = Math.max(0, ...families.map(([, c]) => c.total.toLocaleString('en-US').length));
  const summary = [
    `classes     ${count(existence.total, 'class', 'classes')} read, ${existence.dead} do nothing${existence.deadVars ? `, ${existence.deadVars} undefined variables` : ''}`,
    ...families.map(([family, c]) => `${family.padEnd(11)} ${c.fromDecisions.toLocaleString('en-US').padStart(numberWidth)} of ${c.total.toLocaleString('en-US').padStart(numberWidth)} use your tokens${share(c.fromDecisions, c.total).padEnd(7)} ${c.findings.toLocaleString('en-US')} don't`),
    `inline      ${inline.literalSites} of ${inline.sites} style attributes have literal values`,
    ...(unused.length && !verbose ? [`unused      ${unused.map(f => `${f.sites.length.toLocaleString('en-US')} ${f.family === 'color' ? 'colour' : f.family === 'elevation' ? 'shadow' : f.family}`).join(', ')} tokens are never used in your source; if other apps use them, set decisions.<family>.exported`] : []),
    ...(runtime.length && !verbose ? [`runtime     ${count(runtime.reduce((n, f) => n + f.sites.length, 0), 'style')} in ${count(runtime.length, 'file')} are computed at runtime and can't be checked (--verbose lists them)`] : []),
  ];
  const kinds: [string, (rule: string) => boolean][] = [
    ['values off your tokens', rule => rule.startsWith('provenance/') && rule !== 'provenance/opaque-inline'],
    ['habit breaks', rule => rule.startsWith('habits/')],
    ['broken styles', rule => rule.startsWith('existence/')],
    ['component overrides', rule => rule.startsWith('ownership/')],
    ['hand-built components', rule => rule.startsWith('imitation/')],
    ['config gaps', rule => rule.startsWith('config/')],
    ['ledger and token changes', rule => rule.startsWith('ledger/') || rule.startsWith('decisions/')],
  ];
  const shownFindings = report.findings.filter(finding => verbose || !quiet(finding));
  const rules = verbose
    ? [...byRule].sort((a, b) => b[1] - a[1]).map(([rule, n]) => `${rule} ${n}`).join(', ')
    : kinds.map(([name, match]) => [name, shownFindings.filter(finding => match(finding.rule)).length] as const).filter(([, n]) => n).map(([name, n]) => `${n.toLocaleString('en-US')} ${name}`).join(', ');
  const details = verbose ? [
    `declarations ${Object.entries(report.coverage.declarations).map(([origin, n]) => `${n} ${origin}`).join(', ')}`,
    `stylesheets ${Object.entries(report.coverage.stylesheets).map(([reach, n]) => `${n} ${reach}`).join(', ')}`,
    `inline ${inline.opaque} opaque declarations (${inline.fullyOpaque} fully opaque)  classes ${report.classes.opaque} opaque`,
    `modules ${report.moduleGraph.followed} followed outside source globs, ${report.moduleGraph.cssFiles} CSS files reached  ${report.moduleGraph.totalMs.toFixed(1)}ms  cache ${report.moduleGraph.cacheHits} hits, ${report.moduleGraph.cacheMisses} misses`,
    `timing ${Object.entries(report.timing.phases).map(([phase, ms]) => `${phase} ${ms.toFixed(1)}ms`).join(', ')}  cache ${report.timing.cacheHits} hits, ${report.timing.cacheMisses} misses`,
    ...report.notes.map(note => `note: ${note}`),
  ].join('\n') + '\n' : '';
  return `plumb ${report.tool.version}  ${report.root}  ${tailwind}\n` +
    `files ${tsx} tsx, ${jsx} jsx, ${css} css, ${other} other  ${report.timing.totalMs.toFixed(1)}ms\n\n` +
    `${ordered.map(finding => formatFinding(finding, path, verbose)).join('\n\n') || 'no findings'}\n\n` +
    `${summary.join('\n')}\n` +
    `${shownFindings.length ? `${count(shownFindings.length, 'finding')}: ${rules}\n` : ''}` +
    details;
}
