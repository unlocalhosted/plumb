import { parseSync } from 'oxc-parser';
import type { Node } from 'oxc-parser';
import { defaultRootPx, formatBoxShadow, parseBoxShadow, parseDuration, parseEasing, splitTop, splitVariants } from './css.js';
import type { MotionChange, MotionModel, Recipe, RecipeSource, ShadowModel, Timing, Trigger } from './model.js';
import { timingFromTransition } from './pack.js';
import { isDark, isTheme, scanStylesheet } from './stylesheet.js';
import type { Decl } from './stylesheet.js';

// ---------------------------------------------------------------- defaults
const tailwind = (token: string): RecipeSource => ({ reader: 'builtin', library: 'Tailwind CSS v4 default theme', licence: 'MIT', url: 'https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/theme.css', token,
  credit: 'Tailwind CSS default theme, (c) Tailwind Labs, Inc., MIT https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/theme.css' });
export const tailwindShadows: Record<string, string> = {
  '2xs': '0 1px rgb(0 0 0 / 0.05)',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
};
export const tailwindEases: Record<string, string> = { in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', 'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)' };
export const tailwindDefaultTransition = { duration: 150, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' };

export function tailwindDefaults(): Recipe[] {
  const out: Recipe[] = [];
  for (const [name, value] of Object.entries(tailwindShadows)) out.push({ id: name, name: `shadow-${name}`, kind: 'shadow', model: parseBoxShadow(value)!, source: tailwind(`--shadow-${name}`), token: `--shadow-${name}`, class: `shadow-${name}` });
  for (const [name, value] of Object.entries(tailwindEases)) out.push({ id: `ease-${name}`, name: `ease-${name}`, kind: 'motion', model: { trigger: 'hover', changes: [], timing: { type: 'curve', duration: tailwindDefaultTransition.duration, easing: parseEasing(value)! }, requires: 'none' }, source: tailwind(`--ease-${name}`), token: `--ease-${name}`, class: `ease-${name}` });
  return out;
}

// ---------------------------------------------------------------- pasted values
export function readBoxShadow(text: string, name = 'pasted', rootPx = defaultRootPx): Recipe | null {
  const model = parseBoxShadow(text, rootPx);
  return model ? { id: name, name, kind: 'shadow', model, source: { reader: 'paste' } } : null;
}
/** A CSS transition value or its parts: `transform 200ms cubic-bezier(...)`. */
export function parseTransition(text: string): { properties: string[]; timing: Timing } | null {
  let duration: number | null = null, easing: ReturnType<typeof parseEasing> = null; const properties: string[] = [];
  for (const layer of splitTop(text, ',')) {
    for (const word of splitTop(layer, ' ')) {
      const d = parseDuration(word), e = d === null ? parseEasing(word) : null;
      if (d !== null) { if (duration === null) duration = d; }
      else if (e) { if (!easing) easing = e; }
      else if (/^[a-z-]+$/.test(word) && !/^(?:allow-discrete|normal)$/.test(word)) properties.push(word);
    }
  }
  if (duration === null && !easing) return null;
  return { properties, timing: { type: 'curve', duration: duration ?? tailwindDefaultTransition.duration, easing: easing ?? parseEasing(tailwindDefaultTransition.easing)! } };
}

// ---------------------------------------------------------------- a project's theme
export interface ThemeIndex {
  file: string;
  shadows: Recipe[]; motions: Recipe[];
  /** the property the project's shadow tokens share: --shadow- or --elevation- */
  shadowPrefix: string | null; easePrefix: string | null;
  defaults: { duration: number; easing: string };
  /** the project's own duration utilities (`@utility duration-fast { transition-duration: 140ms }`), so a timing equal to one is written as it */
  durations: { class: string; ms: number; line: number }[];
  decls: Decl[];
  /** the root font size rem and em lengths were resolved at */
  rootPx: number;
}
const shadowName = /^--(shadow|elevation|shadows|depth|raised)-([\w-]+)$/;
function readKeyframes(css: string): Map<string, MotionChange[]> {
  const out = new Map<string, MotionChange[]>();
  const { blocks } = scanStylesheet(css);
  for (const b of blocks) {
    const name = /^@keyframes\s+([\w-]+)/.exec(b.header)?.[1]; if (!name) continue;
    const frames = new Map(b.blocks.map(f => [f.header, f.decls]));
    const from = frames.get('from') ?? frames.get('0%') ?? [], to = frames.get('to') ?? frames.get('100%') ?? [];
    const props = (ds: Decl[]) => { const o: Record<string, number | string> = {}; for (const d of ds) {
      if (d.name === 'opacity') o.opacity = Number(d.value);
      if (d.name === 'transform') { for (const m of d.value.matchAll(/(translateX|translateY|scale)\(([^)]+)\)/g)) { const n = parseFloat(m[2]!); o[m[1] === 'translateX' ? 'x' : m[1] === 'translateY' ? 'y' : 'scale'] = Number.isFinite(n) ? n : m[2]!; } if (/transform:\s*none/.test(d.value) || d.value === 'none') { o.x ??= 0; o.y ??= 0; } }
    } return o; };
    const a = props(from), z = props(to), keys = new Set([...Object.keys(a), ...Object.keys(z)]);
    const base: Record<string, number> = { opacity: 1, scale: 1, x: 0, y: 0 };
    out.set(name, [...keys].map(k => ({ property: k, from: a[k] ?? base[k] ?? 0, to: z[k] ?? base[k] ?? 0 })).filter(c => c.from !== c.to));
  }
  return out;
}
/** The root font size a stylesheet declares for `html` or `:root` (62.5% is 10px), or null when it declares none. */
export function rootFontSize(css: string): number | null {
  let found: number | null = null;
  for (const d of scanStylesheet(css).decls) {
    if (d.name !== 'font-size' || !/^(?:html|:root)(?:\s*,.*)?$/.test(d.block.header)) continue;
    const m = /^(\d*\.?\d+)(px|%|rem|em)$/.exec(d.value.trim());
    if (m) found = Number(m[1]) * (m[2] === '%' ? defaultRootPx / 100 : m[2] === 'rem' || m[2] === 'em' ? defaultRootPx : 1);
  }
  return found;
}
export function readTheme(file: string, css: string, rootPx = rootFontSize(css) ?? defaultRootPx): ThemeIndex {
  const { decls, blocks } = scanStylesheet(css);
  const keyframes = readKeyframes(css);
  const durations = blocks.flatMap(b => {
    const name = /^@utility\s+(duration-[\w-]+)$/.exec(b.header)?.[1];
    const only = b.decls.length === 1 && b.decls[0]!.name === 'transition-duration' ? parseDuration(b.decls[0]!.value) : null;
    return name && only !== null ? [{ class: name, ms: only, line: b.decls[0]!.line }] : [];
  });
  const shadows: Recipe[] = [], motions: Recipe[] = [];
  let duration = tailwindDefaultTransition.duration, easing = tailwindDefaultTransition.easing;
  for (const d of decls) {
    if (d.name === '--default-transition-duration') duration = parseDuration(d.value) ?? duration;
    if (d.name === '--default-transition-timing-function') easing = d.value;
  }
  const src = (d: Decl): RecipeSource => ({ reader: 'theme', file, line: d.line, token: d.name });
  // a dark theme's value of a token is that token's `dark`, never a recipe of its own
  const darkValues = new Map(decls.filter(d => d.custom && isDark(d.block)).map(d => [d.name, d]));
  for (const d of decls) {
    if (!d.custom || isDark(d.block)) continue;
    const named = shadowName.exec(d.name);
    const theme = isTheme(d.block);
    const shadow = parseBoxShadow(d.value, rootPx);
    // outside a shadow-named property or @theme, only a value with a colour on every layer is taken for a shadow
    if (shadow && (named || (!theme && shadow.layers.every(l => l.color) && shadow.layers.some(l => l.x || l.y || l.blur)))) {
      if (/^--(inset-shadow|drop-shadow)-/.test(d.name)) continue;
      const id = named ? named[2]! : d.name.replace(/^--/, '');
      const darkDecl = darkValues.get(d.name), dark = darkDecl ? parseBoxShadow(darkDecl.value, rootPx) : null;
      shadows.push({ id, name: d.name.replace(/^--/, ''), kind: 'shadow', model: shadow, ...(dark ? { dark } : {}), source: src(d), token: d.name, ...(named?.[1] === 'shadow' ? { class: `shadow-${id}` } : {}) });
      continue;
    }
    const ease = /^--ease-([\w-]+)$/.exec(d.name);
    if (ease) {
      const e = parseEasing(d.value);
      if (e) motions.push({ id: `ease-${ease[1]}`, name: d.name.replace(/^--/, ''), kind: 'motion', model: { trigger: 'hover', changes: [], timing: { type: 'curve', duration, easing: e }, requires: 'none' }, source: src(d), token: d.name, class: `ease-${ease[1]}` });
      continue;
    }
    const animate = /^--animate-([\w-]+)$/.exec(d.name);
    if (animate) {
      const parsed = parseTransition(d.value.replace(/^[\w-]+\s+/, m => keyframes.has(m.trim()) ? '' : m));
      const kf = d.value.split(/\s+/).find(w => keyframes.has(w));
      if (parsed) motions.push({ id: `animate-${animate[1]}`, name: d.name.replace(/^--/, ''), kind: 'motion', model: { trigger: 'enter', changes: kf ? keyframes.get(kf)! : [], timing: parsed.timing, requires: 'none' }, source: src(d), token: d.name, class: `animate-${animate[1]}` });
      continue;
    }
    if (!theme && /^--[\w-]*(?:transition|motion|easing|ease|timing)[\w-]*$/.test(d.name)) {
      const parsed = parseTransition(d.value);
      const e = parseEasing(d.value);
      if (parsed) motions.push({ id: d.name.replace(/^--/, ''), name: d.name.replace(/^--/, ''), kind: 'motion', model: { trigger: 'hover', changes: [], timing: parsed.timing, requires: 'none' }, source: src(d), token: d.name });
      else if (e) motions.push({ id: d.name.replace(/^--/, ''), name: d.name.replace(/^--/, ''), kind: 'motion', model: { trigger: 'hover', changes: [], timing: { type: 'curve', duration, easing: e }, requires: 'none' }, source: src(d), token: d.name });
    }
  }
  const prefixOf = (rs: Recipe[]) => { const counts = new Map<string, number>(); for (const r of rs) { const m = /^(--[a-z]+-)/.exec(r.token ?? ''); if (m) counts.set(m[1]!, (counts.get(m[1]!) ?? 0) + 1); } return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null; };
  return { file, shadows, motions, shadowPrefix: prefixOf(shadows), easePrefix: prefixOf(motions.filter(m => m.id.startsWith('ease-'))), defaults: { duration, easing }, durations, decls, rootPx };
}

