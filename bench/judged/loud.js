// Loud against important (docs/briefs/shape-engine.md, section 17): is the loudest text on the first screen the text
// that says the most? Pure: plain rows and the seen tree in, a verdict out.
//
//   ranked(pieces, units, main)  the pieces that are ranked with the piece that says the most: everything but what
//                  is inside a drawn box with words in it that does not also hold that piece. Such a thing is loud
//                  among the things in its own box (a card, a demo, a meter); on the page it is the box that
//                  competes, and boxes are not ranked. A box with no words in it is a picture's frame, and leaves
//                  the picture where it is.
//   heads(tree, units, id)  the rows a block of text heads, as a Set. Going out from the block one group at a time:
//                  while no text comes before it in the group, it is the group's heading and heads everything after
//                  it there; while no text comes after it in the group, it sits directly over what follows the
//                  group and heads the next thing with words in it. A name over a sentence heads the sentence, with
//                  or without a small line above the name; a section's heading heads the section and nothing before
//                  it.
//                  Things that overlap have no order, so in a pile what heads what cannot be read: the Set comes
//                  back with `blind` set, and the judge says so and gives no verdict. A level where nothing else
//                  has words (a picture in its frame, a page's content over a picture that fills the page) has
//                  nothing to head or be headed by, so the block's place there is that level's place.
//   pictured(pictures, pieces, main, heads)  pictures: [{ id, y, w, h }], pieces: the ranked text, each with `y`,
//                  `line` (the height of one of its lines) and `area` (the room its block takes). → the pictures
//                  that sit over the piece that says the most (they head it, as a label would, and end above where
//                  it starts) and are drawn taller than a line of any text in the order, largest first, each as { id, w, h, times, room }: times is its height
//                  against that piece's type size, room its area against that piece's block. A picture with room
//                  over 1 is the biggest thing there. What a picture says is not read, so this is something to
//                  show and never a verdict.
//   judge(pieces, heads)  pieces: [{ id, size, weight, role }]
//                    size, weight  how loud the block's type is drawn (the seen side)
//                    role          'main' | 'supports' | 'minor', as a reading of the words gave it (the meant side)
//                  heads: (id) → the Set above
//                  → null when there is no main piece or fewer than two levels of loudness, else
//                    { outcome, main, top, level, levels, over }
//                    outcome  'agree'     the piece that says the most is drawn as loud as anything here, or the
//                                         loudest text is a label (a name, a greeting, a heading) and the piece that
//                                         says the most is under it: a label and what it heads are one thing
//                             'nearly'    something of substance is drawn louder than the piece that says the most
//                             'disagree'  the loudest text is a label over some other part of the screen
//                             'blind'     the loudest text is a label among things drawn on top of each other, so
//                                         what it heads cannot be read and nothing is said
//                    main, top  the ids of the piece that says the most and of the loudest piece
//                    level, levels  which step of loudness the main piece is on (1 is the loudest) of how many
//                    over     true when the loudest piece heads the piece that says the most
//
// Loudness here is an order and nothing more: larger type first, then heavier. No threshold is used, because none
// has a source: how many times louder a label may be than what it heads is not known, so it is never judged.

export function ranked(pieces, units, main) {
  const boxes = (i) => { const out = []; for (let b = units[i]?.parent ?? -1; b >= 0; b = units[b].parent) out.push(b); return out; };
  const mine = new Set(boxes(main)), worded = new Set();
  units.forEach((u, i) => { if (u.kind === 'text') for (const b of boxes(i)) worded.add(b); });
  return pieces.filter((p) => boxes(p.id).every((b) => mine.has(b) || !worded.has(b)));
}

export function heads(tree, units, id) {
  const path = [], out = new Set();
  const find = (n) => { path.push(n); if (n.type === 'unit' ? n.unit === id : (n.children ?? []).some(find)) return true; path.pop(); return false; };
  if (!find(tree)) return out;
  const each = (n, f) => { if (n.type === 'unit') f(n.unit); else for (const c of n.children ?? []) each(c, f); };
  const worded = (n) => { let any = false; each(n, (u) => { any ||= units[u]?.kind === 'text'; }); return any; };
  let leads = true, ends = true;
  for (let k = path.length - 1; k > 0 && (leads || ends); k--) {
    const node = path[k], above = path[k - 1], how = above.type === 'box' ? above.how : above;
    if (!how) continue;             // a box round one thing: its place is the box's place
    if (!above.children.some((c) => c !== node && worded(c))) continue; // nothing else here has words
    if (!how.axis) { out.blind = true; break; } // a pile
    const at = above.children.indexOf(node), after = above.children.slice(at + 1), next = after.findIndex(worded);
    // the heading of a group (no text before it there) heads all that follows in it; a block that is only the last
    // text of what came before sits over the next thing with words, and heads that
    leads &&= !above.children.slice(0, at).some(worded);
    for (const c of leads ? after : ends ? after.slice(0, next + 1) : []) each(c, (u) => out.add(u));
    ends &&= next < 0;
  }
  return out;
}

export function judge(pieces, heads = () => new Set()) {
  const main = pieces.find((p) => p.role === 'main');
  if (!main) return null;
  const louder = (a, b) => b.size - a.size || b.weight - a.weight, same = (a, b) => a.size === b.size && a.weight === b.weight;
  const order = [...pieces].sort(louder), steps = [];
  for (const p of order) if (!steps.length || !same(steps.at(-1), p)) steps.push(p);
  if (steps.length < 2) return null;
  const tops = order.filter((p) => same(p, order[0])), level = steps.findIndex((s) => same(s, main)) + 1;
  const out = { main: main.id, level, levels: steps.length };
  if (level === 1) return { ...out, top: main.id, over: false, outcome: 'agree' };
  // several blocks may share the loudest step: a label over the main piece settles it, then anything of substance
  const label = tops.find((p) => p.role === 'minor' && heads(p.id).has(main.id));
  if (label) return { ...out, top: label.id, over: true, outcome: 'agree' };
  const rival = tops.find((p) => p.role !== 'minor');
  if (rival) return { ...out, top: rival.id, over: heads(rival.id).has(main.id), outcome: 'nearly' };
  return { ...out, top: tops[0].id, over: false, outcome: tops.some((p) => heads(p.id).blind) ? 'blind' : 'disagree' };
}

export function pictured(pictures, pieces, main, heads) {
  const at = pieces.find((p) => p.id === main), line = Math.max(...pieces.map((p) => p.line)), tenth = (v) => Math.round(v * 10) / 10;
  if (!at) return [];
  return pictures.filter((p) => p.h > line && p.y + p.h <= at.y && heads(p.id).has(main))
    .map((p) => ({ ...p, times: tenth(p.h / at.size), room: tenth(p.w * p.h / at.area) })).sort((a, b) => b.w * b.h - a.w * a.h);
}
