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
//                 outcome  'opposite' (r under 1: a thing reads as part of the next group), 'nearly' (1 to 1.5: the
//                          eye cannot tell where a group ends) or 'agree'
//                 between, inside  which gap each of the two was, as a place in `gaps`
//
// The one number here is published: grouping in a lattice of dots followed the ratio of the two distances, and past
// about 1.5 the longer one was almost never seen as the grouping (Kubovy and Wagemans 1995, as reported in Wagemans
// and others 2012). It was measured on dots. Whether it holds for blocks of text and cards is not known.

export const RATIO = 1.5;

export function judge(run) {
  const gaps = run.gaps.map((g) => Math.max(0, Math.round(g))), between = [], inside = [];
  gaps.forEach((g, k) => { if (!run.skip?.has(k)) (run.groups[k] === run.groups[k + 1] ? inside : between).push(k); });
  if (!between.length || !inside.length) return null;
  const b = between.reduce((m, k) => (gaps[k] < gaps[m] ? k : m)), i = inside.reduce((m, k) => (gaps[k] > gaps[m] ? k : m));
  const r = gaps[i] === 0 ? Infinity : gaps[b] / gaps[i];
  return { r, outcome: r < 1 ? 'opposite' : r < RATIO ? 'nearly' : 'agree', between: b, inside: i, gaps };
}
