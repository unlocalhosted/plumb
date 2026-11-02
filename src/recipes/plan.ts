import { dirname, posix, relative, resolve } from 'node:path';
import { parseSync } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { UsageError } from '../errors.js';
import { classNamesOf, findOpening, swapClasses } from '../session/props.js';
import type { SourceChange } from '../session/props.js';
import { isComponentJSX } from '../session/source-location.js';
import { formatBoxShadow, formatDuration, formatEasing } from './css.js';
import { map } from './mapping.js';
import type { Nearest, Verdict } from './mapping.js';
import { isShadow, num } from './model.js';
import type { MotionChange, MotionModel, Recipe, ShadowModel, Timing } from './model.js';
import { literal, readClasses, readMotionObject, tailwindDefaults } from './readers.js';
import type { ClassReading } from './readers.js';
import type { ProjectIndex } from './project.js';
import { timingToCss } from './render.js';
import { blockIndent, isTheme, scanStylesheet } from './stylesheet.js';
import type { Block, Decl } from './stylesheet.js';

export type Choice = 'use' | 'move' | 'add';
export interface Write { file: string; role: 'theme' | 'presets' | 'element' | 'rule'; before: string; after: string; summary: string }
export interface Plan {
  /** false when it cannot be written safely; `refused` says why, in plain words */
  ok: boolean; refused?: string;
  choice: Choice | 'none'; verdict: Verdict; nearest: Nearest | null;
  writes: Write[]; notes: string[];
  /** the token and class the element ends up wearing */
  uses?: { token?: string; class?: string; export?: string };
}
export interface PlanInput {
  recipe: Recipe; choice?: Choice | undefined; name?: string | undefined;
  /** the caller observed this component usage's className reaching the element, so a class may be added to it */
  forwards?: boolean | undefined;
  index: ProjectIndex;
  /** a project file's text, by path relative to the root with forward slashes */
  read: (path: string) => string | undefined;
  element: { file: string; text: string; start: number; tag: string };
}

// ------------------------------------------------------------------ small helpers
const slug = (s: string) => s.toLowerCase().replace(/^(?:shadow|ease|animate)-/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'custom';
const camel = (s: string) => s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const credit = (r: Recipe) => r.source.credit;
const refuse = (verdict: Verdict, nearest: Nearest | null, reason: string): Plan => ({ ok: false, refused: reason, choice: 'none', verdict, nearest, writes: [], notes: [] });

/** The files a plan touches, each edited by successive text transforms; the writes are what changed in the end. */
class Edits {
  private texts = new Map<string, string>(); private before = new Map<string, string>(); private roles = new Map<string, Write['role']>(); private summaries = new Map<string, string[]>();
  constructor(private read: (path: string) => string | undefined) {}
  text(path: string): string { if (!this.texts.has(path)) { const t = this.read(path); if (t === undefined) throw new UsageError(`${path} is not a file of this project.`); this.texts.set(path, t); this.before.set(path, t); } return this.texts.get(path)!; }
  set(path: string, text: string, role: Write['role'], summary: string): void { this.text(path); this.texts.set(path, text); this.roles.set(path, role); this.summaries.set(path, [...(this.summaries.get(path) ?? []), summary]); }
  writes(): Write[] { return [...this.texts].filter(([p, t]) => t !== this.before.get(p)).map(([file, after]) => ({ file, role: this.roles.get(file)!, before: this.before.get(file)!, after, summary: this.summaries.get(file)!.join('; ') })); }
}
const lineStartOf = (text: string, at: number) => text.lastIndexOf('\n', at - 1) + 1;
const comment = (text: string, css: boolean) => css ? `/* ${text} */` : `// ${text}`;

// ------------------------------------------------------------------ stylesheets
/** The block new tokens go in: Tailwind's @theme (the one already holding this prefix first), or the :root that holds the kind's tokens. */
function tokenBlock(css: string, prefix: string, theme: boolean): Block | null {
  const { blocks } = scanStylesheet(css);
  const candidates = blocks.filter(b => theme ? isTheme(b) && !/\binline\b/.test(b.header) : /^(?::root|html|\*|:host)(?:\s*,.*)?$/.test(b.header) && b.depth === 1);
  return candidates.find(b => b.decls.some(d => d.name.startsWith(prefix))) ?? candidates[0] ?? null;
}
/** A declaration added where the project keeps its own kind (after the last of that prefix), with the credit above it, in the block's indentation. */
function insertDecl(css: string, block: Block, prefix: string, name: string, value: string, note: string | undefined): string {
  const indent = blockIndent(css, block);
  const last = block.decls.filter(d => d.name.startsWith(prefix)).at(-1);
  const lines = [...(note ? [`${indent}${comment(note, true)}`] : []), `${indent}${name}: ${value};`].join('\n');
  if (last) return css.slice(0, last.end) + '\n' + lines + css.slice(last.end);
  const close = lineStartOf(css, block.close);
  const closeLine = css.slice(close, block.close);
  if (block.close > block.open && /^\s*$/.test(closeLine) && close > block.open) {
    const gap = block.decls.length && /\n\s*\n/.test(css.slice(block.open, block.close)) ? '\n' : '';
    return css.slice(0, close) + gap + lines + '\n' + css.slice(close);
  }
  return css.slice(0, block.open + 1) + '\n' + lines + '\n' + css.slice(block.open + 1);
}
/** A block added at the end of a block of the theme (keyframes next to the token that uses them). */
function appendInBlock(css: string, block: Block, text: string): string {
  const indent = blockIndent(css, block);
  const body = text.split('\n').map(l => l ? indent + l : l).join('\n');
  const close = lineStartOf(css, block.close);
  return css.slice(0, close) + '\n' + body + '\n' + css.slice(close);
}
function setDeclValue(css: string, decl: Decl, value: string, note: string | undefined): string {
  const colon = css.indexOf(':', decl.start), at = colon + 1;
  const spacing = /^\s*/.exec(css.slice(at))![0];
  const valueEnd = decl.end - (css[decl.end - 1] === ';' ? 1 : 0);
  const multiline = decl.value.includes('\n') && value.includes(', ');
  const shaped = multiline ? value.split(', ').join(`,\n${decl.indent}  `) : value;
  const credited = note !== undefined && css.slice(Math.max(0, lineStartOf(css, decl.start) - note.length - 10), decl.start).includes(note);
  const lead = note && !credited ? `${comment(note, true)}\n${decl.indent}` : '';
  return css.slice(0, decl.start) + lead + css.slice(decl.start, at) + spacing + shaped + css.slice(valueEnd);
}
const declFor = (index: ProjectIndex, token: string): { file: string; decl: Decl } | null => {
  for (const t of index.themes) { const decl = t.decls.find(d => d.name === token); if (decl) return { file: t.file, decl }; }
  return null;
};

// ------------------------------------------------------------------ the element
type Element = PlanInput['element'];
const variantOf = (c: string) => /^(?:[a-z-]+(?:\[[^\]]*\])?:)+/.exec(c)?.[0] ?? '';
function swap(edits: Edits, el: Element, from: string[], to: string[], summary: string): string | null {
  try {
    const change = swapClasses(el.file, edits.text(el.file), el.start, from, to);
    edits.set(el.file, apply(edits.text(el.file), change), 'element', summary);
    return null;
  } catch (error) { if (error instanceof UsageError) return error.message; throw error; }
}
const apply = (text: string, c: SourceChange) => text.slice(0, c.start) + c.replacement + text.slice(c.end);
const knownShadowSuffix = (index: ProjectIndex, suffix: string) => suffix === 'none' || suffix === 'inner' || suffix.startsWith('[') || suffix.startsWith('(') || index.yours.some(r => r.class === `shadow-${suffix}`) || tailwindDefaults().some(r => r.class === `shadow-${suffix}`);
function shadowClassFor(token: string | undefined, id: string): string { return token && !token.startsWith('--shadow-') ? `shadow-(${token})` : `shadow-${token ? token.slice(9) : id}`; }

