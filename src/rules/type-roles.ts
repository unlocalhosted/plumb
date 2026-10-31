/**
 * Type roles (docs/research/type-roles.md, layer 2): the small set of text styles a codebase is reaching for, named
 * on Material 3's scheme from the code's own values, with the write that makes them the system.
 *
 * Pure over its input: the members (one per text element, with the type classes written at it, the values they
 * lower to, and, when a page has been measured, the computed values and whether it sits in a list) and the paths
 * outside the system. Same members in → same roles, bundles, members, cost and write out.
 */
import { matchesGlob } from 'node:path';

export interface TypeBundle { size: number | null; lineHeight: number | null; letterSpacing: number; weight: number; transform: 'uppercase' | 'none'; /** a fluid size (clamp) kept as written */ sizeText?: string }
export interface TypeClass { text: string; props: string[]; value: string; origin: string }
export interface TypeMember {
  site: { file: string; line: number; column: number };
  stamp?: string;
  tag: string;
  /** the classes at the element that set a type property, as written */
  classes: TypeClass[];
  /** the values those classes lower to (px, unitless line-height ratio, em letter-spacing), or the computed values when a page was measured */
  current: TypeBundle;
  /** the element sits in a list (li/ul/ol/dl) or a list-like repeat */
  list: boolean;
  /** elements rendered from this place on the measured page */
  elements: number;
  /** why the place cannot be swapped (an inline style, a computed className, a formula) */
  fixed?: string;
}
export type RoleName = 'display-large' | 'headline-small' | 'title-large' | 'title-medium' | 'body-large' | 'body-small' | 'label-medium' | 'label-small';
export interface RoleMember { site: TypeMember['site']; stamp?: string; tag: string; classes: string[]; current: TypeBundle; delta: { size: number | null; lineHeight: number | null; letterSpacing: number; weight: number }; variant?: 'compact'; confidence: 'ok' | 'low'; elements: number; fixed?: string }
export interface TypeRole { name: RoleName; bundle: TypeBundle; variants?: { compact: { lineHeight: number } }; members: RoleMember[]; places: number; elements: number; files: number; contexts: { tag: string; places: number }[] }
export interface TypeProposal {
  rule: 'system/type-roles'; kind: 'system'; family: 'type';
  roles: TypeRole[];
  outside: { site: TypeMember['site']; why: string }[];
  low: { site: TypeMember['site']; role: RoleName; why: string }[];
  exceptions: { site: TypeMember['site']; role: RoleName; why: string }[];
  cost: { places: number; elements: number; moves: Record<'size' | 'lineHeight' | 'letterSpacing' | 'weight', Record<string, number>>; classesRemoved: number; sizesBefore: number; sizesAfter: number };
  write: { tokens: { name: string; value: string; why: string }[]; css: string; swaps: { file: string; edits: { line: number; column: number; from: string; to: string }[] }[] };
}

const TYPE_PROPS = new Set(['font-size', 'line-height', 'letter-spacing', 'font-weight', 'text-transform']);
export const isTypeProp = (prop: string) => TYPE_PROPS.has(prop);

/** A length in px: px, rem (16px), em (against the element's size), a bare number for weights and ratios. */
export function px(value: string | undefined, size = 16): number | null {
  if (value === undefined) return null;
  const v = value.trim();
  const m = /^(-?[\d.]+)(px|rem|em|%)?$/.exec(v);
  if (!m) return null;
  const n = parseFloat(m[1]!);
  if (!Number.isFinite(n)) return null;
  return m[2] === 'rem' ? n * 16 : m[2] === 'em' ? n * size : m[2] === '%' ? n / 100 * size : n;
}

export const roleOrder: RoleName[] = ['display-large', 'headline-small', 'title-large', 'title-medium', 'body-large', 'body-small', 'label-medium', 'label-small'];
export const roleClass = (name: RoleName, variant?: 'compact') => `type-${name}${variant ? '-compact' : ''}`;
export const roleToken = (name: RoleName) => `--text-${name}`;

/** Which role a member reaches for, from its own values: caps and tracked → a label by size; else by size and weight. */
export function roleFor(b: TypeBundle): RoleName {
  const size = b.size ?? 0, fluid = !!b.sizeText;
  if (b.transform === 'uppercase' && size <= 13.5) return size < 11.5 ? 'label-small' : 'label-medium';
  if (fluid || size >= 36) return 'display-large';
  if (size >= 22) return 'headline-small';
  if (size >= 18.5 || (size >= 17 && b.weight < 500)) return 'title-large';
  if (size >= 17) return 'title-medium';
  if (size >= 14.5) return 'body-large';
  return 'body-small';
}

