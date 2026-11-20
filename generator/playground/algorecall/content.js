// A returning learner's queue, made up for the playground: the live page signed out shows a first-day stack, where no
// slab is late, so it has nothing in the status slot. These are the same patterns in the same order, with days over
// and recall estimates of the kind useTodayModel computes (recall below the 90% target thickens a slab's edge).
const slab = (patternId, name, overdueDays, recall) => ({ patternId, name, overdueDays, recall, sinceDays: overdueDays + 4, sr: null });
export const slabs = [
  slab('arrays-hashing', 'Arrays & Hashing', 3, 0.71),
  slab('stack', 'Stack', 1, 0.82),
  slab('linked-list', 'Linked List', 0, 0.88),
  slab('math-geometry', 'Math & Geometry', 5, 0.64),
  slab('sliding-window', 'Sliding Window', 0, 0.9),
  slab('two-pointers', 'Two Pointers', 2, 0.79),
  slab('binary-search', 'Binary Search', 0, 0.9), slab('trees', 'Trees', 1, 0.85), slab('heap', 'Heap / Priority Queue', 0, 0.9),
];
export const props = { slabs, premiere: false, selectedId: null, onSelect: () => {}, onStart: () => {} };