// ---------------------------------------------------------------- classes on an element
export interface ClassReading { shadow?: { class: string; recipe: Recipe }; motion?: MotionModel; transition: { properties: string[]; duration?: number; easing?: string } }
const variants: Record<string, Trigger> = { hover: 'hover', 'group-hover': 'hover', active: 'press', focus: 'focus', 'focus-visible': 'focus', 'focus-within': 'focus' };
/** `[&:hover]` is the hover variant written out; any other arbitrary variant is a condition the engine does not read, so it has no trigger. */
const triggerOf = (variant: string): Trigger | undefined => variants[variant] ?? variants[/^\[&:([\w-]+)\]$/.exec(variant)?.[1] ?? ''];
const spacingPx = (n: string): number => Number(n) * 4;
/** `duration-300`, `duration-[300]`, `duration-[0.3s]`, `duration-[300ms]` in ms. */
function durationOf(utility: string): number | undefined {
  const plain = /^duration-(\d+)$/.exec(utility);
  if (plain) return Number(plain[1]);
  const inner = /^duration-\[([^\]]+)\]$/.exec(utility)?.[1];
  if (inner === undefined) return undefined;
  return parseDuration(inner) ?? (/^\d*\.?\d+$/.test(inner) ? Number(inner) : undefined);
}
/** The shadow and motion an element's classes say, against the project's own theme first and Tailwind's defaults after. */
export function readClasses(classes: string[], theme: ThemeIndex | null, rootPx = theme?.rootPx ?? defaultRootPx): ClassReading {
  const reading: ClassReading = { transition: { properties: [] } };
  const own = new Map((theme?.shadows ?? []).flatMap(r => r.class ? [[r.class, r] as const] : []));
  const defaults = new Map(tailwindDefaults().filter(r => r.kind === 'shadow').map(r => [r.class!, r]));
  const eases = new Map([...tailwindDefaults(), ...(theme?.motions ?? [])].filter(r => r.class?.startsWith('ease-')).map(r => [r.class!, r]));
  const changes: MotionChange[] = []; let trigger: Trigger | null = null, duration: number | undefined;
  const durations = new Map((theme?.durations ?? []).map(d => [d.class, d.ms]));
  for (const cls of classes) {
    const split = splitVariants(cls), utility = split.utility.replace(/^!|!$/g, '');
    // a class with any variant is not the element at rest; only the ones that name a state become a change
    const resting = split.variants.length === 0, variant = split.variants.map(triggerOf).find(Boolean);
    const shadow = own.get(utility) ?? defaults.get(utility);
    if (/^shadow(?:-|$)/.test(utility) && resting) {
      if (shadow) reading.shadow = { class: utility, recipe: shadow };
      else if (/^shadow-\[/.test(utility)) { const m = parseBoxShadow(utility.slice(8, -1).replaceAll('_', ' '), rootPx); if (m) reading.shadow = { class: utility, recipe: { id: utility, name: utility, kind: 'shadow', model: m, source: { reader: 'classes' } } }; }
      continue;
    }
    if (/^transition(?:-|$)/.test(utility)) {
      const p = utility === 'transition' ? ['color', 'background-color', 'border-color', 'opacity', 'box-shadow', 'transform'] : utility === 'transition-all' ? ['all'] : utility === 'transition-none' ? [] : utility.startsWith('transition-[') ? utility.slice(12, -1).split(',') : [utility.replace('transition-', '')];
      reading.transition.properties.push(...p); continue;
    }
    const ms = durations.get(utility) ?? durationOf(utility);
    if (ms !== undefined) { duration = ms; continue; }
    const ease = eases.get(utility);
    if (ease) { if (ease.kind === 'motion' && ease.model && 'timing' in ease.model) reading.transition.easing = utility; continue; }
    if (!variant) continue;
    const t = /^(-?)translate-([xy])-(\d+(?:\.\d+)?)$/.exec(utility);
    if (t) { changes.push({ property: t[2]!, from: 0, to: (t[1] ? -1 : 1) * spacingPx(t[3]!) }); trigger ??= variant; continue; }
    const s = /^scale-(\d+)$/.exec(utility);
    if (s) { changes.push({ property: 'scale', from: 1, to: Number(s[1]) / 100 }); trigger ??= variant; continue; }
    const o = /^opacity-(\d+)$/.exec(utility);
    if (o) { changes.push({ property: 'opacity', from: 1, to: Number(o[1]) / 100 }); trigger ??= variant; continue; }
    if (/^shadow-/.test(utility)) {
      // a named shadow is its custom property; an arbitrary one is its value
      const value = /^shadow-\[(.*)\]$/.exec(utility)?.[1]?.replaceAll('_', ' ');
      changes.push({ property: 'boxShadow', from: '', to: value ?? `var(--${utility})` }); trigger ??= variant;
    }
  }
  if (duration !== undefined) reading.transition.duration = duration;
  if (changes.length || reading.transition.properties.length || duration !== undefined || reading.transition.easing) {
    const e = reading.transition.easing ? eases.get(reading.transition.easing)?.model : undefined;
    const curve = e && 'timing' in e && e.timing.type === 'curve' ? e.timing.easing : parseEasing(theme?.defaults.easing ?? tailwindDefaultTransition.easing)!;
    reading.motion = { trigger: trigger ?? 'hover', changes, timing: { type: 'curve', duration: duration ?? theme?.defaults.duration ?? tailwindDefaultTransition.duration, easing: curve }, requires: 'none' };
  }
  return reading;
}

// ---------------------------------------------------------------- motion/react objects
/** A static JS value from source: numbers, strings, booleans, arrays and objects of them. Anything computed is a hole (undefined). */
export function literal(node: Node | null | undefined): unknown {
  if (!node) return undefined;
  switch (node.type) {
    case 'Literal': return (node as unknown as { value: unknown }).value;
    case 'ParenthesizedExpression': return literal((node as unknown as { expression: Node }).expression);
    case 'TSAsExpression': case 'TSSatisfiesExpression': return literal((node as unknown as { expression: Node }).expression);
    case 'UnaryExpression': { const n = node as unknown as { operator: string; argument: Node }; const v = literal(n.argument); return n.operator === '-' && typeof v === 'number' ? -v : n.operator === '+' && typeof v === 'number' ? v : undefined; }
    case 'ArrayExpression': return (node as unknown as { elements: (Node | null)[] }).elements.map(e => literal(e));
    case 'TemplateLiteral': { const t = node as unknown as { quasis: { value: { cooked?: string } }[]; expressions: Node[] }; return t.expressions.length ? undefined : t.quasis[0]?.value.cooked; }
    case 'ObjectExpression': {
      const out: Record<string, unknown> = {};
      for (const p of (node as unknown as { properties: { type: string; key: Node; value: Node; computed: boolean }[] }).properties) {
        if (p.type !== 'Property' || p.computed) return undefined;
        const key = p.key.type === 'Identifier' ? (p.key as unknown as { name: string }).name : String(literal(p.key));
        out[key] = literal(p.value);
      }
      return out;
    }
    default: return undefined;
  }
}
export function parseExpression(text: string): unknown {
  const parsed = parseSync('x.tsx', `const v = (${text});`);
  if (parsed.errors.length) return undefined;
  const decl = parsed.program.body[0] as unknown as { declarations?: { init: Node }[] };
  return literal(decl.declarations?.[0]?.init);
}
/** The motion in a motion/react transition or variant object, e.g. `{ type: 'spring', stiffness: 400, damping: 30 }`. */
export function readMotionObject(value: unknown, name = 'transition', source: Partial<RecipeSource> = {}): Recipe | null {
  const o = value as Record<string, unknown> | undefined;
  if (!o || typeof o !== 'object') return null;
  const timing = timingFromTransition((o.transition as Record<string, unknown> | undefined) ?? o);
  if (!timing) return null;
  const triggers: [string, Trigger][] = [['whileHover', 'hover'], ['whileTap', 'press'], ['whileFocus', 'focus'], ['animate', 'enter'], ['exit', 'exit']];
  const found = triggers.find(([k]) => o[k] && typeof o[k] === 'object');
  const props = found ? o[found[0]] as Record<string, unknown> : {};
  const rest: Record<string, number> = { x: 0, y: 0, scale: 1, opacity: 1 };
  const changes: MotionChange[] = Object.entries(props).filter(([k, v]) => k !== 'transition' && (typeof v === 'number' || typeof v === 'string')).map(([k, v]) => ({ property: k, from: rest[k] ?? 0, to: v as number | string }));
  return { id: name, name, kind: 'motion', model: { trigger: found?.[1] ?? 'hover', changes, timing, requires: 'motion' }, source: { reader: 'motion-object', ...source } };
}

// ---------------------------------------------------------------- W3C design tokens
export function readDesignTokens(json: unknown, file = 'tokens.json'): Recipe[] {
  const out: Recipe[] = [];
  const walk = (node: unknown, path: string[], inherited?: string): void => {
    if (!node || typeof node !== 'object') return;
    const o = node as Record<string, unknown>;
    const type = typeof o.$type === 'string' ? o.$type : inherited;
    if ('$value' in o) {
      const id = path.join('-'), v = o.$value, source: RecipeSource = { reader: 'dtcg', file, token: path.join('.') };
      if (type === 'shadow') {
        const layers = (Array.isArray(v) ? v : [v]) as Record<string, unknown>[];
        const css = layers.map(l => `${l.inset ? 'inset ' : ''}${dim(l.offsetX)} ${dim(l.offsetY)} ${dim(l.blur)} ${dim(l.spread)} ${typeof l.color === 'string' ? l.color : 'rgb(0 0 0 / 0.2)'}`).join(', ');
        const model = parseBoxShadow(css); if (model) out.push({ id, name: id, kind: 'shadow', model, source });
      } else if (type === 'duration') {
        const ms = typeof v === 'string' ? parseDuration(v) : v && typeof v === 'object' && 'value' in v ? (v as { value: number; unit?: string }).value * ((v as { unit?: string }).unit === 's' ? 1000 : 1) : null;
        if (ms !== null) out.push({ id, name: id, kind: 'motion', model: { trigger: 'hover', changes: [], timing: { type: 'curve', duration: ms, easing: parseEasing(tailwindDefaultTransition.easing)! }, requires: 'none' }, source });
      } else if (type === 'cubicBezier' && Array.isArray(v) && v.length === 4) {
        out.push({ id, name: id, kind: 'motion', model: { trigger: 'hover', changes: [], timing: { type: 'curve', duration: tailwindDefaultTransition.duration, easing: v as [number, number, number, number] }, requires: 'none' }, source });
      }
      return;
    }
    for (const [k, child] of Object.entries(o)) if (!k.startsWith('$')) walk(child, [...path, k], type);
  };
  walk(json, []);
  return out;
}
const dim = (v: unknown): string => typeof v === 'number' ? `${v}px` : typeof v === 'object' && v && 'value' in v ? `${(v as { value: number }).value}px` : typeof v === 'string' ? (/^-?[\d.]+$/.test(v) ? `${v}px` : v) : '0';

export const shadowCss = (m: ShadowModel): string => formatBoxShadow(m);
