/* ─────────────────────────────────────────────────────────
 * SYSTEM REVIEW · the project page's walk from your tokens to a system
 *
 * Four steps, one job each, in this order (owner, 2026-11-14: "what it found, how to make sense of it, how to fix it,
 * help user arrive at a good system"):
 *   1 found      one line per kind of token: how many, in how many scales and files. Counts, no judgement
 *   2 sense      the pictures only: each kind's scales side by side at real size (spacing a bar as wide as its
 *                pixels, a corner as round as its radius, a text size set at its size, colours as swatches). A
 *                value two scales share is one row; a value off the shared base is marked. No advice here
 *   3 decide     a short list of decisions, from those numbers only: which scale is the one, what to do with values
 *                off the base, what the kind is called, whether a guess from a name alone is right. One choice each
 *   4 system     your system after those choices, redrawn as you choose: each kind's scale, its name, what the other
 *                scales point at, and the CSS to copy. Nothing is written to your files from here yet
 *
 * Deterministic: the same tokens and the same choices give the same system. Choices live in this tab only.
 * ───────────────────────────────────────────────────────── */
import { TOY_DEFS, toyOf } from './toys.js';
import { BUTTON_CSS, button } from './kit.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const KINDS = { spacing: ['padding', 'Spacing'], color: ['fill', 'Colour'], radius: ['corner', 'Corners'], type: ['type', 'Type'], motion: ['motion', 'Motion'],
  elevation: ['shadow', 'Shadows'], z: ['layer', 'Layers'], size: ['size', 'Sizes'], opacity: ['opacity', 'Opacity'] };
// what each kind is called in Tailwind's theme, the convention most React projects already read
const CONVENTION = { spacing: '--spacing-', radius: '--radius-', type: '--text-', color: '--color-', motion: '--duration-', elevation: '--shadow-', z: '--z-', size: '--size-' };
const LENGTHS = new Set(['spacing', 'radius', 'type']);
// the kind as a word in a sentence
const NOUN = { spacing: 'spacing', radius: 'corner', type: 'type', color: 'colour', motion: 'motion', elevation: 'shadow', z: 'layer', size: 'size', opacity: 'opacity' };
const STYLE = /^(?:(?:normal|italic|bold|\d{3})\s+)*([\d.]+)(px|rem)(?:\s*\/\s*[\d.]+(?:px|rem|em|%)?)?\s+\S/;
function pxOf(family, value) {
  const v = String(value).trim(), style = family === 'type' ? STYLE.exec(v) : null, m = style ? [null, style[1], style[2]] : /^(-?[\d.]+)(px|rem)$/.exec(v);
  return m ? Number(m[1]) * (m[2] === 'rem' ? 16 : 1) : null;
}

