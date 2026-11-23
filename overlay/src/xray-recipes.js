/* THE X-RAY'S RECIPES · which of your shadows, and which motion, should this element have?
 *
 * The X-ray's adapter for the two values that are recipes rather than numbers (xray-live.js draws them, with the same
 * picker and Sync as a corner or a gap). Nothing about a shadow or a motion is worked out here: the recipe engine says what the element wears and what your theme has
 * (GET recipes), whether it can be written (POST recipes/preview), and writes it (POST recipes/apply). It is asked with
 * the chain and the hashes class-site read, so a class passed in from a usage is read, and written, there.
 *
 *   readShadow(el, lifted), readMotion(el)
 *                     → { options, start, mates } to pick from, or { name, css, why } when it can't be changed here.
 *                       `lifted(fn)` runs fn with a preview of ours lifted, so what is read is your code's value
 *   writeRecipe(group) → { id, state: 'ok' | 'failed', cls, where, why, group }; the group's `pick` says the recipe
 */
import { request, post } from './api.js';
import { classSiteOf, siteMatesOf } from './locate.js';
import { SHADOW_PICK as W, MOTION_PICK as M } from './words.js';

const CLEAR = /(?:rgba\(0, 0, 0, 0\)|transparent) 0px 0px 0px(?: 0px)?/g;
// a computed shadow without the empty layers Tailwind composes it from
const tidy = (v) => String(v ?? '').replace(CLEAR, '').replace(/^[\s,]+|[\s,]+$/g, '').replace(/,(\s*,)+/g, ',').replace(/^none$/, '');
// one line of a value with no token: its first layer's lengths
const short = (v) => v.replace(/(?:rgba?|oklch|oklab|color|hsla?)\([^)]*\)|#[0-9a-f]+/gi, '').split(',')[0].trim().split(/\s+/).slice(0, 3).join(' ').replace(/\b0px\b/g, '0');
const depth = (r) => Math.max(0, ...(r.model?.layers ?? []).map((l) => Math.abs(Number(l.y) || 0) + (Number(l.blur) || 0)));

// where its classes are written, and what the recipes are asked with besides that place
// Right after a write the dev server is still taking the file in and a read can come back empty: asked again a few
// times before it says the element can't be placed.
async function placeOfClasses(el) {
  let found;
  for (const wait of [0, 250, 500, 1000]) {
    if (wait) await new Promise((done) => setTimeout(done, wait));
    if (!el.isConnected) return { why: W.gone };
    found = await placeOnce(el);
    if (found.why !== W.unplaced) break;
  }
  return found;
}
async function placeOnce(el) {
  const site = await classSiteOf(el);
  if (!site) return { why: W.unplaced };
  if (site.refused) return { why: site.refused };
  const at = { file: site.file, line: site.line, column: site.column };
  const reading = { ...(site.chain?.length ? { chain: site.chain } : {}), ...(site.hashes ? { hashes: site.hashes } : {}) };
  const forwards = site.usage && site.prop === 'className' ? { forwards: true } : {};
  const data = await request('recipes', { ...at, ...(site.chain?.length ? { chain: JSON.stringify(site.chain) } : {}) });
  return data?.element ? { site, at, reading, forwards, data } : { why: W.unplaced };
}

// a token's value as the page draws it, in its own scheme
function drawnAs(el, values) {
  const probe = document.createElement('i');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;transition:none';
  (el.getRootNode().body ?? document.body).append(probe);
  try { return values.map((v) => { probe.style.boxShadow = v; return tidy(getComputedStyle(probe).boxShadow); }); } finally { probe.remove(); }
}

export async function readShadow(el, lifted = (fn) => fn()) {
  const { css, inline, hovered } = lifted(() => ({ css: tidy(getComputedStyle(el).boxShadow), inline: !!el.style.boxShadow, hovered: el.matches(':hover') && [...el.classList].some((c) => /hover:.*shadow/.test(c)) }));
  const locked = (why, name = css ? short(css) : W.none) => ({ why, name, css });
  if (inline) return locked(W.inline);
  const p = await placeOfClasses(el);
  if (p.why) return locked(p.why);
  const { data, site } = p, worn = data.element.shadow ?? {};
  const tokens = data.yours.filter((r) => r.kind === 'shadow' && r.token).sort((a, b) => depth(a) - depth(b));
  if (!tokens.length) return locked(W.noTokens, worn.class);
  const values = tokens.map((r) => `var(${r.token}, ${r.css.boxShadow})`), drawn = drawnAs(el, values);
  const options = tokens.map((r, i) => ({ name: r.name, v: i + 1, recipe: r.token, value: values[i], css: drawn[i] }));

  let now;
  if (worn.source === 'class') now = options.find((o) => o.recipe === worn.token);
  else if (data.idioms.tailwind) {
    // not a shadow class: a rule or a ring draws it, and a class added beside that would not be what is seen
    if (css && !hovered) return locked(W.elsewhere);
  } else if (css) now = options.find((o) => o.css === css);
  if (!now) {
    const bare = worn.source === 'class' ? !worn.value || worn.value === 'none' : !css || hovered;
    now = bare ? { name: W.none, v: 0, none: true, css: '' }
      : { name: worn.class && !worn.class.includes('[') ? worn.class : short(css) || W.shadow, hard: true, css, v: 0 };
    // your own value sits where it falls among your tokens, by how far it reaches
    const reach = (worn.model ? depth(worn) : bare ? -1 : Infinity), at = tokens.findIndex((r) => depth(r) >= reach);
    options.splice(bare ? 0 : at < 0 ? options.length : at, 0, now);
  }

  // said before the click: the one check the write itself makes, asked with a token it doesn't wear
  let mates = siteMatesOf(el, site);
  const other = options.find((o) => o.recipe && o !== now);
  if (other) {
    const plan = await post('recipes/preview', { ...p.at, recipe: other.recipe, choice: 'use', ...p.forwards, ...p.reading });
    if (!plan.ok) return locked(plan.refused ?? W.unplaced, now.name);
    // a rule in a stylesheet reaches every element of its class
    if (!data.idioms.tailwind && plan.uses?.class) mates = [...document.querySelectorAll(`.${CSS.escape(plan.uses.class)}`)].filter((x) => x !== el);
  }
  return { options, start: options.indexOf(now), mates: [el, ...mates], site: `${site.file}:${site.line}:${site.column}` };
}

