// What Plumber checks, read from the rule sources (overlay/src/craft-rules.js and the packs, the code checks in
// web/docs/recordings/reference/rules.json) into web/docs/recordings/checks.json for the docs page. Run after a rule
// is added or renamed: node web/scripts/checks.mjs
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RULES } from '../../overlay/src/craft-rules.js';
import { PACK_RULES } from '../../overlay/src/packs.js';
import { say, FIX } from '../../overlay/src/words.js';
import { CONCERNS, concernOf } from '../../overlay/src/concerns.js';

const at = (p) => fileURLToPath(new URL(p, import.meta.url));
// how a check is fixed, shown with the motion tile for that kind of change (overlay/src/show-motion.js MOTION_TILES)
const BY_OWN = { radius: 'Corners', gap: 'Gap', 'margin-x': 'Shared edges', 'padding-x': 'Padding', 'padding-y': 'Padding', 'padding-top': 'Padding', 'margin-top': 'Margin',
  color: 'Colour', background: 'Colour', 'background-color': 'Colour', shadow: 'Shadows', 'line-height': 'Line spacing', 'letter-spacing': 'Letter spacing',
  'font-features': 'Number columns', align: 'Baseline', 'font-weight': 'Weight', 'font-size': 'Text size', motion: 'Timing', size: 'Controls', width: 'Controls' };
const BY_ID = { 'craft/measure': 'Line length', 'craft/hit-target': 'Tap target', 'craft/disabled-contrast': 'Disabled', 'craft/contrast': 'Disabled', 'craft/shared-edges': 'Shared edges', 'craft/column-edge': 'Shared edges', 'craft/baseline-align': 'Baseline' };
const WORDS = new Set(['words', 'text', 'sentence', 'subtitle', 'punctuation', 'wording', 'title', 'heading', 'label', 'name', 'alt', 'caption', 'badge', 'dot', 'icon', 'case']);
const fixOf = (r, tile) => tile ? 'Plumber proposes the value from your theme and shows it landing on the element; take it from the fix bar or the X-ray.'
  : (r.owns ?? []).some((o) => WORDS.has(o)) ? 'Plumber says what is wrong with these words: edit them in place, or send a note to your agent.'
  : 'Plumber says what is wrong and where, in plain words; fix it in your code, or send a note to your agent with the place.';
