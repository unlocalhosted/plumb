/* ─────────────────────────────────────────────────────────
 * STYLE SYSTEMS · React Plumber overlay
 *
 * The ways a page writes its look, behind one interface, so Sync writes a change where the element's value comes from.
 * Today: utility classes on the element (Tailwind and its kin) and rules in plain stylesheets. A new system (CSS
 * modules, styled-components, vanilla-extract, a design system's props) is one more object in SYSTEMS.
 *
 *   a system  {
 *     id                          its name, said in the result ("a class", "a CSS rule")
 *     owns(el, prop)              → a claim when this system sets `prop` on `el` now, else null. `fallback` systems
 *                                   claim what nobody sets (a class can be added anywhere)
 *     write(claims, ctx)          → [{ id, state: 'ok' | 'failed', where, why, group }] for each change it was given
 *   }
 *   a change  { id, prop, value, cls, els, scope }: one property of one element, as the X-ray collected it
 *   ctx       { post, group(), keep(state) }: the server, a fresh undo group, and the note kept across a reload
 *
 * Order matters: the first system that owns a property writes it. A utility class on the element wins over any rule,
 * as it does on the page; a stylesheet rule is next; adding a class is the fallback.
 * ───────────────────────────────────────────────────────── */
import { send } from './net.js';
import { elementEdit } from './inplace.js';
import { activeVariants, swapInForce } from './variants.js';
import { classEditsOf } from './locate.js';

// ── utility classes ─────────────────────────────────────────
// the class family each property is written in (a text size is never a text colour)
const FAMILY = {
  gap: (c) => /^gap(-[xy])?-/.test(c), 'border-radius': (c) => /^rounded(-[\w[\].]+)?$/.test(c) && !/^rounded-[trblse]{1,2}(-|$)/.test(c),
  width: (c) => /^w-/.test(c), height: (c) => /^h-/.test(c), 'font-size': (c) => /^text-(xs|sm|base|lg|\d?xl|\[[\d.]+(px|rem)\])$/.test(c), flex: (c) => /^flex-(1|none|auto|initial)$/.test(c),
};
const BOX = /^(padding|margin)-/;
const BOX_CLASS = { padding: /^p[xytrbl]?-/, margin: /^-?m[xytrbl]?-/ };
const hasClassFor = (el, prop) => {
  const classes = [...el.classList];
  if (BOX.test(prop)) return classes.some((c) => BOX_CLASS[prop.split('-')[0]].test(c.split(':').pop()));
  return !!FAMILY[prop] && classes.some((c) => FAMILY[prop](c.split(':').pop()));
};

export const utilityClasses = {
  id: 'class',
  fallback: true,
  owns: (el, prop) => (hasClassFor(el, prop) ? { system: 'class' } : null),
  // every change to one element at once: two writes to one line would trip over each other
  async write(changes, ctx) {
    const out = [], el = changes[0].els[0];
    const fail = (why) => { for (const g of changes) out.push({ id: g.id, state: 'failed', why }); return out; };
    if (!el) return fail("That element isn't on the page any more, so its line can't be found.");
    try {
      const classes = [...el.classList], active = activeVariants(el);
      const box = changes.filter((g) => BOX.test(g.prop)).map((g) => ({ prop: g.prop, to: { token: g.cls.replace(/^-?[a-z]+-/, '') } }));
      const swaps = changes.filter((g) => !BOX.test(g.prop)).map((g) => swapInForce(classes, FAMILY[g.prop] ?? (() => false), g.cls, active)).filter(Boolean);
      const edit = elementEdit(classes, swaps, box, active);
      if (!edit) { for (const g of changes) out.push({ id: g.id, state: 'ok', where: 'already written that way' }); return out; }
      // the class strings that set it: evidence for the server's class system (src/styles/classes.ts), which places
      // and writes them with any rule changes as one undo
      const places = (await classEditsOf(el, edit.from, edit.to)).map((e) => ({ file: e.file, hash: e.hash, ...e.edit }));
      const group = ctx.group(), at = places[0] ? `${places[0].file}:${places[0].line}` : '';
      ctx.keep({ state: 'ok', cls: edit.to, where: at, group });
      const answer = await ctx.post('style', { changes: changes.map((g) => ({ prop: g.prop, value: g.value, evidence: { classes: places } })), trace: { group, meta: { step: 'X-ray', laws: [] } } });
      for (const [i, g] of changes.entries()) {
        const r = answer?.results?.[i] ?? {};
        out.push(r.state === 'ok' ? { id: g.id, state: 'ok', cls: edit.to, where: at, group } : { id: g.id, state: 'failed', why: r.why ?? "This change couldn't be placed." });
      }
    } catch (error) { fail(error?.message ?? String(error)); }
    return out;
  },
};

