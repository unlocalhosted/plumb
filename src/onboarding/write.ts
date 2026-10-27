import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { atomicWrite } from '../atomic-write.js';
import { count } from '../messages.js';
import { readLedger } from '../ledger/store.js';
import type { JudgedFamily } from '../rules/families.js';
import { loadProposal } from './propose.js';
import type { Proposal, Shape } from './propose.js';
import type { Token } from './ladder.js';

/**
 * docs/briefs/onboarding.md section 2.3, "Reviewable" and section 5.2: the proposal written into the project's own theme,
 * in the shape it already has. A block is extended in place; nothing the project wrote is changed.
 */
export interface ThemeEdit {
  /** Relative to the project root. */
  file: string;
  create: boolean;
  before: string;
  after: string;
  /** The lines this edit adds, for the diff the person reads first. */
  added: string[];
}
export interface ThemePlan { edits: ThemeEdit[]; tokens: Record<string, number>; total: number; shape: Shape; target: string }

interface Block { selector: string; open: number; close: number }
/** The top-level blocks of a stylesheet. Comments and strings are skipped, so braces inside them do not count. */
export function topBlocks(css: string): Block[] {
  const blocks: Block[] = [];
  let depth = 0, start = 0, selectorStart = 0, open = 0;
  for (let index = 0; index < css.length; index++) {
    const char = css[index]!;
    if (css.startsWith('/*', index)) { const end = css.indexOf('*/', index + 2); index = end < 0 ? css.length : end + 1; if (!depth && !css.slice(selectorStart, index).trim().replace(/\/\*[\s\S]*?\*\//g, '').trim()) selectorStart = index + 1; continue; }
    if (char === '"' || char === "'") { index++; while (index < css.length && css[index] !== char) { if (css[index] === '\\') index++; index++; } continue; }
    if (char === '{') { if (!depth) { start = selectorStart; open = index + 1; } depth++; }
    else if (char === '}') { depth--; if (!depth) { blocks.push({ selector: css.slice(start, open - 1).replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' '), open, close: index }); selectorStart = index + 1; } if (depth < 0) depth = 0; }
    else if (char === ';' && !depth) selectorStart = index + 1;
  }
  return blocks;
}

const names: Record<string, string> = { color: 'colour', z: 'z-index' };
const declares = (css: string, name: string) => new RegExp(`(?:^|[\\s;{])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`).test(css);
const lines = (tokens: Token[], indent = '  '): string[] => tokens.flatMap(token => [`${indent}/* why: ${token.why} */`, `${indent}${token.name}: ${token.value};`]);

/** Lines go before the closing brace of a block that is already there; otherwise a block of their own closes the file. */
function put(css: string, selector: RegExp, header: string, body: string[], comment?: string): { css: string; added: string[] } {
  if (!body.length) return { css, added: [] };
  const block = topBlocks(css).filter(item => selector.test(item.selector)).at(-1);
  if (block) {
    const inside = css.slice(block.open, block.close);
    const added = [...(comment ? [`  ${comment}`] : []), ...body];
    const gap = /\n[ \t]*$/.test(inside) ? '' : '\n';
    return { css: css.slice(0, block.close).replace(/[ \t]*$/, '') + gap + added.join('\n') + '\n' + css.slice(block.close), added };
  }
  const added = [...(comment ? [comment] : []), `${header} {`, ...body, '}'];
  return { css: (css.trimEnd() ? css.trimEnd() + '\n\n' : '') + added.join('\n') + '\n', added };
}

/** `@import "./theme.css";` after the imports a stylesheet already begins with. */
export function addImport(css: string, specifier: string): { css: string; added: string[] } {
  if (new RegExp(`@import\\s+(?:url\\()?["']${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(css)) return { css, added: [] };
  let offset = 0, index = 0;
  for (;;) {
    while (index < css.length && /\s/.test(css[index]!)) index++;
    if (css.startsWith('/*', index)) { const end = css.indexOf('*/', index + 2); if (end < 0) break; index = end + 2; continue; }
    const match = /^@(?:import|charset)\b[^;]*;/.exec(css.slice(index));
    if (!match) break;
    index += match[0].length; offset = index;
  }
  const statement = `@import "${specifier}";`;
  const before = css.slice(0, offset), after = css.slice(offset);
  return { css: offset ? `${before}\n${statement}${after.startsWith('\n') ? '' : '\n'}${after}` : `${statement}\n${css}`, added: [statement] };
}

/** The edits that put a proposal's tokens in the project's theme. Reads the files; writes nothing. */
export async function planTheme(proposal: Proposal, root: string, families?: ReadonlySet<JudgedFamily>): Promise<ThemePlan | null> {
  if (!proposal.target || !proposal.shape) return null;
  const chosen = proposal.families.filter(item => !families || families.has(item.family));
  const tokens: Record<string, number> = {}, listed: { family: JudgedFamily; token: Token }[] = [];
  const target = resolve(root, proposal.target.file);
  const original = existsSync(target) ? await readFile(target, 'utf8') : '';
  for (const item of chosen) {
    const all = item.scales.flatMap(scale => scale.tokens).filter(token => !declares(original, token.name));
    tokens[item.family] = all.length;
    listed.push(...all.map(token => ({ family: item.family, token })));
  }
  const total = listed.length;
  if (!total) return null;
  const comment = `/* React Plumber proposal ${proposal.hash}: ${chosen.filter(item => tokens[item.family]).map(item => names[item.family] ?? item.family).join(', ')}. Keep what you want, rename or delete the rest. */`;
  const edits: ThemeEdit[] = [];
  const plain = listed.map(item => item.token);
  let css = original;
  let added: string[];
  if (proposal.shape === 'root') {
    ({ css, added } = put(css, /^:root$/, ':root', lines(plain), comment));
    edits.push({ file: proposal.target.file, create: proposal.target.create, before: original, after: css, added });
    if (proposal.target.importedFrom) {
      const from = resolve(root, proposal.target.importedFrom);
      const specifier = relative(dirname(from), target).replaceAll('\\', '/');
      const text = await readFile(from, 'utf8');
      const imported = addImport(text, specifier.startsWith('.') ? specifier : `./${specifier}`);
      if (imported.added.length) edits.push({ file: proposal.target.importedFrom, create: false, before: text, after: imported.css, added: imported.added });
    }
  } else if (proposal.shape === 'shadcn') {
    // Shadcn keeps colour values in :root and bridges them in `@theme inline`; every other token sits in that same block.
    const colours = listed.filter(item => item.family === 'color').map(item => item.token);
    const rest = listed.filter(item => item.family !== 'color').map(item => item.token);
    const roots = colours.map(token => ({ ...token, name: token.name.replace(/^--color-/, '--') }));
    const bridges = colours.map((token, index) => ({ ...token, value: `var(${roots[index]!.name})` }));
    const first = put(css, /^:root$/, ':root', lines(roots));
    const second = put(first.css, /^@theme inline$/, '@theme inline', [...lines(bridges), ...lines(rest)], comment);
    css = second.css; added = [...first.added, ...second.added];
    edits.push({ file: proposal.target.file, create: false, before: original, after: css, added });
  } else {
    ({ css, added } = put(css, /^@theme$/, '@theme', lines(plain), comment));
    edits.push({ file: proposal.target.file, create: false, before: original, after: css, added });
  }
  return { edits, tokens, total, shape: proposal.shape, target: proposal.target.file };
}

/** Write the edits. Returns a function that puts every file back as it was. */
export async function applyTheme(root: string, plan: ThemePlan): Promise<() => Promise<void>> {
  const done: ThemeEdit[] = [];
  const undo = async () => {
    for (const edit of done.reverse()) {
      const path = resolve(root, edit.file);
      if (edit.create) await rm(path, { force: true });
      else await atomicWrite(path, edit.before);
    }
  };
  try {
    for (const edit of plan.edits) {
      const path = resolve(root, edit.file);
      await mkdir(dirname(path), { recursive: true });
      await atomicWrite(path, edit.after);
      done.push(edit);
    }
  } catch (error) { await undo(); throw error; }
  return undo;
}

const shapeNames: Record<Shape, string> = { theme: '@theme', shadcn: '@theme inline', root: ':root' };
/** The diff a person reads before the write, then the sentence after it. */
export function describePlan(plan: ThemePlan): { diff: string; summary: string } {
  const diff = plan.edits.map(edit => `+++ ${edit.file}${edit.create ? ' (new)' : ''}\n${edit.added.map(line => `+ ${line}`).join('\n')}\n`).join('\n');
  const parts = Object.entries(plan.tokens).filter(([, n]) => n).map(([family, n]) => `${n} ${names[family] ?? family}`);
  const imported = plan.edits.find(edit => !edit.create && edit.file !== plan.target);
  const summary = `Wrote ${count(plan.total, 'token')} to ${plan.target} (${shapeNames[plan.shape]}): ${parts.join(', ')}.${imported ? ` Imported it from ${imported.file}.` : ''}`;
  return { diff, summary };
}

/** `plumber propose --write`: the proposal, written. Questions are `plumber init`'s; this writes what it is told to. */
export async function proposeAndWrite(root: string, options: { config?: string; family?: JudgedFamily }): Promise<{ text: string; wrote: boolean }> {
  const { proposal } = await loadProposal(root, options);
  if (proposal.blocked) return { text: `${proposal.blocked.sentence}\n\nNext: ${proposal.blocked.next}\n`, wrote: false };
  const plan = await planTheme(proposal, root);
  if (!plan) {
    const why = proposal.skipped.length ? proposal.skipped.map(item => item.reason).join(' ') : 'No values to build a scale from.';
    return { text: `Nothing to write. ${why}\n`, wrote: false };
  }
  await applyTheme(root, plan);
  const { diff, summary } = describePlan(plan);
  const ledger = await readLedger(root);
  const next = ledger.exists ? 'plumber accept-decisions --why "…"' : 'plumber baseline';
  return { text: `${diff}\n${summary}\nNext: ${next}\n`, wrote: true };
}