/** What an element says it has now, for GET: its shadow and its motion, from its classes or its motion props. */
export function describeElement(i: Pick<PlanInput, 'index' | 'read' | 'element'>): { shadow: Record<string, unknown>; motion: Record<string, unknown> } {
  const { index, element: el } = i;
  const info = (() => { try { return classNamesOf(el.file, el.text, el.start); } catch { return { kind: 'dynamic' as const, classes: [] as string[], reason: 'This file does not parse.' }; } })();
  const theme = index.themes.find(t => t.shadows.length || t.motions.length) ?? null;
  const reading: ClassReading | null = info.kind === 'static' ? readClasses(info.classes, theme) : null;
  const shadow = reading?.shadow
    ? { source: 'class', class: reading.shadow.class, ...(reading.shadow.recipe.token ? { token: reading.shadow.recipe.token } : {}), value: formatBoxShadow(reading.shadow.recipe.model as ShadowModel), model: reading.shadow.recipe.model, recipe: reading.shadow.recipe.id }
    : info.kind === 'dynamic' ? { source: 'dynamic', reason: info.reason } : { source: 'none' };
  let motion: Record<string, unknown> = { source: 'none' };
  const react = readReactMotion(el, index);
  if (react) motion = { source: 'motion-props', ...react };
  else if (reading?.motion) motion = { source: 'classes', trigger: reading.motion.trigger, model: reading.motion, properties: reading.transition.properties };
  return { shadow, motion };
}

