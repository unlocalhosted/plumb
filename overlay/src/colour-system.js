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

  const statusTokens = (scheme) => Object.fromEntries(Object.keys(STATUS).flatMap((n) => scheme === 'light'
    ? [[`state-${n}-base`, v(`${n}-500`)], [`state-${n}-text`, v(`${n}-700`)], [`state-${n}-background`, v(`${n}-50`)]]
    : [[`state-${n}-base`, v(`${n}-400`)], [`state-${n}-text`, v(`${n}-300`)], [`state-${n}-background`, a(`${n}-950`, 0.6)]]));

  const light = {
    'text-primary': v('neutral-950'), 'text-secondary': v('neutral-600'), 'text-tertiary': v('neutral-500'), 'text-placeholder': v('neutral-400'), 'text-disabled': v('neutral-300'), 'text-on-accent': ramp.onAccent.css, 'text-error-primary': v('danger-600'),
    'foreground-icon-primary': v('neutral-900'), 'foreground-icon-secondary': v('neutral-500'), 'foreground-icon-tertiary': v('neutral-400'),
    'background-full': v('neutral-50'), 'background-primary-default': v('neutral-0'), 'background-primary-hover': v('neutral-100'), 'background-primary-active': v('neutral-200'),
    'background-secondary-default': v('neutral-100'), 'background-secondary-hover': v('neutral-200'), 'background-tertiary-default': v('neutral-200'),
    'border-default': v('neutral-200'), 'border-strong': v('neutral-300'), 'border-focus-ring': v('accent-500'),
    'accent-default': v('accent-500'), 'accent-hover': v('accent-600'), 'accent-active': v('accent-700'), 'accent-soft': v('accent-50'),
    ...statusTokens('light'),
  };
  const dark = {
    'text-primary': v('neutral-50'), 'text-secondary': v('neutral-400'), 'text-tertiary': v('neutral-500'), 'text-placeholder': v('neutral-600'), 'text-disabled': v('neutral-700'), 'text-on-accent': ramp.onAccent.css, 'text-error-primary': v('danger-400'),
    'foreground-icon-primary': v('neutral-100'), 'foreground-icon-secondary': v('neutral-400'), 'foreground-icon-tertiary': v('neutral-500'),
    'background-full': v('neutral-950'), 'background-primary-default': v('neutral-925'), 'background-primary-hover': v('neutral-800'), 'background-primary-active': v('neutral-700'),
    'background-secondary-default': a('neutral-800', 0.6), 'background-secondary-hover': v('neutral-800'), 'background-tertiary-default': v('neutral-800'),
    'border-default': a('neutral-700', 0.7), 'border-strong': v('neutral-600'), 'border-focus-ring': v('accent-500'),
    'accent-default': v('accent-500'), 'accent-hover': v('accent-400'), 'accent-active': v('accent-600'), 'accent-soft': a('accent-950', 0.6),
    ...statusTokens('dark'),
  };
  const block = (sel, o) => `${sel} {\n${Object.entries(o).map(([k, val]) => `  --color-${k}: ${val};`).join('\n')}\n}`;
  const css = [
    '/* React Plumber colour system (docs/design/token-spec.md §3). Primitives: raw ramps, read only by the semantic tokens below. */',
    block(':root', primitives),
    '/* Semantic tokens: what components use. Light here, dark in .dark; components never carry dark: classes. */',
    block(':root', light),
    block('.dark', dark),
  ].join('\n');
  return { primitives, light, dark, css, accent: ramp };
}
