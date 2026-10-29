import { relative } from 'node:path';
import type { Declaration, Decision, Finding, Report } from './report.js';

export const plural = (n: number, one: string, many = `${one}s`) => n === 1 ? one : many;
export const count = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${plural(n, one, many)}`;

export const scales: Record<string, string> = { spacing: 'spacing scale', radius: 'radius scale', type: 'type scale', motion: 'motion tokens', elevation: 'shadow tokens', z: 'z-index layers', color: 'colour tokens' };
export const familyNames: Record<string, string> = { color: 'colour', elevation: 'shadow', z: 'z-index', type: 'type', radius: 'radius', spacing: 'spacing', motion: 'motion' };
export const familyReasons: Record<string, string> = {
  spacing: "Off-scale spacing makes layouts drift apart and can't be changed from the theme.",
  radius: "Off-scale corners make surfaces look unrelated and can't be changed from the theme.",
  type: "Sizes and weights off the type scale break the reading rhythm and can't be changed from the theme.",
  color: "A raw colour won't follow theme or colour-scheme changes.",
  motion: "A one-off duration or curve makes motion feel inconsistent and ignores the team's timing.",
  elevation: "A hand-written shadow won't match the other surfaces or follow theme changes.",
  z: 'A raw z-index competes with every other layer; named layers keep stacking predictable.',
};
export const noFit = (amount: string) => `No token is close to ${amount}. Pick one with the design owner, or add one to the theme.`;
export const choiceText = (decisions: Decision[]) => decisions.map(d => `${d.resolved ?? d.value} ${d.name}${d.use?.class ? ` ${d.use.class}` : ''}${d.use?.css ? ` ${d.use.css}` : ''}${d.why ? ` "${d.why}"` : ''}`).join('; ');

type MessageInput = Omit<Finding, 'why' | 'fix' | 'accept'> & { accept?: string };
export function makeFinding(input: MessageInput): Finding {
  return { ...input, accept: input.accept ?? '', why: input.because, fix: input.action ?? choiceText(input.choices ?? []) };
}

/** Normalize once after the final grouping/ledger pass; all surfaces share these fields. */
export function finishMessages(report: Report): Report {
  const paths = new Map<string, string>();
  const path = (file: string): string => {
    if (!paths.has(file)) paths.set(file, relative(report.root, file).replaceAll('\\', '/') || '.');
    return paths.get(file)!;
  };
  // Absolute source paths can occur inside selectors, custom messages and ledger keys.
  const files = new Set([...report.declarations.map(d => d.site.file), ...report.findings.flatMap(f => [f.declaration.owner.name, ...f.sites.map(s => s.file), ...(f.component ? [f.component.source.file] : [])]), ...report.decisions.map(d => d.source.file)]);
  const replacements = [...files].filter(file => file.startsWith('/')).sort((a, b) => b.length - a.length).map(file => [file, path(file)] as const);
  const replacementsByPath = new Map(replacements);
  const pattern = replacements.length ? new RegExp(replacements.map(([file]) => file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g') : undefined;
  const cleaned = new Map<string, string>();
  const clean = (value: string): string => {
    if (!cleaned.has(value)) cleaned.set(value, (pattern && value.includes('/') ? value.replace(pattern, file => replacementsByPath.get(file)!) : value).replaceAll(`${report.root}/`, ''));
    return cleaned.get(value)!;
  };
  for (const finding of report.findings) {
    finding.title = clean(finding.title).replace(/[\r\n]+/g, ' ');
    finding.because = clean(finding.because);
    if (finding.action !== undefined) finding.action = clean(finding.action);
    finding.why = finding.because;
    finding.fix = clean(finding.action ?? finding.fix);
    for (const edit of finding.edits ?? []) edit.text = clean(edit.text);
    const site = finding.sites[0]!;
    // A rule+site command remains valid for mixed-syntax groups and snippets, without
    // exposing a report hash as an authored ledger key. Shell quote paths with spaces.
    finding.accept = finding.rule.startsWith('config/') ? '' : ['ledger/no-why', 'decisions/unaccepted'].includes(finding.rule) ? clean(finding.action!) : `plumber accept --rule ${shell(finding.rule)} --site ${shell(`${path(site.file)}:${site.line}`)} --why "…"`;
  }
  return report;
}
function shell(value: string): string {
  return /^[\w./:@-]+$/.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`;
}

