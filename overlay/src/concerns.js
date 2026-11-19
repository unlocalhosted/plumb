/* ─────────────────────────────────────────────────────────
 * CONCERNS · React Plumber overlay
 *
 * What a note is about, in the reader's words (docs/briefs/concerns-and-two-views.md). Every check belongs to one
 * concern; Blueprint opens on them, each with its count, and picking one shows only its notes.
 *
 * A check is placed by its id: the drift checks (a value set by hand, off your tokens) are the design system check;
 * a pack names its concern by its prefix; craft rules are craft and polish, except the ones that are about whether
 * someone can use the page (contrast, hit targets) and the ones about how it behaves (presses, menus, timing).
 * ───────────────────────────────────────────────────────── */

// each with its toy (toys.js): the list draws it beside the name
export const ALL_TOY = 'layer';
export const CONCERNS = [
  { id: 'system', name: 'Design system check', short: 'Design system', toy: 'grid' },
  { id: 'craft', name: 'Craft and polish', short: 'Craft', toy: 'alignment' },
  { id: 'access', name: 'Accessible and correct', short: 'Accessible', toy: 'cursor' },
  { id: 'slop', name: 'Anti-slop check', short: 'Anti-slop', toy: 'shadow' },
  { id: 'words', name: 'Words and clarity', short: 'Words', toy: 'type' },
  { id: 'states', name: 'States and behaviour', short: 'States', toy: 'switch' },
];

const BY_PACK = { a11y: 'access', html: 'access', forms: 'access', security: 'access', tells: 'slop', experience: 'states', components: 'states' };
const ACCESS = new Set(['contrast', 'disabled-contrast', 'hit-target', 'input-zoom', 'text-collision', 'touch-manipulation']);
const STATES = new Set(['press-feedback', 'press-feedback-probe', 'interruptible', 'interruptible-probe', 'exit-faster', 'menu-pointerdown',
  'submenu-path', 'tooltip-delay', 'spinner-timing', 'skeleton-match', 'overdrag', 'fixed-height', 'flex-min', 'scroll-cue-seen']);

/** The concern a finding is about: one of CONCERNS' ids. */
export function concernOf(mark) {
  if (mark.family !== 'craft') return 'system';
  const [pack, name] = String(mark.rule ?? '').split('/');
  if (BY_PACK[pack]) return BY_PACK[pack];
  if (ACCESS.has(name)) return 'access';
  if (STATES.has(name)) return 'states';
  return 'craft';
}