// ------------------------------------------------------------------ shadows
export function planShadow(i: PlanInput): Plan {
  const { index, element: el } = i;
  const model = i.recipe.model as ShadowModel;
  const value = formatBoxShadow(model);
  const shadows = index.yours.filter(r => r.kind === 'shadow');
  const mapped = map(i.recipe, shadows);
  let { nearest } = mapped; const { verdict } = mapped;
  let choice: Choice = i.choice ?? (verdict.kind === 'new' ? 'add' : 'use');
  const notes: string[] = [];
  if (verdict.kind === 'same' && choice !== 'use') { choice = 'use'; notes.push(`It is the same as your ${nearest!.token?.replace(/^--/, '') ?? nearest!.name}, so that is used instead of adding a copy.`); }
  if (choice !== 'add' && !nearest) return refuse(verdict, nearest, 'Nothing in this project to use or move: add it instead.');
  const edits = new Edits(i.read);
  const note = credit(i.recipe);
  const tailwind = index.idioms.tailwind;
  const info = (() => { try { return classNamesOf(el.file, el.text, el.start); } catch (e) { return { kind: 'dynamic' as const, classes: [], reason: e instanceof UsageError ? e.message : 'This file does not parse.' }; } })();
  let token = nearest?.token, className: string | undefined;

  // 1. the token: reuse (nothing to write), move (the project's own token takes the recipe's value), or add under the project's naming
  if (choice === 'move') {
    const found = declFor(index, nearest!.token ?? '');
    if (!found) return refuse(verdict, nearest, `${nearest!.name} is not a token in your theme, so it cannot be moved.`);
    edits.set(found.file, setDeclValue(edits.text(found.file), found.decl, value, note), 'theme', `${found.decl.name} → ${value}`);
  } else if (choice === 'add') {
    const prefix = index.themes.map(t => t.shadowPrefix).find(Boolean) ?? '--shadow-';
    let name = `${prefix}${slug(i.name ?? i.recipe.id)}`, n = 2;
    while (declFor(index, name)) { if (declFor(index, name)!.decl.value === value) break; name = `${prefix}${slug(i.name ?? i.recipe.id)}-${n++}`; }
    const existing = declFor(index, name);
    if (!existing) {
      const file = tailwind ? tailwind.themeFile : index.idioms.cssVariables?.files[0] ?? null;
      if (!file) return refuse(verdict, nearest, 'No theme file found to hold a new token: your Tailwind @theme or a stylesheet with :root custom properties.');
      const css = edits.text(file), block = tokenBlock(css, prefix, !!tailwind && isThemeFile(css));
      if (!block) return refuse(verdict, nearest, `${file} has no ${tailwind ? '@theme' : ':root'} block to add the token to.`);
      edits.set(file, insertDecl(css, block, prefix, name, value, note), 'theme', `add ${name}: ${value}`);
    } else notes.push(`${name} is already in your theme with this value.`);
    token = name; nearest = nearest ?? null;
  }
  className = tailwind ? shadowClassFor(token, slug(i.name ?? i.recipe.id)) : undefined;

  // 2. the element
  if (tailwind) {
    if (info.kind === 'dynamic') return refuse(verdict, nearest, info.reason ?? 'className is built at runtime; set the class by hand.');
    const from = info.classes.find(c => !variantOf(c) && /^shadow-/.test(c) && knownShadowSuffix(index, c.slice(7)));
    if (from === className) notes.push('The element already wears it.');
    else if (!from && isComponentJSX(el.tag) && !i.forwards) return refuse(verdict, nearest, `<${el.tag}> is a component; add ${className} inside it, by hand.`);
    else {
      const why = swap(edits, el, from ? [from] : [], [className!], `${from ?? 'no shadow'} → ${className}`);
      if (why) return refuse(verdict, nearest, why);
    }
  } else {
    // plain CSS: the shadow is the declaration of the rule that styles the element's class
    if (!token) return refuse(verdict, nearest, 'Plain CSS needs a custom property to point at: choose use, move or add.');
    if (info.kind !== 'static') return refuse(verdict, nearest, info.reason ?? 'This element has no static class to find its rule by.');
    const rule = findRule(index, i.read, info.classes, 'box-shadow');
    if (!rule) return refuse(verdict, nearest, 'No rule of yours styles this element by its classes, so there is nowhere to put the shadow.');
    const css = edits.text(rule.file), fresh = scanStylesheet(css), block = fresh.blocks.find(b => b.header === rule.selector && b.depth === 1)!;
    const decl = block.decls.find(d => d.name === 'box-shadow');
    const next = decl ? css.slice(0, decl.start) + `box-shadow: var(${token});` + css.slice(decl.end)
      : css.slice(0, lineStartOf(css, block.close)) + `${blockIndent(css, block)}box-shadow: var(${token});\n` + css.slice(lineStartOf(css, block.close));
    if (next === css) notes.push('The rule already uses it.');
    else edits.set(rule.file, next, 'rule', `${rule.selector} { box-shadow: var(${token}) }`);
    const users = [...i.index.themes.map(t => t.file), ...allCodeFiles(i)].length ? countUsers(i, rule.cls) : 1;
    if (users > 1) notes.push(`${rule.selector} is used by ${users} elements; they all change.`);
    className = rule.cls;
  }
  return { ok: true, choice, verdict, nearest, writes: edits.writes(), notes, uses: { ...(token ? { token } : {}), ...(className ? { class: className } : {}) } };
}
const isThemeFile = (css: string) => scanStylesheet(css).blocks.some(isTheme);
function allCodeFiles(i: PlanInput): string[] { return [i.element.file]; }
function countUsers(i: PlanInput, cls: string): number {
  let n = 0;
  for (const f of codePaths.get(i.index) ?? []) {
    const t = i.read(f); if (!t || !/\.[cm]?[jt]sx?$/.test(f)) continue;
    for (const m of t.matchAll(/(?:className|class)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g)) if ((m[1] ?? m[2] ?? m[3] ?? '').split(/[^\w-]+/).includes(cls)) n++;
  }
  return Math.max(1, n);
}
/** Paths of the code files, by index, set by the caller so users of a class can be counted. */
export const codePaths = new WeakMap<ProjectIndex, string[]>();
function findRule(index: ProjectIndex, read: PlanInput['read'], classes: string[], property: string): { file: string; block: Block; selector: string; cls: string } | null {
  let fallback: { file: string; block: Block; selector: string; cls: string } | null = null;
  const files = [...new Set([...(index.idioms.cssVariables?.files ?? []), ...index.themes.map(t => t.file)])];
  const all = (codePaths.get(index) ?? []).filter(p => p.endsWith('.css'));
  for (const file of [...new Set([...files, ...all])]) {
    const css = read(file); if (!css) continue;
    for (const b of scanStylesheet(css).blocks) {
      const cls = classes.find(c => b.header === `.${c}`);
      if (!cls || b.depth !== 1) continue;
      const hit = { file, block: b, selector: b.header, cls };
      if (b.decls.some(d => d.name === property)) return hit;
      fallback ??= hit;
    }
  }
  return fallback;
}