const mode = <T>(values: T[], fallback: T): T => {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] ?? fallback;
};
const round = (n: number, places = 3) => Math.round(n * 10 ** places) / 10 ** places;

export function proposeTypeRoles(members: TypeMember[], options: { exclude?: string[] } = {}): TypeProposal {
  const exclude = options.exclude ?? [];
  const outsideOf = (m: TypeMember): string | undefined => {
    const file = m.site.file;
    for (const pattern of exclude) if (file === pattern || file.startsWith(pattern.replace(/\/?$/, '/')) || matchesGlob(file, pattern)) return `excluded by config: ${pattern}`;
    if (['text', 'tspan'].includes(m.tag)) return 'drawing text (SVG)';
    if (m.current.size !== null && m.current.size >= 60) return 'poster size';
    if (m.classes.some(c => /var\(--z/.test(c.value))) return 'runtime-scaled drawing text (var(--z))';
    return undefined;
  };
  const sorted = [...members].sort((a, b) => a.site.file.localeCompare(b.site.file) || a.site.line - b.site.line || a.site.column - b.site.column);
  const outside: TypeProposal['outside'] = [], inside: TypeMember[] = [];
  for (const m of sorted) { const why = outsideOf(m); if (why) outside.push({ site: m.site, why }); else inside.push(m); }
  // roles: the members each reaches for; bundles: the most common of the members' own values
  const byRole = new Map<RoleName, TypeMember[]>();
  for (const m of inside) { const r = roleFor(m.current); byRole.set(r, [...byRole.get(r) ?? [], m]); }
  const roles: TypeRole[] = [], low: TypeProposal['low'] = [], exceptions: TypeProposal['exceptions'] = [];
  const tokens: TypeProposal['write']['tokens'] = [], utilities: string[] = [], swapsByFile = new Map<string, TypeProposal['write']['swaps'][number]['edits']>();
  const moves = { size: {} as Record<string, number>, lineHeight: {} as Record<string, number>, letterSpacing: {} as Record<string, number>, weight: {} as Record<string, number> };
  const bucket = (table: Record<string, number>, v: number | null, steps: number[]) => { if (v === null) return; const a = Math.abs(v); const key = steps.find(s => a <= s + 1e-9)?.toString() ?? `>${steps.at(-1)}`; table[key] = (table[key] ?? 0) + 1; };
  let classesRemoved = 0, places = 0, elements = 0;
  for (const name of roleOrder) {
    const ms = byRole.get(name); if (!ms?.length) continue;
    const label = name.startsWith('label-');
    const fluidText = mode(ms.map(m => m.current.sizeText).filter((s): s is string => !!s), '');
    const size = mode(ms.map(m => m.current.size).filter((s): s is number => s !== null), null as number | null);
    const prose = ms.filter(m => !m.list), lists = ms.filter(m => m.list);
    const lh = (set: TypeMember[]) => mode(set.map(m => m.current.lineHeight).filter((s): s is number => s !== null), null as number | null);
    const lineHeight = lh(prose.length ? prose : ms);
    const compact = name === 'body-large' && lists.length && lh(lists) !== null && lh(lists) !== lineHeight ? { compact: { lineHeight: lh(lists)! } } : undefined;
    const bundle: TypeBundle = { size: fluidText ? null : size, ...(fluidText ? { sizeText: fluidText } : {}), lineHeight, letterSpacing: round(mode(ms.map(m => round(m.current.letterSpacing)), 0)), weight: mode(ms.map(m => m.current.weight), 400), transform: label ? 'uppercase' : 'none' };
    const roleMembers: RoleMember[] = [];
    const contexts = new Map<string, number>();
    const fileSet = new Set<string>();
    for (const m of ms) {
      const variant = compact && m.list ? 'compact' as const : undefined;
      const roleLh = variant ? compact!.compact.lineHeight : bundle.lineHeight;
      const refSize = bundle.size ?? m.current.size ?? 16;
      const delta = {
        size: bundle.size !== null && m.current.size !== null ? round(bundle.size - m.current.size, 2) : null,
        lineHeight: roleLh !== null && m.current.lineHeight !== null ? round((roleLh - m.current.lineHeight) * refSize, 1) : null,
        letterSpacing: round((bundle.letterSpacing - m.current.letterSpacing) * refSize, 2),
        weight: bundle.weight - m.current.weight,
      };
      const confidence: RoleMember['confidence'] = (delta.size !== null && Math.abs(delta.size) > 2) || Math.abs(delta.weight) >= 200 || (delta.lineHeight !== null && Math.abs(delta.lineHeight) > 3) ? 'low' : 'ok';
      const classes = m.classes.map(c => c.text);
      roleMembers.push({ site: m.site, ...(m.stamp ? { stamp: m.stamp } : {}), tag: m.tag, classes, current: m.current, delta, ...(variant ? { variant } : {}), confidence, elements: m.elements, ...(m.fixed ? { fixed: m.fixed } : {}) });
      contexts.set(m.tag, (contexts.get(m.tag) ?? 0) + 1); fileSet.add(m.site.file);
      places++; elements += m.elements;
      bucket(moves.size, delta.size, [0, 1, 2]); bucket(moves.lineHeight, delta.lineHeight, [0, 1, 2]); bucket(moves.letterSpacing, delta.letterSpacing, [0, 0.5, 1]); bucket(moves.weight, delta.weight, [0, 100]);
      if (confidence === 'low') low.push({ site: m.site, role: name, why: `moves ${delta.size ?? 0}px in size, ${delta.lineHeight ?? 0}px in line-height, ${delta.weight} in weight` });
      if (m.fixed) { exceptions.push({ site: m.site, role: name, why: m.fixed }); continue; }
      if (!classes.length) continue;
      classesRemoved += classes.length;
      const edits = swapsByFile.get(m.site.file) ?? []; swapsByFile.set(m.site.file, edits);
      edits.push({ line: m.site.line, column: m.site.column, from: classes.join(' '), to: roleClass(name, variant) });
    }
    roles.push({ name, bundle, ...(compact ? { variants: compact } : {}), members: roleMembers, places: ms.length, elements: ms.reduce((n, m) => n + m.elements, 0), files: fileSet.size, contexts: [...contexts].sort((a, b) => b[1] - a[1]).map(([tag, n]) => ({ tag, places: n })) });
    // the write: the theme pairs in crafting-ui's own shape, and one utility that sets the whole bundle
    const token = roleToken(name), sizeValue = bundle.sizeText ?? (bundle.size !== null ? `${round(bundle.size / 16, 4)}rem` : null);
    const why = `type role ${name}: ${ms.length} places`;
    if (sizeValue) tokens.push({ name: token, value: sizeValue, why });
    if (bundle.lineHeight !== null) tokens.push({ name: `${token}--line-height`, value: String(bundle.lineHeight), why });
    tokens.push({ name: `${token}--letter-spacing`, value: `${bundle.letterSpacing}em`, why });
    tokens.push({ name: `${token}--font-weight`, value: String(bundle.weight), why });
    if (compact) tokens.push({ name: `${token}-compact--line-height`, value: String(compact.compact.lineHeight), why: `${why}, in lists` });
    const body = [sizeValue ? `font-size: var(${token});` : '', bundle.lineHeight !== null ? `line-height: var(${token}--line-height);` : '', `letter-spacing: var(${token}--letter-spacing);`, `font-weight: var(${token}--font-weight);`, label ? 'text-transform: uppercase;' : ''].filter(Boolean);
    utilities.push(`@utility ${roleClass(name)} {\n  ${body.join('\n  ')}\n}`);
    if (compact) utilities.push(`@utility ${roleClass(name, 'compact')} {\n  ${body.map(line => line.startsWith('line-height') ? `line-height: var(${token}-compact--line-height);` : line).join('\n  ')}\n}`);
  }
  const sizesBefore = new Set(inside.map(m => m.current.sizeText ?? m.current.size)).size;
  const sizesAfter = new Set(roles.map(r => r.bundle.sizeText ?? r.bundle.size)).size;
  return { rule: 'system/type-roles', kind: 'system', family: 'type', roles, outside, low, exceptions,
    cost: { places, elements, moves, classesRemoved, sizesBefore, sizesAfter },
    write: { tokens, css: utilities.length ? `/* React Plumber type roles: one class per role, each sets the whole bundle */\n${utilities.join('\n')}\n` : '', swaps: [...swapsByFile].map(([file, edits]) => ({ file, edits })) } };
}
