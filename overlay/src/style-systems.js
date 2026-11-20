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
      const edits = await classEditsOf(el, edit.from, edit.to);
      const group = ctx.group(), files = new Map();
      for (const e of edits) (files.get(e.file) ?? files.set(e.file, { hash: e.hash, edits: [] }).get(e.file)).edits.push(e.edit);
      const at = edits[0] ? `${edits[0].file}:${edits[0].edit.line}` : '';
      ctx.keep({ state: 'ok', cls: edit.to, where: at, group });
      for (const [file, f] of files) await ctx.post('swaps', { file, hash: f.hash, edits: f.edits, trace: { group, meta: { step: 'X-ray', laws: [] } } });
      for (const g of changes) out.push({ id: g.id, state: 'ok', cls: edit.to, where: at, group });
    } catch (error) { fail(error?.message ?? String(error)); }
    return out;
  },
};

// ── rules in plain stylesheets ──────────────────────────────
// the declarations that set a property: its own name, then the shorthands that carry it
const CARRIERS = {
  'font-size': ['font-size', 'font'], 'line-height': ['line-height', 'font'], 'font-weight': ['font-weight', 'font'],
  gap: ['gap'], 'border-radius': ['border-radius'], width: ['width'], height: ['height'],
  'padding-top': ['padding-top', 'padding-block-start', 'padding-block', 'padding'], 'padding-bottom': ['padding-bottom', 'padding-block-end', 'padding-block', 'padding'],
  'padding-left': ['padding-left', 'padding-inline-start', 'padding-inline', 'padding'], 'padding-right': ['padding-right', 'padding-inline-end', 'padding-inline', 'padding'],
};
// a selector's weight: ids, then classes, attributes and pseudo-classes, then elements
function specificity(sel) {
  const s = sel.replace(/::?[\w-]+\(/g, (m) => (m.startsWith('::') ? ' ' : ' .')).replace(/[()]/g, ' ');
  return [(s.match(/#[\w-]+/g) ?? []).length, (s.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) ?? []).length, (s.match(/(^|[\s>+~])[a-z][\w-]*/gi) ?? []).length];
}
const heavier = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
// The rule that wins for el's prop among the page's stylesheets that came from a file of yours (Vite says which file
// each <style> is: data-vite-dev-id). Only rules outside @media and the like: a conditional rule is said, not written.
export function winningRule(el, prop) {
  const carriers = CARRIERS[prop];
  if (!carriers) return null;
  let best = null, order = 0;
  const walk = (rules, file) => {
    for (const r of rules) {
      order++;
      if (r.constructor?.name !== 'CSSStyleRule' && !(r.selectorText && r.style)) continue;
      // a stylesheet's own text keeps a shorthand that reads a variable: the CSSOM answers '' for its longhands
      const sets = carriers.some((c) => r.style.getPropertyValue(c) !== '' || new RegExp(`(^|[;\\s])${c}\\s*:`).test(r.style.cssText));
      if (!sets) continue;
      for (const part of r.selectorText.split(',').map((x) => x.trim())) {
        let hit = false; try { hit = el.matches(part); } catch { /* a selector the browser won't match */ }
        if (!hit) continue;
        const w = specificity(part);
        if (!best || heavier(w, best.w) >= 0) best = { file, selector: part, w, order, important: r.style.getPropertyPriority(carriers[0]) === 'important' };
      }
    }
  };
  for (const sheet of document.styleSheets) {
    const file = sheet.ownerNode?.dataset?.viteDevId;
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    if (!rules) continue;
    // a sheet that is not one of your files still takes part in the cascade: its winner is nobody's to write
    walk(rules, file && /\.css$/.test(file) && !/node_modules/.test(file) ? file : null);
  }
  return best?.file ? { file: best.file, selector: best.selector } : null;
}
// the value a rule is given: your token's variable when the page has it, else the value itself
const VAR = { 'font-size': (t) => [`--text-${t}`], 'line-height': (t) => [`--leading-${t}`], gap: (t) => [`--spacing-${t}`], 'border-radius': (t) => [`--radius-${t}`],
  width: (t) => [`--spacing-${t}`, `--container-${t}`], height: (t) => [`--spacing-${t}`] };
function cssValue(change) {
  const token = change.cls?.match(/^-?[a-z]+(?:-[xytrbl])?-(?!\[)(.+)$/)?.[1];
  const names = token ? (VAR[change.prop] ?? (BOX.test(change.prop) ? (t) => [`--spacing-${t}`] : () => []))(token) : [];
  const root = getComputedStyle(document.documentElement);
  const name = names.find((n) => root.getPropertyValue(n).trim());
  return name ? `var(${name})` : change.value;
}

export const cssRules = {
  id: 'rule',
  owns: (el, prop) => { const r = winningRule(el, prop); return r ? { system: 'rule', ...r } : null; },
  async write(changes, ctx) {
    const out = [];
    for (const g of changes) {
      const claim = g.claim;
      try {
        const now = await ctx.request('rule', { file: claim.file, selector: claim.selector, prop: g.prop });
        const hash = now?.hash;
        if (!hash) throw new Error(`${claim.selector} couldn't be read in ${claim.file}.`);
        const group = ctx.group(), value = cssValue(g);
        const where = `${claim.file.split('/').slice(-2).join('/')}${now?.line ? `:${now.line}` : ''}`;
        ctx.keep({ state: 'ok', cls: `${claim.selector} { ${g.prop}: ${value} }`, where, group });
        await ctx.post('set-rule', { file: claim.file, hash, selector: claim.selector, prop: g.prop, value, trace: { group, meta: { step: 'X-ray', laws: [] } } });
        out.push({ id: g.id, state: 'ok', cls: `${claim.selector} { ${g.prop}: ${value} }`, where, group });
      } catch (error) { out.push({ id: g.id, state: 'failed', why: error?.message ?? String(error) }); }
    }
    return out;
  },
};

// the order the systems are asked in: the first that owns a property writes it
export const SYSTEMS = [utilityClasses, cssRules];

/** Which system writes each change: the first that owns it, else the fallback. Changes come back grouped by system. */
export function route(changes, systems = SYSTEMS) {
  const by = new Map();
  for (const g of changes) {
    const el = g.els[0];
    let system = null, claim = null;
    for (const s of systems) { const c = el ? s.owns(el, g.prop) : null; if (c) { system = s; claim = c; break; } }
    system ??= systems.find((s) => s.fallback);
    (by.get(system) ?? by.set(system, []).get(system)).push({ ...g, claim });
  }
  return by;
}
