import type { CustomHabit, HabitSeverity } from './predicates.js';
import { compilePredicate, validateHabit } from './predicates.js';
import type { Declaration, Finding } from '../report.js';
import { UsageError } from '../errors.js';
import { code, calls, hoverGated, positivePseudo, selector } from './css.js';
import { tokens } from '../rules/families.js';

export const builtins = [
  { id: 'hover-gate', severity: 'error', reason: 'Touch can leave hover stuck. Hover feedback requires both a hover-capable input and a fine pointer.', fix: 'Wrap only the hover branch in @media (hover: hover) and (pointer: fine).' },
  { id: 'focus-outline', severity: 'error', reason: 'An outline survives forced colors. Removing it requires an outline restored on focus-visible or focus-within on the same target.', fix: 'Restore a visible outline on :focus-visible (or :focus-within for a field shell), including forced colors.' },
  { id: 'transition-named', severity: 'error', reason: 'Name the properties that transition so an unrelated change does not start animating.', fix: 'Replace all with the specific properties that should transition.' },
  { id: 'no-ease-in', severity: 'error', reason: 'Feedback to a person’s hand should begin immediately, without a slow start.', fix: 'Use the project’s responsive easing decision instead of ease-in.' },
  { id: 'logical-inline', severity: 'error', reason: 'Logical inline sides mirror in right-to-left layouts; physical sides do not.', fix: 'Use the corresponding inline-start/inline-end property, start/end alignment, or logical corner.' },
  { id: 'viewport-dynamic', severity: 'error', reason: 'Mobile browser toolbars change the usable viewport. Choose dynamic, small or large viewport units deliberately.', fix: 'Use dvh/dvw for a changing viewport, svh/svw for a minimum, or lvh/lvw for a maximum.' },
  { id: 'safe-area-fallback', severity: 'error', reason: 'A safe-area environment variable needs a fallback so unavailable insets cannot invalidate the declaration.', fix: 'Add a fallback: env(safe-area-inset-*, 0px), alongside the element’s own spacing.' },
  { id: 'overflow-clip', severity: 'warn', reason: 'Clipping decoration should not create a scroll container: hidden changes sticky behavior and permits script scrolling.', fix: 'Use overflow: clip if no programmatic scrolling, measurement or formatting context is required; review those semantics first.' },
  { id: 'overscroll-contain', severity: 'warn', reason: 'An inner scroller should keep its scroll instead of moving the page when it reaches an edge.', fix: 'Set overscroll-behavior: contain (or the matching axis) on this scroll container.' },
] as const;
export type BuiltinHabit = typeof builtins[number]['id'];
export interface HabitSummary { id: string; reason: string; severity: HabitSeverity; enabled: boolean; breaks: number | null }

export function validateHabits(entries: unknown[]): void {
  const ids = new Set<string>();
  entries.forEach((entry, i) => {
    const path = `habits[${i}]`;
    if (typeof entry !== 'string') validateHabit(entry, path);
    const id = typeof entry === 'string' ? entry : (entry as CustomHabit).id;
    if (typeof entry === 'string' && !['z-named', 'motion-tokens'].includes(id) && !builtins.some(habit => habit.id === id)) throw new UsageError(`${path}: unknown habit "${id}"; built-ins: ${builtins.map(habit => habit.id).join(', ')}.`);
    if (typeof entry !== 'string' && (['z-named', 'motion-tokens'].includes(id) || builtins.some(habit => habit.id === id))) throw new UsageError(`${path}: custom habit id "${id}" is reserved by a built-in.`);
    if (ids.has(id)) throw new UsageError(`${path}: duplicate habit "${id}".`);
    ids.add(id);
  });
}
const valueOf = (d: Declaration) => code(d.authoredCss ?? d.value).replace(/\s*!important\s*$/i, '').trim();
const isClass = (d: Declaration) => d.origin === 'class' || d.origin === 'arbitrary';
const outline = (d: Declaration) => /^(outline|outline-style)$/.test(d.prop);
const none = (d: Declaration) => /(^|\s)(none|0(?:px)?)(\s|$)/i.test(valueOf(d));
const visibleOutline = (d: Declaration) => outline(d) && !none(d) && !/^(initial|unset|revert|revert-layer|inherit)$/.test(valueOf(d));
const focusBase = (s: string) => s.replace(/(?<!\\):focus-(visible|within)(?![\w-])/gi, '');

