/* ─────────────────────────────────────────────────────────
 * LAWS · React Plumber overlay
 *
 * The laws of UX (lawsofux.com) are the reasons the rules exist: a rule is a measurable form of a law. This table says,
 * for every craft rule (craft-rules.js, craft-headless.js) and every hierarchy rule of tidy (hierarchy.js), which laws
 * it measures. It is the one place that link is decided; findings and tidy changes carry it (craft.js, hierarchy.js).
 *
 * An empty list is a decision too: the rule's root is typography, rendering, accessibility or motion craft, not a law
 * of UX, and naming one would stretch it. A rule missing from the table is an error waiting to be noticed:
 * lawsOf() answers null, never [], so an unmapped rule shows as unmapped.
 *
 * Laws with no rule yet (Hick, Miller, Jakob, serial position, Von Restorff) are here so the page clean-up's layers
 * can add the rules that measure them.
 * ───────────────────────────────────────────────────────── */

export const LAWS = {
  fitts: { name: 'Fitts’s law', says: 'A target is quicker to hit the bigger and nearer it is.' },
  hick: { name: 'Hick’s law', says: 'The more choices, the longer it takes to pick one.' },
  miller: { name: 'Miller’s law', says: 'People hold about seven things in mind at once.' },
  jakob: { name: 'Jakob’s law', says: 'People expect it to work like the products they already use.' },
  doherty: { name: 'Doherty threshold', says: 'People keep their flow when the interface answers within 400ms.' },
  proximity: { name: 'Law of proximity', says: 'Things near each other read as a group.' },
  similarity: { name: 'Law of similarity', says: 'Things that look alike read as the same kind of thing.' },
  'common-region': { name: 'Law of common region', says: 'Things inside one boundary read as a group.' },
  pragnanz: { name: 'Law of Prägnanz', says: 'People see the simplest form a shape can be.' },
  'von-restorff': { name: 'Von Restorff effect', says: 'The one thing that differs is the one noticed.' },
  'serial-position': { name: 'Serial position effect', says: 'People remember the first and last items best.' },
  'cognitive-load': { name: 'Cognitive load', says: 'Effort spent reading the interface is taken from the task.' },
  'aesthetic-usability': { name: 'Aesthetic-usability effect', says: 'A well-made interface is seen as easier to use.' },
};

const RULE_LAWS = {
  // craft rules (craft-rules.js)
  'craft/concentric-radius': ['pragnanz'],
  'craft/inner-outer-spacing': ['proximity', 'common-region'],
  'craft/text-opacity': [],
  'craft/half-pixel': [],
  'craft/hairline': [],
  'craft/image-outline': ['common-region'],
  'craft/layered-shadow': [],
  'craft/scale-from-zero': [],
  'craft/z-index-war': [],
  'craft/content-align': ['common-region'],
  'craft/button-padding': [],
  'craft/icon-side': [],
  'craft/measure': ['cognitive-load'],
  'craft/leading': [],
  'craft/tracking': [],
  'craft/tabular-nums': ['cognitive-load'],
  'craft/heading-widow': [],
  'craft/one-light': [],
  'craft/border-on-shadow': [],
  'craft/contrast': [],
  'craft/disabled-contrast': [],
  'craft/hit-target': ['fitts'],
  'craft/media-size': ['similarity'],
  'craft/image-fit': [],
  'craft/flex-min': [],
  'craft/image-ground': [],
  'craft/sticky-room': [],
  'craft/fixed-height': [],
  'craft/scroll-on-demand': [],
  'craft/truncate-intent': [],
  'craft/scrollbar-gutter': [],
  'craft/bold-hover': [],
  'craft/hanging-quote': [],
  'craft/caps-case': [],
  'craft/gradient-space': [],
  'craft/input-zoom': [],
  'craft/anchor-offset': [],
  'craft/middle-truncate': [],
  'craft/text-wrap-role': [],
  'craft/continuous-corners': ['aesthetic-usability'],
  'craft/optical-sizing': [],
  'craft/tinted-shadow': [],
  'craft/eased-scrim': [],
  'craft/pure-black-white': [],
  'craft/content-size': [],
  'craft/baseline-align': [],
  'craft/icon-cap': [],
  'craft/trim-leading': [],
  'craft/weight-levels': ['similarity'],
  'craft/grey-levels': ['similarity'],
  'craft/rhythm': ['similarity'],
  'craft/elevation-ladder': ['similarity'],
  'craft/heading-lead': ['proximity', 'common-region'],
  'craft/pair-spacing': ['proximity', 'similarity'],
  'craft/card-optical-padding': [],
  'craft/optical-centre': [],
  'craft/overshoot': [],
  'craft/stroke-weight': ['similarity'],
  'craft/scroll-cue': [],
  'craft/press-feedback': ['doherty'],
  'craft/exit-faster': [],
  'craft/interruptible': [],
  // headless rules (craft-headless.js)
  'craft/dark-elevation': [],
  'craft/dark-weight': [],
  'craft/skeleton-match': [],
  'craft/menu-pointerdown': ['doherty'],
  'craft/tooltip-delay': [],
  'craft/palette-motion': ['doherty'],
  'craft/submenu-path': ['fitts'],
  'craft/overdrag': [],
  'craft/touch-manipulation': ['doherty'],
  'craft/spinner-timing': ['doherty'],
  // hierarchy rules of tidy (hierarchy.js, docs/research/hierarchy.md)
  'hierarchy/T1': ['similarity'],
  'hierarchy/T3': ['similarity'],
  'hierarchy/S1': ['proximity', 'common-region'],
  'hierarchy/S2': ['similarity'],
  'hierarchy/S3': ['proximity', 'common-region'],
  'hierarchy/S4': ['proximity', 'similarity'],
  'hierarchy/S5': ['proximity'],
  'hierarchy/S6': ['proximity', 'common-region'],
  'hierarchy/L2': ['pragnanz'],
  'hierarchy/L3': [],
};

/** The laws a rule measures, as { id, name }; null for a rule the table does not know. */
export function lawsOf(rule) {
  const ids = RULE_LAWS[rule];
  return ids ? ids.map((id) => ({ id, name: LAWS[id].name })) : null;
}
