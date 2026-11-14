/* ─────────────────────────────────────────────────────────
 * KINDS · React Plumber overlay
 *
 * Lists by kind (docs/briefs/engine-scaling.md §2b). A rule may say what it is about: `on`, a comma list of tags,
 * `[attribute]`s and `[role="x"]`s ('img', '[aria-expanded]', '[role="tab"]', '[on*]' for any inline handler). The
 * engine then asks it only about those elements. A rule with no `on` (every craft rule) is asked about everything,
 * as before. With 128 pack rules and 16,000 elements that is the difference between two million calls and a few thousand.
 *
 * `on` must be no narrower than the rule's own first test: it is where the rule is asked, not what it decides.
 * ───────────────────────────────────────────────────────── */

const TERM = /^(?:([a-z][a-z0-9]*)|\[([a-z*-]+)\]|\[role="([a-z]+)"\])$/;
const INDEX = new WeakMap(); // the active rules (one array per spec) → their index

function build(rules) {
  const index = { always: [], byTag: new Map(), byAttr: new Map(), byRole: new Map(), order: new Map(), handlers: false };
  const put = (map, key, rule) => { const list = map.get(key); if (list) list.push(rule); else map.set(key, [rule]); };
  rules.forEach((rule, i) => {
    index.order.set(rule, i);
    const terms = typeof rule.on === 'string' ? rule.on.split(',').map((t) => TERM.exec(t.trim())) : null;
    if (!terms || terms.some((t) => !t)) { index.always.push(rule); return; } // not said, or said in a way this does not read: asked about everything
    for (const [, tag, attr, role] of terms) {
      if (tag) put(index.byTag, tag, rule); else if (role) put(index.byRole, role, rule); else { put(index.byAttr, attr, rule); if (attr === 'on*') index.handlers = true; }
    }
  });
  return index;
}

/** The rules to ask about this element, in the rules' own order. */
export function rulesFor(rules, el) {
  let index = INDEX.get(rules);
  if (!index) INDEX.set(rules, (index = build(rules)));
  let extra = null;
  const add = (list) => { if (list) for (const rule of list) (extra ??= new Set()).add(rule); };
  add(index.byTag.get(el.localName));
  if (index.byAttr.size || index.byRole.size) {
    for (const a of el.attributes) {
      const name = a.name;
      add(index.byAttr.get(name));
      if (name === 'role') add(index.byRole.get(a.value));
      else if (index.handlers && name.length > 2 && name.charCodeAt(0) === 111 && name.charCodeAt(1) === 110) add(index.byAttr.get('on*'));
    }
  }
  if (!extra) return index.always;
  return [...index.always, ...extra].sort((a, b) => index.order.get(a) - index.order.get(b));
}