const clean = (s) => String(s ?? '').replace(/`/g, '').replace(/NaN|undefined/g, '…').trim();

// a check whose name or reason quotes what it found, said with a typical case instead
const SAID = {
  'a11y/native-over-role': ['A div playing a button', 'A <button> does this with the keyboard and focus handling a role has to rebuild by hand.'],
  'a11y/role-in-label': ['Role said twice', 'It is read out with its role twice, as in “button, Close button”.'],
  'a11y/field-autocomplete': ['Field the browser cannot fill', 'With autocomplete set (email, name, one-time code), it is filled in for people who find typing hard.'],
  'components/link-nested-control': ['A button inside a link', null], 'components/dialog-native': ['A div playing a dialog', null], 'components/progress-native': ['A div playing a progress bar', null],
  'html/banner-many': ['More than one page header', null], 'html/eager-below-fold': ['Off-screen images loaded at once', null],
  'forms/submit-wording': ['Button says only “Submit”', null], 'forms/input-type': [null, 'type="email" brings the right keyboard on a phone and the browser’s own check.'],
  'craft/heading-lead': [null, 'A heading belongs to what it introduces: give it more space above than below.'],
  'html/list-fake': [null, 'A screen reader reads the marks as text and never says “list, 3 items”.'],
};
const page = [...RULES, ...PACK_RULES].map((r) => {
  // a check's words take what it found; for the list, neutral stand-ins (a 0, an empty list) are enough for its name and why
  const tries = [{}, new Proxy({}, { get: (t, k) => (typeof k === 'symbol' ? undefined : 0) }), new Proxy({}, { get: (t, k) => (typeof k === 'symbol' ? undefined : []) }), new Proxy({}, { get: (t, k) => (typeof k === 'symbol' ? undefined : '') })];
  let w = {}; for (const n of tries) { try { w = say(r.id, n); if (w?.what) break; } catch { /* the next stand-in */ } }
  const tile = BY_ID[r.id] ?? (r.owns ?? []).map((o) => BY_OWN[o]).find(Boolean) ?? null;
  const [name, why] = SAID[r.id] ?? [];
  return { id: r.id, concern: concernOf({ family: 'craft', rule: r.id }), name: name ?? (clean(w.what) || r.id), why: why ?? clean(w.because), where: 'page', tile, fix: fixOf(r, tile) };
});
// the code checks that judge your app, in plain names (the rest are about plumber's own setup and its record: no
// tokens to read, an entry it skipped, the ledger and accepted decisions; they belong to the CLI's reference)
const CODE_NAMES = {
  'dead/color': 'Theme tokens nothing uses', 'existence/dead-class': 'A class that makes no CSS', 'existence/dead-var': 'A variable that is never defined',
  'habits/focus-outline': 'Focus outline removed', 'habits/hover-gate': 'Hover styles that stick on touch', 'habits/logical-inline': 'Left and right instead of start and end',
  'habits/no-ease-in': 'Feedback that starts slowly (ease-in)', 'habits/overflow-clip': 'overflow-hidden that breaks sticky', 'habits/overscroll-contain': 'A scroll that leaks to the page',
  'habits/safe-area-fallback': 'Safe area with no fallback', 'habits/transition-named': 'Transition on every property', 'habits/viewport-dynamic': '100vh that jumps on phones',
  'imitation/{Component}': 'A component rebuilt by hand', 'ownership/{Component}': 'A component’s own styling overridden',
};
// where a code check's reason is written as a template, the same reason in plain words
const CODE_WHY = {
  'existence/dead-class': 'Tailwind never made CSS for it, so the style it was meant to apply is missing and nothing warns you.',
  'existence/dead-var': 'The browser drops a declaration whose variable doesn’t exist, so the value you meant never applies.',
  'imitation/{Component}': 'A copy misses the component’s states, its focus ring and every fix made to it later.',
  'ownership/{Component}': 'The component decides this itself; a style laid over it from outside breaks when the component changes.',
  'provenance/color/framework': 'Your theme has its own steps; Tailwind’s defaults sit outside them and won’t change when your theme does.',
};
// the code checks: your theme against your code (the design system concern), read without a browser
const FAMILY_TILE = { spacing: 'Padding', color: 'Colour', radius: 'Corners', type: 'Text size', motion: 'Timing', elevation: 'Shadows', z: null };
const code = JSON.parse(readFileSync(at('../docs/recordings/reference/rules.json'), 'utf8')).rules.filter((r) => r.id.startsWith('provenance/') || CODE_NAMES[r.id]).map((r) => {
  const [kind, fam] = r.id.split('/'), family = FAMILY_TILE[fam] !== undefined ? fam : r.families?.[0];
  const name = kind === 'provenance' ? (r.id === 'provenance/type' ? 'Type not in your theme' : r.id === 'provenance/arbitrary' ? 'Spacing not in your theme' : FIX.what({ family: family === 'elevation' ? 'shadow' : family, rule: r.id, props: [] })) : CODE_NAMES[r.id];
  const tile = kind === 'provenance' ? FAMILY_TILE[family] ?? null : null;
  const why = CODE_WHY[r.id] ?? clean(r.because).replace(/\{[^}]*\}/g, 'it').replace(/^site\.opaque \?.*?: /, '');
  return { id: r.id, concern: kind === 'habits' ? (/focus|hover|safe-area|viewport|logical/.test(r.id) ? 'access' : 'states') : 'system', name: clean(name), why, where: 'code', tile, fix: tile ? 'Plumber swaps the hard-coded value for your token, on the element and in your code, with one Undo.' : clean(r.fix?.replace(/\{[^}]*\}/g, '…')) || 'Plumber says where it is and what to change.' };
});
// one row per name within a concern: many code checks share a plain name across families
const seen = new Set(), checks = [...code, ...page].filter((c) => { const k = c.concern + '|' + c.name; if (seen.has(k)) return false; seen.add(k); return true; });
writeFileSync(at('../docs/recordings/checks.json'), JSON.stringify({ concerns: CONCERNS, checks }, null, 1));
console.log(`${checks.length} checks: ` + CONCERNS.map((c) => `${c.short} ${checks.filter((x) => x.concern === c.id).length}`).join(', '));