// ── rules in plain stylesheets ──────────────────────────────
// the declarations that set a property: its own name, then the shorthands that carry it. The server's table
// (src/styles/properties.ts) is read once and replaces this one; this is what the page knows before it answers.
let CARRIERS = {
  'font-size': ['font-size', 'font'], 'line-height': ['line-height', 'font'], 'font-weight': ['font-weight', 'font'],
  gap: ['gap'], 'border-radius': ['border-radius'], width: ['width'], height: ['height'],
  'padding-top': ['padding-top', 'padding-block-start', 'padding-block', 'padding'], 'padding-bottom': ['padding-bottom', 'padding-block-end', 'padding-block', 'padding'],
  'padding-left': ['padding-left', 'padding-inline-start', 'padding-inline', 'padding'], 'padding-right': ['padding-right', 'padding-inline-end', 'padding-inline', 'padding'],
};
let table = null;
/** The server's property table, read once (GET style-properties); the page's own until it answers. */
export function loadProperties(request) {
  table ??= request('style-properties', {}).then((t) => { if (t && typeof t === 'object') CARRIERS = Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.carriers])); }).catch(() => { table = null; });
  return table;
}

// ── the winner, proven by effect ────────────────────────────
// For each rule that sets the property (or a shorthand of it), the page sets a sentinel in that rule for a moment,
// reads the element's computed value and puts the rule back as it was. The rule whose change moves the value is the
// one that wins now. That one test covers specificity, source order, @layer, !important, @media and @scope, without
// computing any of them by hand (docs/briefs/css-parity.md, layer 1).
const SENTINEL = {
  color: 'rgb(1, 2, 3)', 'background-color': 'rgb(1, 2, 3)', 'border-color': 'rgb(1, 2, 3)', 'box-shadow': 'rgb(1, 2, 3) 9px 8px 7px 0px',
  'font-weight': '123', 'font-family': 'zzz-sentinel', 'text-transform': 'full-width', 'flex-direction': 'column-reverse', 'align-items': 'last baseline',
  'justify-content': 'space-evenly', 'flex-wrap': 'wrap-reverse', flex: '7 7 7px', 'object-fit': 'scale-down', 'aspect-ratio': '7 / 3', 'line-height': '987.5px',
};
const sentinelOf = (prop) => SENTINEL[prop] ?? '987.5px';
// states a rule may hold under while the pointer is on the element: said, not taken as the element's value
const STATE = /:(hover|focus|focus-visible|focus-within|active|visited|checked|target)\b/;
const GROUP = (r) => r.cssRules && !r.selectorText;
// a nested rule's full selector: & is its parent's, a bare one is a descendant
function fullSelector(r) {
  const parent = r.parentRule;
  if (!parent || !parent.selectorText) return r.selectorText;
  const up = fullSelector(parent);
  return r.selectorText.includes('&') ? r.selectorText.replace(/&/g, up) : `${up} ${r.selectorText}`;
}
function conditionsOf(r) {
  const media = [], layer = [];
  for (let p = r.parentRule; p; p = p.parentRule) {
    if (p.media && p.conditionText !== undefined) media.unshift(p.conditionText);
    else if (p.conditionText !== undefined) media.unshift(p.conditionText);
    else if (p.name !== undefined && p.constructor?.name?.includes('Layer')) layer.unshift(p.name);
  }
  return { ...(media.length ? { media: media.join(' and ') } : {}), ...(layer.length ? { layer: layer.join('.') } : {}) };
}
// every style rule of a sheet in source order, inside groups and nesting too
function* styleRules(rules) {
  for (const r of rules) {
    if (r.selectorText && r.style) { yield r; if (r.cssRules?.length) yield* styleRules(r.cssRules); }
    else if (GROUP(r)) yield* styleRules(r.cssRules);
  }
}
const setsAny = (r, carriers) => carriers.some((c) => r.style.getPropertyValue(c) !== '' || new RegExp(`(^|[;\\s])${c}\\s*:`).test(r.style.cssText));
function proves(r, el, prop, carriers, before) {
  const saved = r.style.cssText;
  const important = carriers.some((c) => r.style.getPropertyPriority(c) === 'important');
  try {
    r.style.setProperty(prop, sentinelOf(prop), important ? 'important' : '');
    return getComputedStyle(el).getPropertyValue(prop) !== before;
  } catch { return false; } finally { r.style.cssText = saved; }
}
/**
 * What the page sees for one property of one element: the declaration that wins now and where it lives, or that a
 * style attribute sets it, or that nothing of the element's own sets it (inherited or the default).
 *   { kind: 'rule', file | bundle, selectorText, nth, selector, media?, layer?, important, sharedBy, isClass }
 *   { kind: 'inline' } · { kind: 'none', inherited }
 */
