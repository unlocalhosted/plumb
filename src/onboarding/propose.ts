import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { check } from '../index.js';
import { UsageError } from '../errors.js';
import { count } from '../messages.js';
import { tailwindEntryCandidates } from '../project.js';
import { pixels } from '../decisions/resolve.js';
import { readLedger } from '../ledger/store.js';
import { judgedFamilies } from '../rules/families.js';
import type { JudgedFamily } from '../rules/families.js';
import type { Report } from '../report.js';
import { canonical, harvest, measureFamily, measures } from './harvest.js';
import type { Measure } from './harvest.js';
import { fit } from './ladder.js';
import type { Scale } from './ladder.js';
import { readState } from './state.js';
import type { ProjectState } from './state.js';

/** docs/briefs/onboarding.md section 2.3: chaos to system, in one pass and three steps. Reads only. */
export interface FamilyProposal {
  family: JudgedFamily;
  /** Places the code uses a value of this family, and the files they are in. */
  sites: number;
  files: number;
  /** Values set in code that the proposal cannot cluster. */
  setInCode: number;
  summary: string;
  scales: Scale[];
}
export type Shape = 'theme' | 'shadcn' | 'root';
export interface Proposal {
  schemaVersion: 1;
  /** A hash of the values and places the proposal was made from. */
  hash: string;
  state: { rung: string; name: string; kind: string };
  shape: Shape | null;
  /** Where the tokens are written. A new file is imported from `importedFrom`. */
  target: { file: string; create: boolean; importedFrom: string | null } | null;
  families: FamilyProposal[];
  /** Families that already have your tokens, and why nothing is proposed for them. */
  skipped: { family: string; reason: string }[];
  notes: string[];
  /** When the project cannot be judged yet: the state's sentence and next step. */
  blocked?: { sentence: string; next: string };
}

const labels: Record<JudgedFamily, string> = { spacing: 'Spacing', color: 'Colour', radius: 'Radius', type: 'Type', motion: 'Motion', elevation: 'Shadows', z: 'Layers' };
export const proposalFamilies: readonly JudgedFamily[] = ['spacing', 'color', 'radius', 'type', 'motion', 'elevation', 'z'];
const unitNouns: Record<Measure, [string, string]> = {
  spacing: ['value', 'values'], radius: ['corner size', 'corner sizes'], 'type-size': ['size', 'sizes'], 'line-height': ['line height', 'line heights'], 'letter-spacing': ['tracking', 'trackings'],
  duration: ['duration', 'durations'], easing: ['curve', 'curves'], color: ['colour', 'colours'], elevation: ['shadow', 'shadows'], z: ['layer', 'layers'],
};
const cut = (text: string, width = 36) => text.length > width ? text.slice(0, width - 1) + '…' : text;
const short = (name: string) => name.replace(/^--[a-z]+-/, '');

/** The sentence a question or the table heading uses: what is in use and what it snaps to. */
export function describeFamily(item: FamilyProposal): string {
  const main = item.scales[0];
  if (!main) return `${labels[item.family]}: nothing to propose.`;
  if (main.ladder === 'tailwind-numeric') return `${labels[item.family]}: Tailwind's numeric scale, ${count(main.steps.length, 'step')} in use.`;
  const [one, many] = unitNouns[main.measure];
  const first = main.steps[0], last = main.steps.at(-1);
  const range = main.steps.length > 1 && first && last ? ` (${short(first.name)}…${short(last.name)})` : '';
  const used = `${count(main.values, one, many)} in use`;
  return main.steps.length < main.values ? `${labels[item.family]}: ${used} snap to ${count(main.steps.length, 'step')}${range}.` : `${labels[item.family]}: ${used}${range}.`;
}

