/* ─────────────────────────────────────────────────────────
 * COLOUR SYSTEM · React Plumber overlay (docs/design/token-spec.md §3, layer 5)
 *
 * One brand colour (and, optionally, the tint of the greys) in; the whole colour system out, in three layers:
 *   primitives  raw ramps 50–950: neutral, accent, and the four status hues. Nothing but the semantic layer reads them.
 *   semantic    `--color-{category}-{role}-{state}`, each a var() of a primitive, light in `:root`, dark in `.dark`.
 *   (components use only the semantic layer; plumber proposes no component tokens by default, §6 decision 4)
 *
 * Pure: same input, same CSS. The neutral lightness curve is Tailwind's neutral ramp; the accent ramp is ramp.js's.
 * ───────────────────────────────────────────────────────── */

import { rampOf, STOPS, cssOf } from './ramp.js';

// Tailwind v4's neutral ramp lightness (OKLCH), with 925 between 900 and 950 for the deepest dark surface
const NEUTRAL_L = { 0: 1, 50: 0.985, 100: 0.97, 200: 0.922, 300: 0.87, 400: 0.708, 500: 0.556, 600: 0.439, 700: 0.371, 800: 0.269, 900: 0.205, 925: 0.175, 950: 0.145 };
// the status hues: fixed, so meaning never follows the brand (colour-system.md §9.3)
const STATUS = { success: { l: 0.6, c: 0.16, h: 150 }, warning: { l: 0.72, c: 0.16, h: 70 }, danger: { l: 0.58, c: 0.21, h: 27 }, info: { l: 0.58, c: 0.17, h: 250 } };

const v = (name) => `var(--color-${name})`;
const a = (name, alpha) => `oklch(from var(--color-${name}) l c h / ${alpha})`;

/**
 * @param {object} input
 * @param {string|object} input.accent  the brand colour (#rrggbb, [r,g,b] or { l, c, h })
 * @param {number} [input.neutralHue]   hue of the greys (default: the accent's)
 * @param {number} [input.neutralChroma] how tinted the greys are (default 0: pure grey)
 * @returns {{ primitives: Record<string,string>, light: Record<string,string>, dark: Record<string,string>, css: string, accent: object }}
 */
export function colourSystem({ accent, neutralHue, neutralChroma = 0 } = {}) {
  const ramp = rampOf(accent);
  const hue = neutralHue ?? ramp.stops[500].h;
  const primitives = {};
  for (const [s, l] of Object.entries(NEUTRAL_L)) primitives[`neutral-${s}`] = cssOf({ l, c: s === '0' ? 0 : neutralChroma * (1 - Math.abs(l - 0.6)), h: hue });
  for (const s of STOPS) primitives[`accent-${s}`] = ramp.stops[s].css;
  for (const [name, colour] of Object.entries(STATUS)) { const r = rampOf(colour); for (const s of STOPS) primitives[`${name}-${s}`] = r.stops[s].css; }

  // our roles (token-spec §3.2), with the fixed state suffixes and surface levels (§3.3)
  const statusTokens = (scheme) => Object.fromEntries(Object.keys(STATUS).flatMap((n) => scheme === 'light'
    ? [[n, v(`${n}-600`)], [`${n}-soft`, v(`${n}-50`)]]
    : [[n, v(`${n}-400`)], [`${n}-soft`, a(`${n}-950`, 0.6)]]));
  const light = {
    ground: v('neutral-50'), surface: v('neutral-0'), 'surface-hover': v('neutral-100'), 'surface-active': v('neutral-200'), 'surface-2': v('neutral-50'), sunken: v('neutral-100'),
    fg: v('neutral-950'), muted: v('neutral-600'), faint: v('neutral-500'), 'fg-disabled': v('neutral-300'), 'on-accent': ramp.onAccent.css,
    line: v('neutral-200'), 'line-strong': v('neutral-300'),
    accent: v('accent-500'), 'accent-hover': v('accent-600'), 'accent-active': v('accent-700'), 'accent-soft': v('accent-50'), 'accent-disabled': v('neutral-300'),
    ...statusTokens('light'),
  };
  const dark = {
    ground: v('neutral-950'), surface: v('neutral-925'), 'surface-hover': v('neutral-800'), 'surface-active': v('neutral-700'), 'surface-2': v('neutral-900'), sunken: a('neutral-800', 0.6),
    fg: v('neutral-50'), muted: v('neutral-400'), faint: v('neutral-500'), 'fg-disabled': v('neutral-700'), 'on-accent': ramp.onAccent.css,
    line: a('neutral-700', 0.7), 'line-strong': v('neutral-600'),
    accent: v('accent-500'), 'accent-hover': v('accent-400'), 'accent-active': v('accent-600'), 'accent-soft': a('accent-950', 0.6), 'accent-disabled': v('neutral-700'),
    ...statusTokens('dark'),
  };
  const block = (sel, o) => `${sel} {\n${Object.entries(o).map(([k, val]) => `  --color-${k}: ${val};`).join('\n')}\n}`;
  const css = [
    '/* React Plumber colour system (docs/design/token-spec.md §3). Primitives: raw ramps, read only by the semantic tokens below. */',
    block(':root', primitives),
    '/* Roles: what components use. Light here, dark in .dark; components never carry dark: classes. */',
    block(':root', light),
    block('.dark', dark),
  ].join('\n');
  return { primitives, light, dark, css, accent: ramp };
}