export function evidenceFor(el, prop) {
  const carriers = CARRIERS[prop] ?? [prop];
  if (carriers.some((c) => el.style?.getPropertyValue(c))) return { kind: 'inline' };
  const before = getComputedStyle(el).getPropertyValue(prop);
  const candidates = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    if (!rules || sheet.ownerNode?.closest?.('plumb-overlay')) continue;
    const dev = sheet.ownerNode?.dataset?.viteDevId;
    const file = dev && /\.(css|scss|sass)$/.test(dev) && !/node_modules/.test(dev) ? dev : null;
    const bundle = !file && sheet.href && new URL(sheet.href).origin === location.origin ? sheet.href : null;
    const seen = new Map();
    for (const r of styleRules(rules)) {
      const nth = seen.get(r.selectorText) ?? 0; seen.set(r.selectorText, nth + 1);
      if (!setsAny(r, carriers)) continue;
      const selector = fullSelector(r);
      let part = null;
      for (const x of selector.split(',').map((y) => y.trim())) { let hit = false; try { hit = el.matches(x); } catch { /* not a selector the browser matches */ } if (hit) { part = x; break; } }
      if (!part || STATE.test(part)) continue;
      candidates.push({ r, file, bundle, nth, selector: part, sheet });
    }
  }
  // the last candidate is the likeliest winner: proving from the end finds it first
  for (const c of candidates.reverse()) {
    if (!proves(c.r, c.el ?? el, prop, carriers, before)) continue;
    const cls = c.selector.match(/^\.((?:\\.|[\w-])+)$/)?.[1]?.replace(/\\(.)/g, '$1');
    let sharedBy = 0; try { sharedBy = document.querySelectorAll(c.selector).length; } catch { /* counted as unknown */ }
    return { kind: 'rule', ...(c.file ? { file: c.file } : {}), ...(c.bundle ? { bundle: c.bundle } : {}), selectorText: c.r.selectorText, nth: c.nth, selector: c.selector,
      ...conditionsOf(c.r), important: carriers.some((x) => c.r.style.getPropertyPriority(x) === 'important'), sharedBy, isClass: !!cls && el.classList.contains(cls) };
  }
  const parent = el.parentElement;
  const inheritable = /^(color|font-|line-height|letter-spacing|text-transform|text-align|word-spacing|white-space|visibility|cursor)/.test(prop);
  return { kind: 'none', inherited: inheritable && !!parent && getComputedStyle(parent).getPropertyValue(prop) === before };
}
/** The winning rule of el's prop in a file of yours, for the rule system; null when a utility class, a style attribute
 * or nothing of the element's own wins. */