/** Definitions of one variable in different files, and the one the cascade ends on. */
function conflicts(report: Report, root: string): string[] {
  const path = (file: string) => relative(root, file).replaceAll('\\', '/');
  const sheets = report.stylesheets.filter(sheet => sheet.sourceOrigin === 'project');
  const children = new Map<string, string[]>();
  const imported = new Set<string>();
  for (const sheet of sheets) for (const reach of sheet.reached) if (reach.kind === 'import' && reach.from) {
    children.set(reach.from, [...children.get(reach.from) ?? [], sheet.file]); imported.add(sheet.file);
  }
  // Imports come first in the cascade; a file's own rules follow what it imports.
  const order: string[] = [], seen = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const child of (children.get(file) ?? []).sort()) visit(child);
    order.push(file);
  };
  for (const sheet of sheets.map(item => item.file).sort()) if (!imported.has(sheet)) visit(sheet);
  for (const sheet of sheets.map(item => item.file).sort()) visit(sheet);
  const rank = (file: string) => order.indexOf(file);
  const own = report.declarations.filter(declaration => declaration.origin === 'custom-property' && declaration.sourceOrigin !== 'framework' && !declaration.prop.startsWith('--tw-')
    && declaration.when.length > 0 && declaration.when.every(condition => condition.text === ':root' || condition.text === 'html'));
  const byName = new Map<string, typeof own>();
  for (const declaration of own) byName.set(declaration.prop, [...byName.get(declaration.prop) ?? [], declaration]);
  const notes: string[] = [];
  for (const [name, list] of [...byName].sort((a, b) => a[0] < b[0] ? -1 : 1)) {
    const files = new Set(list.map(item => item.site.file)), values = new Set(list.map(item => item.value));
    if (files.size < 2 || values.size < 2) continue;
    const ranked = [...list].sort((a, b) => rank(a.site.file) - rank(b.site.file) || a.site.line - b.site.line);
    const winner = ranked.at(-1)!;
    const where = ranked.map(item => `${item.value} in ${path(item.site.file)}:${item.site.line}`);
    notes.push(`${name} is set ${ranked.length} times: ${where.join(', ')}. Your cascade ends on ${winner.value}, so that is the one used.`);
  }
  return notes;
}

/** The stylesheet that holds most of the project's own rules: the one to import a new theme file from. */
function mainStylesheet(report: Report, root: string): string | undefined {
  const sheets = new Map<string, number>();
  for (const sheet of report.stylesheets) if (sheet.sourceOrigin === 'project') sheets.set(relative(root, sheet.file).replaceAll('\\', '/'), 0);
  for (const declaration of report.declarations) if (declaration.sourceOrigin !== 'framework' && (declaration.origin === 'stylesheet' || declaration.origin === 'custom-property')) {
    const file = relative(root, declaration.site.file).replaceAll('\\', '/');
    if (sheets.has(file)) sheets.set(file, sheets.get(file)! + 1);
  }
  return [...sheets].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0];
}

export interface ProposeOptions { root: string; report: Report; state: ProjectState; declined?: ReadonlySet<string>; family?: JudgedFamily }

/** The proposal for a checked project. Pure over the report: same declarations, same bytes. */
export function propose(options: ProposeOptions): Proposal {
  const { root, report, state } = options;
  const base = { schemaVersion: 1 as const, state: { rung: state.rung, name: state.name, kind: state.kind } };
  if (state.rung === 'R0') return { ...base, hash: '', shape: null, target: null, families: [], skipped: [], notes: [], blocked: { sentence: state.sentence, next: state.next } };
  const found = harvest(report, { root, ...(options.declined ? { declined: options.declined } : {}) });
  const entry = report.tailwind.entry;
  const numericBase = report.numericSpacing && !report.numericSpacing.replaced && entry ? pixels(report.numericSpacing.unit.resolved ?? '') : undefined;
  const numeric = numericBase !== undefined && report.numericSpacing ? { unit: numericBase, text: report.numericSpacing.unit.value } : undefined;
  const families: FamilyProposal[] = [], skipped: Proposal['skipped'] = [];
  for (const family of proposalFamilies) {
    if (options.family && family !== options.family) continue;
    const info = state.numbers.families[family];
    if (!info) continue;
    if (info.tokened) { skipped.push({ family, reason: `Your theme already has ${family === 'color' ? 'colour' : family} tokens.` }); continue; }
    const scales = measures.filter(measure => measureFamily[measure] === family && found.values[measure].length)
      .map(measure => fit(measure, found.values[measure], measure === 'spacing' && numeric ? { numeric } : {}));
    if (!scales.length) continue;
    const sites = scales.reduce((sum, scale) => sum + scale.sites, 0);
    const files = new Set<string>();
    for (const scale of scales) for (const value of found.values[scale.measure]) value.fileList.forEach(file => files.add(file));
    const item: FamilyProposal = { family, sites, files: files.size, setInCode: found.setInCode[family] ?? 0, summary: '', scales };
    item.summary = describeFamily(item);
    families.push(item);
  }

  const notes: string[] = conflicts(report, root);
  for (const item of families) if (item.setInCode) notes.push(`${labels[item.family]}: ${item.setInCode} set in code, left out.`);
  if (found.dark && families.some(item => item.family === 'color')) notes.push(`${count(found.dark, 'colour')} set for dark mode. The theme is written for light only; no dark values are made up.`);

  let shape: Shape | null = null, target: Proposal['target'] = null;
  if (families.length) {
    if (entry) {
      const file = relative(root, entry).replaceAll('\\', '/');
      shape = existsSync(join(root, 'components.json')) && /@theme\s+inline\b/.test(readFileSyncSafe(entry)) ? 'shadcn' : 'theme';
      target = { file, create: false, importedFrom: null };
    } else {
      const main = mainStylesheet(report, root);
      const file = main ? join(dirname(main), 'theme.css').replaceAll('\\', '/') : 'src/theme.css';
      shape = 'root';
      target = { file, create: !existsSync(resolve(root, file)), importedFrom: main && !existsSync(resolve(root, file)) ? main : null };
    }
  }
  return { ...base, hash: found.hash, shape, target, families, skipped, notes };
}

