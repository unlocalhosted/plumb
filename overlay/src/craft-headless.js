/* ─────────────────────────────────────────────────────────
 * CRAFT HEADLESS · React Plumber overlay
 *
 * The facts only a headless run can gather (docs/briefs/craft-hard-rules.md, layers 4–7), and the rules that read
 * them. The live overlay loads this module too: with nothing handed in, every reader answers null and every rule here
 * stays quiet, so a rule is never judged on facts it does not have.
 *
 *  HEADLESS.other(condition, facts)  a Facts-like view of the same route under `dark` | `motion` | `touch` | `held` |
 *                                    `scrolled`, keyed by source site; null when that pair was not taken
 *  HEADLESS.probe(el, gesture)       the recorded timeline of one gesture on one element; null when not probed
 *  HEADLESS.source(el)               { component, library, role, props, handlers } from the server's index; null before
 *  RUN_RULES                         rules that read the above (appended to RULES in craft-rules.js)
 * ───────────────────────────────────────────────────────── */

export const HEADLESS = {
  other: () => null,
  probe: () => null,
  source: () => null,
};

export const RUN_RULES = [];