// ------------------------------------------------------------------ motion
const states: Record<string, string> = { hover: 'hover:', press: 'active:', focus: 'focus-visible:' };
const px = (n: number) => `${num(n)}px`;
const lengthClass = (axis: string, n: number): string => { const steps = Math.abs(n) / 4, neg = n < 0 ? '-' : ''; return Number.isInteger(steps * 2) ? `${neg}translate-${axis}-${num(steps)}` : `${neg}translate-${axis}-[${px(Math.abs(n))}]`; };
function stateClasses(m: MotionModel): string[] {
  const prefix = states[m.trigger] ?? 'hover:', out: string[] = [];
  for (const c of m.changes) {
    const to = typeof c.to === 'number' ? c.to : Number.parseFloat(String(c.to));
    if ((c.property === 'x' || c.property === 'y') && Number.isFinite(to)) out.push(prefix + lengthClass(c.property, to));
    else if (c.property === 'scale' && Number.isFinite(to)) out.push(`${prefix}scale-${Math.round(to * 100)}`);
    else if (c.property === 'opacity' && Number.isFinite(to)) out.push(`${prefix}opacity-${Math.round(to * 100)}`);
  }
  return out;
}
const transitionClass = (m: MotionModel): string => {
  const kinds = new Set(m.changes.map(c => c.property === 'opacity' ? 'opacity' : c.property === 'boxShadow' ? 'shadow' : 'transform'));
  return kinds.size === 1 ? `transition-${[...kinds][0]}` : 'transition';
};
const durationClass = (ms: number) => Number.isInteger(ms) ? `duration-${ms}` : `duration-[${num(ms)}ms]`;
function easingCandidates(i: PlanInput, duration: number): Recipe[] {
  const own = i.index.yours.filter(r => r.kind === 'motion' && r.class?.startsWith('ease-'));
  const names = new Set(own.map(r => r.class));
  const defaults = i.index.idioms.tailwind ? tailwindDefaults().filter(r => r.kind === 'motion' && !names.has(r.class)) : [];
  return [...own, ...defaults].map(r => ({ ...r, model: { ...(r.model as MotionModel), timing: { ...(r.model as MotionModel).timing, duration } as Timing } }));
}

export function planMotion(i: PlanInput): Plan {
  const m = i.recipe.model as MotionModel, exit = i.recipe.exit;
  const none = { kind: 'new', text: 'new to this project', differs: [] } satisfies Verdict;
  if (m.requires === 'motion' && !i.index.idioms.motion.installed) return refuse(none, null, `${i.recipe.name} needs a motion library (motion/react), and this project has none installed. Install it, then add it.`);
  const el = i.element;
  if (isReactMotionElement(el) && i.index.idioms.motion.installed) return planMotionReact(i);
  if (m.requires === 'motion') return refuse(none, null, `${i.recipe.name} needs motion/react, and <${el.tag}> is not a motion element.`);
  if (!i.index.idioms.tailwind) return refuse(none, null, 'This project has no Tailwind theme and this element is not a motion element, so there is no idiom to write a transition in.');
  if (m.trigger === 'layout') return refuse(none, null, `${i.recipe.name} animates layout, which needs motion/react.`);
  return planMotionTailwind(i, m, exit);
}

