import { makeFinding } from '../messages.js';
import { performance } from 'node:perf_hooks';
import { profiling, profileDuration } from '../profile.js';
import type { CustomHabit, HabitSeverity } from './predicates.js';
import { compilePredicate, validateHabit } from './predicates.js';
import type { Declaration, Finding } from '../report.js';
import { UsageError } from '../errors.js';
import { code, calls, hoverGated, positivePseudo, selector, directionSpecific } from './css.js';
import { pixels, resolveValue } from '../decisions/resolve.js';
import { tokens, oklab } from '../rules/families.js';

export const builtins = [
  { id: 'hover-gate', severity: 'error', reason: 'Touch can leave a hover style stuck after a tap.', fix: 'Wrap only the hover branch in @media (hover: hover) and (pointer: fine).' },
  { id: 'focus-outline', severity: 'error', reason: 'Keyboard users lose track of focus, and forced-colors mode shows nothing.', fix: 'Restore a visible outline on :focus-visible (or :focus-within for a field shell), including forced colors.' },
  { id: 'transition-named', severity: 'error', reason: 'Name the properties that transition so an unrelated change does not start animating.', fix: 'Replace all with the specific properties that should transition.' },
  { id: 'no-ease-in', severity: 'error', reason: 'Feedback to a person’s hand should begin immediately, without a slow start.', fix: 'Use the project’s responsive easing decision instead of ease-in.' },
  { id: 'logical-inline', severity: 'error', reason: "It doesn't mirror in right-to-left layouts.", fix: 'Use the corresponding inline-start/inline-end property, start/end alignment, or logical corner.' },
  { id: 'viewport-dynamic', severity: 'error', reason: 'Mobile toolbars change the viewport height.', fix: 'Use dvh/dvw for a changing viewport, svh/svw for a minimum, or lvh/lvw for a maximum.' },
  { id: 'safe-area-fallback', severity: 'error', reason: 'A safe-area environment variable needs a fallback so unavailable insets cannot invalidate the declaration.', fix: 'Add a fallback: env(safe-area-inset-*, 0px), alongside the element’s own spacing.' },
  { id: 'overflow-clip', severity: 'warn', reason: 'It breaks position: sticky inside and still allows script scrolling.', fix: 'Use overflow: clip if no programmatic scrolling, measurement or formatting context is required; review those semantics first.' },
  { id: 'overscroll-contain', severity: 'warn', reason: 'Reaching its edge scrolls the page behind it.', fix: 'Set overscroll-behavior: contain (or the matching axis) on this scroll container.' },
  { id: 'tracking-em', severity: 'warn', reason: 'Letter spacing in px stays the same at every size, so large type looks loose and small type cramped.', fix: 'Write the tracking in em (Tailwind tracking-* utilities are em) so it scales with the font size.' },
  { id: 'color-scheme', severity: 'warn', reason: 'Without color-scheme a dark theme keeps light scrollbars, form controls and autofill.', fix: 'Set color-scheme: dark (Tailwind scheme-dark) where the dark theme applies, or scheme-light-dark on the root.' },
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
const visibleRing = (d: Declaration) => d.prop === 'box-shadow' && tokens(d.value, /,/).some(shadow => {
  const parts = tokens(shadow, /\s/).filter(part => part !== 'inset' && !/^var\(--tw-ring-inset,\s*\)$/.test(part));
  const lengths = parts.slice(0, 4).map(part => {
    // Tailwind adds its unitless zero ring offset to the authored length.
    const length = part.replace(/^calc\(([-\d.]+px)\s*\+\s*0\)$/, '$1');
    return pixels(resolveValue(length, new Map()) ?? length);
  });
  return lengths[0] !== undefined && lengths[1] !== undefined &&
    (lengths[0] !== 0 || lengths[1] !== 0 || (lengths[2] ?? 0) > 0 || (lengths[3] ?? 0) > 0) &&
    !parts.slice(4).some(part => part === 'transparent' || oklab(part)?.[3] === 0);
});
const highlightAttribute = /(?<!\\)\[\s*(?:data-highlighted(?:\s*=\s*(?:"true"|'true'|true))?|(?:data-selected|aria-selected)\s*=\s*(?:"true"|'true'|true)|data-state\s*=\s*(?:"(?:open|active)"|'(?:open|active)'|open|active))\s*\]/gi;
const stateAttribute = /(?<!\\)\[\s*(?:data-(?:highlighted|selected|state)|aria-selected)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\]\s]+))?\s*\]/gi;
const focusBase = (s: string) => s.replace(/(?<!\\):focus(?:-(?:visible|within))?(?![\w-])/gi, '').replace(highlightAttribute, '');
/** Only attributes on this target count; ancestors, descendants and negations don't. */
function highlighted(s: string, utility = false): boolean {
  const branches = tokens(s, /,/);
  return branches.length > 0 && branches.every(branch => {
    const nested = ['not', 'has', 'is', 'where'].flatMap(name => calls(branch, name));
    for (const call of nested.filter(call => !nested.some(parent => parent.start < call.start && parent.end >= call.end)).sort((a, b) => b.start - a.start)) branch = branch.slice(0, call.start) + branch.slice(call.end);
    const compounds = tokens(branch, /[\s>+~]/);
    return (!utility || compounds.length === 1) && !!compounds.at(-1)?.match(highlightAttribute);
  });
}
const visibleColor = (value: string) => value !== 'transparent' && oklab(value)?.[3] !== 0;
const borderParts = (d: Declaration) => /^border(?:-(top|right|bottom|left|inline(?:-start|-end)?|block(?:-start|-end)?))?(?:-(width|style|color))?$/.exec(d.prop);
const easeIn = (value: string) => tokens(value.toLowerCase()).some(token => token === 'ease-in' || calls(token, 'cubic-bezier').some(call => {
  const points = call.args.split(',').map(Number);
  // CSS ease-in and Tailwind's default ease-in have these respective curves.
  return points.length === 4 && [0.42, 0.4].includes(points[0]!) && points[1] === 0 && points[2] === 1 && points[3] === 1;
}));

