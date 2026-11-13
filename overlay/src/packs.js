/* ─────────────────────────────────────────────────────────
 * PACKS · React Plumber overlay
 *
 * The one list of what plumber judges on the page (docs/briefs/rule-packs.md). A pack is a kind of rule: craft, and
 * now accessibility. The engine's rules are the rules of the packs that are on; nothing else in the engine names a
 * pack. A new kind of rule is a new pack here: its data beside the others (pack-*.js) and its rules (*-rules.js).
 *
 * A pack the spec turns off is not run: its rules are entries in the spec like any other, turned off together
 * (craft-spec.js, craft.packs).
 * ───────────────────────────────────────────────────────── */
import { RULES } from './craft-rules.js';
import { A11Y } from './pack-a11y.js';
import { A11Y_RULES } from './a11y-rules.js';

export const PACKS = [
  { id: 'craft', title: 'Craft', ground: 'the craft rules (docs/craft/rules.md)', runs: 'page', rules: RULES },
  { ...A11Y, rules: A11Y_RULES },
];

// which pack a rule belongs to, by its id: craft/… and habits/… are craft's, the rest name their pack
export const packOf = (id) => { const p = String(id).split('/')[0]; return p === 'habits' ? 'craft' : p; };

// every page rule of every pack; the spec decides which run (craft.js, Craft#rules)
export const PACK_RULES = PACKS.flatMap((p) => p.rules);
