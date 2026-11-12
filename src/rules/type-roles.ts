/**
 * Type roles (docs/research/type-roles.md, layer 2; docs/design/token-spec.md §2): the small set of text styles a
 * codebase is reaching for, named on Material 3's scheme from the code's own values, with the write that makes them the
 * system. A role is a size, line-height and tracking; weight is a separate choice (`type-title-medium font-semibold`), and
 * reading text keeps its leading with `leading-prose`.
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
  /** it is, or sits inside, something you press: a button, a tab, a menu item, a summary, or a form label */
  control?: boolean;
  /** its own words are a figure: digits with their signs, separators, a currency or percent mark and at most a two-letter unit ("142", "78%", "3.2d") */
  number?: boolean;
  /** its own words are a sentence (more than one word, ending in . ! or ?); undefined when no page has been measured */
  sentence?: boolean;
  /** elements rendered from this place on the measured page */
  elements: number;
  /** why the place cannot be swapped (an inline style, a computed className, a formula) */
  fixed?: string;
}
export type RoleName = 'display-hero' | 'display-large' | 'display-figure' | 'display-figure-small' | 'headline-large' | 'headline-medium' | 'headline-small' | 'title-large' | 'title-medium' | 'title-small' | 'body-lead' | 'body-lead-small' | 'body-large' | 'body-small' | 'body-caption' | 'label-control' | 'label-control-small' | 'label-medium' | 'label-small';
export interface RoleMember { site: TypeMember['site']; stamp?: string; tag: string; classes: string[]; current: TypeBundle; delta: { size: number | null; lineHeight: number | null; letterSpacing: number; weight: number }; /** the weight this place takes, when not its role's usual one */ weight?: WeightName; /** reading text: its role plus leading-prose */ variant?: 'prose'; confidence: 'ok' | 'low'; elements: number; fixed?: string }
export interface RoleOverride { size?: number; lineHeight?: number; letterSpacing?: number; weight?: number; compact?: { lineHeight: number } }
export interface TypeRole { name: RoleName; bundle: TypeBundle; /** the role's usual weight, and the other weights its places use (one class each) */ weightName: WeightName; weights: { name: WeightName; places: number }[]; members: RoleMember[]; places: number; elements: number; files: number; contexts: { tag: string; places: number }[]; /** where the size came from: the owner's decision, the theme's step within 1px of the mode, the members' mode, or the cluster's centre (the ladder) */ sizeFrom: 'decision' | 'theme' | 'mode' | 'centre'; /** the fluid sizes among the members, most places first */ clamps?: { text: string; places: number }[] }
export interface TypeProposal {
  rule: 'system/type-roles'; kind: 'system'; family: 'type';
  roles: TypeRole[];
  outside: { site: TypeMember['site']; why: string }[];
  low: { site: TypeMember['site']; role: RoleName; why: string }[];
  exceptions: { site: TypeMember['site']; role: RoleName; why: string }[];
  cost: { places: number; elements: number; moves: Record<'size' | 'lineHeight' | 'letterSpacing' | 'weight', Record<string, number>>; classesRemoved: number; sizesBefore: number; sizesAfter: number };
  /** the sizes up the ladder, each with the ratio to the one below (null for a fluid size) */
  ladder: { role: RoleName; size: number | null; sizeText?: string; ratio: number | null }[];
  /** reading text: places whose code sets a roomy line-height keep one shared leading (token-spec §2.4) */
  prose: { lineHeight: number; places: number; from: 'decision' | 'mode' } | null;
  /** roles folded into another because two clusters sat at one size and the centre could not separate them */
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

export const roleOrder: RoleName[] = ['display-hero', 'display-large', 'display-figure', 'display-figure-small', 'headline-large', 'headline-medium', 'headline-small', 'title-large', 'title-medium', 'title-small', 'body-lead', 'body-lead-small', 'body-large', 'body-small', 'body-caption', 'label-control', 'label-control-small', 'label-medium', 'label-small'];
/** up a ladder every size must be strictly greater than the one below. One ladder per job (docs/research/text-role-signals.md):
 * a large paragraph and a small heading are different jobs, so their sizes may cross */
export const ladders: RoleName[][] = [['display-figure-small', 'display-figure'], ['label-control-small', 'label-control'], ['label-small', 'label-medium'], ['body-caption', 'body-small', 'body-large', 'body-lead-small', 'body-lead'], ['title-small', 'title-medium', 'title-large', 'headline-small', 'headline-medium', 'headline-large', 'display-large', 'display-hero']];
export const ladderOrder: RoleName[] = ladders.flat();
/** What a place is for, where it says so itself (docs/PRINCIPLES.md: a text style names a job; the size belongs to the job).
 * A heading: HTML's h1–h6, "six levels of section headings". Reading text: a paragraph, a definition, a quotation, or
 * words that are a sentence. A figure: a number drawn large (a dashboard's "142"): Material keeps numerals with display
 * text ("short, important text or numerals"), and a figure folded into a heading style shrinks to the section titles
 * beside it. A control's label: the words on something you press; Material's label styles are for "text inside
 * components" and its buttons use one. Null when the place says nothing (a span, a div): its size stands in, as before. */
export type Job = 'heading' | 'reading' | 'figure' | 'control';
export const HERO_MIN_PX = 60;
// tags that say the text is something else (a control, a caption, code): its words being a sentence does not make it reading text
const OTHER_JOB = new Set(['button', 'label', 'summary', 'th', 'dt', 'figcaption', 'legend', 'caption', 'kbd', 'code', 'pre', 'samp']);
export function jobOf(m: Pick<TypeMember, 'tag' | 'sentence' | 'number' | 'control'>): Job | null {
  if (/^h[1-6]$/.test(m.tag)) return 'heading';
  if (m.control) return 'control';
  if (m.number && !OTHER_JOB.has(m.tag)) return 'figure';
  // a paragraph is reading text, unless a measured page shows its words are not a sentence: generated code puts any
  // text in a <p> (a stat's "142", a row's project name), and then the tag says nothing
  if (['p', 'dd', 'blockquote'].includes(m.tag)) return m.sentence === false ? null : 'reading';
  if (OTHER_JOB.has(m.tag)) return null;
  return m.sentence ? 'reading' : null;
}
export const roleClass = (name: RoleName) => `type-${name}`;
/** weight is its own axis (token-spec §2.2, from BoardUI): four named weights, a place's snapped to the nearest */
export const WEIGHTS = { regular: 400, medium: 500, semibold: 600, bold: 700 } as const;
export type WeightName = keyof typeof WEIGHTS;
/** a place at another weight than its role's takes Tailwind's own weight class beside the role (`type-title-medium font-semibold`);
 * the role reads `var(--tw-font-weight, …)`, so the weight class wins in any order */
export const weightClass = (w: WeightName) => `font-${w === 'regular' ? 'normal' : w}`;
export function weightFor(weight: number): WeightName {
  return (Object.entries(WEIGHTS) as [WeightName, number][]).reduce((a, b) => Math.abs(b[1] - weight) < Math.abs(a[1] - weight) ? b : a)[0];
}
/** reading text: a place whose code sets at least this line-height, at a size no larger than this, not caps, not code,
 * and not a heading, a control's words or a figure (crafting-ui's h2 group names took leading-prose by their 1.55 leading) */
export const PROSE_MIN_LH = 1.45, PROSE_MAX_PX = 20;
export const PROSE_CLASS = 'leading-prose', PROSE_TOKEN = '--leading-prose';
const isProse = (m: TypeMember) => !['heading', 'control', 'figure'].includes(jobOf(m) ?? '') && m.current.transform !== 'uppercase' && !['pre', 'code', 'kbd', 'samp'].includes(m.tag) && (m.current.size ?? 99) <= PROSE_MAX_PX && m.current.lineHeight !== null && m.current.lineHeight >= PROSE_MIN_LH;
export const roleToken = (name: RoleName) => `--text-${name}`;

/** the three headline steps (Material 3's 32 / 28 / 24): a 33px page title and a 22px section title are two steps, never one
 * (crafting-ui, 2026-11-12: the "Craft" h1 shrank from 33px to 22px when 22–36px was one role) */
const headline = (size: number): RoleName | null => size >= 30 ? 'headline-large' : size >= 26 ? 'headline-medium' : size >= 22 ? 'headline-small' : null;

/** Which role a member reaches for: small capitals → a label by size; then its job picks the kind (a heading is never
 * a body style, reading text never a title) and its size the step within it; with no job, by size alone. */
export function roleFor(b: TypeBundle, job: Job | null = null): RoleName {
  const size = b.size ?? 0, fluid = !!b.sizeText;
  if (b.transform === 'uppercase' && size <= 13.5) return size < 11.5 ? 'label-small' : 'label-medium';
  // the words on a control are its label, in plain case (small capitals were taken as a label above); a control drawn
  // at title size or larger (a hero's button) goes by size, like any large text
  if (job === 'control') { if (!fluid && size < 17) return size >= 13.5 ? 'label-control' : 'label-control-small'; job = null; }
  // a number at heading size is a figure; a small one (a count in a row, a cell) is ordinary text and goes by size
  // two steps, like the headlines: a 33px figure is not folded into the 22px ones (crafting-ui, 2026-11-12)
  if (job === 'figure') { if (fluid || size >= 26) return 'display-figure'; if (size >= 22) return 'display-figure-small'; job = null; }
  // body-large keeps its meaning (the 16px body: configs and the element card name it); larger reading text steps above it
  // as lead text at two sizes: the names say the job (owner, 2026-11-12: "the most semantically relevant naming")
  if (job === 'reading') return size >= 18.5 ? 'body-lead' : size >= 17 ? 'body-lead-small' : size >= 14.5 ? 'body-large' : size >= 12.5 ? 'body-small' : 'body-caption';
  if (job === 'heading') {
    if (!fluid && size >= HERO_MIN_PX) return 'display-hero';
    if (fluid || size >= 36) return 'display-large';
    return headline(size) ?? (size >= 18.5 ? 'title-large' : size >= 17 ? 'title-medium' : 'title-small');
  }
  if (fluid || size >= 36) return 'display-large';
  const h = headline(size); if (h) return h;
  // weight is its own axis (token-spec §2.2): a 17px title is one role at any weight
  if (size >= 18.5) return 'title-large';
  if (size >= 17) return 'title-medium';
  if (size >= 14.5) return 'body-large';
  // 12px and under is caption text (a timestamp, a hint under a field): its own step, or it is pulled up to the 14px
  // small body with everything else under 14.5px (bench/messy: 37 places of 12px went to 14px)
  return size >= 12.5 ? 'body-small' : 'body-caption';
}

const mode = <T>(values: T[], fallback: T): T => {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0] ?? fallback;
};
const round = (n: number, places = 3) => Math.round(n * 10 ** places) / 10 ** places;