// ── renaming a project's colour tokens onto plumber's role names (token-spec §3, §5: only when asked) ──

// each role's name; hover and active (the press state) follow the surface they sit on. A second ink keeps the
// project's own name (crafting-ui's `draw`), so it has none here.
const NEW_NAME = {
  ground: 'ground', surface: 'surface', sunken: 'sunken', hover: 'surface-hover', pressed: 'surface-active',
  fg: 'fg', muted: 'muted', faint: 'faint', 'on-accent': 'on-accent',
  line: 'line', 'line-strong': 'line-strong',
  accent: 'accent', 'accent-hover': 'accent-hover', 'accent-active': 'accent-active', 'accent-soft': 'accent-soft',
  success: 'success', warning: 'warning', danger: 'danger', info: 'info',
};
const OWN_NAME = new Set(['ink2', 'ink2-hover', 'ink2-soft']);

/**
 * Which of a project's colour tokens takes which of plumber's role names. Each token's role (`kind`, colours.js) gives its
 * new name; a token whose role has no name here, or whose new name another token already takes (the one named most
 * plainly for the role wins: `line` over `draw-line`), keeps its own name and says why. Same tokens in, same map out.
 * @param {{ short: string, kind: string }[]} tokens  the theme's colour tokens, `short` without `--color-`
 * @returns {{ map: Record<string, string>, kept: { short: string, why: string }[] }}
 */
export function renameMap(tokens) {
  const map = {}, kept = [], taken = new Map();
  // first a token already named for its job, then the plainest (its name is the role word itself), then the shortest
  const plain = (t) => (NEW_NAME[t.kind] === t.short ? -1 : t.short === t.kind ? 0 : 1) * 100 + t.short.length;
  for (const t of [...tokens].sort((a, b) => plain(a) - plain(b) || a.short.localeCompare(b.short))) {
    const next = NEW_NAME[t.kind];
    if (!next) { kept.push({ short: t.short, why: OWN_NAME.has(t.kind) ? 'a second ink keeps its own name' : `not a UI role (${t.kind})` }); continue; }
    if (taken.has(next)) { kept.push({ short: t.short, why: `${taken.get(next)} already has that job` }); continue; }
    taken.set(next, t.short);
    if (next !== t.short) map[t.short] = next; // already named for its job: it keeps the name, and no other token takes it
  }
  return { map, kept };
}
