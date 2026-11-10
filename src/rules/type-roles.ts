/**
 * Type roles (docs/research/type-roles.md, layer 2): the small set of text styles a codebase is reaching for, landed
 * on plumber's type ladder × weight (docs/design/token-spec.md §2) from the code's own values, with the write that makes them the system.
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
/** a text style: a ladder step crossed with a weight, `body-medium`, `caption-1-medium-caps` (docs/design/token-spec.md §2) */
export type RoleName = string;
export interface RoleMember { site: TypeMember['site']; stamp?: string; tag: string; classes: string[]; current: TypeBundle; delta: { size: number | null; lineHeight: number | null; letterSpacing: number; weight: number }; variant?: 'compact' | 'prose'; confidence: 'ok' | 'low'; elements: number; fixed?: string }
/** the owner's decisions, keyed by a ladder step (`body`) or a style (`body-medium`); `compact` is read by config and ignored */
export interface RoleOverride { size?: number; lineHeight?: number; letterSpacing?: number; weight?: number; compact?: { lineHeight: number } }
export interface TypeRole {
  name: RoleName; step: StepName; weightName: WeightName; caps: boolean;
  bundle: TypeBundle; members: RoleMember[]; places: number; elements: number; files: number; contexts: { tag: string; places: number }[];
  /** where the size came from: plumber's ladder, the owner's decision, or a fluid size the code already writes */
  sizeFrom: 'ladder' | 'decision' | 'fluid';
  /** the fluid sizes among the members, most places first */ clamps?: { text: string; places: number }[];
}
export interface TypeProposal {
  rule: 'system/type-roles'; kind: 'system'; family: 'type';
  roles: TypeRole[];
  outside: { site: TypeMember['site']; why: string }[];
  low: { site: TypeMember['site']; role: RoleName; why: string }[];
  exceptions: { site: TypeMember['site']; role: RoleName; why: string }[];
  cost: { places: number; elements: number; moves: Record<'size' | 'lineHeight' | 'letterSpacing' | 'weight', Record<string, number>>; classesRemoved: number; sizesBefore: number; sizesAfter: number; weightsBefore: number; weightsAfter: number };
  /** the styles up the ladder, each with the ratio of its size to the next smaller size (null for a fluid size) */
  ladder: { role: RoleName; step: StepName; size: number | null; sizeText?: string; ratio: number | null }[];
  /** reading text: places whose code sets a roomy line-height keep one shared leading, written as `leading-prose` beside the style (token-spec §2.2 rule 7) */
  prose: { lineHeight: number; places: number; from: 'decision' | 'mode' } | null;
  /** styles with too few places, folded into the nearest kept style */
  merged: { from: RoleName; into: RoleName; why: string }[];
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

/**
 * Plumber's type ladder (docs/design/token-spec.md §2.1): thirteen named steps, each a size and line-height in px and
 * a tracking in em, smallest last. Sizes and leading follow BoardUI's scale; tracking on the steps BoardUI leaves
 * unstated is ours (large text tightens, small text opens).
 */
export const LADDER = [
  { step: 'large-title', label: 'Large title', size: 64, lineHeight: 80, tracking: -0.025 },
  { step: 'display-1', label: 'Display 1', size: 56, lineHeight: 72, tracking: -0.025 },
  { step: 'display-2', label: 'Display 2', size: 48, lineHeight: 64, tracking: -0.02 },
  { step: 'display-3', label: 'Display 3', size: 40, lineHeight: 54, tracking: -0.02 },
  { step: 'display-4', label: 'Display 4', size: 32, lineHeight: 44, tracking: -0.015 },
  { step: 'title-1', label: 'Title 1', size: 24, lineHeight: 34, tracking: -0.01 },
  { step: 'title-2', label: 'Title 2', size: 20, lineHeight: 26, tracking: -0.005 },
  { step: 'title-3', label: 'Title 3', size: 18, lineHeight: 24, tracking: 0 },
  { step: 'headline', label: 'Headline', size: 16, lineHeight: 22, tracking: 0 },
  { step: 'body', label: 'Body', size: 14, lineHeight: 20, tracking: 0 },
  { step: 'body-2', label: 'Body 2', size: 13, lineHeight: 18, tracking: 0 },
  { step: 'caption-1', label: 'Caption 1', size: 12, lineHeight: 16, tracking: 0.0125 },
  { step: 'caption-2', label: 'Caption 2', size: 11, lineHeight: 15, tracking: 0.018 },
] as const;
export type StepName = typeof LADDER[number]['step'];
export const WEIGHTS = { regular: 400, medium: 500, semibold: 600, bold: 700 } as const;
export type WeightName = keyof typeof WEIGHTS;
/** tracking for an uppercase label, whatever its step (token-spec §2.2 rule 4) */
export const CAPS_TRACKING = 0.08;
const POSTER = 80;
/** a style needs this many places to stand on its own; fewer join a neighbour */
export const MIN_PLACES = 3;
/** reading text: a place whose code sets at least this line-height, at a step no larger than PROSE_MAX_PX, not caps */
export const PROSE_MIN_LH = 1.45, PROSE_MAX_PX = 20;
export const PROSE_CLASS = 'leading-prose', PROSE_TOKEN = '--leading-prose';

/** the step a size reaches for: the nearest; a tie goes to the larger (more readable) step */
export function stepFor(size: number): typeof LADDER[number] {
  let best: typeof LADDER[number] = LADDER[0];
  for (const s of LADDER) if (Math.abs(s.size - size) < Math.abs(best.size - size) - 1e-9) best = s;
  return best;
}
export function weightFor(weight: number): WeightName {
  return (Object.entries(WEIGHTS) as [WeightName, number][]).reduce((a, b) => Math.abs(b[1] - weight) < Math.abs(a[1] - weight) ? b : a)[0];
}
/** the largest size a fluid clamp reaches, in px */
const clampMax = (text: string) => { const m = /clamp\([^,]*,[^,]*,\s*([\d.]+)(rem|px)/.exec(text); return m ? Number(m[1]) * (m[2] === 'rem' ? 16 : 1) : null; };
export const styleName = (step: StepName, weight: WeightName, caps: boolean) => `${step}-${weight}${caps ? '-caps' : ''}`;
export const roleClass = (name: RoleName) => `text-${name}`;
export const roleToken = (step: StepName) => `--text-${step}`;

/** Which style a member reaches for: its size snapped onto the ladder (a fluid size at the size it reaches), its weight onto the four weights, caps when the code uppercases small text. */
export function roleFor(b: TypeBundle): { step: typeof LADDER[number]; weight: WeightName; caps: boolean; name: RoleName } {
  const size = b.sizeText ? clampMax(b.sizeText) ?? b.size ?? 16 : b.size ?? 16;
  const step = stepFor(size), weight = weightFor(b.weight), caps = b.transform === 'uppercase' && size <= 13.5;
  return { step, weight, caps, name: styleName(step.step, weight, caps) };
}

const mode = <T>(values: T[], fallback: T): T => {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] ?? fallback;
};
const round = (n: number, places = 3) => Math.round(n * 10 ** places) / 10 ** places;
const stepIndex = (step: string) => LADDER.findIndex(s => s.step === step);
const weightOrder = (w: WeightName) => WEIGHTS[w];

export function proposeTypeRoles(members: TypeMember[], options: { exclude?: string[]; roles?: Record<string, RoleOverride>; themeSteps?: number[] } = {}): TypeProposal {
  const exclude = options.exclude ?? [], overrides = options.roles ?? {};
  const outsideOf = (m: TypeMember): string | undefined => {
    const file = m.site.file;
    for (const pattern of exclude) if (file === pattern || file.startsWith(pattern.replace(/\/?$/, '/')) || matchesGlob(file, pattern)) return `excluded by config: ${pattern}`;
    if (['text', 'tspan'].includes(m.tag)) return 'drawing text (SVG)';
    if (m.current.size !== null && m.current.size > POSTER) return 'poster size';
    if (m.classes.some(c => /var\(--z/.test(c.value))) return 'runtime-scaled drawing text (var(--z))';
    return undefined;
  };
  const sorted = [...members].sort((a, b) => a.site.file.localeCompare(b.site.file) || a.site.line - b.site.line || a.site.column - b.site.column);
  const outside: TypeProposal['outside'] = [], inside: TypeMember[] = [];
  for (const m of sorted) { const why = outsideOf(m); if (why) outside.push({ site: m.site, why }); else inside.push(m); }
  // styles: each member's step × weight; the bundle is the ladder's, not the members'
  const byStyle = new Map<RoleName, { pick: ReturnType<typeof roleFor>; ms: TypeMember[] }>();
  for (const m of inside) { const pick = roleFor(m.current); const at = byStyle.get(pick.name) ?? { pick, ms: [] }; at.ms.push(m); byStyle.set(pick.name, at); }
  // a project uses a subset (token-spec §2.2 rule 3): a style with fewer than MIN_PLACES places joins the nearest kept
  // style of the same caps, a weight step costing 1 and a ladder step 2; smallest first, so folds never chain upward
  const merged: TypeProposal['merged'] = [];
  const kept = () => [...byStyle.values()].filter(v => v.ms.length >= MIN_PLACES);
  for (const small of [...byStyle.values()].filter(v => v.ms.length < MIN_PLACES).sort((a, b) => a.ms.length - b.ms.length || a.pick.name.localeCompare(b.pick.name))) {
    const cost = (v: typeof small) => Math.abs(stepIndex(v.pick.step.step) - stepIndex(small.pick.step.step)) * 2 + Math.abs(weightOrder(v.pick.weight) - weightOrder(small.pick.weight)) / 100;
    const into = kept().filter(v => v.pick.caps === small.pick.caps).sort((a, b) => cost(a) - cost(b) || b.ms.length - a.ms.length)[0];
    if (!into) continue;
    into.ms.push(...small.ms); byStyle.delete(small.pick.name);
    merged.push({ from: small.pick.name, into: into.pick.name, why: `${small.ms.length} ${small.ms.length === 1 ? 'place' : 'places'}; joins the nearest kept style` });
  }
  // reading text keeps its leading: one shared value (the owner's `prose` decision, else the mode of what the code sets, to 0.05)
  const isProse = (m: TypeMember, pick: ReturnType<typeof roleFor>) => !pick.caps && pick.step.size <= PROSE_MAX_PX && m.current.lineHeight !== null && m.current.lineHeight >= PROSE_MIN_LH;
  const proseMembers = new Set<TypeMember>();
  for (const { pick, ms } of byStyle.values()) for (const m of ms) if (isProse(m, pick)) proseMembers.add(m);
  const proseDecision = overrides['prose']?.lineHeight;
  const proseLh = proseDecision ?? (proseMembers.size ? mode([...proseMembers].map(m => Math.round(m.current.lineHeight! * 20) / 20), 1.6) : null);
  const order = [...byStyle.values()].sort((a, b) => stepIndex(a.pick.step.step) - stepIndex(b.pick.step.step) || weightOrder(a.pick.weight) - weightOrder(b.pick.weight) || Number(a.pick.caps) - Number(b.pick.caps));

  const roles: TypeRole[] = [], low: TypeProposal['low'] = [], exceptions: TypeProposal['exceptions'] = [];
  const tokens: TypeProposal['write']['tokens'] = [], utilities: string[] = [], swapsByFile = new Map<string, TypeProposal['write']['swaps'][number]['edits']>();
  const stepsWritten = new Set<string>();
  const moves = { size: {} as Record<string, number>, lineHeight: {} as Record<string, number>, letterSpacing: {} as Record<string, number>, weight: {} as Record<string, number> };
  const bucket = (table: Record<string, number>, v: number | null, steps: number[]) => { if (v === null) return; const a = Math.abs(v); const key = steps.find(s => a <= s + 1e-9)?.toString() ?? `>${steps.at(-1)}`; table[key] = (table[key] ?? 0) + 1; };
  let classesRemoved = 0, places = 0, elements = 0;
  for (const { pick, ms } of order) {
    const { step, weight, caps, name } = pick;
    const override = { ...overrides[step.step], ...overrides[name] };
    const clampCounts = new Map<string, number>();
    for (const m of ms) if (m.current.sizeText) clampCounts.set(m.current.sizeText, (clampCounts.get(m.current.sizeText) ?? 0) + 1);
    const clamps = [...clampCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([text, places]) => ({ text, places }));
    // a fluid size is kept only where the code already writes one, and only when most of the style's places are fluid
    const fluidText = clamps.length && clamps.reduce((n, c) => n + c.places, 0) * 2 >= ms.length ? clamps[0]!.text : '';
    const size = override.size ?? step.size;
    const lineHeight = override.lineHeight ?? round(step.lineHeight / step.size, 4);
    const letterSpacing = override.letterSpacing ?? (caps ? CAPS_TRACKING : step.tracking);
    const bundle: TypeBundle = { size: fluidText ? null : size, ...(fluidText ? { sizeText: fluidText } : {}), lineHeight, letterSpacing, weight: override.weight ?? WEIGHTS[weight], transform: caps ? 'uppercase' : 'none' };
    const roleMembers: RoleMember[] = [];
    const contexts = new Map<string, number>();
    const fileSet = new Set<string>();
    for (const m of ms) {
      const refSize = bundle.size ?? m.current.size ?? 16;
      const prose = proseLh !== null && proseMembers.has(m), lh = prose ? proseLh : bundle.lineHeight;
      const delta = {
        size: bundle.size !== null && m.current.size !== null ? round(bundle.size - m.current.size, 2) : null,
        lineHeight: lh !== null && m.current.lineHeight !== null ? round((lh - m.current.lineHeight) * refSize, 1) : m.current.lineHeight === null ? 0 : null,
        letterSpacing: round((bundle.letterSpacing - m.current.letterSpacing) * refSize, 2),
        weight: bundle.weight - m.current.weight,
      };
      const confidence: RoleMember['confidence'] = (delta.size !== null && Math.abs(delta.size) > 2) || Math.abs(delta.weight) >= 200 || (delta.lineHeight !== null && Math.abs(delta.lineHeight) > 3) ? 'low' : 'ok';
      const classes = m.classes.map(c => c.text);
      roleMembers.push({ site: m.site, ...(m.stamp ? { stamp: m.stamp } : {}), tag: m.tag, classes, current: m.current, delta, ...(prose ? { variant: 'prose' as const } : {}), confidence, elements: m.elements, ...(m.fixed ? { fixed: m.fixed } : {}) });
      contexts.set(m.tag, (contexts.get(m.tag) ?? 0) + 1); fileSet.add(m.site.file);
      places++; elements += m.elements;
      bucket(moves.size, delta.size, [0, 1, 2]); bucket(moves.lineHeight, delta.lineHeight, [0, 1, 2]); bucket(moves.letterSpacing, delta.letterSpacing, [0, 0.5, 1]); bucket(moves.weight, delta.weight, [0, 100]);
      if (confidence === 'low') low.push({ site: m.site, role: name, why: `moves ${delta.size ?? 0}px in size, ${delta.lineHeight ?? 0}px in line-height, ${delta.weight} in weight` });
      if (m.fixed) { exceptions.push({ site: m.site, role: name, why: m.fixed }); continue; }
      if (!classes.length) continue;
      classesRemoved += classes.length;
      const edits = swapsByFile.get(m.site.file) ?? []; swapsByFile.set(m.site.file, edits);
      edits.push({ line: m.site.line, column: m.site.column, from: classes.join(' '), to: prose ? `${roleClass(name)} ${PROSE_CLASS}` : roleClass(name) });
    }
    roles.push({ name, step: step.step, weightName: weight, caps, bundle, members: roleMembers, places: ms.length, elements: ms.reduce((n, m) => n + m.elements, 0), files: fileSet.size, contexts: [...contexts].sort((a, b) => b[1] - a[1]).map(([tag, n]) => ({ tag, places: n })), sizeFrom: fluidText ? 'fluid' : override.size !== undefined ? 'decision' : 'ladder', ...(clamps.length ? { clamps } : {}) });
    // the write: the step's size, leading and tracking once (shared by its weights), then one class per style that sets the whole bundle
    const token = roleToken(step.step), why = `type step ${step.step}`;
    const sizeValue = bundle.sizeText ?? `${round(size / 16, 4)}rem`;
    if (!stepsWritten.has(step.step) || fluidText) {
      stepsWritten.add(step.step);
      if (!tokens.some(t => t.name === token)) tokens.push({ name: token, value: sizeValue, why });
      tokens.push({ name: `${token}--line-height`, value: String(lineHeight), why });
      tokens.push({ name: `${token}--letter-spacing`, value: `${step.tracking}em`, why });
    }
    const body = [
      fluidText ? `font-size: ${fluidText};` : `font-size: var(${token});`,
      `line-height: var(--tw-leading, var(${token}--line-height));`,
      caps ? `letter-spacing: ${CAPS_TRACKING}em;` : `letter-spacing: var(${token}--letter-spacing);`,
      `font-weight: ${bundle.weight};`,
      caps ? 'text-transform: uppercase;' : '',
    ].filter(Boolean);
    utilities.push(`@utility ${roleClass(name)} {\n  ${body.join('\n  ')}\n}`);
  }
  if (proseLh !== null) tokens.push({ name: PROSE_TOKEN, value: String(proseLh), why: `reading text: ${proseMembers.size} places keep this leading` });
  // dedupe tokens by name, first wins
  const seen = new Set<string>();
  const uniqueTokens = tokens.filter(t => (seen.has(t.name) ? false : (seen.add(t.name), true)));
  const sizesBefore = new Set(inside.map(m => m.current.sizeText ?? m.current.size)).size;
  const sizesAfter = new Set(roles.map(r => r.bundle.sizeText ?? r.bundle.size)).size;
  const weightsBefore = new Set(inside.map(m => m.current.weight)).size;
  const weightsAfter = new Set(roles.map(r => r.bundle.weight)).size;
  // up the ladder: smallest first, each with the ratio to the next smaller size
  const ladder: TypeProposal['ladder'] = [];
  for (const role of [...roles].reverse()) {
    const belowSize = [...ladder].reverse().find(s => s.size !== null && s.size !== role.bundle.size)?.size ?? null;
    ladder.push({ role: role.name, step: role.step, size: role.bundle.size, ...(role.bundle.sizeText ? { sizeText: role.bundle.sizeText } : {}), ratio: role.bundle.size !== null && belowSize !== null ? round(role.bundle.size / belowSize, 3) : null });
  }
  return { rule: 'system/type-roles', kind: 'system', family: 'type', roles, outside, low, exceptions,
    cost: { places, elements, moves, classesRemoved, sizesBefore, sizesAfter, weightsBefore, weightsAfter }, ladder, prose: proseLh !== null ? { lineHeight: proseLh, places: proseMembers.size, from: proseDecision !== undefined ? 'decision' : 'mode' } : null, merged,
    write: { tokens: uniqueTokens, css: utilities.length ? `/* React Plumber text styles: one class per ladder step × weight, each sets the whole bundle (docs/design/token-spec.md) */\n${utilities.join('\n')}\n` : '', swaps: [...swapsByFile].map(([file, edits]) => ({ file, edits })) } };
}