// What it can do instead, grouped by when it plays: yours first, then the moves the engine knows, each written with your
// own curve where one is close. A move that needs a library the project lacks, or animates layout, isn't offered.
const PLAYS = { hover: 'pointed', press: 'pointed', focus: 'pointed', enter: 'shown' };
// What each of the engine's own moves is for (its pack's summary says so), and so where it is offered: a press on what
// can be pressed, a focus ring on what takes focus, the floating entrances on what floats over the page.
const pressable = (el) => el.matches('a[href], button, summary, label, [role="button"], [role="link"], [role="tab"], [tabindex]') || getComputedStyle(el).cursor === 'pointer';
const floating = (el) => /^(fixed|absolute|sticky)$/.test(getComputedStyle(el).position) || el.matches('[role="dialog"], [role="menu"], [role="tooltip"], [role="status"], [popover], dialog');
const FOR = { press: pressable, 'focus-ring': (el) => el.matches(':is(a[href], button, input, select, textarea, [tabindex])'), pop: floating, 'grow-from-trigger': floating, toast: floating, sheet: floating };
export async function readMotion(el) {
  const p = await placeOfClasses(el);
  const locked = (why, name = M.none) => ({ why: why === W.unplaced ? M.unplaced : why === W.gone ? M.gone : why, name });
  if (p.why) return locked(p.why);
  const { data, site } = p, worn = data.element.motion ?? {};
  const offer = (r, tag) => ({ name: r.name, recipe: r.token ?? r.id, css: r.css, group: PLAYS[r.model?.trigger], tag });
  const fit = (r, pack) => r.kind === 'motion' && !r.blocked && PLAYS[r.model?.trigger] && r.model.changes?.length && (!pack || (FOR[r.id] ?? (() => true))(el));
  const moves = [
    ...data.yours.filter(fit).map((r) => offer(r, M.yours)),
    // a move new to the project says nothing more; one written with a curve of yours says which
    ...data.packs.filter((x) => fit(x.recipe, true)).map((x) => offer(x.recipe, x.verdict.kind !== 'new' && x.nearest ? M.uses(x.nearest.name) : '')),
  ].sort((a, b) => (a.group === b.group ? 0 : a.group === 'pointed' ? -1 : 1));
  if (!moves.length) return locked(M.nothing);
  const trigger = worn.trigger ?? worn.model?.trigger, ms = worn.model?.timing?.duration;
  const now = worn.source === 'none' ? { name: M.none, none: true }
    : worn.source === 'motion-props' ? { name: M.props, now: true }
    : { name: M.now(M.triggers[trigger] ?? '', ms ? Math.round(ms) : 0), now: true };
  const options = [now, ...moves].map((x, i) => ({ ...x, v: i }));
  // said before the click: the one check the write itself makes
  const plan = await post('recipes/preview', { ...p.at, recipe: moves[0].recipe, ...p.forwards, ...p.reading });
  if (!plan.ok) return locked(plan.refused ?? M.unplaced, now.name);
  let mates = siteMatesOf(el, site);
  if (!data.idioms.tailwind && plan.uses?.class) mates = [...document.querySelectorAll(`.${CSS.escape(plan.uses.class)}`)].filter((x) => x !== el);
  return { options, start: 0, mates: [el, ...mates], site: `${site.file}:${site.line}:${site.column}` };
}

// Read again as it is written: another change in the same Sync may have just moved the file on.
export async function writeRecipe(g, { group, keep }) {
  const fail = (why) => ({ id: g.id, state: 'failed', why });
  try {
    const el = g.pick?.el?.isConnected ? g.pick.el : g.els[0];
    if (!el) return fail(W.gone);
    const p = await placeOfClasses(el);
    if (p.why) return fail(p.why);
    const where = `${p.site.file}:${p.site.at ?? p.site.line}`, id = group();
    keep({ state: 'ok', cls: g.pick.name, where, group: id });
    await post('recipes/apply', { ...p.at, hash: p.data.hash, recipe: g.pick.recipe, ...(g.pick.choice ? { choice: g.pick.choice } : {}), ...p.forwards, ...p.reading, trace: { group: id, meta: { step: g.prop === 'box-shadow' ? W.shadow : M.motion, laws: [] } } });
    return { id: g.id, state: 'ok', cls: g.pick.name, where, group: id };
  } catch (error) { return fail(error?.message ?? String(error)); }
}