/** This receives only source-glob declarations. Companions never certify a computed cascade. */
export function judgeHabits(declarations: Declaration[], entries: (string | CustomHabit)[], classContexts: ReadonlyMap<Declaration, string>, hoverVariants: string[] = [], list = false, managedFocus: ReadonlySet<Declaration> = new Set()): { findings: Finding[]; summaries: HabitSummary[] } {
  const selected = new Map(entries.map(entry => [typeof entry === 'string' ? entry : entry.id, entry]));
  const active = new Set(list ? builtins.map(habit => habit.id) : [...selected.keys()].filter(id => !['z-named', 'motion-tokens'].includes(id)));
  if (!active.size) return { findings: [], summaries: builtins.map(habit => ({ id: habit.id, reason: habit.reason, severity: habit.severity, enabled: false, breaks: null })) };
  const eligible = declarations.filter(d => !d.opaque && d.origin !== 'keyframes');
  const values = new Map<string, string>(), pseudos = new Map<string, boolean>();
  const value = (d: Declaration) => { const raw = d.authoredCss ?? d.value; if (!values.has(raw)) values.set(raw, valueOf(d)); return values.get(raw)!; };
  const positive = (s: string, name: string) => { const key = `${name}\0${s}`; if (!pseudos.has(key)) pseudos.set(key, positivePseudo(s, name)); return pseudos.get(key)!; };
  const groups = new Map<string, Declaration[]>(), rings = new Map<string, Declaration[]>(), focusGroups = new Map<string, Declaration[]>();
  const scope = (d: Declaration) => JSON.stringify(d.when.filter(c => !['selector', 'pseudo', 'branch'].includes(c.kind)));
  const target = (d: Declaration) => isClass(d) ? classContexts.get(d) ?? `${d.site.file}:${d.site.line}:${d.site.column}` : d.origin === 'inline' ? classContexts.get(d) ?? `${d.site.file}:${d.site.line}:${d.site.column}` : selector(d.when);
  const groupKey = (d: Declaration) => `${d.site.file}\0${target(d)}\0${scope(d)}`;
  const focusKey = (d: Declaration) => `${d.site.file}\0${isClass(d) ? target(d) : focusBase(selector(d.when))}`;
  const covers = (other: Declaration, d: Declaration) =>
    ['hover', 'active', 'disabled', 'checked'].every(name => !positive(selector(other.when), name) || positive(selector(d.when), name)) &&
    other.when.filter(c => ['media', 'supports', 'container', 'branch'].includes(c.kind)).every(c =>
      visibleOutline(other) && c.kind === 'media' && /^\(\s*forced-colors\s*:\s*active\s*\)$/i.test(c.text) || d.when.some(t => t.kind === c.kind && t.text === c.text));
  for (const d of declarations.filter(d => d.origin !== 'keyframes')) {
    const key = groupKey(d); const group = groups.get(key) ?? []; group.push(d); groups.set(key, group);
    if (!d.opaque) { const key = focusKey(d), group = focusGroups.get(key) ?? []; group.push(d); focusGroups.set(key, group); }
  }
  const visibleBorder = (d: Declaration) => {
    const border = borderParts(d);
    if (!border) return false;
    const part = border[2], v = value(d);
    if ((!part || part === 'color') && !tokens(v, /\s/).every(visibleColor)) return false;
    const companions = focusGroups.get(focusKey(d))!.filter(other => {
      const match = borderParts(other);
      return match && (!match[1] || match[1] === border[1]) && !/(?<!\\)::?(before|after)(?![\w-])/.test(selector(other.when)) && covers(other, d) &&
        (selector(other.when).match(stateAttribute) ?? []).every(attribute => selector(d.when).includes(attribute));
    });
    const hasWidth = (v: string) => tokens(v, /\s/).some(part => /^(thin|medium|thick)$/.test(part) || (pixels(part) ?? 0) > 0);
    const hasStyle = (v: string) => tokens(v, /\s/).some(part => /^(solid|dashed|dotted|double|groove|ridge|inset|outset)$/.test(part));
    const widths = companions.filter(other => !borderParts(other)![2] || borderParts(other)![2] === 'width');
    const styles = companions.filter(other => !borderParts(other)![2] || borderParts(other)![2] === 'style');
    const colors = companions.filter(other => !borderParts(other)![2] || borderParts(other)![2] === 'color');
    const focusedColors = colors.filter(other => positive(selector(other.when), 'focus') || positive(selector(other.when), 'focus-visible') || positive(selector(other.when), 'focus-within') || highlighted(selector(other.when), isClass(other)));
    // A color alone cannot draw a border; zero widths and none/hidden styles
    // cannot certify a visible replacement even if another utility sets them.
    return (focusedColors.length ? focusedColors : colors).every(other => tokens(value(other), /\s/).every(visibleColor)) &&
      widths.some(other => hasWidth(value(other))) && styles.some(other => hasStyle(value(other))) &&
      !widths.some(other => /^(?:0(?:px)?\s*)+$/.test(value(other))) &&
      !styles.some(other => /^(none|hidden)$/.test(value(other)));
  };
  for (const d of eligible) {
    if (!outline(d) && d.prop !== 'box-shadow' && !borderParts(d) && !/^(background(?:-color)?|color)$/.test(d.prop)) continue;
    const s = selector(d.when);
    const focus = positive(s, 'focus') || positive(s, 'focus-visible') || positive(s, 'focus-within');
    const highlight = highlighted(s, isClass(d));
    const highlightColor = highlight && /^(background(?:-color)?|color)$/.test(d.prop) && visibleColor(value(d)) &&
      !/^(none|inherit|initial|unset|revert(?:-layer)?)$/.test(value(d)) &&
      !focusGroups.get(focusKey(d))!.some(other => other !== d && other.prop === d.prop && value(other) === value(d) &&
        !highlighted(selector(other.when), isClass(other)) && !['focus', 'focus-visible', 'focus-within', 'hover', 'active'].some(name => positive(selector(other.when), name)) && covers(other, d));
    const ringUtility = isClass(d) && /(?:^|:)(?:inset-)?ring(?:-|$)/.test(d.site.text);
    const transparentRing = d.prop === 'box-shadow' && groups.get(groupKey(d))!.some(other => /^(--tw-ring-color|--tw-inset-ring-color)$/.test(other.prop) &&
      JSON.stringify(other.when.filter(c => ['pseudo', 'branch'].includes(c.kind))) === JSON.stringify(d.when.filter(c => ['pseudo', 'branch'].includes(c.kind))) &&
      (value(other) === 'transparent' || oklab(value(other))?.[3] === 0));
    if (!/(?<!\\)::?(before|after)(?![\w-])/.test(s) && (visibleOutline(d) && focus || visibleRing(d) && !transparentRing && (focus || ringUtility) || (focus || highlight) && visibleBorder(d) || highlightColor)) {
      const key = focusKey(d);
      const matches = rings.get(key) ?? []; matches.push(d); rings.set(key, matches);
    }
  }
  const compiled = (list ? [] : entries).filter((entry): entry is CustomHabit => typeof entry !== 'string').map(habit => ({ habit, test: compilePredicate(habit.when) }));
  const findings = new Map<string, Finding>(), counts = new Map<string, Set<string>>();
  const ruleTimes = new Map<string, number>();
  function add(id: string, d: Declaration, reason: string, severity: HabitSeverity, fix: string): void {
    const occurrence = JSON.stringify([d.site, d.prop, d.value, d.when]);
    const seen = counts.get(id) ?? new Set<string>(); seen.add(occurrence); counts.set(id, seen);
    const key = `habits/${id}:${d.prop}:${d.value}:${selector(d.when)}:${fix}`;
    const existing = findings.get(key);
    if (existing) { if (!existing.sites.some(s => s.file === d.site.file && s.line === d.site.line && s.column === d.site.column)) { existing.sites.push(d.site); existing.edits!.push({ site: d.site, text: fix }); } }
    else {
      const authored = isClass(d) ? d.site.text : selector(d.when) || d.prop;
      const owner = d.owner.name;
      const { title, action } = habitMessage(id, d, authored, owner, value(d), fix);
      findings.set(key, makeFinding({ key, rule: `habits/${id}`, family: 'habits', severity, sites: [d.site], declaration: d, decisions: [], title, because: reason, action, edits: [{ site: d.site, text: fix }] }));
    }
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
      const start = profiling ? performance.now() : 0;
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
          const restored = (rings.get(focusKey(d)) ?? []).some(ring => covers(ring, d));
          broken = outline(d) && none(d) && !restored && !managedFocus.has(d);
          break;
        }
        case 'transition-named': broken = /^transition(?:-property)?$/.test(p) && tokens(v.toLowerCase()).includes('all'); break;
        case 'no-ease-in': broken = /^(transition|animation)(-|$)/.test(p) && easeIn(d.resolved ?? v); break;
        case 'logical-inline': {
          if (s && directionSpecific(s)) break;
          const centered = /^(?:calc\()?\s*(?:50%|1\s*\/\s*2\s*\*\s*100%)/.test(v);
          broken = /^(?:left|right|(?:margin|padding|scroll-margin|scroll-padding)-(?:left|right)|border-(?:left|right)(?:-(?:width|style|color))?|border-(?:top|bottom)-(?:left|right)-radius)$/.test(p) && !centered || /^(text-align|float|clear)$/.test(p) && /^(left|right)$/i.test(v);
          if (broken && !['text-align', 'float', 'clear'].includes(p)) {
            const opposite = p.replace(/left|right/, side => side === 'left' ? 'right' : 'left');
            const state = (other: Declaration) => JSON.stringify(other.when.filter(c => ['pseudo', 'branch'].includes(c.kind)));
            const amount = (other: Declaration) => {
              const resolved = resolveValue(value(other), new Map()) ?? other.resolved ?? value(other);
              return pixels(resolved) ?? resolved;
            };
            // Equal companions under the same conditions already mirror. A
            // hover-only or conditional counterpart cannot certify the base.
            if (group.some(other => other.prop === opposite && !other.opaque && state(other) === state(d) && amount(other) === amount(d))) broken = false;
          }
          const parts = tokens(v, /\s/);
          if (/^(padding|margin|inset)$/.test(p) && parts.length === 4 && parts[1] !== parts[3]) broken = true;
          break;
        }
        case 'tracking-em': broken = p === 'letter-spacing' && tokens(v, /\s/).some(part => (pixels(part) ?? 0) !== 0 && /px$/i.test(part)); break;
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
      if (profiling) ruleTimes.set(habit.id, (ruleTimes.get(habit.id) ?? 0) + performance.now() - start);
    }
  }
  // One dark theme with no color-scheme anywhere is one finding, placed on the first declaration the dark theme sets.
  if (active.has('color-scheme') && !declarations.some(d => d.prop === 'color-scheme')) {
    const darkened = eligible.find(d => d.when.some(c => c.kind === 'media' && /prefers-color-scheme\s*:\s*dark/i.test(c.text) ||
      c.kind === 'selector' && /(?:^|[\s(,])(?:\.dark\b|\[data-(?:theme|mode)=["']?dark)/.test(c.text)));
    const habit = builtins.find(h => h.id === 'color-scheme')!;
    if (darkened) add(habit.id, darkened, habit.reason, habit.severity, habit.fix);
  }
  for (const d of declarations) if (!d.opaque) for (const { habit, test } of compiled) if (test(d)) add(habit.id, d, habit.message, habit.severity ?? 'error', habit.message);
  const summaries: HabitSummary[] = builtins.map(habit => ({ id: habit.id, reason: habit.reason, severity: habit.severity, enabled: selected.has(habit.id), breaks: active.has(habit.id) ? counts.get(habit.id)?.size ?? 0 : null }));
  for (const { habit } of compiled) summaries.push({ id: habit.id, reason: habit.message, severity: habit.severity ?? 'error', enabled: true, breaks: counts.get(habit.id)?.size ?? 0 });
  for (const [id, duration] of ruleTimes) profileDuration(`rule:habits/${id}`, duration);
  return { findings: [...findings.values()], summaries };
}

export function logicalProperty(prop: string, value: string): string {
  if (['text-align', 'float', 'clear'].includes(prop)) return value === 'left' ? 'start' : 'end';
  if (prop === 'left' || prop === 'right') return prop === 'left' ? 'inset-inline-start' : 'inset-inline-end';
  const corner = /^border-(top|bottom)-(left|right)-radius$/.exec(prop);
  if (corner) return `border-${corner[1] === 'top' ? 'start' : 'end'}-${corner[2] === 'left' ? 'start' : 'end'}-radius`;
  if (prop === 'padding' || prop === 'margin' || prop === 'inset') return `${prop}-inline-start / ${prop}-inline-end`;
  return prop.replace(/-(left|right)(?=-|$)/, (_, side: string) => `-inline-${side === 'left' ? 'start' : 'end'}`);
}

function habitMessage(id: string, d: Declaration, authored: string, owner: string, value: string, fix: string): { title: string; action: string } {
  switch (id) {
    case 'hover-gate': return { title: `\`${authored}\` also applies on touch screens`, action: 'Use `pointer-hover:` (or wrap the rule in @media (hover: hover) and (pointer: fine)).' };
    case 'focus-outline': return { title: `\`${isClass(d) ? d.site.text : d.prop}\` removes the focus outline on ${owner}`, action: 'Restore an outline on :focus-visible.' };
    case 'logical-inline': return { title: `\`${isClass(d) ? d.site.text : d.prop}\` is a physical side`, action: `Use \`${logicalProperty(d.prop, value)}\`.` };
    case 'tracking-em': return { title: `\`${authored}\` sets letter spacing in px`, action: 'Use em so the tracking scales with the type.' };
    case 'color-scheme': return { title: 'The dark theme never sets color-scheme', action: 'Add scheme-dark where the dark theme applies (or color-scheme: dark).' };
    case 'viewport-dynamic': return { title: `\`${value}\` uses vh, which jumps on mobile`, action: 'Use dvh for a changing viewport, svh for the smallest, lvh for the largest.' };
    case 'overflow-clip': return { title: `\`overflow-hidden\` on ${owner} creates a scroll container`, action: 'Use overflow-clip if nothing scrolls it.' };
    case 'overscroll-contain': return { title: `${owner} scrolls, and its scroll leaks to the page`, action: 'Add overscroll-contain.' };
    case 'transition-named': return { title: `\`${authored}\` transitions every property`, action: fix };
    case 'no-ease-in': return { title: `\`${authored}\` starts feedback slowly with ease-in`, action: fix };
    case 'safe-area-fallback': return { title: `\`${value}\` has no safe-area fallback`, action: fix };
    default: return { title: `\`${d.site.text}\` breaks ${id}`, action: fix };
  }
}
