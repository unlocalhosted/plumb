// The interaction standards a form of an action is judged against: each one a principle, where it comes from, what is
// measured, and what a designer would tell a client when it holds or fails. Plumber's rule: no judgement without a
// principle and a checkable source (docs/PRINCIPLES.md). `checked` says whether the source's exact wording and numbers
// were checked against the published page; until then the claim is from memory and is marked so.
//
// severity: 'breaks' fails the interaction for some people outright; 'weakens' makes it worse without stopping anyone.

export const STANDARDS = [
  { id: 'answers-at-once', name: 'Answers the press at once', severity: 'weakens',
    principle: 'People need to know their action registered: the interface answers within about a tenth of a second, or the press feels lost.',
    sources: ['Nielsen Norman Group, 10 usability heuristics: #1 Visibility of system status', 'Apple Human Interface Guidelines: Feedback', 'Response time limits (Nielsen, 0.1 s feels instantaneous)'],
    checked: false,
    measure: 'the first visible change after the press, from the frame-by-frame recording',
    holds: 'It answers the moment it is pressed, so the customer knows the button heard them.',
    fails: (m) => `Nothing visibly changes for ${m.firstMs} ms after the press, long enough to wonder whether it registered.`,
    fix: 'Give the press an immediate answer: the button sinking onto its lip, or its fill starting to move.' },

  { id: 'words-stay-readable', name: 'Its words stay readable in every state', severity: 'breaks',
    principle: 'What a button says must be readable in every state it passes through, not only at rest: mid-gesture is when people check what they are committing to.',
    sources: ['WCAG 2.2, 1.4.3 Contrast (Minimum)', 'Plumber: craft/words-on-layers (words follow their ground)'],
    checked: true,
    measure: 'plumber’s contrast and words-on-layers rules at rest, pointed at, mid-gesture and done',
    holds: 'Its words read clearly at every moment, including mid-gesture.',
    fails: (m) => `${m.when}, ${m.says.charAt(0).toLowerCase()}${m.says.slice(1)}`,
    fix: 'Keep the words on their ground: redraw them in the fill’s own ink, clipped at the fill’s edge (as hold-to-confirm does), or move them out of the fill’s path.' },

  { id: 'progress-shows', name: 'You can see your progress', severity: 'breaks',
    principle: 'A hold or a drag commits only at the end; the part done has to stand clearly apart from the part to go, or people let go too early or hold on not knowing.',
    sources: ['WCAG 2.2, 1.4.11 Non-text Contrast (3:1 for the states of a control)'],
    checked: true, appliesTo: ['held-time', 'threshold'],
    measure: 'contrast between the fill and the track it grows over, from the recorded colours',
    holds: 'The fill stands out from the track, so it is always clear how far there is to go.',
    fails: (m) => `The fill and the track differ by only ${m.ratio}:1, so progress is hard to see.`,
    fix: 'Make the fill a clear step deeper (3:1 against the track), in the product’s own colour.' },

  { id: 'can-back-out', name: 'You can back out mid-gesture', severity: 'breaks',
    principle: 'Starting a gesture must not commit you: letting go early, or sliding away, has to undo it.',
    sources: ['WCAG 2.2, 2.5.2 Pointer Cancellation', 'Nielsen Norman Group heuristic #3: User control and freedom'],
    checked: true, appliesTo: ['held-time', 'threshold', 'confirm', 'countdown'],
    measure: 'the recipe’s cancel paths, read from its source (release early, move away, Escape)',
    holds: 'Letting go early takes it back, so a half-meant gesture never commits.',
    fails: () => 'Once started, it can’t be taken back.',
    fix: 'Let a release before the end undo the gesture, and Escape cancel it.' },

  { id: 'no-drag-needed', name: 'There is a way that needs no drag', severity: 'breaks',
    principle: 'Anything done by dragging must also be doable with a single press or the keyboard, for people who can’t drag precisely.',
    sources: ['WCAG 2.2, 2.5.7 Dragging Movements (AA)', 'WCAG 2.2, 2.5.1 Pointer Gestures (A)'],
    checked: true, appliesTo: ['threshold'],
    measure: 'a keyboard or single-press path in the recipe’s source',
    holds: 'It also works from the keyboard, so nobody is shut out by the drag.',
    fails: () => 'It can only be done by dragging; anyone who can’t drag precisely can’t buy.',
    fix: 'Let Enter or a plain press complete it as well as the drag.' },

  { id: 'big-enough', name: 'It is big enough to hit', severity: 'weakens',
    principle: 'The thing you press needs room for a finger: small targets cause missed and mistaken presses.',
    sources: ['Apple Human Interface Guidelines: 44×44 pt minimum hit target', 'Material Design: 48×48 dp touch target', 'WCAG 2.2, 2.5.8 Target Size (Minimum), 24×24 CSS px'],
    checked: false,
    measure: 'the rendered size of the part you press',
    holds: 'Its target is comfortably big for a finger.',
    fails: (m) => `The part you press is ${m.size}, under the 44 pt a finger needs.`,
    fix: 'Give the pressable part at least 44 px in each direction.' },

  { id: 'motion-purposeful', name: 'Its motion is quick and respects reduced motion', severity: 'weakens',
    principle: 'Interface motion should be brief and say something; people who ask for reduced motion should get the same states without the travel.',
    sources: ['Material Design: motion duration and easing', 'Apple Human Interface Guidelines: Motion; Reduce Motion', 'WCAG 2.2, 2.3.3 Animation from Interactions (AAA)'],
    checked: false,
    measure: 'reduced-motion handling read from the source; how long its movements take, from the recording',
    holds: 'Its motion is brief, and it calms down for people who ask for reduced motion.',
    fails: (m) => (m.reduced ? `Its movements run ${m.longestMs} ms, longer than a control’s motion should.` : 'It plays its motion even for people who ask their device to reduce motion.'),
    fix: 'Honour reduced motion (states change at once) and keep a control’s own motion short.' },

  { id: 'friction-fits-stakes', name: 'The effort fits the stakes', severity: 'weakens',
    principle: 'Consequential, hard-to-undo actions deserve a deliberate step; everyday ones should not make people work. Both too little and too much friction cost trust.',
    sources: ['Apple Human Interface Guidelines: confirm destructive or consequential actions, sparingly', 'Material Design: dialogs and confirmation for consequential actions', 'Nielsen Norman Group heuristic #5: Error prevention'],
    checked: false,
    measure: 'the recipe’s commit effort against the moment’s stakes',
    holds: (m) => m.fit,
    fails: (m) => m.misfit,
    fix: (m) => m.fixFit },
];

// The moment a form is judged for: what is at stake, and how often it is done. For crafting attention's buy button,
// a one-time payment a visitor makes once.
export const MOMENTS = {
  // the press itself doesn't pay: it opens checkout (its own words: "Opening checkout"), where the payment is confirmed
  'craftingattention/buy': { name: 'buying lifetime access', stakes: 'low', confirmedLater: 'checkout asks for the payment itself, so a slip here costs nothing', frequency: 'once', who: 'a first-time visitor on the pricing page' },
  'algorecall/start': { name: 'starting a review', stakes: 'low', reversible: true, frequency: 'daily', who: 'a learner coming back' },
};