function planMotionTailwind(i: PlanInput, m: MotionModel, exit: MotionModel | undefined): Plan {
  const { index, element: el } = i;
  const css = timingToCss(m.timing);
  const info = (() => { try { return classNamesOf(el.file, el.text, el.start); } catch (e) { return { kind: 'dynamic' as const, classes: [], reason: e instanceof UsageError ? e.message : 'This file does not parse.' }; } })();
  const edits = new Edits(i.read), notes: string[] = [], note = credit(i.recipe);
  const themeFile = index.idioms.tailwind!.themeFile;
  if (info.kind === 'dynamic') return refuse(none(), null, info.reason ?? 'className is built at runtime; set the classes by hand.');
  const themeText = () => themeFile ? edits.text(themeFile) : '';
  const prefix = index.themes.map(t => t.easePrefix).find(Boolean) ?? '--ease-';
  const addTheme = (name: string, value: string, withPrefix: string, comment: string | undefined, extra?: string): string | null => {
    if (!themeFile) return 'No @theme block found to add the token to.';
    const text = themeText(), block = tokenBlock(text, withPrefix, true);
    if (!block) return `${themeFile} has no @theme block to add the token to.`;
    let next = insertDecl(text, block, withPrefix, name, value, comment);
    if (extra) { const fresh = tokenBlock(next, withPrefix, true)!; next = appendInBlock(next, fresh, extra); }
    edits.set(themeFile, next, 'theme', `add ${name}: ${value}`);
    return null;
  };
  const wanted: string[] = [];
  let verdict: Verdict = none(), nearest: Nearest | null = null, choice: Choice = i.choice ?? 'add', uses: Plan['uses'];
  const existingAll = info.classes;
  const replace: string[] = [];

  if (m.trigger === 'enter' || m.trigger === 'exit') {
    // an entrance is a keyframes block and an --animate token; its leaving half only where something drives it
    const base = slug(i.name ?? i.recipe.id), name = `--animate-${base}`;
    const keyframes = (changes: MotionChange[], suffix: string) => {
      const at = (w: 'from' | 'to') => {
        const t: string[] = [], rest: string[] = [];
        for (const c of changes) { const v = c[w]; if (c.property === 'opacity') rest.push(`opacity: ${v};`); else if (c.property === 'y') t.push(`translateY(${typeof v === 'number' ? px(v) : v})`); else if (c.property === 'x') t.push(`translateX(${typeof v === 'number' ? px(v) : v})`); else if (c.property === 'scale') t.push(`scale(${v})`); }
        return [...rest, ...(t.length ? [`transform: ${t.join(' ')};`] : [])].join(' ');
      };
      return `@keyframes ${base}${suffix} {\n  from { ${at('from')} }\n  to { ${at('to')} }\n}`;
    };
    const have = index.themes.flatMap(t => t.decls).find(d => d.name === name);
    if (have) { notes.push(`${name} is already in your theme; it is used as it is.`); }
    else {
      const timing = `${slug(i.recipe.id)} ${formatDuration(css.duration)} ${css.easing} both`.replace(slug(i.recipe.id), base);
      const why = addTheme(name, timing, '--animate-', note, keyframes(m.changes, ''));
      if (why) return refuse(none(), null, why);
    }
    wanted.push(`animate-${base}`); replace.push(...existingAll.filter(c => !variantOf(c) && /^animate-/.test(c)));
    uses = { token: name, class: `animate-${base}` };
    const reverse = exit ?? (m.trigger === 'enter' ? { ...m, trigger: 'exit' as const, changes: m.changes.map(c => ({ ...c, from: c.to, to: c.from })) } : undefined);
    if (m.trigger === 'enter' && index.idioms.dataState && reverse) {
      const out = `--animate-${base}-out`;
      if (!index.themes.flatMap(t => t.decls).some(d => d.name === out)) {
        const o = timingToCss(reverse.timing);
        const why = addTheme(out, `${base}-out ${formatDuration(o.duration)} ${o.easing} both`, '--animate-', undefined, keyframes(reverse.changes, '-out'));
        if (why) return refuse(none(), null, why);
      }
      wanted.push(`data-[state=closed]:animate-${base}-out`); replace.push(...existingAll.filter(c => c.startsWith('data-[state=closed]:animate-')));
    } else if (m.trigger === 'enter') notes.push('Entrance only: nothing on this element says when it leaves (no data-state, no motion library), so no exit is written.');
  } else {
    // a state: transition, duration, an easing token of the project's, and the state's own classes
    const yoursEases = easingCandidates(i, css.duration);
    const asCurve: Recipe = { ...i.recipe, model: { ...m, changes: [], timing: { type: 'curve', duration: css.duration, easing: css.easing.startsWith('linear(') ? css.easing : (m.timing.type === 'curve' ? m.timing.easing : css.easing) } } };
    const mapped = map(asCurve, yoursEases); verdict = mapped.verdict; nearest = mapped.nearest;
    choice = i.choice ?? (verdict.kind === 'new' ? 'add' : 'use');
    if (verdict.kind === 'same' && choice !== 'use') { choice = 'use'; notes.push(`The easing is the same as your ${nearest!.name}, so that is used instead of adding a copy.`); }
    let easeClass: string;
    if (choice === 'add' || !nearest) {
      const base = slug(i.name ?? i.recipe.id), name = `${prefix}${base}`;
      easeClass = `ease-${base}`;
      if (!index.themes.flatMap(t => t.decls).some(d => d.name === name)) { const why = addTheme(name, css.easing, prefix, note); if (why) return refuse(verdict, nearest, why); }
      uses = { token: name, class: easeClass };
    } else if (choice === 'move') {
      const found = declFor(index, nearest.token ?? '');
      if (!found) return refuse(verdict, nearest, `${nearest.name} is a Tailwind default, not a token of yours, so it cannot be moved: add it instead.`);
      edits.set(found.file, setDeclValue(edits.text(found.file), found.decl, css.easing, note), 'theme', `${found.decl.name} → ${css.easing}`);
      easeClass = nearest.class!; uses = { token: nearest.token!, class: easeClass };
    } else { easeClass = nearest.class!; uses = { ...(nearest.token ? { token: nearest.token } : {}), class: easeClass }; }
    wanted.push(transitionClass(m), durationClass(css.duration), easeClass, ...stateClasses(m));
    replace.push(...existingAll.filter(c => (!variantOf(c) && /^(?:transition(?:-[\w[\],-]+)?|duration-[\w[\]]+|ease-[\w-]+)$/.test(c)) || (variantOf(c) === states[m.trigger] && /(?:translate-|scale-|opacity-)/.test(c))));
  }
  const from = [...new Set(replace)], to = [...new Set(wanted)].filter(c => !existingAll.includes(c) || from.includes(c));
  const finalTo = to.length ? to : [];
  const same = from.length === finalTo.length && from.every(c => finalTo.includes(c));
  if (same) notes.push('The element already wears these classes.');
  else {
    if (!from.length && isComponentJSX(el.tag) && !i.forwards) return refuse(verdict, nearest, `<${el.tag}> is a component; add ${finalTo.join(' ')} inside it, by hand.`);
    const why = swap(edits, el, from, finalTo, `${from.join(' ') || 'no motion'} → ${finalTo.join(' ')}`);
    if (why) return refuse(verdict, nearest, why);
  }
  if (css.easing.startsWith('linear(') && m.timing.type === 'spring') notes.push('A spring is written as a CSS linear() curve and the time it settles in, so it needs no library.');
  return { ok: true, choice, verdict, nearest, writes: edits.writes(), notes, ...(uses ? { uses } : {}) };
}
function none(): Verdict { return { kind: 'new', text: 'new to this project', differs: [] }; }