export const REVIEW_CSS = BUTTON_CSS + `
  .intro .eyebrow { font: var(--pl-page-meta); color: var(--pl-text-secondary); }
  .intro h1 { margin: var(--pl-space-4) 0 var(--pl-space-6); max-width: 24ch; font: var(--pl-page-display); letter-spacing: var(--pl-tracking-display); text-wrap: balance; }
  .intro h1 .n { color: var(--pl-pink); }
  .intro .lede { max-width: 60ch; margin: 0; font: var(--pl-page-body); color: var(--pl-text-secondary); }
  .review { display: grid; gap: var(--pl-page-space-2); margin-top: var(--pl-page-space-2); }
  .incode { margin-top: var(--pl-page-space-1); }
  .incode h3 { margin: 0 0 var(--pl-space-2); font: var(--pl-card-title); font-size: 17px; }
  .incode > p { max-width: 60ch; margin: 0 0 var(--pl-space-6); font: var(--pl-page-small); color: var(--pl-text-secondary); }
  @media (max-width: 720px) { .intro h1 { font: var(--pl-page-display-narrow); } }
  .step > header { display: grid; grid-template-columns: var(--pl-space-8) 1fr; gap: var(--pl-space-2) var(--pl-space-5); align-items: baseline; margin-bottom: var(--pl-space-7); }
  .step .num { display: grid; place-items: center; width: var(--pl-space-8); height: var(--pl-space-8); border-radius: 50%; background: var(--pl-text-primary); color: var(--pl-bg-surface); font: var(--pl-card-title); font-family: var(--pl-round); align-self: center; }
  .step h2 { margin: 0; font: var(--pl-page-title); letter-spacing: var(--pl-tracking-title); }
  .step header p { grid-column: 2; margin: 0; max-width: 60ch; font: var(--pl-page-small); color: var(--pl-text-secondary); }
  .step code { font: var(--pl-card-code); }
  .panel { padding: var(--pl-space-7) var(--pl-space-8); border-radius: var(--pl-radius-card); background: var(--pl-bg-inset); }

  /* 1 found */
  .found { display: grid; grid-template-columns: var(--pl-space-8) minmax(0, 8rem) repeat(3, auto) 1fr; gap: var(--pl-space-4) var(--pl-space-7); align-items: center; }
  .found .toy, .kind-hd .toy { width: var(--pl-space-8); height: var(--pl-space-8); }
  .toy svg { display: block; width: 100%; height: 100%; overflow: visible; }
  .found b { font: var(--pl-card-title); font-family: var(--pl-round); }
  .found span { font: var(--pl-card-body); color: var(--pl-text-secondary); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .found span em { font-style: normal; color: var(--pl-text-primary); font-weight: 600; }

  /* 2 sense */
  .sense { display: grid; gap: var(--pl-space-6); }
  .kind-hd { display: flex; align-items: center; gap: var(--pl-space-5); margin-bottom: var(--pl-space-6); }
  .kind-hd b { font: var(--pl-card-title); font-family: var(--pl-round); }
  .kind-hd span { font: var(--pl-card-body); color: var(--pl-text-secondary); }
  .ladder { display: grid; grid-template-columns: var(--pl-page-space-2) repeat(var(--cols), minmax(var(--pl-page-space-4), 1fr)); column-gap: var(--pl-space-6); align-items: center; overflow-x: auto; }
  .ladder > * { min-height: var(--pl-space-8); }
  .ladder .col { display: flex; align-items: end; padding-bottom: var(--pl-space-3); font: var(--pl-card-code); color: var(--pl-text-secondary); }
  .ladder .v { font: var(--pl-card-code); color: var(--pl-text-primary); font-variant-numeric: tabular-nums; display: flex; align-items: center; }
  .ladder .v.off { color: var(--pl-soft-text); font-weight: 600; }
  .ladder .rule { grid-column: 1 / -1; min-height: 0; height: var(--pl-line); background: color-mix(in oklab, var(--pl-text-primary) 5%, transparent); }
  .ladder .shared-row { grid-column: 1 / -1; min-height: 0; }
  .cell { display: flex; align-items: center; }
  .bar { height: var(--pl-space-3); border-radius: var(--pl-radius-mark); background: var(--pl-mint); }
  .arc { width: var(--pl-space-8); height: var(--pl-space-8); box-sizing: border-box; border-top: var(--pl-space-1) solid var(--pl-pink); border-left: var(--pl-space-1) solid var(--pl-pink); }
  .aa { font-family: var(--pl-sans); font-weight: 600; line-height: 1; color: var(--pl-sky); }
  .cell.shared .bar, .cell.shared .arc, .cell.shared .aa { outline: var(--pl-space-1) solid color-mix(in oklab, var(--pl-instrument) 35%, transparent); outline-offset: var(--pl-space-1); border-radius: var(--pl-radius-mark); }
  .strips { display: grid; gap: var(--pl-space-3); }
  .strip { display: grid; grid-template-columns: minmax(0, 11rem) 1fr; align-items: center; gap: var(--pl-space-6); }
  .strip code { color: var(--pl-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sws { display: flex; flex-wrap: wrap; gap: var(--pl-space-2); }
  .sw { width: var(--pl-space-7); height: var(--pl-space-7); border-radius: 50%; box-shadow: inset 0 0 0 var(--pl-line) color-mix(in oklab, var(--pl-text-primary) 14%, transparent); }
  .steps-text { font: var(--pl-card-code); color: var(--pl-text-secondary); }
  .legend { display: flex; flex-wrap: wrap; gap: var(--pl-space-6); margin: 0 0 var(--pl-space-2); font: var(--pl-card-meta); color: var(--pl-text-secondary); }
  .legend i { display: inline-block; width: var(--pl-space-5); height: var(--pl-space-5); margin-right: var(--pl-space-2); vertical-align: -2px; border-radius: var(--pl-radius-mark); }
  .more { font: var(--pl-card-meta); color: var(--pl-text-secondary); }

  /* the colour map: the palette on the left, roles by job on the right, each role pointing at what it uses */
  .cmap { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: var(--pl-space-8); }
  .cmap h4 { margin: 0; font: var(--pl-card-title); }
  .cmap .more { margin: var(--pl-space-1) 0 var(--pl-space-5); }
  .hue { display: grid; grid-template-columns: minmax(0, 7rem) 1fr; align-items: center; gap: var(--pl-space-5); padding: var(--pl-space-2) 0; }
  .hue code, .role code { font: var(--pl-card-code); color: var(--pl-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sw.unused { opacity: .28; }
  .roles details { margin-bottom: var(--pl-space-4); }
  .roles summary { cursor: pointer; font: var(--pl-card-label); text-transform: uppercase; letter-spacing: var(--pl-tracking-caps); color: var(--pl-text-secondary); padding: var(--pl-space-2) 0; }
  .roles summary span { margin-left: var(--pl-space-2); font-weight: 400; }
  .role { display: grid; grid-template-columns: var(--pl-space-7) minmax(0, 11rem) var(--pl-space-6) minmax(0, 1fr); align-items: center; gap: var(--pl-space-4); padding: var(--pl-space-2) 0; }
  .role code { color: var(--pl-text-primary); }
  .role .arrow { color: var(--pl-text-placeholder); font: var(--pl-card-meta); }
  .role .tgt { display: flex; flex-wrap: wrap; align-items: center; gap: var(--pl-space-2) var(--pl-space-4); min-width: 0; }
  .role .tgt .to { display: inline-flex; align-items: center; gap: var(--pl-space-2); min-width: 0; }
  .role .tgt .to .sw { width: var(--pl-space-5); height: var(--pl-space-5); }
  .role .tgt code { color: var(--pl-text-secondary); }
  .role .plus { color: var(--pl-text-placeholder); }
  .role.hard .raw { font: var(--pl-card-code); color: var(--pl-soft-text); font-weight: 600; }
  @media (max-width: 900px) { .cmap { grid-template-columns: 1fr; } }

  /* 3 decide */
  .tally { margin: 0 0 var(--pl-space-6); font: var(--pl-card-body); color: var(--pl-text-secondary); }
  .tally b { color: var(--pl-text-primary); }
  .decisions { display: grid; gap: var(--pl-space-5); margin: 0; padding: 0; list-style: none; counter-reset: d; }
  .decision { display: grid; gap: var(--pl-space-3); padding: var(--pl-space-6) var(--pl-space-7); border-radius: var(--pl-radius-card); background: var(--pl-bg-inset); }
  .decision[data-done] { background: color-mix(in oklab, var(--pl-mint) 10%, var(--pl-bg-inset)); }
  .decision .q { font: var(--pl-card-title); color: var(--pl-text-primary); }
  .decision .why { max-width: 64ch; font: var(--pl-card-body); color: var(--pl-text-secondary); }
  .decision .opts { display: flex; flex-wrap: wrap; gap: var(--pl-space-4); margin-top: var(--pl-space-3); }

  /* 4 system */
  .result { display: grid; gap: var(--pl-space-6); }
  .result .kind-hd code { color: var(--pl-text-primary); }
  .result .scale { display: grid; grid-template-columns: minmax(0, 10rem) var(--pl-page-space-2) 1fr; gap: var(--pl-space-2) var(--pl-space-6); align-items: center; }
  .result .scale code { color: var(--pl-text-primary); }
  .result .scale > span { display: flex; align-items: center; min-height: var(--pl-space-7); }
  .result .scale .new { color: var(--pl-soft-text); }
  .result .aliases { margin-top: var(--pl-space-5); font: var(--pl-card-body); color: var(--pl-text-secondary); }
  .result .aliases code { color: var(--pl-text-primary); }
  .copy { display: flex; align-items: center; gap: var(--pl-space-5); margin-top: var(--pl-space-6); font: var(--pl-card-meta); color: var(--pl-text-secondary); }
  @media (max-width: 720px) { .panel { padding: var(--pl-space-6); } .found { grid-template-columns: var(--pl-space-8) 1fr auto; } .found span:nth-of-type(n+2) { display: none; } .strip, .result .scale { grid-template-columns: 1fr; } }
`;

