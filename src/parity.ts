import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readDtcg } from './decisions/dtcg.js';
import { pixels, resolveValue } from './decisions/resolve.js';
import { UsageError } from './errors.js';
import { makeFinding } from './messages.js';
import { colorDistance, oklab } from './rules/families.js';
import { tool } from './report.js';
import type { Decision, Finding, Report, Site } from './report.js';
import { pathFor } from './surfaces/sites.js';

export const colorTolerance = 0.01;
const alphaTolerance = 0.001;
export interface ParityFinding extends Finding {
  title: string;
  because: string;
  action: string;
  token: string;
  themeToken?: string;
  exportedValue?: string;
  themeValue?: string;
  distance?: number;
}
export interface ParityReport {
  schemaVersion: 1;
  tool: typeof tool;
  source: string;
  compared: number;
  tolerance: { oklab: number; alpha: number };
  findings: ParityFinding[];
}
const nameFor = (name: string) => name.startsWith('--') ? name : `--${name.replaceAll('.', '-')}`;
const short = (name: string) => name.length > 27 ? name.slice(0, 26) + '…' : name;
const cssValue = (value: string) => value.replace(/\{([\w.-]+)\}/g, 'var($1)');
const normalized = (value: string) => value.trim().replace(/\s+/g, ' ').replace(/\s*([(),])\s*/g, '$1');

function equal(a: string, b: string, family: Decision['family']): { equal: boolean; distance?: number } {
  if (family === 'color') {
    const x = oklab(a), y = oklab(b);
    if (x && y) { const distance = colorDistance(x, y); return { equal: distance <= colorTolerance && Math.abs(x[3] - y[3]) <= alphaTolerance, distance }; }
    // Unparsed colours cannot establish parity, even when their text is equal.
    return { equal: false };
  }
  const x = pixels(a), y = pixels(b);
  if (['spacing', 'radius', 'size'].includes(family) && x !== undefined && y !== undefined) return { equal: Math.abs(x - y) < 1e-6 };
  const time = (v: string) => { const match = /^(-?(?:\d*\.)?\d+)(ms|s)$/.exec(v); return match ? Number(match[1]) * (match[2] === 's' ? 1000 : 1) : undefined; };
  if (family === 'motion') { const x = time(a), y = time(b); if (x !== undefined && y !== undefined) return { equal: Math.abs(x - y) < 1e-6 }; }
  return { equal: normalized(a) === normalized(b) };
}

