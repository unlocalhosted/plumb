// Nearly regular (docs/briefs/shape-engine.md, section 16): a set of like things that almost share an edge, a size or
// a gap. The seen picture compared with itself: no meant side is needed. Pure: numbers in, a verdict out.
//
//   judge(values, least)  values: one number per member (a left edge, a width, a gap), in pixels
//                         least: the smallest value this attribute may have and still be judged (gaps only)
//                       → null when the set is regular, is not a regular set at all, or only differs by choice;
//                         else { common, count, w, slips: [{ at, by }], firm }
//                         common  the value most members share
//                         count   how many share it (within a pixel)
//                         w       (count less one) over the number of members: how strongly the set reads as
//                                 regular on this attribute (structural information theory, as the 2012 review
//                                 reports it)
//                         slips   the members a little off it, each with how far
//                         firm    true when every slip is small enough to be nobody's intention
//
// None of the three numbers is published. SAME is what a browser's rounding can produce. SLIP and DOUBT follow
// plumber's own check on list rows, where one or two steps of a 4px scale off the common edge is a slip and further
// is an indent that means something. Past DOUBT a difference is taken as a choice and nothing is said.

export const SAME = 1, SLIP = 4, DOUBT = 8;

export function judge(values, least = -Infinity) {
  const n = values.length;
  if (n < 4) return null;
  let common = 0, count = 0;
  for (const c of values) { const m = values.filter((v) => Math.abs(v - c) <= SAME).length; if (m > count) { count = m; common = c; } }
  // "most": at least three, and at least two in three
  if (count === n || count < 3 || count < Math.ceil((n * 2) / 3) || common < least) return null;
  const off = values.map((v, at) => ({ at, by: Math.round((v - common) * 10) / 10 })).filter((o) => Math.abs(o.by) > SAME);
  const slips = off.filter((o) => Math.abs(o.by) <= DOUBT);
  if (!slips.length) return null;
  return { common: Math.round(common * 10) / 10, count, w: Math.round(((count - 1) / n) * 100) / 100, slips, firm: slips.every((o) => Math.abs(o.by) <= SLIP) };
}
