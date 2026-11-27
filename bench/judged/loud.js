// Loud against important (docs/briefs/shape-engine.md, section 17): is the loudest text on the first screen the text
// that says the most? Pure: plain rows in, a verdict out.
//
//   judge(pieces)  pieces: [{ id, size, weight, role }]
//                    size, weight  how loud the block's type is drawn (the seen side)
//                    role          'main' | 'supports' | 'minor', as a reading of the words gave it (the meant side)
//                  → null when there is no main piece or fewer than two levels of loudness, else
//                    { outcome, main, top, level, levels }
//                    outcome  'agree'     the piece that says the most is drawn as loud as anything here
//                             'disagree'  the loudest text is a piece a visitor learns nothing from, or the piece
//                                         that says the most is in the quieter half of the screen's type
//                             'nearly'    something of substance is drawn louder than the piece that says the most
//                    main, top  the ids of the piece that says the most and of the loudest piece
//                    level, levels  which step of loudness the main piece is on (1 is the loudest) of how many
//
// Loudness here is an order and nothing more: larger type first, then heavier. No threshold is used, because none
// has a source. The table in the spec has the same three rows.

export function judge(pieces) {
  const main = pieces.find((p) => p.role === 'main');
  if (!main) return null;
  const louder = (a, b) => b.size - a.size || b.weight - a.weight, same = (a, b) => a.size === b.size && a.weight === b.weight;
  const order = [...pieces].sort(louder), steps = [];
  for (const p of order) if (!steps.length || !same(steps.at(-1), p)) steps.push(p);
  if (steps.length < 2) return null;
  const top = order[0], level = steps.findIndex((s) => same(s, main)) + 1;
  const out = { main: main.id, top: top.id, level, levels: steps.length };
  if (level === 1) return { ...out, outcome: 'agree' };
  if (top.role === 'minor' || (steps.length >= 3 && level > Math.ceil(steps.length / 2))) return { ...out, outcome: 'disagree' };
  return { ...out, outcome: 'nearly' };
}
