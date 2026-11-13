/* ─────────────────────────────────────────────────────────
 * PACK LIST · React Plumber
 *
 * Every pack described as data, in the order they are listed (docs/briefs/rule-packs.md). Craft is not here: its
 * rules, words and numbers are the original tables (craft-rules.js, words.js, craft-spec.js), which this list sits
 * beside. Plain data with no imports of rules, so the spec, the words and the grounding can read it anywhere,
 * the server included.
 * ───────────────────────────────────────────────────────── */
import { A11Y } from './pack-a11y.js';
import { FORMS } from './pack-forms.js';
import { COMPONENTS } from './pack-components.js';
import { HTML } from './pack-html.js';
import { SECURITY } from './pack-security.js';

export const PACK_DATA = [A11Y, FORMS, COMPONENTS, HTML, SECURITY];