export function proposeTypeRoles(members: TypeMember[], options: { exclude?: string[]; roles?: Record<string, RoleOverride>; themeSteps?: number[] } = {}): TypeProposal {
  const exclude = options.exclude ?? [], overrides = options.roles ?? {}, themeSteps = [...new Set(options.themeSteps ?? [])].sort((a, b) => a - b);
  const outsideOf = (m: TypeMember): string | undefined => {
    const file = m.site.file;
    for (const pattern of exclude) if (file === pattern || file.startsWith(pattern.replace(/\/?$/, '/')) || matchesGlob(file, pattern)) return `excluded by config: ${pattern}`;
    if (['text', 'tspan'].includes(m.tag)) return 'drawing text (SVG)';
    // a very large heading is the page's hero; anything else that large is a drawing or a specimen
    if (m.current.size !== null && m.current.size >= HERO_MIN_PX && jobOf(m) !== 'heading') return 'poster size';
    if (m.classes.some(c => /var\(--z/.test(c.value))) return 'runtime-scaled drawing text (var(--z))';
    return undefined;
  };
  const sorted = [...members].sort((a, b) => a.site.file.localeCompare(b.site.file) || a.site.line - b.site.line || a.site.column - b.site.column);
  const outside: TypeProposal['outside'] = [], inside: TypeMember[] = [];
  for (const m of sorted) { const why = outsideOf(m); if (why) outside.push({ site: m.site, why }); else inside.push(m); }
  // roles: the members each reaches for; bundles: the most common of the members' own values
  const byRole = new Map<RoleName, TypeMember[]>();
  for (const m of inside) { const r = roleFor(m.current, jobOf(m)); byRole.set(r, [...byRole.get(r) ?? [], m]); }
  // the size of each role: the owner's decision, else the theme's step within 1px of the mode, else the mode; then up
  // the ladder every size must grow: a role at its neighbour's size takes its cluster's centre, or folds into it
  const sizes = new Map<RoleName, { size: number | null; from: TypeRole['sizeFrom'] }>();
  const merged: TypeProposal['merged'] = [];
  // the bundle of a role is its own cluster's; members folded in from another cluster move to it, they do not shape it
  const clusters = new Map<RoleName, TypeMember[]>([...byRole].map(([name, ms]) => [name, [...ms]]));
  const centre = (ms: TypeMember[]) => { const s = ms.map(m => m.current.size).filter((n): n is number => n !== null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)]! : null; };
  // the size most places use; when none is used by more places than every other, the middle one (the upper of two), so a
  // role's large places do not shrink to its smallest (crafting-ui's 33px and 30px page titles went to 30px)
  const modeOf = (ms: TypeMember[]) => {
    const counts = new Map<number, number>();
    for (const m of ms) if (m.current.size !== null) counts.set(m.current.size, (counts.get(m.current.size) ?? 0) + 1);
    const ranked = [...counts].sort((a, b) => b[1] - a[1]);
    if (!ranked.length) return null;
    if (ranked.length === 1 || ranked[0]![1] !== ranked[1]![1]) return ranked[0]![0];
    // a tie: the members' size on one of the theme's own steps nearest the middle, else the middle itself
    const mid = centre(ms)!, onTheme = [...counts.keys()].filter(v => themeSteps.some(t => Math.abs(t - v) < 0.5));
    return onTheme.length ? onTheme.reduce((a, b) => Math.abs(b - mid) < Math.abs(a - mid) || (Math.abs(b - mid) === Math.abs(a - mid) && b > a) ? b : a) : mid;
  };
  const modes = new Set([...byRole.values()].map(modeOf));
  for (const ladder of ladders) { const placed: RoleName[] = []; for (const name of ladder) {
    const ms = byRole.get(name); if (!ms?.length) continue;
    const fluid = ms.some(m => m.current.sizeText);
    const override = overrides[name]?.size;
    const modeSize = modeOf(ms);
    // the theme's step within 1px of the mode, unless another role's cluster already sits on that step
    const step = modeSize === null ? undefined : themeSteps.find(s => Math.abs(s - modeSize) <= 1 && s !== modeSize && !modes.has(s));
    let size: number | null = fluid ? null : override ?? step ?? modeSize, from: TypeRole['sizeFrom'] = override !== undefined ? 'decision' : step !== undefined ? 'theme' : 'mode';
    const below = placed.map(n => sizes.get(n)!.size).filter((n): n is number => n !== null).at(-1);
    if (!fluid && size !== null && below !== undefined && size <= below) {
      const mid = centre(ms);
      if (mid !== null && mid > below) { size = mid; from = 'centre'; }
      else {
        // one size, two clusters: the smaller cluster folds into the role below it, and says so
        const intoName = placed.at(-1)!;
        merged.push({ from: name, into: intoName, why: `both at ${size}px and the cluster's centre (${mid}px) is no higher; folded into ${intoName}` });
        byRole.set(intoName, [...byRole.get(intoName)!, ...ms]); byRole.delete(name);
        continue;
      }
    }
    sizes.set(name, { size, from }); placed.push(name);
  } }
  const roles: TypeRole[] = [], low: TypeProposal['low'] = [], exceptions: TypeProposal['exceptions'] = [];
  const tokens: TypeProposal['write']['tokens'] = [], utilities: string[] = [], swapsByFile = new Map<string, TypeProposal['write']['swaps'][number]['edits']>();
  const moves = { size: {} as Record<string, number>, lineHeight: {} as Record<string, number>, letterSpacing: {} as Record<string, number>, weight: {} as Record<string, number> };
  const bucket = (table: Record<string, number>, v: number | null, steps: number[]) => { if (v === null) return; const a = Math.abs(v); const key = steps.find(s => a <= s + 1e-9)?.toString() ?? `>${steps.at(-1)}`; table[key] = (table[key] ?? 0) + 1; };
  let classesRemoved = 0, places = 0, elements = 0;
  // reading text keeps its leading (token-spec §2.4): one shared value, the owner's `prose` decision or the code's mode
  const proseMembers = new Set(inside.filter(isProse));
  const proseDecision = overrides['prose']?.lineHeight;
  const proseLh = proseDecision ?? (proseMembers.size ? mode([...proseMembers].map(m => Math.round(m.current.lineHeight! * 20) / 20), 1.6) : null);
  let proseUsed = 0;
  const clampMax = (text: string) => { const m = /clamp\([^,]*,[^,]*,\s*([\d.]+)(rem|px)/.exec(text); return m ? Number(m[1]) * (m[2] === 'rem' ? 16 : 1) : 0; };
  for (const name of roleOrder) {
    const ms = byRole.get(name); if (!ms?.length) continue;
    // the capital label styles; a control's label keeps the case it is written in
    const label = name === 'label-medium' || name === 'label-small', override = overrides[name] ?? {}, own = clusters.get(name) ?? ms;
    const clampCounts = new Map<string, number>();
    for (const m of own) if (m.current.sizeText) clampCounts.set(m.current.sizeText, (clampCounts.get(m.current.sizeText) ?? 0) + 1);
    // the fluid size most places use, a tie going to the larger
    const clamps = [...clampCounts].sort((a, b) => b[1] - a[1] || clampMax(b[0]) - clampMax(a[0]) || a[0].localeCompare(b[0])).map(([text, places]) => ({ text, places }));
    const fluidText = clamps[0]?.text ?? '';
    const sized = sizes.get(name) ?? { size: null, from: 'mode' as const };
    // leading comes from what the code sets at the member, its UI places first; reading text takes leading-prose
    const lh = (set: TypeMember[]) => mode(set.map(m => m.current.lineHeight).filter((s): s is number => s !== null), null as number | null);
    const ui = own.filter(m => !proseMembers.has(m));
    const lineHeight = override.lineHeight ?? lh(ui.length ? ui : own);
    // weight is its own axis: the role's usual weight is the one most places use; the others are classes of their own
    const usual: WeightName = override.weight !== undefined ? weightFor(override.weight) : mode(own.map(m => weightFor(m.current.weight)), 'regular' as WeightName);
    const bundle: TypeBundle = { size: fluidText ? null : sized.size, ...(fluidText ? { sizeText: fluidText } : {}), lineHeight, letterSpacing: override.letterSpacing ?? round(mode(own.map(m => round(m.current.letterSpacing)), 0)), weight: WEIGHTS[usual], transform: label ? 'uppercase' : 'none' };
    const roleMembers: RoleMember[] = [];
    const contexts = new Map<string, number>();
    const fileSet = new Set<string>();
    const others = new Map<WeightName, number>();
    for (const m of ms) {
      const weight = weightFor(m.current.weight), other = weight !== usual ? weight : undefined;
      const prose = proseLh !== null && proseMembers.has(m) && proseLh !== bundle.lineHeight;
      const roleLh = prose ? proseLh : bundle.lineHeight;
      const refSize = bundle.size ?? m.current.size ?? 16;
      const delta = {
        size: bundle.size !== null && m.current.size !== null ? round(bundle.size - m.current.size, 2) : null,
        lineHeight: roleLh !== null && m.current.lineHeight !== null ? round((roleLh - m.current.lineHeight) * refSize, 1) : m.current.lineHeight === null ? 0 : null,
        letterSpacing: round((bundle.letterSpacing - m.current.letterSpacing) * refSize, 2),
        weight: WEIGHTS[weight] - m.current.weight,
      };
      const confidence: RoleMember['confidence'] = (delta.size !== null && Math.abs(delta.size) > 2) || Math.abs(delta.weight) >= 200 || (delta.lineHeight !== null && Math.abs(delta.lineHeight) > 3) ? 'low' : 'ok';
      const classes = m.classes.map(c => c.text);
      roleMembers.push({ site: m.site, ...(m.stamp ? { stamp: m.stamp } : {}), tag: m.tag, classes, current: m.current, delta, ...(other ? { weight: other } : {}), ...(prose ? { variant: 'prose' as const } : {}), confidence, elements: m.elements, ...(m.fixed ? { fixed: m.fixed } : {}) });
      contexts.set(m.tag, (contexts.get(m.tag) ?? 0) + 1); fileSet.add(m.site.file);
      places++; elements += m.elements;
      bucket(moves.size, delta.size, [0, 1, 2]); bucket(moves.lineHeight, delta.lineHeight, [0, 1, 2]); bucket(moves.letterSpacing, delta.letterSpacing, [0, 0.5, 1]); bucket(moves.weight, delta.weight, [0, 100]);
      if (confidence === 'low') low.push({ site: m.site, role: name, why: `moves ${delta.size ?? 0}px in size, ${delta.lineHeight ?? 0}px in line-height, ${delta.weight} in weight` });
      if (m.fixed) { exceptions.push({ site: m.site, role: name, why: m.fixed }); continue; }
      if (!classes.length) continue;
      if (other) others.set(other, (others.get(other) ?? 0) + 1);
      if (prose) proseUsed++;
      classesRemoved += classes.length;
      const edits = swapsByFile.get(m.site.file) ?? []; swapsByFile.set(m.site.file, edits);
      edits.push({ line: m.site.line, column: m.site.column, from: classes.join(' '), to: `${roleClass(name)}${other ? ` ${weightClass(other)}` : ''}${prose ? ` ${PROSE_CLASS}` : ''}` });
    }
    const weights = [...others].sort((a, b) => WEIGHTS[a[0]] - WEIGHTS[b[0]]).map(([w, n]) => ({ name: w, places: n }));
    roles.push({ name, bundle, weightName: usual, weights, members: roleMembers, places: ms.length, elements: ms.reduce((n, m) => n + m.elements, 0), files: fileSet.size, contexts: [...contexts].sort((a, b) => b[1] - a[1]).map(([tag, n]) => ({ tag, places: n })), sizeFrom: fluidText ? 'mode' : sized.from, ...(clamps.length ? { clamps } : {}) });
    // the write: the theme pairs in the project's own shape, one class for the role at its usual weight, one per other weight
    const token = roleToken(name), sizeValue = bundle.sizeText ?? (bundle.size !== null ? `${round(bundle.size / 16, 4)}rem` : null);
    const why = `type role ${name}: ${ms.length} places`;
    if (sizeValue) tokens.push({ name: token, value: sizeValue, why });
    if (bundle.lineHeight !== null) tokens.push({ name: `${token}--line-height`, value: String(bundle.lineHeight), why });
    tokens.push({ name: `${token}--letter-spacing`, value: `${bundle.letterSpacing}em`, why });
    const body = (weight: number) => [sizeValue ? `font-size: var(${token});` : '', bundle.lineHeight !== null ? `line-height: var(--tw-leading, var(${token}--line-height));` : '', `letter-spacing: var(${token}--letter-spacing);`, `font-weight: var(--tw-font-weight, ${weight});`, label ? 'text-transform: uppercase;' : ''].filter(Boolean);
    utilities.push(`@utility ${roleClass(name)} {\n  ${body(bundle.weight).join('\n  ')}\n}`);
  }
  if (proseLh !== null && proseUsed) tokens.push({ name: PROSE_TOKEN, value: String(proseLh), why: `reading text: ${proseUsed} places keep this leading` });
  const sizesBefore = new Set(inside.map(m => m.current.sizeText ?? m.current.size)).size;
  const sizesAfter = new Set(roles.map(r => r.bundle.sizeText ?? r.bundle.size)).size;
  const ladder: TypeProposal['ladder'] = [];
  for (const name of ladderOrder) {
    const role = roles.find(r => r.name === name); if (!role) continue;
    const own = ladders.find(l => l.includes(name))!;
    const belowSize = [...ladder].reverse().find(step => step.size !== null && own.includes(step.role))?.size ?? null;
    ladder.push({ role: name, size: role.bundle.size, ...(role.bundle.sizeText ? { sizeText: role.bundle.sizeText } : {}), ratio: role.bundle.size !== null && belowSize !== null ? round(role.bundle.size / belowSize, 3) : null });
  }
  return { rule: 'system/type-roles', kind: 'system', family: 'type', roles, outside, low, exceptions,
    cost: { places, elements, moves, classesRemoved, sizesBefore, sizesAfter }, ladder, merged,
    prose: proseLh !== null && proseUsed ? { lineHeight: proseLh, places: proseUsed, from: proseDecision !== undefined ? 'decision' : 'mode' } : null,
    write: { tokens, css: utilities.length ? `/* React Plumber type roles: one class per role sets the whole bundle; another weight is the font-* class beside it; colour stays out (docs/design/token-spec.md §2) */\n${utilities.join('\n')}\n` : '', swaps: [...swapsByFile].map(([file, edits]) => ({ file, edits })) } };
}
