// Alike against same role (docs/briefs/shape-engine.md, section 14, first cut): pieces of text that look exactly the
// same and are not the same kind of thing. Pure: plain rows in, findings out.
//
//   judge(pieces)  pieces: [{ look, role, text, carrier, size, weight, contrast, unit, scope, row, group, heads }]
//                    heads  the rows and columns of the seen picture in which this piece is the first thing of a
//                           group of several (what a heading is to its section), as numbers
//                    look  everything drawn about the piece's letters, as one string (see.js builds it)
//                    role  what the page is built to do with it: 'plain' | 'page' (a link to another page of the site)
//                          | 'jump' (a link down this page) | 'leaves' (a link to another site) | 'control'
//                    carrier  the link or control the piece is inside, as a number, or -1
//                    size, weight, contrast  how loud its letters are, used only to order the pieces of one carrier
//                    unit, scope, row, group  where it sits in the seen picture (seen.js, places): the block of text
//                            it is part of, the kind of ground that block is on, the row it stands in, and the
//                            row or column it stands in, each a number or -1
//                  → findings: [{ kind, odd: [row numbers], many: [row numbers], look, beside, scope, firm }]
//                    beside  true when the pieces sit side by side with others drawn the same, false when each is
//                            on a line of its own
//                    'looks-pressable'  text drawn exactly like the things that can be pressed, and it cannot
//                    'pressable-plain'  things that can be pressed, drawn exactly like the plain text of their kind
//                    'one-set-two-ways' one row of look-alike links that do different things
//
// Two things decide which pieces are compared at all, both from the owner's judging of the first findings
// (2026-11-27, journey entry 160):
//   A link that holds several pieces drawn differently (a row with a year, a name and a description) is one thing
//   to press. Only its loudest piece stands for it. The rest are parts of it and are compared with nothing: grey
//   text inside a row is not how the page says "press here".
//   A look is compared only among pieces that sit the same way, and the seen picture says how each one sits: on
//   the page itself or inside boxes (and inside which set of boxes), and in a row beside others drawn the same or
//   not. A title is not mistaken for a tab because both are 14px medium, nor for the month inside a calendar.
// Both are ours and neither has a source. "Loudest" is an order (larger, then heavier, then further from what is
// behind it), a stand-in until the loud layer of the spec exists.
//
// Only exact likeness is judged here. "Nearly alike" (a step apart on one attribute) is the third outcome in the
// spec and is not built. No number in this file comes from a source: the least a look must be shared (3 pieces) and
// the least a set must hold (3 links) are conventions, taken from plumber's own check on siblings.

const LEAST = 3;
const pressable = (role) => role !== 'plain';
// not compared with anything: a part of a larger link, and a link to the page you are already on (it is drawn as
// "you are here", which is its own meaning)
const out = (role) => role === 'part' || role === 'here';

const push = (map, key, v) => (map.get(key) ?? map.set(key, []).get(key)).push(v);

// the pieces of a link that are not what stands for it
function parts(pieces) {
  const inside = new Map(), out = new Set();
  pieces.forEach((p, i) => { if (p.carrier >= 0) push(inside, p.carrier, i); });
  const louder = (a, b) => a.size - b.size || a.weight - b.weight || a.contrast - b.contrast;
  for (const members of inside.values()) {
    if (new Set(members.map((i) => pieces[i].look)).size < 2) continue;
    const lead = members.reduce((m, i) => (louder(pieces[i], pieces[m]) > 0 ? i : m));
    for (const i of members) if (louder(pieces[i], pieces[lead]) < 0) out.add(i);
  }
  return out;
}

// of pieces drawn the same, the ones that stand in one row of the seen picture with another of them
function beside(pieces, rows) {
  const out = new Set();
  for (const i of rows) for (const j of rows) {
    if (i >= j) continue;
    const a = pieces[i], b = pieces[j];
    if (a.row >= 0 && a.row === b.row && a.unit !== b.unit) { out.add(i); out.add(j); }
  }
  return out;
}

export function judge(pieces) {
  const findings = [], looks = new Map(), part = parts(pieces);
  pieces.forEach((p, i) => { if (!part.has(i) && !out(p.role)) push(looks, p.look, i); });
  // a link whose letters are set one by one is one thing to press, not nine
  const things = (rows) => { const seen = new Set(); return rows.filter((i) => { const c = pieces[i].carrier; if (c < 0) return true; if (seen.has(c)) return false; seen.add(c); return true; }); };
  // Firm only when the odd ones stand with the others. A name drawn like the project titles further down is the
  // same look in another place, and is only worth a look. Boxes are never firm: a frame alone says too little
  // about what is inside it. Two of the first three findings called firm on a looser rule were wrong when looked at.
  const firm = (odd, many) => {
    if (pieces[odd[0]].kind === 'box') return false;
    // side by side in one row or column of the seen picture: a button among plain facts in one footer line
    const together = odd.every((i) => pieces[i].group >= 0 && many.some((j) => pieces[j].group === pieces[i].group));
    // or each leading one of a set of sister groups: a heading that is not a link among headings that are
    const sisters = odd.every((i) => pieces[i].heads?.length && many.some((j) => pieces[j].heads?.some((r) => pieces[i].heads.includes(r))));
    return together || sisters;
  };
  const settings = [];
  for (const [look, every] of looks) {
    const scopes = new Map();
    for (const i of every) push(scopes, pieces[i].scope, i);
    for (const [scope, all] of scopes) {
      const row = beside(pieces, all);
      settings.push([look, all.filter((i) => row.has(i)), true, scope], [look, all.filter((i) => !row.has(i)), false, scope]);
    }
  }
  for (const [look, rows, side, scope] of settings) {
    if (rows.length < LEAST) continue;
    const press = things(rows.filter((i) => pressable(pieces[i].role))), plain = rows.filter((i) => !pressable(pieces[i].role));
    if (press.length + plain.length < LEAST) continue;
    // one look, two kinds of thing: the fewer are the odd ones. A tie is left alone: nothing says which is meant.
    if (press.length >= 2 && plain.length && plain.length < press.length) findings.push({ kind: 'looks-pressable', odd: plain, many: press, look, beside: side, scope, firm: firm(plain, press) });
    else if (plain.length >= 2 && press.length && press.length < plain.length) findings.push({ kind: 'pressable-plain', odd: press, many: plain, look, beside: side, scope, firm: firm(press, plain) });
    // one row of links that look the same and act differently
    const sets = new Map();
    // a set is what the seen picture shows as one row or one column: links in separate blocks, standing together
    for (const i of press) if (pieces[i].group >= 0 && pieces[i].role !== 'control') push(sets, pieces[i].group, i);
    for (const members of sets.values()) {
      if (new Set(members.map((i) => pieces[i].unit)).size < LEAST) continue;
      // judged here: a link that jumps down this page beside one that opens a page. A link that leaves the site
      // beside one that stays is not: on the first page tried it made three findings and no judge had marked one,
      // and the reviewer's own limit is that a link named after another service needs no mark.
      const way = (role) => (role === 'jump' ? 'jump' : 'page');
      const ways = new Map();
      for (const i of members) (ways.get(way(pieces[i].role)) ?? ways.set(way(pieces[i].role), []).get(way(pieces[i].role))).push(i);
      if (ways.size < 2) continue;
      const sorted = [...ways.values()].sort((a, b) => b.length - a.length);
      findings.push({ kind: 'one-set-two-ways', odd: sorted.slice(1).flat(), many: sorted[0], look, beside: side, scope, firm: true });
    }
  }
  return findings;
}
