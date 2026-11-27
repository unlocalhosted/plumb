// Near against belongs (docs/briefs/shape-engine.md, section 13): does the space between things say what the page
// means about which of them belong together? Pure: numbers in, a verdict out.
//
//   judge(run)  run: { gaps: [n - 1 numbers], groups: [n numbers], skip?: Set of places in `gaps` }
//                 gaps    the space between each two neighbours along one row or column, in order
//                 groups  which group each thing belongs to, as the meant picture has it (neighbours with the
//                         same number belong together)
//                 skip    gaps that say nothing here: one inside a group that has groups of its own (that gap is
//                         judged one level down), or one beside a group that a drawn box already sets apart
//               → null when there is nothing to compare (one group, or no group with two things in it), else
//                 { r, outcome, between, inside }
//                 r        the smallest gap between two groups divided by the largest gap inside a group
//                 outcome  'agree' (r at 1.5 or over), 'opposite' (r at 1/1.5 or under: the gap inside a group is
//                          the one that reads as a break) or 'nearly' (in between: the two gaps are too alike for
//                          space to say where a group ends)
//                 between, inside  which gap each of the two was, as a place in `gaps`
//
// The one number here is published: grouping in a lattice of dots followed the ratio of the two distances, and past
// about 1.5 the longer one was almost never seen as the grouping (Kubovy and Wagemans 1995, as reported in Wagemans
// and others 2012). It was measured on dots. Whether it holds for blocks of text and cards is not known.
// The same ratio is used both ways. The first cut called anything under 1 "the opposite", and that made a claim out
// of 17px against 19px. Inside 1.5 either way the eye has no grouping to read, so that whole band is "nearly".

export const RATIO = 1.5;

export function judge(run) {
  const gaps = run.gaps.map((g) => Math.max(0, Math.round(g))), between = [], inside = [];
  gaps.forEach((g, k) => { if (!run.skip?.has(k)) (run.groups[k] === run.groups[k + 1] ? inside : between).push(k); });
  if (!between.length || !inside.length) return null;
  const b = between.reduce((m, k) => (gaps[k] < gaps[m] ? k : m)), i = inside.reduce((m, k) => (gaps[k] > gaps[m] ? k : m));
  const r = gaps[i] === 0 ? Infinity : gaps[b] / gaps[i];
  return { r, outcome: r >= RATIO ? 'agree' : r <= 1 / RATIO ? 'opposite' : 'nearly', between: b, inside: i, gaps };
}