// the scales of a kind (a stem's tokens in one file), with each token's size where it has one
export function lanesOf(kind) {
  return kind.groups.filter((g) => g.pattern).map((g) => {
    const stem = g.pattern.replace(/\*$/, '');
    const tokens = g.tokens.map((t) => ({ ...t, px: pxOf(kind.family, t.value), suffix: t.name.slice(stem.length) }));
    return { name: g.pattern, stem, file: g.file, reasons: g.reasons, tokens, values: [...new Set(tokens.map((t) => t.px).filter((n) => n !== null && n > 0))].sort((a, b) => a - b) };
  });
}
const baseOf = (values) => (values.filter((v) => v % 4 === 0).length >= values.length * 0.75 ? 4 : 2);
// a guess worth a question: the name only mentions the kind (`--pl-space-*`); a Tailwind name (`--radius-*`) is not a guess
const nameOnly = (reasons) => reasons.length > 0 && reasons.every((r) => r.startsWith('its name says'));

/* Colour as two layers: the palette (tokens that hold a colour: --pink: #f24a9f) and roles (tokens that name a job and
   point at the palette: --text-primary: var(--ink)). A token is a role when its name says a job; a role that holds a raw
   colour instead of pointing at the palette is the one thing worth fixing, and a palette colour no token points at is
   worth knowing. Mixes (color-mix of palette colours) are roles built from the palette */
const JOBS = [['text', /(?:^|-)(?:text|fg|foreground|label|heading|body|muted)(?:-|$)/], ['surface', /(?:^|-)(?:bg|background|surface|paper|desk|page|canvas|card|inset|scrim|overlay|g\d)(?:-|$)/],
  ['border', /(?:^|-)(?:border|rule|line|outline|divider|ring|stroke)(?:-|$)/], ['icon', /(?:^|-)(?:icon|glyph)(?:-|$)/],
  ['action', /(?:^|-)(?:action|primary|accent|cta|button|link|focus)(?:-|$)/], ['state', /(?:^|-)(?:state|danger|error|warn|warning|success|done|info|hard-coded|minor|written)(?:-|$)/]];