/** Compare token names and resolved values, independently of caller policy and ledger allowances. */
export async function parity(report: Report, tokenPath: string): Promise<ParityReport> {
  const file = resolve(report.root, tokenPath);
  let parsed: unknown;
  try { if (!(await stat(file)).isFile()) throw new Error('expected a file'); parsed = JSON.parse(await readFile(file, 'utf8')); }
  catch { throw new UsageError(`Read token export ${pathFor(report, file)}: provide a readable DTCG JSON file.`); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new UsageError('DTCG export must be an object containing tokens.');
  const names: string[] = [];
  function walk(node: unknown, path: string[]): void {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const value = node as Record<string, unknown>;
    if ('$root' in value) throw new UsageError('DTCG root tokens are not supported. Export root tokens with explicit names.');
    if ('$value' in value) { names.push(path.join('.')); return; }
    if ('$ref' in value || '$extends' in value) throw new UsageError('DTCG group extensions and JSON Pointer references are not supported. Export resolved token groups.');
    for (const [key, child] of Object.entries(value)) if (!key.startsWith('$')) walk(child, [...path, key]);
  }
  walk(parsed, []);
  // Escape glob metacharacters: the argument denotes one exact file, never a glob.
  const tokens = (await readDtcg(report.root, file.replace(/([*?\[\]{}()!])/g, '[$1]')));
  const unknown = names.filter(name => !tokens.some(token => token.name === name));
  if (unknown.length) throw new UsageError(`Token ${unknown[0]} has no supported $type. Export tokens with a $type or an inherited group $type.`);
  const variables = new Map(tokens.map(token => [token.name, { value: cssValue(token.value) }]));
  for (const token of tokens) {
    const resolved = resolveValue(cssValue(token.value), variables, new Set([token.name]));
    if (resolved !== undefined) token.resolved = resolved;
  }
  // Include project theme keys outside the selected caller ladders; omit Tailwind defaults.
  const theme = [...new Map([...report.decisionInventory ?? [], ...report.decisions].filter(token => token.origin !== 'framework')
    .map(token => [`${token.family}:${token.name}`, token])).values()];
  const index = new Map<string, Decision[]>();
  for (const token of theme) {
    for (const name of new Set([token.name, ...token.refs.flatMap(ref => /^var\((--[\w-]+)\)$/.exec(ref)?.[1] ?? [])])) {
      const entries = index.get(name) ?? []; entries.push(token); index.set(name, entries);
    }
  }
  const matched = new Set<Decision>();
  const findings: ParityFinding[] = [];
  function add(rule: string, token: Decision, title: string, because: string, action: string, details: Partial<ParityFinding> = {}): void {
    const site: Site = { ...token.source, file: pathFor(report, token.source.file), column: 1, text: `${token.name}: ${token.value}` };
    // Parity differences require source changes; ledger acceptance cannot excuse them.
    findings.push({ ...makeFinding({ key: `${rule}:${token.family}:${token.name}`, rule, family: token.family, severity: 'error', sites: [site],
      declaration: { prop: token.name, value: token.value, ...(token.resolved === undefined ? {} : { resolved: token.resolved }), refs: token.refs, when: [], site,
        owner: { kind: 'element', name: 'tokens' }, origin: 'custom-property' }, decisions: [],
      title, because, action }), title, because, action, token: token.name, ...details });
  }
  for (const token of tokens) {
    const candidates = index.get(token.name) ?? index.get(nameFor(token.name)) ?? [];
    if (candidates.length > 1) throw new UsageError(`Token ${token.name} matches several theme tokens. Give each theme token a unique name or reference.`);
    const target = candidates[0];
    if (!target) { add('parity/missing', token, `\`${short(token.name)}\` is missing from your theme`, 'Code cannot use a token that exists only in the export.', `Add ${token.name} to the theme, or remove it from the export after review.`); continue; }
    if (matched.has(target)) throw new UsageError(`Several exported tokens map to ${target.name}. Give each exported token a unique theme name.`);
    matched.add(target);
    if (token.resolved === undefined || target.resolved === undefined) {
      add('parity/unresolved', token, `\`${short(token.name)}\` cannot be compared with your theme`, 'Unresolved values can hide differences between code and designs using the export.', `Resolve the aliases or conditional values for ${token.name} and ${target.name}, then rerun plumber parity.`, { themeToken: target.name });
      continue;
    }
    // DTCG dimensions also describe radius/size; numbers also describe z-index.
    const comparison = equal(token.resolved, target.resolved, target.family);
    if (!comparison.equal) add('parity/mismatch', token,
      `\`${short(token.name)}\` differs from \`${short(target.name)}\``, 'Code and designs using the export render this token differently.',
      `Review ${token.name} (${token.resolved}) and ${target.name} (${target.resolved}), then update the source that is out of date.`,
      { themeToken: target.name, exportedValue: token.resolved, themeValue: target.resolved, ...(comparison.distance === undefined ? {} : { distance: comparison.distance }), decisions: [{ ...target, source: { ...target.source, file: pathFor(report, target.source.file) } }] });
  }
  for (const token of theme) if (!matched.has(token)) add('parity/extra', token, `\`${short(token.name)}\` is missing from the export`,
    'Designs using this export cannot use all the tokens available to the code.', `Add ${token.name} to the export, or remove it from the theme after review.`, { themeToken: token.name });
  return { schemaVersion: 1, tool, source: pathFor(report, file), compared: matched.size, tolerance: { oklab: colorTolerance, alpha: alphaTolerance }, findings };
}

export function formatParity(report: ParityReport): string {
  return report.findings.map(finding => `${finding.title}\n  ${finding.because}\n  ${finding.action}\n  ${finding.sites[0]!.file}:${finding.sites[0]!.line}:1\n`).join('\n') +
    `${report.findings.length} token differences. ${report.compared} tokens compared.\n`;
}