// ------------------------------------------------------------------ motion/react
const isReactMotionElement = (el: Element) => /^(?:motion|m)\.[a-z]/.test(el.tag) || /^motion\./.test(el.tag);
interface Attr { name: string; start: number; end: number; value: unknown; ref?: string; raw?: string }
function attributesOf(el: Element): { attrs: Attr[]; nameEnd: number; opening: ReturnType<typeof findOpening> } {
  const opening = findOpening(el.file, el.text, el.start);
  if (!opening) throw new UsageError('Source position does not identify an authored JSX element.');
  const attrs: Attr[] = [];
  for (const a of opening.attributes) {
    if (a.type !== 'JSXAttribute' || a.name.type !== 'JSXIdentifier') continue;
    const v = a.value as unknown as { type: string; expression?: Node; value?: unknown } | null;
    const expr = v?.type === 'JSXExpressionContainer' ? v.expression : undefined;
    const ref = expr?.type === 'Identifier' ? (expr as unknown as { name: string }).name : undefined;
    attrs.push({ name: a.name.name, start: a.start, end: a.end, value: v?.type === 'Literal' ? v.value : literal(expr), ...(ref ? { ref } : {}), ...(expr ? { raw: el.text.slice(expr.start, expr.end) } : {}) });
  }
  return { attrs, nameEnd: opening.name.end, opening };
}
function readReactMotion(el: Element, index: ProjectIndex): Record<string, unknown> | null {
  if (!isReactMotionElement(el)) return null;
  try {
    const { attrs } = attributesOf(el);
    const get = (n: string) => attrs.find(a => a.name === n);
    const t = get('transition');
    const preset = t?.ref ? index.presets.find(p => p.exportName === t.ref) : undefined;
    const recipe = preset ?? (t?.value && typeof t.value === 'object' ? readMotionObject({ transition: t.value, ...Object.fromEntries(['whileHover', 'whileTap', 'whileFocus', 'initial', 'animate', 'exit'].map(k => [k, get(k)?.value]).filter(([, v]) => v && typeof v === 'object')) }) : null);
    return { ...(recipe ? { model: recipe.model, trigger: (recipe.model as MotionModel).trigger } : {}), ...(preset ? { preset: preset.exportName } : {}), ...(t && !recipe ? { dynamic: 'transition is computed at runtime' } : {}),
      props: attrs.filter(a => /^(?:whileHover|whileTap|whileFocus|initial|animate|exit|layout|layoutId|transition|variants)$/.test(a.name)).map(a => a.name) };
  } catch { return null; }
}
const quoteOf = (text: string) => (text.match(/from\s+'/g)?.length ?? 0) >= (text.match(/from\s+"/g)?.length ?? 0) ? "'" : '"';
const semiOf = (text: string) => /^import[^\n]*;\s*$/m.test(text) ? ';' : '';
const q = (s: string, quote: string) => `${quote}${s}${quote}`;
function timingObject(t: Timing, quote: string): string {
  const e = (k: string, v: number | string) => `${k}: ${typeof v === 'string' ? q(v, quote) : num(v)}`;
  if (t.type === 'curve') return `{ ${e('duration', t.duration / 1000)}, ease: ${typeof t.easing === 'string' ? q(t.easing, quote) : `[${t.easing.map(n => num(n)).join(', ')}]`} }`;
  if ('stiffness' in t) return `{ type: ${q('spring', quote)}, ${e('stiffness', t.stiffness)}, ${e('damping', t.damping)}${t.mass ? `, ${e('mass', t.mass)}` : ''} }`;
  return `{ type: ${q('spring', quote)}, ${e('duration', t.duration / 1000)}, ${e('bounce', t.bounce)} }`;
}
const propObject = (changes: MotionChange[], at: 'from' | 'to', quote: string) => `{ ${changes.map(c => `${c.property}: ${typeof c[at] === 'number' ? num(c[at] as number) : q(String(c[at]), quote)}`).join(', ')} }`;

/** The path an import should use to reach `target` from `from`: what the project's other files already use (an alias), else relative. */
function specifierFor(i: PlanInput, from: string, target: string): string {
  const strip = (p: string) => p.replace(/\.[cm]?[jt]sx?$/, '').replace(/\/index$/, '');
  for (const path of codePaths.get(i.index) ?? []) {
    const text = i.read(path); if (!text) continue;
    for (const m of text.matchAll(/from\s+['"]((?:@|~)\/[^'"]+)['"]/g)) {
      const rest = m[1]!.slice(2);
      if ([`src/${rest}`, rest].some(c => strip(c) === strip(target))) return m[1]!;
    }
  }
  const rel = posix.relative(posix.dirname(from), strip(target));
  return rel.startsWith('.') ? rel : `./${rel}`;
}
const resolvesTo = (spec: string, from: string, target: string): boolean => {
  const strip = (p: string) => p.replace(/\.[cm]?[jt]sx?$/, '').replace(/\/index$/, '');
  if (spec.startsWith('.')) return strip(posix.join(posix.dirname(from), spec)) === strip(target);
  if (/^(?:@|~)\//.test(spec)) return [`src/${spec.slice(2)}`, spec.slice(2)].some(c => strip(c) === strip(target));
  return false;
};

function planMotionReact(i: PlanInput): Plan {
  const { index, element: el } = i;
  const m = i.recipe.model as MotionModel;
  const presets = index.presets;
  const note = credit(i.recipe);
  const edits = new Edits(i.read), notes: string[] = [];
  const asCandidate = presets.map(p => p as Recipe);
  const mapped = map(i.recipe, asCandidate.filter(p => (p.model as MotionModel).trigger === m.trigger || !(p.model as MotionModel).changes.length));
  const verdict = mapped.verdict; let nearest = mapped.nearest;
  let choice: Choice = i.choice ?? (verdict.kind === 'new' ? 'add' : 'use');
  if (!presets.length) { choice = 'add'; nearest = null; }
  if (verdict.kind === 'same' && choice !== 'use' && presets.length) { choice = 'use'; notes.push(`It is the same as your ${nearest!.name}, so that is used instead of adding a copy.`); }
  if (choice !== 'add' && !nearest) return refuse(verdict, nearest, 'No preset of yours to use or move: add it instead.');
  let attrs: ReturnType<typeof attributesOf>;
  try { attrs = attributesOf(el); } catch (e) { return refuse(verdict, nearest, e instanceof UsageError ? e.message : 'This file does not parse.'); }
  const quote = quoteOf(el.text), semi = semiOf(el.text);
  const existing = attrs.attrs.find(a => a.name === 'transition');
  if (existing && existing.value === undefined && !(existing.ref && presets.some(p => p.exportName === existing.ref))) return refuse(verdict, nearest, 'transition is computed at runtime here; change it by hand.');
  if (attrs.opening!.attributes.some(a => a.type === 'JSXSpreadAttribute') && !existing) return refuse(verdict, nearest, 'This element spreads props, which may carry transition; set it by hand.');

  // the transition expression: a preset of the project's by name, or the object inline when the project keeps no presets
  let expression: string, exportName: string | undefined;
  const presetsFile = index.idioms.motion.presets?.file;
  if (choice === 'use') exportName = (nearest as Nearest & { id: string }).id;
  if (choice === 'move' && nearest) {
    const preset = presets.find(p => p.exportName === nearest!.id)!;
    const file = preset.source.file!, text = edits.text(file);
    const found = findPresetInit(file, text, preset.exportName);
    if (!found) return refuse(verdict, nearest, `${preset.exportName} is not a plain object in ${file}, so it cannot be moved.`);
    edits.set(file, text.slice(0, found.start) + timingObject(m.timing, quoteOf(text) === "'" ? "'" : '"') + text.slice(found.end), 'presets', `${preset.exportName} → ${timingObject(m.timing, "'")}`);
    exportName = preset.exportName;
  }
  if (choice === 'add' && presetsFile) {
    const name = camel(slug(i.name ?? i.recipe.id)), text = edits.text(presetsFile);
    let finalName = name, n = 2; while (presets.some(p => p.exportName === finalName)) finalName = `${name}${n++}`;
    const pq = quoteOf(text) === "'" ? "'" : '"', ps = /;\s*$/m.test(text.replace(/\n+$/, '')) ? ';' : '';
    const last = presets.filter(p => p.source.file === presetsFile).at(-1);
    const lastEnd = last ? exportEnd(text, last.exportName) : text.length;
    const line = `export const ${finalName} = ${timingObject(m.timing, pq)}${ps}`;
    const lead = note ? `${comment(note, false)}\n` : '';
    const next = lastEnd >= text.length || !last ? `${text.replace(/\n*$/, '\n')}\n${lead}${line}\n` : `${text.slice(0, lastEnd)}\n${lead}${line}${text.slice(lastEnd)}`;
    edits.set(presetsFile, next, 'presets', `add ${line}`);
    exportName = finalName;
  }
  if (exportName && presetsFile) {
    expression = exportName;
    // the import: join an existing one from the presets module, or add one in the project's style
    const src = edits.text(el.file);
    const spec = specifierFor(i, el.file, presetsFile);
    const imports = parseSync(el.file, src).program.body.filter(n => n.type === 'ImportDeclaration') as unknown as { start: number; end: number; source: { value: string }; specifiers: { start: number; end: number; type: string; local: { name: string } }[]; importKind?: string }[];
    const mine = imports.find(n => resolvesTo(n.source.value, el.file, presetsFile));
    if (!mine?.specifiers.some(s => s.local.name === exportName)) {
      if (mine && mine.specifiers.some(s => s.type === 'ImportSpecifier')) {
        const lastSpec = mine.specifiers.filter(s => s.type === 'ImportSpecifier').at(-1)!;
        edits.set(el.file, src.slice(0, lastSpec.end) + `, ${exportName}` + src.slice(lastSpec.end), 'element', `import ${exportName}`);
      } else {
        const at = imports.at(-1)?.end ?? 0, line = `import { ${exportName} } from ${q(spec, quote)}${semi}`;
        edits.set(el.file, imports.length ? src.slice(0, at) + '\n' + line + src.slice(at) : line + '\n' + src, 'element', `import ${exportName}`);
      }
    }
  } else expression = timingObject(m.timing, quote);
  const choiceExport = exportName;

  // the element: the transition prop, and the trigger's props when the element has none
  const text0 = edits.text(el.file);
  const shift = text0.length - el.text.length;
  const at = (n: number) => n + shift;
  const fresh = (() => { const o = findOpening(el.file, text0, at(el.start)); return o; })();
  void fresh;
  const re = attributesOf({ ...el, text: text0, start: at(el.start) });
  const pieces: { start: number; end: number; text: string }[] = [];
  const insertAfter = re.attrs.at(-1)?.end ?? re.nameEnd;
  const multiline = re.attrs.length > 0 && text0.slice(re.nameEnd, re.attrs[0]!.start).includes('\n');
  const attrIndent = multiline ? /^[ \t]*/.exec(text0.slice(lineStartOf(text0, re.attrs[0]!.start)))![0] : '';
  const sep = multiline ? `\n${attrIndent}` : ' ';
  const tNow = re.attrs.find(a => a.name === 'transition');
  const added: string[] = [];
  const triggerProp: Record<string, string> = { hover: 'whileHover', press: 'whileTap', focus: 'whileFocus' };
  const hasAttr = (n: string) => re.attrs.some(a => a.name === n);
  const wantTransition = `transition={${exportName ? expression : expression.startsWith('{') ? `${expression}` : expression}}`.replace('transition={{', 'transition={{');
  const tText = exportName ? `transition={${expression}}` : `transition={${expression}}`;
  void wantTransition;
  if (tNow) { if (text0.slice(tNow.start, tNow.end) !== tText) pieces.push({ start: tNow.start, end: tNow.end, text: tText }); } else added.push(tText);
  if (triggerProp[m.trigger] && m.changes.length && !hasAttr(triggerProp[m.trigger]!)) added.push(`${triggerProp[m.trigger]}={${propObject(m.changes, 'to', quote)}}`);
  if (m.trigger === 'enter' && m.changes.length && !hasAttr('initial') && !hasAttr('animate')) {
    added.push(`initial={${propObject(m.changes, 'from', quote)}}`, `animate={${propObject(m.changes, 'to', quote)}}`);
    const ex = i.recipe.exit;
    if (ex && !hasAttr('exit')) added.push(`exit={${propObject(ex.changes, 'to', quote)}}`);
    notes.push('exit needs the element inside AnimatePresence to play.');
  }
  if (m.trigger === 'layout' && !hasAttr('layout')) added.push('layout');
  if (m.trigger === 'enter' && i.recipe.exit && (hasAttr('initial') || hasAttr('animate'))) notes.push('The element already has its own initial and animate; only the transition was set.');
  if (added.length) pieces.push({ start: insertAfter, end: insertAfter, text: sep + added.join(sep) });
  let next = text0;
  for (const p of pieces.sort((a, b) => b.start - a.start)) next = next.slice(0, p.start) + p.text + next.slice(p.end);
  if (next !== text0) edits.set(el.file, next, 'element', `${pieces.length ? 'set ' : ''}transition ${exportName ?? 'inline'}`);
  else notes.push('The element already has it.');
  return { ok: true, choice, verdict, nearest, writes: edits.writes(), notes, uses: { ...(choiceExport ? { export: choiceExport } : {}) } };
}
function findPresetInit(file: string, text: string, name: string): { start: number; end: number } | null {
  const parsed = parseSync(file, text);
  for (const item of parsed.program.body as Node[]) {
    const d = (item as unknown as { declaration?: { declarations?: { id: { name: string }; init: { start: number; end: number; type: string } | null }[] } }).declaration;
    const decl = d?.declarations?.find(x => x.id.name === name);
    if (decl?.init && decl.init.type === 'ObjectExpression') return { start: decl.init.start, end: decl.init.end };
  }
  return null;
}
function exportEnd(text: string, name: string): number {
  const parsed = parseSync('x.ts', text);
  for (const item of parsed.program.body as Node[]) {
    const d = (item as unknown as { declaration?: { declarations?: { id: { name: string } }[] } }).declaration;
    if (d?.declarations?.some(x => x.id.name === name)) return item.end;
  }
  return text.length;
}

// ------------------------------------------------------------------ entry
export function plan(i: PlanInput): Plan {
  void dirname; void relative; void resolve; void isShadow; void formatEasing;
  return isShadow(i.recipe.model) ? planShadow(i) : planMotion(i);
}

/** A readable diff of one write: changed lines with two lines of context, `-` before and `+` after. */
export function diff(before: string, after: string): string {
  const a = before.split('\n'), b = after.split('\n');
  let head = 0; while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0; while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  const ma = a.slice(head, a.length - tail), mb = b.slice(head, b.length - tail);
  // line diff of the middle by LCS, so two separate edits do not read as one big replacement
  const dp: number[][] = Array.from({ length: ma.length + 1 }, () => new Array<number>(mb.length + 1).fill(0));
  for (let x = ma.length - 1; x >= 0; x--) for (let y = mb.length - 1; y >= 0; y--) dp[x]![y] = ma[x] === mb[y] ? dp[x + 1]![y + 1]! + 1 : Math.max(dp[x + 1]![y]!, dp[x]![y + 1]!);
  const ops: { t: ' ' | '-' | '+'; line: string; n: number }[] = [];
  let x = 0, y = 0;
  while (x < ma.length || y < mb.length) {
    if (x < ma.length && y < mb.length && ma[x] === mb[y]) { ops.push({ t: ' ', line: ma[x]!, n: head + x + 1 }); x++; y++; }
    else if (y < mb.length && (x === ma.length || dp[x]![y + 1]! >= dp[x + 1]![y]!)) { ops.push({ t: '+', line: mb[y]!, n: head + y + 1 }); y++; }
    else { ops.push({ t: '-', line: ma[x]!, n: head + x + 1 }); x++; }
  }
  const out: string[] = [], context = 2;
  const show = new Set<number>();
  ops.forEach((o, k) => { if (o.t !== ' ') for (let d = -context; d <= context; d++) show.add(k + d); });
  const leading = a.slice(Math.max(0, head - context), head), trailing = a.slice(a.length - tail, a.length - tail + context);
  for (const l of leading) out.push(`  ${l}`);
  let gap = false;
  ops.forEach((o, k) => { if (show.has(k)) { if (gap) out.push('  …'); gap = false; out.push(`${o.t} ${o.line}`); } else gap = true; });
  for (const l of trailing) out.push(`  ${l}`);
  return out.join('\n');
}