function readFileSyncSafe(file: string): string {
  try { return readFileSync(file, 'utf8'); } catch { return ''; }
}

/** Values the person declined, as `measure:canonical`, from the ledger. */
export async function declinedValues(root: string): Promise<Set<string>> {
  const ledger = await readLedger(root);
  const result = new Set<string>();
  for (const entry of ledger.entries) {
    if (entry.kind !== 'declined' || !entry.family || entry.value === undefined) continue;
    const key = canonical(entry.family as Measure, entry.value);
    if (key !== undefined) result.add(`${entry.family}:${key}`);
  }
  return result;
}

/** Check the project and propose for it. `config` is any config path the caller wants judged against. */
export async function loadProposal(root: string, options: { config?: string; family?: JudgedFamily } = {}): Promise<{ proposal: Proposal; report: Report | null; state: ProjectState }> {
  const state = await readState({ root, ...(options.config ? { config: options.config } : {}) });
  if (state.rung === 'R0') return { proposal: propose({ root, report: undefined as unknown as Report, state }), report: null, state };
  const report = await checkProject(root, options.config);
  const declined = await declinedValues(root);
  return { proposal: propose({ root, report, state, declined, ...(options.family ? { family: options.family } : {}) }), report, state };
}

/** The same check `plumber state` runs: two Tailwind entries read the first and say so elsewhere. */
export async function checkProject(root: string, config?: string): Promise<Report> {
  const run = (entry?: string) => check({ root, ledger: false, ...(config ? { config } : {}), ...(entry ? { entry } : {}) });
  try { return await run(); }
  catch (error) {
    if (!(error instanceof UsageError) || !/^Multiple Tailwind entry files/.test(error.message)) throw error;
    const [first] = await tailwindEntryCandidates(root);
    if (!first) throw error;
    return await run(first);
  }
}

/** The human output of `plumber propose`. */
export function formatProposal(proposal: Proposal, table: (rows: string[][]) => string[]): string {
  if (proposal.blocked) return `${proposal.blocked.sentence}\n\nNext: ${proposal.blocked.next}\n`;
  const lines: string[] = [];
  if (!proposal.families.length) {
    lines.push(proposal.skipped.length ? 'Nothing to propose. ' + proposal.skipped.map(item => item.reason).join(' ') : 'Nothing to propose. No values to build a scale from.');
    for (const note of proposal.notes) lines.push('', note);
    return lines.join('\n') + '\n';
  }
  for (const family of proposal.families) {
    lines.push(family.summary);
    for (const scale of family.scales) {
      if (family.scales.length > 1) lines.push('', `  ${scale.measure}`);
      const rows = scale.steps.map(step => [step.name, step.value, `${step.sites}`, `${step.files}`, step.examples[0] ?? '',
        step.absorbs.length ? 'takes ' + step.absorbs.slice(0, 3).map(item => cut(item.value, 24)).join(', ') + (step.absorbs.length > 3 ? ` +${step.absorbs.length - 3}` : '') : '']);
      if (rows.length) lines.push('', ...table(rows));
      for (const item of scale.merged.slice(0, 6)) lines.push(`  merged ${cut(item.value)} into ${cut(item.into)} (${count(item.sites, 'place')})`);
      if (scale.merged.length > 6) lines.push(`  +${scale.merged.length - 6} more merged`);
      if (scale.offLadder.length) lines.push(`  off the scale: ${scale.offLadder.slice(0, 6).map(item => `${cut(item.value)} (${item.sites})`).join(', ')}${scale.offLadder.length > 6 ? ` +${scale.offLadder.length - 6} more` : ''}`);
      if (scale.near.length) lines.push(`  close but kept apart: ${scale.near.slice(0, 4).map(pair => pair.map(item => cut(item, 24)).join(' and ')).join('; ')}${scale.near.length > 4 || scale.nearMore ? ' …' : ''}`);
    }
    lines.push('');
  }
  for (const item of proposal.skipped) lines.push(item.reason);
  for (const note of proposal.notes) lines.push(note);
  if (lines.at(-1) === '') lines.pop();
  const where = proposal.target ? `${proposal.target.create ? 'a new ' : ''}${proposal.target.file}` : 'your theme';
  lines.push('', `plumber propose --write puts these in ${where}.`);
  return lines.join('\n') + '\n';
}
