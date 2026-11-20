// The interaction standards a form of an action is judged against: each one a principle, where it comes from, what is
// measured, and what a designer would tell a client when it holds or fails. Plumber's rule: no judgement without a
// principle and a checkable source (docs/PRINCIPLES.md). Each source is { says, url }: what the page says, in short, and
// where it says it. `checked` says the wording and numbers were read off the published page (all eight on 2026-11-20).
const src = (says, url) => ({ says, url });
const NNG = 'https://www.nngroup.com/articles/ten-usability-heuristics/', WCAG = 'https://www.w3.org/TR/WCAG22/';
//
// severity: 'breaks' fails the interaction for some people outright; 'weakens' makes it worse without stopping anyone.

export const STANDARDS = [
  { id: 'answers-at-once', name: 'Answers the press at once', severity: 'weakens',
    principle: 'People need to know their action registered: the interface answers within about a tenth of a second, or the press feels lost.',
    sources: [src('Nielsen Norman Group heuristic #1, Visibility of system status: keep people informed through appropriate feedback within a reasonable amount of time', NNG),
      src('Nielsen, Response Times: 0.1 second is about the limit for feeling the system reacts instantaneously', 'https://www.nngroup.com/articles/response-times-3-important-limits/')],
    checked: true,
    measure: 'the first visible change after the press, from the frame-by-frame recording',
    holds: 'It answers the moment it is pressed, so the customer knows the button heard them.',
    fails: (m) => `Nothing visibly changes for ${m.firstMs} ms after the press, long enough to wonder whether it registered.`,
    fix: 'Give the press an immediate answer: the button sinking onto its lip, or its fill starting to move.' },

  { id: 'words-stay-readable', name: 'Its words stay readable in every state', severity: 'breaks',
    principle: 'What a button says must be readable in every state it passes through, not only at rest: mid-gesture is when people check what they are committing to.',
    sources: [src('WCAG 2.2, 1.4.3 Contrast (Minimum)', `${WCAG}#contrast-minimum`), src('Plumber: craft/words-on-layers (words follow their ground)', null)],
    checked: true,
    measure: 'plumber’s contrast and words-on-layers rules at rest, pointed at, mid-gesture and done',
    holds: 'Its words read clearly at every moment, including mid-gesture.',
    fails: (m) => `${m.when}, ${m.says.charAt(0).toLowerCase()}${m.says.slice(1)}`,
    fix: 'Keep the words on their ground: redraw them in the fill’s own ink, clipped at the fill’s edge (as hold-to-confirm does), or move them out of the fill’s path.' },

  { id: 'progress-shows', name: 'You can see your progress', severity: 'breaks',
    principle: 'A hold or a drag commits only at the end; the part done has to stand clearly apart from the part to go, or people let go too early or hold on not knowing.',
    sources: [src('WCAG 2.2, 1.4.11 Non-text Contrast (3:1 for the states of a control)', `${WCAG}#non-text-contrast`)],
    checked: true, appliesTo: ['held-time', 'threshold'],
    measure: 'contrast between the fill and the track it grows over, from the recorded colours',
    holds: 'The fill stands out from the track, so it is always clear how far there is to go.',
    fails: (m) => `The fill and the track differ by only ${m.ratio}:1, so progress is hard to see.`,
    fix: 'Make the fill a clear step deeper (3:1 against the track), in the product’s own colour.' },

  { id: 'can-back-out', name: 'You can back out mid-gesture', severity: 'breaks',
    principle: 'Starting a gesture must not commit you: letting go early, or sliding away, has to undo it.',
    sources: [src('WCAG 2.2, 2.5.2 Pointer Cancellation', `${WCAG}#pointer-cancellation`), src('Nielsen Norman Group heuristic #3, User control and freedom: a clearly marked emergency exit', NNG)],
    checked: true, appliesTo: ['held-time', 'threshold', 'confirm', 'countdown'],
    measure: 'the recipe’s cancel paths, read from its source (release early, move away, Escape)',
    holds: 'Letting go early takes it back, so a half-meant gesture never commits.',
    fails: () => 'Once started, it can’t be taken back.',
    fix: 'Let a release before the end undo the gesture, and Escape cancel it.' },

  { id: 'no-drag-needed', name: 'There is a way that needs no drag', severity: 'breaks',
    principle: 'Anything done by dragging must also be doable with a single press or the keyboard, for people who can’t drag precisely.',
    sources: [src('WCAG 2.2, 2.5.7 Dragging Movements (AA)', `${WCAG}#dragging-movements`), src('WCAG 2.2, 2.5.1 Pointer Gestures (A)', `${WCAG}#pointer-gestures`)],
    checked: true, appliesTo: ['threshold'],
    measure: 'a keyboard or single-press path in the recipe’s source',
    holds: 'It also works from the keyboard, so nobody is shut out by the drag.',
    fails: () => 'It can only be done by dragging; anyone who can’t drag precisely can’t buy.',
    fix: 'Let Enter or a plain press complete it as well as the drag.' },

  { id: 'big-enough', name: 'It is big enough to hit', severity: 'weakens',
    principle: 'The thing you press needs room for a finger: small targets cause missed and mistaken presses.',
    // Apple's 44 is its default control size on iPhone (its floor is 28); Material asks for 48. 44 is the gentler of the two.
    sources: [src('Apple Human Interface Guidelines, Accessibility: default control size on iOS 44×44 pt (minimum 28×28 pt)', 'https://developer.apple.com/design/human-interface-guidelines/accessibility'),
      src('Material Design 3: consider making touch targets at least 48×48 dp', 'https://m3.material.io/foundations/designing/structure'),
      src('WCAG 2.2, 2.5.8 Target Size (Minimum): at least 24×24 CSS px (AA)', `${WCAG}#target-size-minimum`)],
    checked: true,
    measure: 'the rendered size of the part you press',
    holds: 'Its target is comfortably big for a finger.',
    fails: (m) => `The part you press is ${m.size}, under the 44 pt Apple makes its own controls on a phone.`,
    fix: 'Give the pressable part at least 44 px in each direction.' },

  { id: 'motion-purposeful', name: 'Its motion is quick and respects reduced motion', severity: 'weakens',
    principle: 'Interface motion should be brief and say something; people who ask for reduced motion should get the same states without the travel. Motion that goes on while the control says it is waiting is a progress indicator, which may run as long as the wait, but it too must stop for reduced motion.',
    // Material's longest suggested pair is 500 ms (emphasised, for a transition that begins and ends on screen); a
    // control's own movement should be no longer than that.
    sources: [src('Material Design 3, easing and duration: suggested transitions run 200–500 ms', 'https://m3.material.io/styles/motion/easing-and-duration/applying-easing-and-duration'),
      src('Apple Human Interface Guidelines, Motion: aim for brevity and precision in feedback animations; make motion optional', 'https://developer.apple.com/design/human-interface-guidelines/motion'),
      src('WCAG 2.2, 2.3.3 Animation from Interactions (AAA): motion triggered by interaction can be disabled', `${WCAG}#animation-from-interactions`)],
    checked: true,
    measure: 'reduced-motion handling read from the source; how long its movements take, from the recording',
    holds: 'Its motion is brief, and it calms down for people who ask for reduced motion.',
    fails: (m) => (m.reduced ? `Its movements run ${m.longestMs} ms, longer than a control’s motion should.` : 'It plays its motion even for people who ask their device to reduce motion.'),
    fix: 'Honour reduced motion (states change at once) and keep a control’s own motion short.' },

  { id: 'friction-fits-stakes', name: 'The effort fits the stakes', severity: 'weakens',
    principle: 'Consequential, hard-to-undo actions deserve a deliberate step; everyday ones should not make people work. Both too little and too much friction cost trust.',
    sources: [src('Apple Human Interface Guidelines, Alerts: use alerts sparingly; avoid them for common, undoable actions', 'https://developer.apple.com/design/human-interface-guidelines/alerts'),
      src('Material Design 3, Dialogs: purposefully interruptive, so use them sparingly', 'https://m3.material.io/components/dialogs/guidelines'),
      src('Nielsen Norman Group heuristic #5, Error prevention: a confirmation option before people commit', NNG)],
    checked: true,
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