/** Reasons shared by four or more distinct tokens describe a group, not a value. */
export function tokenReasons(decisions: Decision[]): void {
  const groups = new Map<string, Set<string>>();
  for (const d of decisions) if (d.why) {
    const names = groups.get(d.why) ?? new Set<string>(); names.add(`${d.family}:${d.name}`); groups.set(d.why, names);
  }
  for (const d of new Set(decisions)) {
    if (!d.why) continue;
    if (groups.get(d.why)!.size > 3) { d.groupWhy = d.why; d.why = ''; continue; }
    const amount = (d.resolved ?? d.value).match(/^-?[\d.]+/)?.[0];
    const tail = d.name.split(/[.-]/).at(-1);
    const sentences = d.why.split(/(?<=[.!?])\s+/).filter(Boolean);
    const mentions = (sentence: string, term: string) => new RegExp(`(^|[^\\w])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\w]|$)`, 'i').test(sentence);
    const pick = sentences.find(s => mentions(s, d.name) || tail && mentions(s, tail) || amount && mentions(s, amount)) ?? sentences[0];
    d.why = pick ? pick.length > 100 ? `${pick.slice(0, 99).trimEnd()}…` : pick : '';
  }
}

/** Exact source replacement only when its spelling and property are known. */
/** `hover:-duration-[350ms]!` → before `hover:-`, utility `duration`, after `!`; null when the value can't be told apart. */
function utilityValue(text: string): { before: string; utility: string; value: string; after: string } | null {
  let depth = 0, colon = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[' || text[i] === '(') depth++;
    else if (text[i] === ']' || text[i] === ')') depth--;
    else if (text[i] === ':' && depth === 0) colon = i;
  }
  const lead = /^!?-?/.exec(text.slice(colon + 1))![0], after = text.endsWith('!') && !lead.includes('!') ? '!' : '';
  const base = text.slice(colon + 1 + lead.length, text.length - after.length);
  const match = /^([a-z][a-z-]*?)-(\[[^\]]+\]|\([^)]+\)|[\d.]+(?:px|rem|ms|s)?|[a-z0-9.]+)$/.exec(base);
  return match ? { before: text.slice(0, colon + 1) + lead, utility: match[1]!, value: match[2]!, after } : null;
}
/**
 * A token with no utility of its own still has a class form: the same utility with `(--token)` as its value, its
 * variants, sign and importance kept, and a type hint where the utility could mean several properties. One spelling
 * for what people read and what is written (surfaces/edits.ts).
 */
export function tokenClass(d: Pick<Declaration, 'origin' | 'prop' | 'site'> & Partial<Pick<Declaration, 'value'>>, use: NonNullable<Decision['use']>): string | undefined {
  const text = d.site.text;
  const variable = /^var\((--[\w-]+)\)$/.exec(use.css.slice(d.prop.length + 2))?.[1];
  if (!['class', 'arbitrary', 'apply'].includes(d.origin) || use.class || !variable || !use.css.startsWith(`${d.prop}: `) || /[\s/]/.test(text)) return undefined;
  const at = utilityValue(text);
  // only the value the class spells is swapped: `duration-150` or `duration-[150ms]` for 150ms, never a keyword such
  // as transition-colors, whose value names the properties and only implies the time
  const value = String(d.value ?? '').trim();
  const written = at && /^\[(.*)\]$/.exec(at.value)?.[1]?.replaceAll('_', ' ');
  if (!at || !(written !== undefined ? written === value : /^[\d.]+$/.test(at.value) && parseFloat(value) === Number(at.value))) return undefined;
  const hint = ['text', 'border', 'ring', 'outline', 'stroke', 'decoration', 'font', 'bg', 'shadow', 'fill'].includes(at.utility)
    ? /color|^fill$|^stroke$/.test(d.prop) ? 'color:' : /width|size|offset|thickness/.test(d.prop) ? 'length:' : d.prop === 'font-family' ? 'family-name:' : d.prop === 'font-weight' ? 'number:' : null : '';
  return hint === null ? undefined : `${at.before}${at.utility}-(${hint}${variable})${at.after}`;
}
/**
 * A keyword utility only implies its time (`transition-colors` carries the default duration), so the class that sets
 * the token is added beside it: `duration-(--dur-quick)`, with the same variants. Nothing is swapped.
 */
