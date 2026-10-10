// What Plumb says about one element, shaped for the overlay.
//
// The engine reports findings; a finding can group several authored sites that share a value (`gap-[10px]` and
// `py-[10px]` are one "10px is off the scale" finding). The overlay marks places, so it turns the reply into one mark per
// authored site on this element, each with its own choices and, where the engine knows the exact text change, an edit
// id for apply. Findings about the theme as a whole are not places; they become quiet notes.

const GLYPH = { spacing: 'spacing', radius: 'radius', type: 'type', color: 'color', elevation: 'shadow', shadow: 'shadow', z: 'z', motion: 'motion' };

export function glyphFor(finding) {
  const rule = finding.rule;
  if (rule.startsWith('habits/')) return 'habit';
  if (rule.startsWith('ownership/')) return 'ownership';
  if (rule.startsWith('imitation/')) return 'imitation';
  if (rule.startsWith('existence/')) return 'existence';
  return GLYPH[finding.family] ?? 'existence';
}

// Off: the value is not on the scale or not allowed. Soft: it is legal but reaches the scale the wrong way
// (a Tailwind default, a primitive where a semantic token exists, a literal that equals a token).
const soft = finding => /framework|tier|by-value|matches/.test(finding.rule);

const at = s => `${s.line}:${s.column}`;
const number = value => { const n = parseFloat(value); return Number.isFinite(n) && /^-?[\d.]+(px|rem|em)?$/.test(String(value).trim()) ? n : undefined; };
// Token names come back as custom properties; the family prefix is noise inside a family's own comparison.
const short = name => name.replace(/^--/, '');

export function reading(location, site, edits) {
  const marks = [], notes = [], byKey = new Map();
  const editsAt = new Map();
  for (const edit of edits?.edits ?? []) {
    const key = at(edit);
    if (!editsAt.has(key)) editsAt.set(key, []);
    editsAt.get(key).push(edit);
  }
  for (const finding of site.findings) {
    if (finding.rule.startsWith('config/') || !finding.sites?.length) {
      notes.push({ title: finding.title, because: finding.because, rule: finding.rule });
      continue;
    }
    const first = finding.sites[0];
    for (const s of finding.sites) {
      const key = at(s);
      if (byKey.has(key)) continue; // one mark per authored site even when several rules speak about it
      const declarations = site.declarations.filter(d => d.site && at(d.site) === key && !d.prop.startsWith('--'));
      const props = declarations.length ? declarations.map(d => d.prop) : [finding.declaration?.prop].filter(Boolean);
      const value = declarations[0]?.resolved ?? declarations[0]?.value ?? finding.declaration?.resolved ?? finding.declaration?.value;
      const here = editsAt.get(key) ?? [];
      const choices = (finding.choices ?? []).map(c => {
        const edit = here.find(e => e.token === c.name);
        return { name: c.name, label: short(c.name), value: c.resolved ?? c.value, n: number(c.resolved ?? c.value), why: c.why, edit: edit && { id: edit.id, from: edit.from, to: edit.to } };
      });
      const mark = {
        key, text: s.text, line: s.line, column: s.column, props, value, n: number(value),
        glyph: glyphFor(finding), family: finding.family, rule: finding.rule, soft: soft(finding),
        // A grouped finding's title names its first site; each mark names its own.
        title: s === first ? finding.title : finding.title.replace('`' + first.text + '`', '`' + s.text + '`'),
        because: finding.because, action: finding.action ?? finding.fix, accept: finding.accept,
        ledger: s.ledger?.status ?? 'new',
        choices,
        // The engine never picks between two tokens that fit equally; neither does the overlay.
        pick: choices.length === 1 ? 0 : null,
      };
      byKey.set(key, mark); marks.push(mark);
    }
  }
  // Reading order: new problems first, then by where they sit in the source.
  marks.sort((a, b) => (a.ledger === 'new' ? 0 : 1) - (b.ledger === 'new' ? 0 : 1) || a.line - b.line || a.column - b.column);
  // No declarations at all means nothing is written literally here (classes computed in code), not "on the system".
  return { location, file: location.file, line: location.line, column: location.column, tag: location.tag, component: location.component, via: location.via,
    hash: edits?.hash, marks, notes, declared: site.declarations.length };
}

export const offCount = r => r.marks.filter(m => m.ledger === 'new' && !m.synced).length;
