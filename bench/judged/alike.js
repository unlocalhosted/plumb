// Alike against same role (docs/briefs/shape-engine.md, section 14, first cut): pieces of text that look exactly the
// same and are not the same kind of thing. Pure: plain rows in, findings out.
//
//   judge(pieces)  pieces: [{ look, role, set, text }]
//                    look  everything drawn about the piece's letters, as one string (see.js builds it)
//                    role  what the page is built to do with it: 'plain' | 'page' (a link to another page of the site)
//                          | 'jump' (a link down this page) | 'leaves' (a link to another site) | 'control'
//                    set   the row or list the piece sits in with its neighbours, as a number, or -1
//                  → findings: [{ kind, odd: [row numbers], many: [row numbers], look }]
//                    'looks-pressable'  text drawn exactly like the things that can be pressed, and it cannot
//                    'pressable-plain'  things that can be pressed, drawn exactly like the plain text of their kind
//                    'one-set-two-ways' one row of look-alike links that do different things
//
// Only exact likeness is judged here. "Nearly alike" (a step apart on one attribute) is the third outcome in the
// spec and is not built. No number in this file comes from a source: the least a look must be shared (3 pieces) and
// the least a set must hold (3 links) are conventions, taken from plumber's own check on siblings.

const LEAST = 3;
const pressable = (role) => role !== 'plain';

export function judge(pieces) {
  const findings = [], looks = new Map();
  pieces.forEach((p, i) => (looks.get(p.look) ?? looks.set(p.look, []).get(p.look)).push(i));
  for (const [look, rows] of looks) {
    if (rows.length < LEAST) continue;
    const press = rows.filter((i) => pressable(pieces[i].role)), plain = rows.filter((i) => !pressable(pieces[i].role));
    // one look, two kinds of thing: the fewer are the odd ones. A tie is left alone: nothing says which is meant.
    if (press.length >= 2 && plain.length && plain.length < press.length) findings.push({ kind: 'looks-pressable', odd: plain, many: press, look });
    else if (plain.length >= 2 && press.length && press.length < plain.length) findings.push({ kind: 'pressable-plain', odd: press, many: plain, look });
    // one row of links that look the same and act differently
    const sets = new Map();
    for (const i of press) if (pieces[i].set >= 0 && pieces[i].role !== 'control') (sets.get(pieces[i].set) ?? sets.set(pieces[i].set, []).get(pieces[i].set)).push(i);
    for (const members of sets.values()) {
      if (members.length < LEAST) continue;
      // judged here: a link that jumps down this page beside one that opens a page. A link that leaves the site
      // beside one that stays is not: on the first page tried it made three findings and no judge had marked one,
      // and the reviewer's own limit is that a link named after another service needs no mark.
      const way = (role) => (role === 'jump' ? 'jump' : 'page');
      const ways = new Map();
      for (const i of members) (ways.get(way(pieces[i].role)) ?? ways.set(way(pieces[i].role), []).get(way(pieces[i].role))).push(i);
      if (ways.size < 2) continue;
      const sorted = [...ways.values()].sort((a, b) => b.length - a.length);
      findings.push({ kind: 'one-set-two-ways', odd: sorted.slice(1).flat(), many: sorted[0], look });
    }
  }
  return findings;
}