export function tokenClassBeside(d: Pick<Declaration, 'origin' | 'prop' | 'site'>, use: NonNullable<Decision['use']>): string | undefined {
  const text = d.site.text;
  const variable = /^var\((--[\w-]+)\)$/.exec(use.css.slice(d.prop.length + 2))?.[1];
  if (!['class', 'arbitrary', 'apply'].includes(d.origin) || use.class || !variable || !use.css.startsWith(`${d.prop}: `) || /[\s/]/.test(text)) return undefined;
  const at = utilityValue(text);
  if (!at || at.utility !== 'transition' || !/^[a-z][a-z-]*$/.test(at.value)) return undefined;
  const utility = ({ 'transition-duration': 'duration', 'transition-delay': 'delay', 'transition-timing-function': 'ease' } as Record<string, string>)[d.prop];
  return utility ? `${at.before}${utility}-(${variable})${at.after}` : undefined;
}
/**
 * The class written for a token at a class site, one spelling for what people read and what is written: the token's
 * own utility in place of the class (`p-4` → `p-small`, variants, sign and importance kept), the utility with the token
 * as its value when the token has none (`duration-150` → `duration-(--dur-quick)`), or, when the class is a keyword of
 * another utility that only implies this property (`transition-colors` carries the default duration), the token's
 * class added beside it. A keyword is never swapped for a token of another utility.
 */
export function classEdit(d: Pick<Declaration, 'origin' | 'prop' | 'site'> & Partial<Pick<Declaration, 'value'>>, use: NonNullable<Decision['use']>): { to: string; beside: boolean } | undefined {
  const text = d.site.text;
  if (!['class', 'arbitrary', 'apply'].includes(d.origin) || /[\s/]/.test(text)) return undefined;
  if (!use.class) {
    const variableClass = tokenClass(d, use);
    if (variableClass) return { to: variableClass, beside: false };
    const beside = tokenClassBeside(d, use);
    return beside ? { to: beside, beside: true } : undefined;
  }
  const at = utilityValue(text), own = utilityValue(use.class)?.utility;
  if (at && own && at.utility !== own && /^[a-z][a-z-]*$/.test(at.value)) {
    return at.utility === 'transition' && ['duration', 'delay', 'ease'].includes(own) ? { to: `${at.before}${use.class}${at.after}`, beside: true } : undefined;
  }
  // Retain variants, sign and importance, but never guess at arbitrary selectors or modifiers.
  let depth = 0, colon = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') depth--;
    else if (text[i] === ':' && depth === 0) colon = i;
  }
  const base = text.slice(colon + 1);
  return { to: `${text.slice(0, colon + 1)}${base.startsWith('!') ? '!' : ''}${base.replace(/^!/, '').startsWith('-') ? '-' : ''}${use.class}${base.endsWith('!') ? '!' : ''}`, beside: false };
}
export function sourceEdit(d: Declaration, use: NonNullable<Decision['use']>): string {
  const text = d.site.text;
  const edit = classEdit(d, use);
  if (edit) return edit.beside ? `Add \`${edit.to}\` beside \`${text}\`.` : `Replace \`${text}\` with \`${edit.to}\`.`;
  // a class site with no class form for the token: say so, rather than hand a declaration to a className
  if (['class', 'arbitrary', 'apply'].includes(d.origin) && !use.class && /^var\(--[\w-]+\)$/.test(use.css.slice(d.prop.length + 2))) return `No class sets \`${use.css}\` in place of \`${text}\`; set it in a stylesheet.`;
  const colon = text.indexOf(':');
  const property = text.slice(0, colon).trim().replace(/["']/g, '');
  if (colon >= 0 && property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`) === d.prop && use.css.startsWith(`${d.prop}: `)) {
    const value = use.css.slice(d.prop.length + 2);
    const replacement = d.origin === 'inline' || d.origin === 'custom-property' && /["']/.test(text.slice(0, colon)) ? `${text.slice(0, colon)}: ${JSON.stringify(value)}` : use.css;
    return `Replace \`${text}\` with \`${replacement}\`.`;
  }
  return `Use ${use.class ? `\`${use.class}\` or ` : ''}\`${use.css}\`.`;
}