const JOB_NAMES = { text: 'Text', surface: 'Surfaces', border: 'Borders', icon: 'Icons', action: 'Actions', state: 'States', other: 'Other roles' };
const refsOf = (raw) => [...String(raw).matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
const norm = (v) => String(v).trim().toLowerCase().replace(/\s+/g, ' ');
export function colourModel(kind) {
  // a name counts once (a light and a dark block define the same token twice)
  const all = [...new Map(kind.groups.flatMap((g) => g.tokens.map((t) => [t.name, { ...t, file: g.file }]))).values()];
  const bare = (name) => name.replace(/^--/, '').replace(/^[a-z]{1,3}-(?=[a-z])/, '');
  const jobOf = (name) => (JOBS.find(([, re]) => re.test(bare(name))) ?? [null])[0];
  // a token holding a colour is a role only when its name starts with a job (--text-…, --bg-…, --border-…); a hue's
  // shades (--coral-ink, --mint-on) are palette, whatever words follow the hue
  const startsWithJob = (name) => /^(?:text|bg|background|surface|border|icon|action|state|fg|foreground|outline|divider|focus)(?:-|$)/.test(bare(name));
  const palette = [], roles = [];
  for (const t of all) {
    const refs = refsOf(t.raw ?? t.value);
    if (!refs.length && !startsWithJob(t.name)) palette.push(t);
    else roles.push({ ...t, refs, job: jobOf(t.name) ?? 'other', raw: !refs.length });
  }
  const pointed = new Set(roles.flatMap((r) => r.refs));
  const unused = palette.filter((p) => !pointed.has(p.name));
  // a role holding a raw colour, and the palette colour it equals exactly (the only safe move)
  const hard = roles.filter((r) => r.raw).map((r) => ({ ...r, match: palette.find((p) => norm(p.value) === norm(r.value)) }));
  return { palette, roles, unused, hard };
}

/** The decisions a kind asks for, from its numbers only. */
export function decisionsOf(kind) {
  const [, label] = KINDS[kind.family] ?? ['', kind.family], lanes = lanesOf(kind), out = [];
  if (kind.family === 'color') {
    const { hard } = colourModel(kind), fixable = hard.filter((h) => h.match);
    if (fixable.length) out.push({ id: 'roles:color', family: 'color', q: `${fixable.length} colour ${fixable.length === 1 ? 'role holds' : 'roles hold'} a raw colour your palette already has.`,
      why: `${fixable.slice(0, 3).map((h) => `${h.name} is ${h.value}, the same as ${h.match.name}`).join('; ')}${fixable.length > 3 ? '; …' : ''}. A role that points at the palette changes when the palette does; a raw copy doesn't, and drifts.`,
      options: [['point', 'Point them at the palette'], ['leave', 'Leave them']] });
    return out;
  }
  const sized = lanes.filter((l) => l.values.length > 1);
  if (LENGTHS.has(kind.family) && sized.length > 1) {
    const shared = [];
    for (let i = 0; i < sized.length; i++) for (let j = i + 1; j < sized.length; j++) {
      const both = sized[i].values.filter((v) => sized[j].values.includes(v));
      if (both.length >= 2) shared.push(`${sized[i].name} and ${sized[j].name} both hold ${both.join(', ')}`);
    }
    if (shared.length) out.push({ id: `keep:${kind.family}`, family: kind.family, q: `${label}: which scale is the one?`,
      why: `${shared.join('; ')}. Two names for one step means two places to change it. The others will point at the one you keep.`,
      options: [...sized.map((l) => [l.name, l.name]), ['all', 'Keep them all']] });
  }
  if (kind.family === 'spacing' || kind.family === 'radius') {
    const values = [...new Set(sized.flatMap((l) => l.values))], base = baseOf(values), off = values.filter((v) => v % base !== 0);
    if (off.length && values.length > 2) out.push({ id: `base:${kind.family}`, family: kind.family, q: `${label}: ${off.join(' and ')} sit off the ${base}px steps.`,
      why: `Every other step is a multiple of ${base}. A step off the base is either a deliberate exception or a rounding that slipped in.`,
      options: [['keep', 'They are meant'], ['round', `Round to ${off.map((v) => Math.max(base, Math.round(v / base) * base)).join(' and ')}`]], base, off });
  }
  const stems = [...new Set(lanes.map((l) => l.stem))], convention = CONVENTION[kind.family];
  if (LENGTHS.has(kind.family) && convention && (stems.length > 1 || (stems[0] && stems[0] !== convention))) out.push({ id: `name:${kind.family}`, family: kind.family, q: `What should ${NOUN[kind.family]} tokens be called?`,
    why: `${stems.length > 1 ? `Today ${stems.length} names: ${stems.join(', ')}. ` : ''}One name for one kind lets anyone find every step by typing it. Tailwind's theme calls this ${convention}*, which is what most React projects already read.`,
    options: [...new Set([...stems, convention])].slice(0, 4).map((s) => [s, `${s}*`]) });
  // how steps are numbered: asked when a kind's names mix numbering (an order and a size) or a scale is being merged
  const suffixes = lanes.flatMap((l) => l.tokens.map((t) => t.suffix));
  const mixed = suffixes.some((x) => /^\d+$/.test(x)) && suffixes.some((x) => !/^\d+$/.test(x)) || sized.length > 1;
  if (LENGTHS.has(kind.family) && mixed) {
    const sizeName = kind.family === 'spacing' ? 'in 4px units: --spacing-4 is 16px' : `by pixels: ${CONVENTION[kind.family]}12 is 12px`;
    out.push({ id: `count:${kind.family}`, family: kind.family, q: `How are ${NOUN[kind.family]} steps numbered?`,
      why: `By size (${sizeName}): a name says its size, and a step added later fits between without renaming. In order (1, 2, 3): shorter, but a step added later renames every step after it.`,
      options: [['size', 'By size'], ['order', 'In order'], ['keep', 'Keep the names you have']] });
  }
  for (const l of lanes) if (nameOnly(l.reasons)) out.push({ id: `guess:${l.name}`, family: kind.family, q: `Is ${l.name} really ${NOUN[kind.family] ?? label.toLowerCase()}?`,
    why: `Plumber read it from its name alone (${l.reasons.join(', ')}); nothing in your stylesheets uses it yet to confirm it.`, options: [['yes', `Yes, it is ${NOUN[kind.family] ?? label.toLowerCase()}`], ['no', 'No, leave it out']] });
  return out;
}

function colourSystem(kind, choices) {
  if (choices['roles:color'] !== 'point') return null;
  const aliases = colourModel(kind).hard.filter((h) => h.match).map((h) => ({ from: h.name, file: h.file, to: h.match.name }));
  return aliases.length ? { kind, scales: [], aliases, renames: [], numbering: '', note: `${aliases.length} ${aliases.length === 1 ? 'role now points' : 'roles now point'} at your palette, e.g. ${aliases[0].from} → var(${aliases[0].to}).` } : null;
}

/** A kind's system after the choices: its one scale, its name, and what the other scales point at. */
export function systemOf(kind, choices) {
  if (kind.family === 'color') return colourSystem(kind, choices);
  const lanes = lanesOf(kind).filter((l) => choices[`guess:${l.name}`] !== 'no');
  if (!lanes.length) return null;
  const keepChoice = choices[`keep:${kind.family}`], biggest = [...lanes].sort((a, b) => b.tokens.length - a.tokens.length)[0];
  const kept = keepChoice === 'all' ? lanes : [lanes.find((l) => l.name === keepChoice) ?? biggest];
  const dropped = lanes.filter((l) => !kept.includes(l));
  const naming = choices[`name:${kind.family}`];
  const round = choices[`base:${kind.family}`] === 'round', base = baseOf([...new Set(lanes.flatMap((l) => l.values))]);
  const fix = (px) => (round && px !== null && px % base !== 0 ? Math.max(base, Math.round(px / base) * base) : px);
  const scales = kept.map((lane) => {
    const stem = naming && kept.length === 1 ? naming : lane.stem;
    const steps = new Map();
    for (const t of lane.tokens) { const px = fix(t.px), key = px ?? t.value; if (!steps.has(key)) steps.set(key, { name: `${stem}${t.suffix}`, value: px !== null && px !== t.px ? `${px}px` : t.value, px, from: t.name, orig: t.value, file: lane.file, added: false }); }
    // a step only a dropped scale had comes along, named by its size, marked to check
    for (const d of dropped) for (const t of d.tokens) { const px = fix(t.px); if (px !== null && !steps.has(px) && kept.length === 1) steps.set(px, { name: `${stem}${px}`, value: px !== t.px ? `${px}px` : t.value, px, from: t.name, file: lane.file, added: true }); }
    return { stem, lane, steps: [...steps.values()].sort((a, b) => (a.px ?? 0) - (b.px ?? 0)) };
  });
  // numbering: by size or in order, only under a new name for the kind (renumbering a scale in place would collide
  // with its own names); otherwise the names stay and the step says why
  const count = choices[`count:${kind.family}`];
  let numbering = '';
  if (count === 'size' || count === 'order') {
    for (const s of scales) {
      if (s.stem === s.lane.stem) { numbering = 'Numbering needs a new name for the kind first (the question above it).'; continue; }
      const unit = kind.family === 'spacing' ? base : 1;
      s.steps.forEach((st, i) => { if (st.px === null) return; const n = count === 'order' ? i + 1 : st.px / unit; st.name = `${s.stem}${String(n).replace('.', '-')}`; });
    }
  }
  const one = scales.length === 1 ? scales[0] : null;
  const aliases = one ? dropped.flatMap((d) => d.tokens.map((t) => ({ from: t.name, file: d.file, to: one.steps.find((s) => s.px !== null && s.px === fix(t.px))?.name })).filter((a) => a.to)) : [];
  const renames = scales.flatMap((s) => s.steps.filter((st) => !st.added && st.from !== st.name).map((st) => ({ from: st.from, to: st.name })));
  return { kind, scales, aliases, renames, numbering };
}

/** The system as edits to the files that define its tokens. Nothing is renamed or deleted: a token given a new name keeps
 *  its old one, pointing at the new; a dropped scale's tokens point at the kept scale; a rounded step gets its new value;
 *  a step only a dropped scale had is added after the kept scale's last step. */
export function editsOf(systems) {
  const files = new Map(), of = (file) => { if (!files.has(file)) files.set(file, { file, set: [], add: [] }); return files.get(file); };
  for (const sys of systems) {
    for (const s of sys.scales) {
      const kept = s.steps.filter((st) => !st.added), last = kept.at(-1)?.from ?? s.lane.tokens.at(-1)?.name;
      for (const st of kept) {
        if (st.from !== st.name) { of(st.file).set.push({ name: st.from, value: `var(${st.name})` }); of(st.file).add.push({ after: st.from, name: st.name, value: st.value }); }
        else if (st.value !== st.orig) of(st.file).set.push({ name: st.name, value: st.value });
      }
      for (const st of s.steps.filter((x) => x.added)) of(s.lane.file).add.push({ after: last, name: st.name, value: st.value });
    }
    for (const a of sys.aliases) of(a.file).set.push({ name: a.from, value: `var(${a.to})` });
  }
  return [...files.values()].filter((f) => f.set.length || f.add.length);
}

function cssOf(systems) {
  const lines = [];
  for (const sys of systems) {
    lines.push(`  /* ${(KINDS[sys.kind.family] ?? ['', sys.kind.family])[1]} */`);
    for (const s of sys.scales) for (const st of s.steps) lines.push(`  ${st.name}: ${st.value};`);
    for (const a of [...sys.aliases, ...sys.renames]) lines.push(`  ${a.from}: var(${a.to}); /* was its own value; now points at the scale */`);
  }
  return `:root {\n${lines.join('\n')}\n}\n`;
}

/**
 * Draws the four steps into `el` from the project page's reading (src/decisions/stems.ts readingOf) and keeps
 * steps 3 and 4 live as choices are made.
 */
export function mountReview(host, kinds, { handTyped = 0, project = '', post } = {}) {
  // its own shadow root: the page's other parts use the same short class names (.step, .panel); custom properties
  // (the tokens) still inherit through
  const el = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  if (!kinds?.length) { el.innerHTML = ''; return; }
  const choices = {};
  const all = kinds.flatMap((k) => k.groups), tokens = all.reduce((m, g) => m + g.tokens.length, 0);
  const decisions = kinds.flatMap(decisionsOf);
  const kindHd = (k, extra = '') => { const [toy, name] = KINDS[k.family] ?? ['size', k.family]; return `<div class="kind-hd"><i class="toy">${toyOf(toy)}</i><b>${name}</b>${extra}</div>`; };

  const found = `<div class="panel found">${kinds.map((k) => {
    const [toy, name] = KINDS[k.family] ?? ['size', k.family], n = k.groups.reduce((m, g) => m + g.tokens.length, 0);
    const scales = k.groups.filter((g) => g.pattern).length, files = new Set(k.groups.map((g) => g.file)).size, lone = k.groups.filter((g) => !g.pattern).reduce((m, g) => m + g.tokens.length, 0);
    return `<i class="toy">${toyOf(toy)}</i><b>${name}</b><span><em>${n}</em> ${n === 1 ? 'token' : 'tokens'}</span><span><em>${scales}</em> ${scales === 1 ? 'scale' : 'scales'}${lone ? `, ${lone} on their own` : ''}</span><span>in ${files} ${files === 1 ? 'file' : 'files'}</span><span></span>`;
  }).join('')}</div>`;

  const picture = (k) => {
    const lanes = lanesOf(k);
    if (!lanes.length) return '';
    if (LENGTHS.has(k.family)) {
      const sized = lanes.filter((l) => l.values.length > 1);
      if (!sized.length) return '';
      const rows = [...new Set(sized.flatMap((l) => l.values))].sort((a, b) => a - b);
      const base = baseOf(rows), checksBase = k.family !== 'type';
      const mark = (v) => k.family === 'radius' ? `<i class="arc" style="border-top-left-radius: ${v}px"></i>` : k.family === 'type' ? `<span class="aa" style="font-size: ${Math.min(v, 48)}px">Aa</span>` : `<i class="bar" style="width: ${Math.min(v, 160)}px"></i>`;
      return `<div class="panel">${kindHd(k)}<div class="ladder" style="--cols: ${sized.length}"><span></span>${sized.map((l) => `<span class="col">${esc(l.name)}</span>`).join('')}
        ${rows.map((v) => `<span class="rule"></span><span class="v${checksBase && v % base ? ' off' : ''}">${v}</span>${sized.map((l) => l.values.includes(v) ? `<span class="cell${sized.filter((o) => o.values.includes(v)).length > 1 ? ' shared' : ''}" title="${esc(l.name)}: ${v}px">${mark(v)}</span>` : '<span class="cell"></span>').join('')}`).join('')}</div></div>`;
    }
    if (k.family === 'color') {
      const { palette, roles, unused, hard } = colourModel(k), byName = new Map([...palette, ...roles].map((t) => [t.name, t]));
      const sw = (t, cls = '') => `<i class="sw ${cls}" style="background: ${esc(t.value)}" title="${esc(t.name)}: ${esc(t.value)}"></i>`;
      const jobs = Object.keys(JOB_NAMES).map((job) => [job, roles.filter((r) => r.job === job)]).filter(([, rs]) => rs.length);
      // each colour in one row: its hue, the name without a tone at its end (--pl-coral-ink → --pl-coral), never shorter
      // than the prefix and one word
      const hueOf = (name) => { const parts = name.split('-'), keep = name.startsWith('--pl-') ? 4 : 3; let n = parts.length; while (n > keep && /^(?:\d+|soft|ink|on|face|line|block|bg|text|accent)$/.test(parts[n - 1])) n--; return parts.slice(0, n).join('-'); };
      const hues = [...new Set(palette.map((p) => hueOf(p.name)))];
      const target = (r) => r.raw ? `<span class="raw">raw ${esc(r.value.length > 22 ? `${r.value.slice(0, 21)}…` : r.value)}</span>`
        : r.refs.map((n) => byName.has(n) ? `<span class="to">${sw(byName.get(n))}<code>${esc(n)}</code></span>` : `<code>${esc(n)}</code>`).join('<span class="plus">+</span>');
      return `<div class="panel">${kindHd(k, `<span>${palette.length} in the palette · ${roles.length} roles</span>`)}
        <div class="cmap">
          <div class="pal"><h4>Palette</h4><p class="more">Colours themselves. Faded: no role points at it.</p>
            ${hues.slice(0, 14).map((h) => `<div class="hue"><code>${esc(h)}</code><div class="sws">${palette.filter((p) => hueOf(p.name) === h).map((p) => sw(p, unused.includes(p) ? 'unused' : '')).join('')}</div></div>`).join('')}
            ${hues.length > 14 ? `<p class="more">and ${hues.length - 14} more</p>` : ''}</div>
          <div class="roles"><h4>Roles</h4><p class="more">Jobs, each pointing at the palette.${hard.length ? ` Yellow: holds a raw colour instead.` : ''}</p>
            ${jobs.map(([job, rs]) => `<details${job !== 'other' ? ' open' : ''}><summary>${JOB_NAMES[job]} <span>${rs.length}</span></summary>
              ${rs.slice(0, 12).map((r) => `<div class="role${r.raw ? ' hard' : ''}">${sw(r)}<code>${esc(r.name)}</code><span class="arrow">→</span><span class="tgt">${target(r)}</span></div>`).join('')}${rs.length > 12 ? `<p class="more">and ${rs.length - 12} more</p>` : ''}</details>`).join('')}</div>
        </div></div>`;
    }
    if (k.family === 'color') return `<div class="panel">${kindHd(k)}<div class="strips">${lanes.slice(0, 10).map((l) => `<div class="strip"><code>${esc(l.name)}</code><div class="sws">${l.tokens.slice(0, 16).map((t) => `<i class="sw" style="background: ${esc(t.value)}" title="${esc(t.name)}: ${esc(t.value)}"></i>`).join('')}</div></div>`).join('')}</div>${lanes.length > 10 ? `<p class="more">and ${lanes.length - 10} more colour scales</p>` : ''}</div>`;
    return `<div class="panel">${kindHd(k)}<div class="strips">${lanes.map((l) => `<div class="strip"><code>${esc(l.name)}</code><span class="steps-text">${l.tokens.length} ${l.tokens.length === 1 ? 'step' : 'steps'}</span></div>`).join('')}</div></div>`;
  };

  const stems = new Set(all.filter((g) => g.pattern).map((g) => g.pattern)).size;
  el.innerHTML = `<style>:host { display: block; color: var(--pl-text-primary); }${REVIEW_CSS}</style>${TOY_DEFS}
  <div class="intro"><span class="eyebrow">${esc(project || 'Your project')} · your design system</span>
    <h1>${tokens} tokens in ${stems} scales. ${decisions.length ? `<span class="n">${decisions.length}</span> ${decisions.length === 1 ? 'decision gets' : 'decisions get'} you to one system.` : 'It already reads as one system.'}</h1>
    <p class="lede">Four steps: what Plumber found, how it fits together, what to decide, and the system you land on. Nothing changes in your files until you say so.</p></div>
  <div class="review">
    <section class="step"><header><span class="num">1</span><h2>What Plumber found</h2><p>${tokens} tokens in your stylesheets, sorted by what each one is for.${handTyped ? ` And ${handTyped} ${handTyped === 1 ? 'value' : 'kinds of value'} in your code typed by hand instead of a token; the biggest are in step 3.` : ''}</p></header>${found}</section>
    <section class="step"><header><span class="num">2</span><h2>How they fit together</h2><p>Each kind's scales side by side, every step drawn at its real size. A step two scales share is ringed in blue; a step off the size the others are built on is yellow.</p></header>
      <div class="legend"><span><i style="background: var(--pl-mint)"></i>a spacing step, as wide as it is</span><span><i style="outline: var(--pl-space-1) solid color-mix(in oklab, var(--pl-instrument) 35%, transparent)"></i>held by two scales</span><span><i style="background: var(--pl-soft-text)"></i>off the base</span></div>
      <div class="sense">${kinds.map(picture).join('')}</div></section>
    <section class="step"><header><span class="num">3</span><h2>Decide</h2><p>${decisions.length ? `${decisions.length} ${decisions.length === 1 ? 'decision' : 'decisions'}, from the pictures above. Pick one answer each; your system below follows.` : 'Nothing to decide: each kind is one scale, one name, on one base.'}</p></header>
      <p class="tally" data-tally></p><ol class="decisions">${decisions.map((d) => `<li class="decision" data-id="${esc(d.id)}"><span class="q">${esc(d.q)}</span><span class="why">${esc(d.why)}</span><div class="opts">${d.options.map(([value, label]) => button(esc(label), { cls: 'sm quiet', attrs: `data-value="${esc(value)}"` })).join('')}</div></li>`).join('')}</ol>
      <div class="incode"><h3>In your code</h3><p>Values typed by hand where a token would do, biggest first. Each fix uses your tokens, the ones you settle above.</p><slot name="causes"></slot></div></section>
    <section class="step"><header><span class="num">4</span><h2>Your system</h2><p>Your tokens after these choices: one scale per kind, one name, and what the old names point at. It redraws as you choose. Write it to your files when it looks right: old names keep working, pointing at the new ones, and one Undo takes it all back.</p></header><div class="result" data-result></div></section>
  </div>`;

  const draw = () => {
    const done = decisions.filter((d) => choices[d.id] !== undefined).length;
    el.querySelector('[data-tally]').innerHTML = decisions.length ? `<b>${done} of ${decisions.length}</b> decided.${done < decisions.length ? ' Until you choose, your system keeps the biggest scale and its name.' : ''}` : '';
    const systems = kinds.map((k) => systemOf(k, choices)).filter(Boolean);
    el.querySelector('[data-result]').innerHTML = systems.filter((s) => LENGTHS.has(s.kind.family) || s.aliases.length || s.renames.length || s.note).map((sys) => {
      const k = sys.kind, one = sys.scales.length === 1 ? sys.scales[0] : null;
      if (sys.note) return `<div class="panel">${kindHd(k)}<p class="aliases">${esc(sys.note)}</p></div>`;
      return `<div class="panel">${kindHd(k, `<span>${sys.scales.map((s) => `<code>${esc(s.stem)}*</code>`).join(', ')} · ${sys.scales.reduce((m, s) => m + s.steps.length, 0)} steps</span>`)}
        ${one ? `<div class="scale">${one.steps.slice(0, 16).map((st) => `<code class="${st.added ? 'new' : ''}" title="${st.added ? `came from ${esc(st.from)}; check its name` : ''}">${esc(st.name)}</code><span class="steps-text">${esc(st.value)}</span><span>${LENGTHS.has(k.family) && st.px ? (k.family === 'radius' ? `<i class="arc" style="border-top-left-radius: ${st.px}px"></i>` : k.family === 'type' ? `<span class="aa" style="font-size: ${Math.min(st.px, 40)}px">Aa</span>` : `<i class="bar" style="width: ${Math.min(st.px, 160)}px"></i>`) : ''}</span>`).join('')}</div>`
          : `<p class="more">${sys.scales.length} scales kept as they are.</p>`}
        ${sys.numbering ? `<p class="aliases">${esc(sys.numbering)}</p>` : ''}
        ${sys.aliases.length || sys.renames.length ? `<p class="aliases">${sys.aliases.length ? `${sys.aliases.length} old ${sys.aliases.length === 1 ? 'name points' : 'names point'} at it, e.g. <code>${esc(sys.aliases[0].from)}</code> → <code>${esc(sys.aliases[0].to)}</code>. ` : ''}${sys.renames.length ? `${sys.renames.length} ${sys.renames.length === 1 ? 'token is' : 'tokens are'} renamed, e.g. <code>${esc(sys.renames[0].from)}</code> → <code>${esc(sys.renames[0].to)}</code>.` : ''}</p>` : ''}</div>`;
    }).join('') + `<div class="copy">${post ? button('Write it to your files', { attrs: 'data-write' }) : ''}${button('Copy the CSS', { cls: post ? 'sm quiet' : 'sm', attrs: 'data-copy' })}<span data-copied></span></div>`;
    const write = el.querySelector('[data-write]');
    if (write) write.onclick = async () => {
      const said = el.querySelector('[data-copied]'), edits = editsOf(systems);
      if (!edits.length) { said.textContent = 'Nothing to write: your files already say this.'; return; }
      write.setAttribute('aria-busy', 'true');
      try {
        const done = await post('/__plumb/system-apply', { files: edits, label: 'Your system' });
        const n = done.written.reduce((m, f) => m + f.set + f.added, 0);
        said.innerHTML = `Written: ${n} ${n === 1 ? 'token' : 'tokens'} in ${done.written.map((f) => `<code>${esc(f.file)}</code>`).join(', ')}. `;
        if (done.undo) {
          const undo = document.createElement('button'); undo.type = 'button'; undo.className = 'tb sm quiet'; undo.innerHTML = '<span class="top"><span class="lb">Undo</span></span>';
          undo.onclick = async () => { try { await post('/__plumb/undo', { id: done.undo.id }); said.textContent = 'Undone. Your files are back as they were.'; } catch (e) { said.textContent = `Couldn’t undo: ${e.message}`; } };
          said.append(undo);
        }
      } catch (e) { said.textContent = `Nothing was written. ${e.message}`; }
      finally { write.removeAttribute('aria-busy'); }
    };
    el.querySelector('[data-copy]').onclick = async () => {
      const said = el.querySelector('[data-copied]');
      try { await navigator.clipboard.writeText(cssOf(systems)); said.textContent = 'Copied. Paste it over your token file to try it.'; } catch { said.textContent = 'Your browser kept the clipboard closed.'; }
    };
  };
  el.querySelector('.decisions').addEventListener('click', (e) => {
    const b = e.target.closest('[data-value]'); if (!b) return;
    const item = b.closest('.decision'), id = item.dataset.id;
    choices[id] = b.dataset.value;
    item.toggleAttribute('data-done', true);
    for (const o of item.querySelectorAll('[data-value]')) o.classList.toggle('done', o === b);
    draw();
  });
  draw();
}