// the file's hash for a place, as the card read it (POST style-place): sent back with the write so a file that changed
// since is refused, never written over
const readAt = new WeakMap();
export function placeRead(el, prop, place) { if (!readAt.has(el)) readAt.set(el, new Map()); readAt.get(el).set(prop, place); }
const hashRead = (el, prop) => readAt.get(el)?.get(prop)?.hash;
export function winningRule(el, prop) {
  const e = evidenceFor(el, prop);
  if (e.kind !== 'rule' || e.isClass && hasClassFor(el, prop)) return null;
  return e.file || e.bundle ? e : null;
}
// A bundled sheet's rule, traced to the file it was written in: the nth rule with that selector in the served text
// (rules in groups and nesting counted too), then the source map section, or mapping, that covers its line.
const bundles = new Map();
const VLQ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function sourceAtLine(map, line) {
  const lines = map.mappings.split(';');
  let src = 0;
  for (let i = 0; i <= line && i < lines.length; i++) {
    for (const seg of lines[i].split(',')) {
      if (!seg) continue;
      const vals = []; let v = 0, shift = 0;
      for (const ch of seg) { const d = VLQ.indexOf(ch); v += (d & 31) << shift; if (d & 32) shift += 5; else { vals.push(v & 1 ? -(v >> 1) : v >> 1); v = 0; shift = 0; } }
      if (vals.length >= 4) src += vals[1];
      if (i === line) return map.sources[src] ?? null;
    }
  }
  return null;
}
export async function fileOfBundled({ bundle, selectorText, nth }) {
  if (!bundles.has(bundle)) bundles.set(bundle, (async () => {
    const text = await (await send(bundle, { cache: 'no-store' })).text();
    const ref = [...text.matchAll(/\/\*#\s*sourceMappingURL=([^\s*]+)/g)].at(-1)?.[1];
    const map = ref ? await (await send(new URL(ref, bundle), { cache: 'no-store' })).json() : null;
    return { text, map };
  })());
  const { text, map } = await bundles.get(bundle);
  bundles.delete(bundle); // read again next time: a write changes the bundle
  if (!map) return null;
  const esc = selectorText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/,\s*/g, ',\\s*');
  const at = [...text.matchAll(new RegExp(`(?:^|\\n)[ \\t]*${esc}\\s*\\{`, 'g'))][nth];
  if (!at) return null;
  const line = text.slice(0, at.index + (at[0].startsWith('\n') ? 1 : 0)).split('\n').length - 1;
  let source = null;
  if (map.sections) {
    const section = map.sections.filter((x) => x.offset.line <= line).at(-1);
    const inner = section?.map;
    source = inner?.sources?.length === 1 ? inner.sources[0] : inner ? sourceAtLine(inner, line - section.offset.line) : null;
  } else source = map.sources?.length === 1 ? map.sources[0] : map.mappings ? sourceAtLine(map, line) : null;
  if (!source) return null;
  // Turbopack names a source by its root (`turbopack:///[project]/app/page.scss`): `[project]/…` is passed on, and the
  // server finds it from its own root
  const path = decodeURI(String(source).replace(/^(?:turbopack:\/\/\/)+/, '').replace(/^file:\/\//, '').replace(/^webpack:\/\/[^/]*\//, ''));
  return /node_modules/.test(path) || !/\.(css|scss|sass)$/.test(path) ? null : path;
}
// the value a rule is given: your token's variable when the page has it, else the value itself
const VAR = { 'font-size': (t) => [`--text-${t}`], 'line-height': (t) => [`--leading-${t}`], gap: (t) => [`--spacing-${t}`], 'border-radius': (t) => [`--radius-${t}`],
  width: (t) => [`--spacing-${t}`, `--container-${t}`], height: (t) => [`--spacing-${t}`] };
// your token's variable for a change, when the page has it: the server's rule system spells it (`var(--x)`)
function tokenOf(change) {
  const token = change.cls?.match(/^-?[a-z]+(?:-[xytrbl])?-(?!\[)(.+)$/)?.[1];
  const names = token ? (VAR[change.prop] ?? (BOX.test(change.prop) ? (t) => [`--spacing-${t}`] : () => []))(token) : [];
  const root = getComputedStyle(document.documentElement);
  return names.find((n) => root.getPropertyValue(n).trim()) ?? null;
}

// Your own token for a value: a custom property on the root whose value is exactly it, named for its kind (space,
// radius, text, weight…). Read from the page, so a project's own names count, not Tailwind's alone.
const KINDS = { spacing: /space|spacing|gap|gutter|pad|inset|s-?\d/i, radius: /radius|round|corner|r-/i, type: /text|font|size|fs|t-/i, weight: /weight|fw/i, color: /color|ink|bg|fg|line|accent|on/i };
const KIND_OF = (prop) => /radius/.test(prop) ? 'radius' : /font-size|line-height/.test(prop) ? 'type' : /font-weight/.test(prop) ? 'weight' : /color/.test(prop) ? 'color' : 'spacing';
export function ownToken(prop, value) {
  const root = document.documentElement, cs = getComputedStyle(root), kind = KINDS[KIND_OF(prop)];
  let best = null;
  for (const name of cs) {
    if (!name.startsWith('--') || !kind.test(name) || cs.getPropertyValue(name).trim() !== String(value).trim()) continue;
    if (!best || name.length < best.length) best = name;
  }
  return best;
}
/**
 * One change made on the page (a property of an element and the value it should be), as style changes when a rule of
 * yours owns every property it touches: [{ prop, value, token?, evidence }]. Null when a class owns any of them, or
 * nothing does: the caller writes it the class way.
 */
export async function ruleChanges(el, props, value, request) {
  await loadProperties(request);
  const routed = route(props.map((prop, id) => ({ id, prop, value, els: [el] })));
  if (!routed.size || [...routed.keys()].some((sys) => sys.id !== 'rule')) return null;
  const out = [];
  for (const g of [...routed.values()].flat()) {
    const file = g.claim.file ?? await fileOfBundled(g.claim).catch(() => null);
    if (!file) return null;
    const token = ownToken(g.prop, value), hash = hashRead(el, g.prop);
    out.push({ prop: g.prop, value, ...(token ? { token } : {}), evidence: { file, selector: g.claim.selector, ...(g.claim.media ? { media: g.claim.media } : {}), ...(hash ? { hash } : {}) } });
  }
  return out;
}

// The page's half of the rule system: evidence only (which rule wins, and its file). Where the value is written, and
// how, is decided on the server by the project's style systems (src/styles, POST style), as one undo.
export const cssRules = {
  id: 'rule',
  owns: (el, prop) => { const r = winningRule(el, prop); return r ? { system: 'rule', ...r } : null; },
  async write(changes, ctx) {
    const out = [], sent = [];
    for (const g of changes) {
      let claim = g.claim;
      try {
        // a rule in a bundle: its file comes from the bundle's source map
        if (!claim.file && claim.bundle) { const file = await fileOfBundled(claim); if (!file) throw new Error(`${claim.selector} comes from a stylesheet Plumber can't trace to a file of yours.`); claim = { ...claim, file }; }
        const token = tokenOf(g) ?? ownToken(g.prop, g.value);
        sent.push({ g, change: { prop: g.prop, value: g.value, ...(token ? { token } : {}), evidence: { file: claim.file, selector: claim.selector, carriers: CARRIERS[g.prop], ...(claim.media ? { media: claim.media } : {}), ...(claim.layer ? { layer: claim.layer } : {}), ...(hashRead(g.els[0], g.prop) ? { hash: hashRead(g.els[0], g.prop) } : {}) } } });
      } catch (error) { out.push({ id: g.id, state: 'failed', why: error?.message ?? String(error) }); }
    }
    if (!sent.length) return out;
    const group = ctx.group();
    ctx.keep({ state: 'ok', cls: sent.map((x) => `${x.change.evidence.selector} { ${x.g.prop}: ${x.change.token ? `var(${x.change.token})` : x.g.value} }`).join(', '), where: '', group });
    try {
      const answer = await ctx.post('style', { changes: sent.map((x) => x.change), trace: { group, meta: { step: 'X-ray', laws: [] } } });
      for (const [i, x] of sent.entries()) {
        const r = answer?.results?.[i] ?? {};
        // a Sass variable is said as its own line (`$gap: 20px`); a rule as the rule with the property
        const name = r.said?.split(' in ')[0] ?? x.change.evidence.selector;
        if (r.state === 'ok') out.push({ id: x.g.id, state: 'ok', cls: name.startsWith('$') ? `${name}: ${r.to}` : `${name} { ${x.g.prop}: ${r.to} }`, where: r.said ?? '', group });
        else out.push({ id: x.g.id, state: 'failed', why: r.why ?? "This change couldn't be placed." });
      }
    } catch (error) { for (const x of sent) out.push({ id: x.g.id, state: 'failed', why: error?.message ?? String(error) }); }
    return out;
  },
};

// the order the systems are asked in: the first that owns a property writes it
export const SYSTEMS = [utilityClasses, cssRules];

// A Sync arrives with its preview still on the element (an inline value over `befores`, what was there). Where a value
// comes from is read without it, or every Sync would find that preview and take it for a style attribute of yours.
// Transitions are held meanwhile: mid-transition the page still computes the preview's value.
function asWritten(changes, read) {
  const held = changes.filter((g) => g.els[0] && g.befores?.length).map((g) => ({ el: g.els[0], prop: g.prop, before: g.befores[0] }));
  const saved = new Map();
  for (const { el } of held) if (!saved.has(el)) saved.set(el, el.getAttribute('style'));
  for (const el of saved.keys()) el.style.setProperty('transition', 'none', 'important');
  for (const { el, prop, before } of held) el.style.setProperty(prop, before); // an empty before removes it
  try { return read(); } finally {
    for (const [el, style] of saved) if (style === null) el.removeAttribute('style'); else el.setAttribute('style', style);
  }
}

/**
 * Which system writes each change, from what the page proves (evidenceFor): a utility class in force on the element is
 * the class system's; a rule in one of your stylesheets is the rule system's; a style attribute is said, not written
 * around; nothing of the element's own setting it goes to adding (layer 3: a class only where the project has utilities).
 */
export function route(changes, systems = SYSTEMS) {
  const by = new Map(), put = (s, g) => (by.get(s) ?? by.set(s, []).get(s)).push(g);
  const said = { id: 'said', async write(list) { return list.map((g) => ({ id: g.id, state: 'failed', why: g.why })); } };
  const evidence = asWritten(changes, () => changes.map((g) => (g.els[0] ? evidenceFor(g.els[0], g.prop) : { kind: 'none' })));
  for (const [i, g] of changes.entries()) {
    const el = g.els[0], e = evidence[i];
    if (e.kind === 'inline') put(said, { ...g, why: 'A style attribute on this element sets it. Change it there, or remove it and Sync again.' });
    else if (e.kind === 'rule' && e.isClass && hasClassFor(el, g.prop)) put(utilityClasses, { ...g, claim: { system: 'class' } });
    else if (e.kind === 'rule' && (e.file || e.bundle)) put(cssRules, { ...g, claim: { system: 'rule', ...e } });
    else if (e.kind === 'rule') put(said, { ...g, why: `${e.selector} sets it from a stylesheet that isn't one of your files.` });
    else put(addSystem(systems), { ...g, claim: null, evidence: e });
  }
  return by;
}
/** Whether the page has utility classes (a Tailwind build: its utilities layer, or its --tw- variables). */
// asked on every draw of the fix bar: a page that has utilities keeps them, so a yes is remembered; a no is asked
// again (the stylesheets may still be arriving)
let utilitiesSeen = false;
export const pageHasUtilities = () => utilitiesSeen || (utilitiesSeen = hasUtilities());
export function hasUtilities() {
  return [...document.styleSheets].some((sh) => { try { return [...sh.cssRules].some((r) => r.name === 'utilities' || /--tw-/.test(r.cssText)); } catch { return false; } });
}
/**
 * Clean up's type roles on a page with no utility classes (docs/briefs/css-parity.md): a role written as Tailwind's
 * `@utility type-x { … }` and swapped onto elements does nothing there. Each swap becomes the role's values written into
 * the rule that styles each element it reaches; the tokens are written as before. Returns the style changes, and the
 * swaps it couldn't turn into rule edits (left as they were).
 */
export async function rolesAsRules(css, swaps, request) {
  const roles = new Map();
  for (const block of css ?? []) for (const m of String(block.css ?? '').matchAll(/@utility\s+([\w-]+)\s*\{([^}]*)\}/g)) {
    roles.set(m[1], m[2].split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const i = d.indexOf(':'); return [d.slice(0, i).trim(), d.slice(i + 1).trim()]; }));
  }
  const stamped = [...document.querySelectorAll('[data-plumb-source]')];
  const at = (file, line, column) => { const tail = String(file).replace(/^(\.\.\/)+/, '').replace(/^\/+/, ''); return stamped.filter((el) => { const s = el.getAttribute('data-plumb-source').split('#')[0]; return s.endsWith(`${tail}:${line}:${column}`) || `${tail}:${line}:${column}`.endsWith(s); }); };
  const changes = [], left = [];
  for (const sw of swaps ?? []) {
    const kept = [];
    for (const e of sw.edits ?? []) {
      const role = String(e.to).split(/\s+/).map((c) => roles.get(c.split(':').pop())).find(Boolean);
      const els = role ? at(sw.file, e.line, e.column) : [];
      const made = [];
      for (const el of els) for (const [prop, value] of role) { const r = await ruleChanges(el, [prop], value, request).catch(() => null); if (!r) { made.length = 0; break; } made.push(...r); }
      if (made.length) changes.push(...made); else kept.push(e);
    }
    if (kept.length) left.push({ ...sw, edits: kept });
  }
  return { changes, swaps: left };
}
// the system that adds a value nothing sets: the utility system where the project has utilities, else a refusal in words
function addSystem(systems) {
  const tailwind = [...document.styleSheets].some((sh) => { try { return [...sh.cssRules].some((r) => r.name === 'utilities' || /--tw-/.test(r.cssText)); } catch { return false; } });
  if (tailwind) return systems.find((s) => s.fallback) ?? utilityClasses;
  return { id: 'said', async write(list) { return list.map((g) => ({ id: g.id, state: 'failed', why: g.evidence?.inherited ? 'Nothing of this element sets it; it comes from a parent. Change the parent, or give this element a rule of its own.' : 'Nothing of this element sets it, and this project has no utility classes to add. Give it a rule in your stylesheet first.' })); } };
}
