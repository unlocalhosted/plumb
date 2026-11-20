// algorecall, as the generator needs to know it: the organism it varies is the review stack on Today (DueStack.tsx),
// one slab per due pattern, the top one lit and pressed to start. Its slots and the content it really has.
export const product = {
  id: 'algorecall',
  name: 'algorecall',
  root: '/Users/vijaysingh/unlocalhosted/algorecall',
  tokens: ['src/theme.css', 'src/index.css'],
  wrapper: '', mode: 'light',
  organism: { specimen: 'algorecall-today-stack', component: 'src/pages/today/DueStack.tsx', card: '.pg-organism', name: 'the review stack',
    slots: { status: 'slab-lateness', navigation: 'ghost-slab' } },
  // content (useTodayModel: due slabs with days over and a recall estimate; the rest of the queue as a count)
  content: {
    'a number that changes': true,   // days over, the count of the rest
    'ordered stages': false,          // an order of review, not stages one passes through
    'two billing periods': false, 'people': false,
    'a data series': false,           // the recall curve is beside the stack, not in it
    'several plans': false,
  },
};