/** This receives only source-glob declarations. Companions never certify a computed cascade. */
export function judgeHabits(declarations: Declaration[], entries: (string | CustomHabit)[], classContexts: ReadonlyMap<Declaration, string>, hoverVariants: string[] = [], list = false): { findings: Finding[]; summaries: HabitSummary[] } {
  const selected = new Map(entries.map(entry => [typeof entry === 'string' ? entry : entry.id, entry]));
  const active = new Set(list ? builtins.map(habit => habit.id) : [...selected.keys()].filter(id => !['z-named', 'motion-tokens'].includes(id)));
  if (!active.size) return { findings: [], summaries: builtins.map(habit => ({ id: habit.id, reason: habit.reason, severity: habit.severity, enabled: false, breaks: null })) };
  const eligible = declarations.filter(d => !d.opaque && d.origin !== 'keyframes');
  const values = new Map<string, string>(), pseudos = new Map<string, boolean>();
  const value = (d: Declaration) => { const raw = d.authoredCss ?? d.value; if (!values.has(raw)) values.set(raw, valueOf(d)); return values.get(raw)!; };
  const positive = (s: string, name: string) => { const key = `${name}\0${s}`; if (!pseudos.has(key)) pseudos.set(key, positivePseudo(s, name)); return pseudos.get(key)!; };
  const groups = new Map<string, Declaration[]>(), rings = new Map<string, Declaration[]>();
  const scope = (d: Declaration) => JSON.stringify(d.when.filter(c => !['selector', 'pseudo', 'branch'].includes(c.kind)));
  const target = (d: Declaration) => isClass(d) ? classContexts.get(d) ?? `${d.site.file}:${d.site.line}:${d.site.column}` : d.origin === 'inline' ? classContexts.get(d) ?? `${d.site.file}:${d.site.line}:${d.site.column}` : selector(d.when);
  const groupKey = (d: Declaration) => `${d.site.file}\0${target(d)}\0${scope(d)}`;
  for (const d of declarations.filter(d => d.origin !== 'keyframes')) {
    const key = groupKey(d); const group = groups.get(key) ?? []; group.push(d); groups.set(key, group);
    const s = selector(d.when);
    if (!d.opaque && visibleOutline(d) && (positive(s, 'focus-visible') || positive(s, 'focus-within'))) {
      const key = `${d.site.file}\0${isClass(d) ? target(d) : focusBase(s)}`;
      const matches = rings.get(key) ?? []; matches.push(d); rings.set(key, matches);
    }
  }
  const compiled = (list ? [] : entries).filter((entry): entry is CustomHabit => typeof entry !== 'string').map(habit => ({ habit, test: compilePredicate(habit.when) }));
  const findings = new Map<string, Finding>(), counts = new Map<string, Set<string>>();
  function add(id: string, d: Declaration, reason: string, severity: HabitSeverity, fix: string): void {
    const occurrence = JSON.stringify([d.site, d.prop, d.value, d.when]);
    const seen = counts.get(id) ?? new Set<string>(); seen.add(occurrence); counts.set(id, seen);
    const key = `habits/${id}:${d.prop}:${d.value}:${selector(d.when)}:${fix}`;
    const existing = findings.get(key);
    if (existing) { if (!existing.sites.some(s => s.file === d.site.file && s.line === d.site.line && s.column === d.site.column)) existing.sites.push(d.site); }
    else findings.set(key, { key, rule: `habits/${id}`, family: 'habits', severity, sites: [d.site], declaration: d, decisions: [], why: reason, fix });
  }
  for (const d of eligible) {
    const s = selector(d.when), v = value(d), p = d.prop, group = groups.get(groupKey(d))!;
    const peer = (test: (other: Declaration) => boolean) => group.some(other =>
      // An unconditional companion covers any branch; a conditional one only covers its own branch.
      ['hover', 'focus', 'focus-visible', 'focus-within', 'active', 'checked', 'disabled'].every(name => !positive(selector(other.when), name) || positive(s, name)) &&
      other.when.filter(c => c.kind === 'branch').every(c => d.when.some(t => t.kind === c.kind && t.text === c.text)) && test(other));
    const scroller = (other: Declaration) => /^overflow(?:-[xy])?$/.test(other.prop) && /(^|\s)(auto|scroll)(\s|$)/i.test(value(other));
    for (const habit of builtins) {
      if (!active.has(habit.id)) continue;
      let broken = false, fix: string = habit.fix;
      switch (habit.id) {
        case 'hover-gate':
          broken = positive(s, 'hover') && !hoverGated(d.when);
          const selectorVariant = /\[[^\]]*:hover/.test(d.site.text) && !/(?:^|:)(?:(?:group|peer)-)?hover(?:\/[^:]+)?:/.test(d.site.text);
          if (broken && isClass(d) && selectorVariant) fix = 'Prefix this class with [@media(hover:hover)_and_(pointer:fine)]: while keeping its existing selector variant.';
          if (broken && isClass(d) && !selectorVariant) {
            const compound = /(?:^|:)(group|peer)-hover(\/[^:]+)?:/.exec(d.site.text);
            const family = compound ? `${compound[1]}-` : '';
            const available = hoverVariants.filter(name => family ? name.split(':').at(-1)!.startsWith(family) : !/^(group|peer)-/.test(name.split(':').at(-1)!));
            const variant = available.includes(`${family}pointer-hover`) ? `${family}pointer-hover` : available[0];
            fix = variant ? `Use ${variant}${compound?.[2] ?? ''}: instead of the ungated hover variant; preserve the other variants and utility.` : 'Add @custom-variant pointer-hover { &:hover { @media (hover: hover) and (pointer: fine) { @slot; } } } then use pointer-hover:.';
          }
          break;
        case 'focus-outline': {
          // Primitive utility definitions need companions at their class sites.
          if (!isClass(d) && ['.outline-none', '.focus-visible\\:outline-none', '.focus-visible\\:outline-none:focus-visible'].includes(s)) break;
          const restored = (rings.get(`${d.site.file}\0${isClass(d) ? target(d) : focusBase(s)}`) ?? []).some(ring =>
            ['hover', 'active', 'disabled', 'checked'].every(name => !positive(selector(ring.when), name) || positive(s, name)) &&
            ring.when.filter(c => ['media', 'supports', 'container', 'branch'].includes(c.kind)).every(c =>
              c.kind === 'media' && /^\(\s*forced-colors\s*:\s*active\s*\)$/i.test(c.text) || d.when.some(t => t.kind === c.kind && t.text === c.text))); 
          broken = outline(d) && none(d) && !restored || p === 'box-shadow' && positive(s, 'focus-visible') && !/::?(before|after)$/.test(s) && !peer(outline) && !restored;
          break;
        }
        case 'transition-named': broken = /^transition(?:-property)?$/.test(p) && tokens(v.toLowerCase()).includes('all'); break;
        case 'no-ease-in': broken = /^(transition|animation)(-|$)/.test(p) && tokens(v.toLowerCase()).includes('ease-in'); break;
        case 'logical-inline': {
          const centered = /^(?:calc\()?\s*(?:50%|1\s*\/\s*2\s*\*\s*100%)/.test(v);
          broken = /^(?:left|right|(?:margin|padding|scroll-margin|scroll-padding)-(?:left|right)|border-(?:left|right)(?:-(?:width|style|color))?|border-(?:top|bottom)-(?:left|right)-radius)$/.test(p) && !centered || /^(text-align|float|clear)$/.test(p) && /^(left|right)$/i.test(v);
          const parts = tokens(v, /\s/);
          if (/^(padding|margin|inset)$/.test(p) && parts.length === 4 && parts[1] !== parts[3]) broken = true;
          break;
        }
        case 'viewport-dynamic': broken = /(?<![\w.])[-+]?(?:\d*\.)?\d+v[hw]\b/i.test(v); break;
        case 'safe-area-fallback': broken = calls(v, 'env').some(call => /^safe-area-inset-[\w-]+\s*$/i.test(call.args)); break;
        case 'overflow-clip': {
          if (!/^overflow(?:-[xy])?$/.test(p) || !/(^|\s)hidden(\s|$)/i.test(v)) break;
          const decoration = /::?(before|after)$/.test(s) || peer(other => /^(border-radius|border-.*-radius|clip-path|mask(?:-image)?)$/.test(other.prop));
          const semantics = peer(other => scroller(other) || /^(scroll-|resize|text-overflow)/.test(other.prop) || other.prop === 'white-space' && /nowrap/.test(value(other)) || /^(transition|animation)/.test(other.prop) && /\b(height|block-size|grid-template-rows|all)\b/.test(value(other)) || other.opaque !== undefined);
          broken = /^overflow(?:-[xy])?$/.test(p) && /(^|\s)hidden(\s|$)/i.test(v) && decoration && !semantics && !(isClass(d) && /(?:^|:)(truncate|sr-only)!?$/.test(d.site.text));
          break;
        }
        case 'overscroll-contain': {
          if (!scroller(d)) break;
          if (!isClass(d) && /^\.overflow(?:-[xy])?-(?:auto|scroll)$/.test(s)) break;
          const overflow = tokens(v.toLowerCase(), /\s/);
          const axes = p === 'overflow-x' ? ['x'] : p === 'overflow-y' ? ['y'] : ['x', 'y'].filter((_, i) => /^(auto|scroll)$/.test(overflow[i] ?? overflow[0] ?? ''));
          const vertical = peer(other => other.prop === 'writing-mode' && /^(vertical|sideways)-/.test(value(other)));
          broken = scroller(d) && !axes.every(axis => peer(other => {
            const parts = tokens(value(other).toLowerCase(), /\s/);
            const contained = (part: string | undefined) => part === 'contain' || part === 'none';
            if (other.prop === 'overscroll-behavior') return contained(parts[axis === 'x' ? 0 : 1] ?? parts[0]);
            const logical = axis === (vertical ? 'y' : 'x') ? 'inline' : 'block';
            return (other.prop === `overscroll-behavior-${axis}` || other.prop === `overscroll-behavior-${logical}`) && contained(parts[0]);
          }));
          break;
        }
      }
      if (broken) add(habit.id, d, habit.reason, habit.severity, fix);
    }
  }
  for (const d of declarations) if (!d.opaque) for (const { habit, test } of compiled) if (test(d)) add(habit.id, d, habit.message, habit.severity ?? 'error', habit.message);
  const summaries: HabitSummary[] = builtins.map(habit => ({ id: habit.id, reason: habit.reason, severity: habit.severity, enabled: selected.has(habit.id), breaks: active.has(habit.id) ? counts.get(habit.id)?.size ?? 0 : null }));
  for (const { habit } of compiled) summaries.push({ id: habit.id, reason: habit.message, severity: habit.severity ?? 'error', enabled: true, breaks: counts.get(habit.id)?.size ?? 0 });
  return { findings: [...findings.values()], summaries };
}
