/* ─────────────────────────────────────────────────────────
 * WORDS · React Plumber overlay
 *
 * Every sentence the overlay says, in one voice (docs/copy/voice.md): plain words, the thing you can see first, real
 * numbers, one idea per sentence, nothing about ourselves. Code passes numbers; this file turns them into words, so
 * the voice lives here and nowhere else.
 *
 *  craft     per rule: label (a panel row, ≤ 32), line (what `i` shows, ≤ 72), reason (the second `i`, ≤ 90)
 * ───────────────────────────────────────────────────────── */

const px = (n) => `${Math.round(n * 10) / 10}px`;

// The craft rules' words. Each takes the numbers its rule measured.
export const CRAFT = {
  'concentric-radius': ({ r, p, R, wanted }) => ({
    label: 'Corner doesn’t match its parent',
    line: `This ${px(r)} corner sits ${px(p)} inside a ${px(R)} corner. Use ${px(wanted)}.`,
    reason: 'Inner radius = outer radius minus the padding. Then the curves line up.',
  }),
  'inner-outer-spacing': ({ g, G }) => ({
    label: 'Group falls apart',
    line: `Items here are ${px(g)} apart, but the groups are only ${px(G)} apart.`,
    reason: 'People see things that are close together as one group.',
  }),
  'text-opacity': ({ o, near }) => ({
    label: 'Faded with opacity',
    line: `This text uses opacity ${o}. ${near ? `Use ${near}, the colour it shows as.` : 'Use a colour instead.'}`,
    reason: 'Opacity changes with whatever is behind the text.',
  }),
  'half-pixel': ({ x, y, line }) => ({
    label: line ? 'Blurry line' : 'Blurry text',
    line: `Moved by ${px(x)}, ${px(y)}, so it lands between pixels.`,
    reason: `${line ? 'Thin lines' : 'Text'} blur when they sit between two pixels.`,
  }),
  hairline: ({ dpr }) => ({
    label: 'Line too heavy',
    line: `This 1px line is ${dpr} pixels thick on a ${dpr}× screen.`,
    reason: 'A hairline should be one screen pixel thick.',
  }),
  'image-outline': () => ({
    label: 'Image blends into the page',
    line: 'This image’s edge is the same tone as the page around it.',
    reason: 'A faint inner outline gives it an edge.',
  }),
  'layered-shadow': ({ blur }) => ({
    label: 'Shadow is one big blur',
    line: `One ${px(blur)} blur looks like a smudge. Stack a few smaller ones.`,
    reason: 'Real shadows have a sharp part and a soft part.',
  }),
  'scale-from-zero': ({ name }) => ({
    label: 'Grows from nothing',
    line: `${name} starts at scale 0, so it seems to come from nowhere.`,
    reason: 'Start near full size, at 0.95, and fade in.',
  }),
  'z-index-war': ({ z }) => ({
    label: 'z-index too high',
    line: `z-index ${z} in the middle of the page.`,
    reason: 'Big numbers fight other components. Give the component its own layer instead.',
  }),
  'content-align': ({ pl }) => ({
    label: 'Text off the column',
    line: `This row’s words start ${px(pl)} in from the others.`,
    reason: 'Line up the words, not the boxes. Let the background stick out.',
  }),
  'button-padding': ({ side }) => ({
    label: 'Sides too tight',
    line: `${px(side)} on every side. Text buttons need about twice as much on the sides.`,
    reason: 'Words are wide, so equal padding looks cramped left and right.',
  }),
  'icon-side': ({ side, less }) => ({
    label: 'Too much space by the icon',
    line: `The icon side has the same ${px(side)} as the text side. Take ${px(side - less)} off it.`,
    reason: 'Icons carry their own space inside them.',
  }),
  measure: ({ chars }) => ({
    label: 'Lines too long',
    line: `About ${chars} characters a line. Readers lose their place after 75.`,
    reason: 'Short lines are easier to follow back to the start.',
  }),
  leading: ({ big, size, ratio }) => ({
    label: big ? 'Lines too far apart' : 'Lines too close',
    line: `${px(size)} text with line height ${ratio}. ${big ? 'Big text needs about 1.2.' : 'Body text needs about 1.5.'}`,
    reason: 'Bigger text needs less line height, smaller text more.',
  }),
  tracking: ({ caps, size }) => ({
    label: caps ? 'Capitals too tight' : 'Big text too loose',
    line: caps ? `${px(size)} capitals with no letter spacing.` : `${px(size)} text with extra letter spacing.`,
    reason: 'Small capitals need a little more space. Big text needs a little less.',
  }),
  'tabular-nums': () => ({
    label: 'Numbers don’t line up',
    line: 'Each digit here is a different width, so the column wobbles.',
    reason: 'Tabular numbers make every digit the same width.',
  }),
  'heading-widow': ({ word }) => ({
    label: 'One word on the last line',
    line: `“${word}” sits alone on the last line.`,
    reason: 'Balanced lines look intended.',
  }),
  'one-light': ({ up }) => ({
    label: 'Shadow from the wrong side',
    line: `This shadow falls ${up ? 'up' : 'sideways'}. Shadows on a page fall down.`,
    reason: 'Every shadow on a page should come from the same light.',
  }),
  'border-on-shadow': ({ color }) => ({
    label: 'Border fights the shadow',
    line: `A solid ${color} border on a raised surface.`,
    reason: 'A see-through border blends with what’s behind it.',
  }),
  contrast: ({ lc, size, need, large }) => ({
    label: 'Hard to read',
    line: `Contrast ${lc} at ${px(size)}. ${large ? 'Large' : 'Small'} text needs ${need}.`,
    reason: 'Measured with APCA, which tracks what people can actually read.',
  }),
  'disabled-contrast': ({ o, lc }) => ({
    label: 'Disabled text unreadable',
    line: `Faded to ${o}, the words drop to contrast ${lc}.`,
    reason: 'Opacity fades the words along with the button.',
  }),
  'hit-target': ({ w, h, min }) => ({
    label: 'Too small to tap',
    line: `${w}×${h}. People miss anything under ${min}×${min}.`,
    reason: 'The tap area can be bigger than what’s drawn.',
  }),
  'media-size': ({ mine, mode }) => ({
    label: 'One size off',
    line: `This one is ${mine}px. The rest of the list is ${mode}px.`,
    reason: 'Different sizes in one list look like a mistake.',
  }),
  'truncate-intent': () => ({
    label: 'Cut off, no way to see it',
    line: 'This text is cut off and nothing shows the rest.',
    reason: 'Put the full text in a title or a tooltip.',
  }),
  'scrollbar-gutter': () => ({
    label: 'Jumps when it scrolls',
    line: 'The content moves sideways when the scrollbar appears.',
    reason: 'A stable gutter keeps room for the scrollbar.',
  }),
  'bold-hover': () => ({
    label: 'Row jumps on hover',
    line: 'Bold on hover makes the words wider, so things move.',
    reason: 'Bold text is wider than regular text.',
  }),
  'hanging-quote': () => ({
    label: 'Quote mark inside the edge',
    line: 'The opening quote pushes the first line in.',
    reason: 'Hang the quote outside so the letters line up.',
  }),
  'caps-case': () => ({
    label: 'Punctuation sits low',
    line: 'Hyphens and brackets sit low between these capitals.',
    reason: 'The font’s case feature lifts them.',
  }),
  'gradient-space': () => ({
    label: 'Gradient goes grey',
    line: 'This gradient goes grey in the middle.',
    reason: 'Mixing in OKLCH keeps the colour bright.',
  }),
  'input-zoom': ({ size }) => ({
    label: 'Zooms on iPhone',
    line: `This field’s text is ${px(size)}. iPhone zooms in on anything under 16px.`,
    reason: 'Safari zooms in when the field is focused, and stays zoomed.',
  }),
  'anchor-offset': ({ id, header }) => ({
    label: 'Hidden under the header',
    line: `Linking to #${id} puts it under the ${px(header)} header.`,
    reason: 'scroll-margin-top leaves room for the header.',
  }),
  'middle-truncate': ({ text }) => ({
    label: 'Path cut at the wrong end',
    line: `${text} is cut at the end, where the name is.`,
    reason: 'Cut paths and ids in the middle.',
  }),
  'text-wrap-role': ({ heading, lines }) => ({
    label: heading ? 'Heading lines uneven' : 'Ragged paragraph',
    line: heading ? `This heading breaks into ${lines} uneven lines. Use text-balance.` : `${lines} lines, and the last one is left to chance. Use text-pretty.`,
    reason: heading ? 'Balanced lines read as one thought.' : 'Pretty wrapping avoids a lonely last word.',
  }),
  'continuous-corners': ({ r }) => ({
    label: 'Corners could be smoother',
    line: `${px(r)} round corners on a big surface. A squircle looks softer.`,
    reason: 'Curvature that eases in looks gentler than a circle’s arc.',
  }),
  'optical-sizing': ({ family }) => ({
    label: 'Optical size turned off',
    line: `${family} has an optical-size axis, but it’s switched off here.`,
    reason: 'With optical size on, small text gets sturdier shapes and big text finer ones.',
  }),
  'tinted-shadow': ({ ground }) => ({
    label: 'Grey shadow on colour',
    line: `A grey shadow on ${ground} looks dirty. Tint it with that colour.`,
    reason: 'Real shadows on colour take the colour, darker.',
  }),
  'eased-scrim': () => ({
    label: 'Scrim has a hard edge',
    line: 'This fade goes from dark to clear in a straight line, so its edge shows.',
    reason: 'An eased fade (more stops, dropping fast then slow) has no visible edge.',
  }),
  'pure-black-white': ({ black }) => ({
    label: black ? 'Pure black area' : 'Pure white area',
    line: black ? 'A large area of pure black. A tinted near-black reads better.' : 'A large area of pure white, outside your surface colour.',
    reason: black ? 'Pure black is harsh next to anything with colour.' : 'Your other surfaces are tinted; this one escaped.',
  }),
  'content-size': ({ w, need }) => ({
    label: 'Fixed width crushes its words',
    line: `This is fixed at ${px(w)}, and its words need ${px(need)}. Let it fit its words.`,
    reason: 'Fixed sizes break with real content and translations.',
  }),
  'baseline-align': ({ off }) => ({
    label: 'Words sit at different heights',
    line: `Two sizes, centred, so their baselines are ${px(off)} apart. Align them.`,
    reason: 'Tops and centres of different sizes don’t line up to the eye; baselines do.',
  }),
  'icon-cap': ({ off }) => ({
    label: 'Icon sits off the text',
    line: `The icon’s centre is ${px(Math.abs(off))} ${off > 0 ? 'below' : 'above'} the middle of the capitals beside it.`,
    reason: 'Centring on the line box puts icons low; the eye reads the capitals’ middle.',
  }),
  'trim-leading': ({ pad, seen }) => ({
    label: 'Padding looks bigger than it is',
    line: `${px(pad)} of padding looks like ${px(seen)}. The line adds its own space.`,
    reason: 'A text box carries invisible space above and below the letters.',
  }),
  'heading-lead': ({ above, below, want }) => ({
    label: 'Heading sits nearer what came before',
    line: `${px(Math.round(above))} above the heading, ${px(Math.round(below))} below. It reads as the end of the last part.`,
    reason: `A heading belongs to what it introduces: give it at least ${px(want)} above.`,
  }),
  'pair-spacing': ({ kind, ab, bc }) => (kind === 'order' ? {
    label: 'Subtitle sits far from its title',
    line: `The subtitle is ${ab.toFixed(2)}em from the title, but ${bc.toFixed(2)}em from the text below it.`,
    reason: 'Things that belong together sit closer than things that don’t.',
  } : {
    label: 'Heading drifts away from its text',
    line: `The text starts ${ab.toFixed(2)}em below its heading: further than the heading is tall.`,
    reason: 'Past about one line of the heading, the text stops reading as the heading’s.',
  }),
  'card-optical-padding': ({ top, left }) => ({
    label: 'Card looks taller on top',
    line: `The first letters sit ${px(Math.round(top))} from the top edge, ${px(left)} from the side.`,
    reason: 'The first line carries space above its capitals, so equal padding looks bigger on top.',
  }),
  'weight-levels': ({ w, used }) => ({
    label: 'One weight too many',
    line: `Weight ${w} appears here, but the page mostly uses ${used}. Use one of those.`,
    reason: 'Two or three weights make a clear hierarchy; every extra level weakens the others.',
  }),
  'grey-levels': ({ used }) => ({
    label: 'One grey too many',
    line: `This text grey isn’t one of the ${used} greys the page mostly uses.`,
    reason: 'Two or three text colours make a clear hierarchy; a fourth reads as a mistake.',
  }),
  rhythm: ({ g, steps }) => ({
    label: 'Off the page’s rhythm',
    line: `This stack is ${px(g)} apart; the page keeps to ${steps}.`,
    reason: 'Repeating a few gaps down the page is what makes it feel even.',
  }),
  'optical-centre': ({ by, dir }) => ({
    label: 'Icon looks off-centre',
    line: `Centred by its box, the icon looks off. Move it ${px(by)} ${dir}.`,
    reason: 'The eye centres a shape by its weight, not its box.',
  }),
  overshoot: ({ rd, sq }) => ({
    label: 'Round icon looks smaller',
    line: `The round icon is ${px(rd)}, the square ones ${px(sq)}. Make it a bit bigger.`,
    reason: 'A circle covers less than a square of the same width, so it reads smaller.',
  }),
  'stroke-weight': ({ w, usual, big }) => ({
    label: big ? 'Icon stroke too heavy' : 'Icon stroke doesn’t match',
    line: big ? `This big icon’s stroke grew to ${px(w)}.` : `This icon’s stroke is ${px(w)}. Next to text this weight, you use ${px(usual)}.`,
    reason: 'An icon’s line should weigh what the words beside it weigh.',
  }),
  'scroll-cue': ({ x }) => ({
    label: 'Hidden content, no hint',
    line: `This area scrolls ${x ? 'sideways' : 'down'}, but has no scrollbar or fade to say so.`,
    reason: 'Without an edge cue, people think they’ve seen everything.',
  }),
  'press-feedback': ({ idiom }) => ({
    label: 'No response to a press',
    line: `Nothing changes on press. Your other buttons use ${idiom}.`,
    reason: 'A press that shows nothing feels like it didn’t register.',
  }),
  'exit-faster': ({ enter, exit }) => ({
    label: 'Leaves as slowly as it came',
    line: `It opens and closes in ${enter}ms. Close it in ${exit}ms.`,
    reason: 'People are done with it when they close it. Waiting feels slow.',
  }),
  interruptible: () => ({
    label: 'Can’t reverse midway',
    line: 'Open and close are keyframes, so closing midway jumps to the start.',
    reason: 'A transition reverses from where it is.',
  }),
  // ── headless rules (pairs, probes, structure: craft-headless.js) ──
  'dark-elevation': ({ blur }) => ({
    label: 'Shadow does nothing in dark',
    line: `This ${px(blur)} shadow can’t show on a dark surface.`,
    reason: 'In the dark, a surface rises by getting lighter, or by a light edge on top.',
  }),
  'dark-weight': ({ weight, size }) => ({
    label: 'Light text looks heavy on dark',
    line: `Weight ${weight}, ${px(size)}: light on dark looks bolder than on white.`,
    reason: 'Light text glows into a dark ground. Smooth it, or lighten the weight in dark.',
  }),
  'skeleton-match': ({ was, now }) => ({
    label: 'Skeleton is the wrong size',
    line: `The skeleton is ${px(was)} tall. What loads in is ${px(now)}.`,
    reason: 'When the real content lands, everything under it jumps.',
  }),
  'scroll-cue-seen': () => ({
    label: 'No sign there is more to scroll',
    line: 'The edges look the same at the top as at the end.',
    reason: 'People can’t tell more is hidden. Fade the edge that has more behind it.',
  }),
  'spinner-timing': ({ ms, press }) => ({
    label: 'Spinner flashes',
    line: press ? `The spinner shows ${ms}ms after the press and flashes on quick replies.` : `On a quick reply this spinner shows for just ${ms}ms.`,
    reason: 'A blink is worse than nothing. Wait 200ms, then keep it up for 500ms.',
  }),
  'press-feedback-probe': ({ first }) => ({
    label: 'No response to a press',
    line: first === null ? 'Nothing changes while this is pressed.' : `It answers a press after ${first}ms.`,
    reason: 'Answered within 100ms, a press feels connected. Later, it feels broken.',
  }),
  'interruptible-probe': () => ({
    label: 'Jumps when reversed',
    line: 'Closed halfway, it jumps back to the start of its exit.',
    reason: 'Keyframes restart from the first frame. A transition reverses from where it is.',
  }),
  'menu-pointerdown': () => ({
    label: 'Menu opens late',
    line: 'This menu waits for the mouse button to come back up.',
    reason: 'Opening on the press feels instant, and lets people press, drag and release to pick.',
  }),
  'tooltip-delay': ({ kind, ms }) => ({
    label: { quick: 'Tooltip flickers', slow: 'Tooltip is slow', skip: 'Next tooltip waits again', cool: 'Tooltip forgets too fast' }[kind],
    line: { quick: `The tooltip shows after ${ms}ms, so it flickers as the mouse passes.`, slow: `The tooltip takes ${ms}ms to show.`,
      skip: `Moving to the next tooltip waits ${ms}ms again.`, cool: `Coming back after 100ms waits ${ms}ms again.` }[kind],
    reason: { quick: 'Wait about 500ms for the first one, so a pass-over shows nothing.', slow: 'Past a second, people think there isn’t one. About 500ms works.',
      skip: 'Once one is open, the next should show at once.', cool: 'Keep the wait off for about 300ms after one closes.' }[kind],
  }),
  'palette-motion': ({ enter, combo }) => ({
    label: 'Shortcut opens slowly',
    line: `${combo} opens it with a ${enter}ms entrance.`,
    reason: 'A shortcut people use all day shouldn’t make them wait on motion.',
  }),
  'submenu-path': () => ({
    label: 'Submenu closes on the way',
    line: 'The submenu closes when the pointer crosses the next item.',
    reason: 'People cut corners. Give it a safe triangle, or 300ms of grace.',
  }),
  overdrag: ({ kind }) => ({
    label: kind === 'dead' ? 'Hard stop when dragged' : 'No limit when dragged',
    line: kind === 'dead' ? 'Drag it past its end and it stops dead.' : 'Drag it as far as you like and it follows, with no limit.',
    reason: 'Past its limit, something should give: move less than the pointer, then spring back.',
  }),
  'touch-manipulation': ({ drag }) => ({
    label: drag ? 'Page scrolls under the drag' : 'Tap flashes grey on phones',
    line: drag ? 'Dragging this also scrolls the page on a phone.' : 'Tapping this flashes it grey on a phone.',
    reason: drag ? 'Set touch-action: none, so the drag keeps the touch.' : 'Browsers add a grey tap highlight to custom controls. Turn it off.',
  }),
  // ── end of headless rules ──
};

// A rule's words as the finding's fields: what (its label), title (its line), because (its reason).
export function say(rule, n = {}) {
  const w = CRAFT[rule.replace(/^craft\//, '')]?.(n);
  return w ? { what: w.label, title: w.line, because: w.reason } : {};
}

// ── the fix panel ─────────────────────────────────────────
// docs/copy/voice.md and the better-writing skill (jakub.kr/skills#better-writing): plain words, one idea per
// sentence, verb-first buttons, parallel status ("Applying 3 changes…" → "3 changes applied"), an example in a
// placeholder, never an internal name. The panel passes numbers and names; every sentence it shows is made here.
const plural = new Intl.PluralRules('en');
const count = (n, one, other) => `${new Intl.NumberFormat('en').format(n)} ${plural.select(n) === 'one' ? one : other}`;
// what a property is called, for a type finding (tracking is letter spacing, not a size)
const TYPE = { 'letter-spacing': 'Letter spacing', 'line-height': 'Line height', 'font-size': 'Text size', 'font-weight': 'Weight', 'font-family': 'Font' };
// what an arbitrary class writes, as written: text-[length:calc(var(--z)*12px)] → calc(var(--z)*12px)
export const written = (cls) => { const m = /\[(?:[a-z-]+:)?(.+)\]!?$/.exec(String(cls ?? '')); return m ? m[1].replace(/_/g, ' ') : null; };
const FAMILY = { spacing: 'Spacing', radius: 'Corner', color: 'Colour', elevation: 'Shadow', shadow: 'Shadow', z: 'Layer order', motion: 'Timing' };

export const FIX = {
  // rest
  problems: (n) => count(n, 'problem', 'problems'),
  fixes: (n) => count(n, 'fix', 'fixes'),
  notes: (n) => count(n, 'note', 'notes'),
  // places are spots in your code; one drawn many times on the page says both
  // `here`: one element is read (an Alt+click), so what is drawn is counted inside it; the page beyond it is said apart
  // ("The same code draws N other places on this page"), never as a second page count
  places: (n, shown = n, here = false) => (shown > n ? `${count(n, 'place', 'places')} in your code · ${shown} ${here ? 'here' : 'on the page'}` : count(n, 'place', 'places')),
  // what a screen reader hears when a fix is put in hand
  inHand: (position, cls, what, n) => `${position}: ${cls}. ${what}, ${count(n, 'place', 'places')}.`,
  // where this one is among its kind: fixes are counted apart from notes, as the resting line counts them
  position: (g, list, isNote) => { const same = list.filter((x) => !!isNote(x) === !!isNote(g)); return `${isNote(g) ? 'Note ' : ''}${same.indexOf(g) + 1} of ${same.length}`; },
  stillChecking: 'checking…',
  unchecked: (n) => `${count(n, 'element', 'elements')} can’t be checked`,
  uncheckedTitle: 'Not in your code: drawn by a library, or added to the page at runtime.',
  checking: 'Checking this page…',
  checkingElement: 'Checking this element…',
  // the text editor (docs/design/text-editor.md): Alt+click on words opens their own values, problem or not
  text: {
    region: (name) => `Edit ${name}`,
    labels: { style: 'Style', 'font-size': 'Size', 'font-weight': 'Weight', 'line-height': 'Leading', 'letter-spacing': 'Tracking', 'text-transform': 'Case', color: 'Colour' },
    cases: { none: 'As written', uppercase: 'UPPER', lowercase: 'lower', capitalize: 'Title' },
    // the same cases inside a sentence: "Changed case to title case on Link", "uppercase from the page"
    casesSaid: { none: 'as written', uppercase: 'uppercase', lowercase: 'lowercase', capitalize: 'title case' },
    lists: (name) => `${name}, lists`,
    fromPage: (v) => `${v} from the page`,
    fromStyle: (name) => `From ${name}`,
    notStyle: (name) => `Set here, not from ${name}`,
    closest: (name) => `Closest: ${name}`,
    noStyle: 'No style',
    // the hierarchy, on the scale (overlay/src/hierarchy.js): the element's role among its peers
    fitsHere: 'fits its place',
    breaksHere: 'breaks the order',
    // a level at the same size is set apart by weight, never "below" or "above" it
    fitsSize: (role, up, down) => `Fits as the ${role}${up ? (up.same ? `, at the ${up.role}’s size (${up.n}px) in a lighter weight` : `, below the ${up.role} (${up.n}px)`) : ''}${down ? `${up ? ' and' : ','} ${down.same ? `at the ${down.role}’s size (${down.n}px) in a heavier weight` : `above the ${down.role} (${down.n}px)`}` : ''}.`,
    fitsWeight: (role, beside) => beside.length ? `Fits as the ${role}: at this size, its weight sets it apart from the ${beside.join(' and the ')}.` : `Fits as the ${role}.`,
    closestShort: (name) => `closest ${name}`,
    dragOr: 'Drag the field, or',
    letGo: 'Let go to use it',
    use: 'use',
    back: 'back',
    cancel: 'cancel',
    reach: (n) => n === 1 ? 'The same code draws 1 other place on this page. A change here changes it too.' : `The same code draws ${n} other places on this page. A change here changes them too.`,
    byHand: (v) => `${v}, typed by hand. Pick it to use the step.`,
    offScale: (v, lo, hi) => lo && hi ? `${v} isn’t in your scale. Nearest: ${lo} or ${hi}.` : `${v} isn’t in your scale. Nearest: ${lo ?? hi}.`,
    setIn: (why) => `Set in code: ${String(why ?? '').replace(/\.$/, '')}.`,
    empty: (label) => `Your theme has no ${label.toLowerCase()} steps.`,
    down: 'React Plumber isn’t running, so nothing can be written.',
    unreachable: 'Can’t find where this is written, so it can’t be edited.',
    problems: (n) => `${n} ${n === 1 ? 'problem' : 'problems'} here`,
    show: 'Show',
    // a value the page works out (clamp, var, calc): what it shows now, and the value as written
    fluid: (v, now) => `Fluid: ${v}. ${now} at this width.`,
    inCode: 'Change it in your code.',
    // a style sets a fixed size, which would replace the fluid one
    styleFluid: 'The size is fluid, and a style would fix it. Change it in your code.',
    // digits typed that aren't a step: the step Enter uses
    typedNearest: (typed, step) => `${typed} isn’t a step. Enter uses ${step}, the nearest.`,
    ownBox: 'Its own box (⌥↑): padding, shadow, motion. ⌥↓ comes back.',
    // a text style worn, but not measured: the size the words have here
    styleHere: (px) => `${px} here`,
    styleDiffers: (name, step, here) => `${name} is ${step}, but these words measure ${here}: something else sets their size.`,
    // the classes come in through a prop of another name where it's used: the card can't write that prop
    passedIn: (prop) => `Its classes come in as ${prop} where it’s used, so they can’t be changed here. Change them in your code.`,
    upBox: 'Up to the box that holds these words (⌥↑). ⌥↓ comes back.',
    changed: (label, to, name) => `Changed ${label.toLowerCase()} to ${to} on ${name}`,
    styled: (style, name) => `${name} uses ${style} now`,
  },
  // the element card (elementcard.js): any element that isn't words. Shadow › and Motion › open their own editors
  card: {
    region: (name) => `Edit ${name}`,
    shadow: 'Shadow',
    motion: 'Motion',
    none: 'None',
    setInCode: 'Set in code',
    // the levels above an element, in its card's header (⌥↑ goes up one, ⌥↓ back down)
    levels: 'Levels above it',
    exitIdle: 'Its exit plays when something sets data-state="closed" on it. Nothing does yet, so only the entrance plays.',
    upOne: 'Up a level (⌥↑). ⌥↓ comes back.',
    upTo: (tag) => `Up to this ${tag}`,
    // where its classes are written (locate.js classSiteOf): nowhere it can be changed, or in more than one place
    builtInCode: 'Its classes are built in code, so they can’t be changed here. Change them in your code.',
    splitClasses: 'These classes are written in different places, so they can’t be changed in one go. Change them in your code.',
    // a class added where the element's classes come from its component's own code, when where it is used isn't known
    addShared: 'A class added here goes inside its component, so it would change every copy. Add it where this one is used, in your code.',
    triggers: { hover: 'On hover', press: 'On press', focus: 'On focus', enter: 'Entrance', exit: 'Exit', layout: 'On layout' },
    tabs: { hover: 'Hover & press', enter: 'Entrance' },
    strip: { shadow: 'Shadows', hover: 'Hover and press', enter: 'Entrances' },
    stripHint: 'Point at one to try it on your element. Click to take it.',
    now: 'now',
    yours: 'yours',
    same: (name) => `= ${name}`,
    close: (name) => `≈ ${name}`,
    fresh: 'new',
    needs: 'motion/react',
    pickShadow: 'Pick a shadow in the strip. Each one is tried on your element as you point at it.',
    pickMotion: 'Pick a motion in the strip. Each one plays on your element.',
    yoursSay: 'yours',
    useYours: (name) => `Use your ${name}`,
    addAnyway: (name) => `Add ${name} anyway`,
    addOne: 'Add one for this',
    everywhere: 'Change yours everywhere',
    from: (library, licence) => [library, licence].filter(Boolean).join(' · '),
    light: (deg, height, soft) => `${deg}° · height ${height} · softness ${soft}`,
    sun: 'Light. Drag it to move it.',
    overshoots: 'overshoots',
    settles: 'settles',
    spring: 'A spring: it settles by itself. Drag the time to speed it up.',
    moves: (n) => `moves ${n}px`,
    scales: (n) => `scales to ${n}`,
    writes: 'Writes',
    reading: 'Reading what it writes…',
    nothing: (name, what) => `${name} already uses ${what}. Nothing to write.`,
    blocked: 'Needs motion/react, which this project doesn’t have. Nothing is written.',
    writeIt: 'Write it',
    pickOne: 'Pick one',
    play: 'Play',
    back: 'back',
    used: (name, recipe, files) => `${name} uses ${recipe} now${files.length ? ` · wrote ${files.join(', ')}` : ''}`,
    // layout (layoutcard.js)
    layout: 'Layout',
    flex: 'Flex', grid: 'Grid',
    layoutNow: (mode, more) => [mode === 'grid' ? 'Grid' : mode === 'flex' ? 'Flex' : 'Block', more].filter(Boolean).join(' · '),
    stacked: 'Stacked', sideBySide: 'Side by side', oneLine: 'One line', wraps: 'Wrap onto new lines',
    direction: 'Direction', wrap: 'Wrap',
    columns: 'Columns', columnsHint: 'drag the lines on the element',
    nColumns: (n) => `${n} ${n === 1 ? 'column' : 'columns'}`,
    nextTrack: 'Click for the next size. Drag the line on the element to resize.',
    addColumn: 'Add a column', removeColumn: 'Remove the last column',
    follow: 'Rows follow these columns',
    followTag: 'subgrid',
    followOn: 'Each row’s own columns follow the grid, so what’s in the rows lines up down the list.',
    followOff: 'Each row is one cell of the grid.',
    noRows: 'Rows follow these columns needs rows inside it.',
    asWritten: 'This is how it’s written now.',
    putBack: 'Put back',
    layouts: 'Layouts',
    layoutsHint: 'Your element, laid out each way. Point at one to try it. Click to take it.',
    options: { stack: 'Stacked', row: 'Side by side', two: 'Two columns', lined: 'Lined up', fit: 'Fit as many as fit' },
    kinds: { flex: 'flex', grid: 'grid', sub: 'grid + subgrid' },
    laidOut: (name, mode, sub) => `${name} is ${mode === 'grid' ? (sub ? 'a grid now, its rows follow its columns' : 'a grid now') : 'a flex layout now'}`,
    line: (n) => `Drag to resize the columns either side of line ${n}`,
    // the spacing grammar, on the element
    spacing: 'Spacing',
    spacingHint: 'point at an edge on the element',
    spacingKeys: [['Scroll', 'or drag a band, a step at a time'], ['⇧', 'the pair'], ['⌘', 'all sides']],
    sides: { top: 'top', right: 'right', bottom: 'bottom', left: 'left' },
    what: (kind, sides) => kind === 'gap' ? 'gap' : `${kind === 'pad' ? 'padding' : 'margin'} ${sides.length === 4 ? 'all sides' : sides.length === 2 ? `${sides[0]} and ${sides[1]}` : sides[0]}`,
    mates: (n) => `${n + 1} like it, one line of code`,
    fitBetween: (inside, around) => `Between: at least the space inside (${inside})${around ? `, at most the padding around (${around})` : ''}.`,
    fitAround: (between) => `Around: at least the gap between (${between}).`,
    fitInside: (between) => `Inside: at most the gap between (${between}).`,
    spaced: (name, what, px, mates) => `${name}: ${what} ${px}px${mates ? ` · ${mates + 1} places, one line of code` : ''}`,
    // tidy this card (tidycard.js): the rules as sentences, never their ids
    // the step a write is in History's timeline: what the person did, in a word (history.js names the tick after it)
    steps: {
      edit: 'Edit', shadow: 'Shadow', motion: 'Motion', layout: 'Layout', spacing: 'Spacing', tidy: 'Tidy', fix: 'Fix', styles: 'Text styles',
      text: (key) => ({ 'font-size': 'Size', 'line-height': 'Leading', 'letter-spacing': 'Tracking', 'font-weight': 'Weight', 'text-transform': 'Case', color: 'Colour', 'font-family': 'Font' }[key] ?? 'Text'),
    },
    tidy: {
      button: 'Tidy this card',
      title: 'Tidy',
      none: 'Nothing to tidy. This card already keeps its own order.',
      count: (n) => `${n} ${n === 1 ? 'change' : 'changes'}`,
      holdSpace: 'Hold Space to see it as it was',
      asItWas: 'As it was',
      theCard: 'the card',
      of: (who) => `of ${who}`,
      props: { 'font-size': 'Size', 'font-weight': 'Weight', gap: 'Space inside', padding: 'Padding', radius: 'Corner', 'margin-top': 'Space above' },
      // one change to every copy the code draws of the same thing
      like: (n) => `${n} like it.`,
      value: (prop, v) => prop === 'font-weight' ? ({ 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' }[v] ?? String(v)) : `${v}px`,
      rules: {
        T3: 'Like the same line in the cards beside it.',
        T1: 'A step below the line above it, so the order reads.',
        S2: 'The gaps inside are even.',
        S1: 'Space inside the card is less than the space between cards.',
        S3: 'Space around the card is at least the space between cards.',
        L2: 'Its corner sits inside the card’s corner.',
      },
      noPlace: (what) => `${what} is left alone: it isn’t written anywhere it can be changed.`,
      tidied: (name, n) => `Tidied ${name}: ${n} ${n === 1 ? 'change' : 'changes'}`,
    },
  },
  // an Alt+click reads one element; its fix changes a line of code that also draws other places on the page
  // drawn copies are counted as copies, never as places (a place is a spot in the code): "here" inside the element read,
  // "more outside it" past it, one unit for both
  elsewhere: (n) => n === 1 ? 'The same code draws 1 more outside it on this page. The fix changes it too.' : `The same code draws ${n} more outside it on this page. The fix changes them too.`,
  clear: 'Nothing to fix on this page.',
  clearChecked: (n) => `Nothing to fix in what was checked. ${count(n, 'element', 'elements')} can’t be checked.`,
  start: 'Fix',
  applied: (n) => `${count(n, 'change', 'changes')} applied`,
  // a fix writes the moment it is taken: while it is written, then what it changed and where, with Undo
  writing: 'Writing it to your code…',
  added: (name, file) => `Added ${name} to ${String(file ?? '').split('/').pop()}`,
  addedUsed: (name, file, cls, n) => `Added ${name} to ${String(file ?? '').split('/').pop()} and used ${cls} at ${count(n, 'place', 'places')}`,
  changed: (from, to, n) => `Changed ${from} to ${to} at ${count(n, 'place', 'places')}`,
  kept: (n) => `Kept as is at ${count(n, 'place', 'places')}. It won’t be flagged again.`,
  undo: 'Undo',
  undoing: 'Undoing…',
  undone: 'Undone. Your code is back as it was.',
  couldNotUndo: (why) => /changed since/i.test(why ?? '') ? 'This file changed after the fix, so it can’t be undone here. Undo it in your editor.' : `Couldn’t undo. ${why ?? 'Check again.'}`,
  couldNot: 'Couldn’t apply. Check again.',
  changedSince: 'This file changed after we checked it. Check again.',
  // a cause whose places no element renders right now: in your code, in a part this page shows only sometimes
  offPage: (n) => n === 1 ? 'Nothing on the page shows this place right now. It’s in a part this page shows only sometimes. Fixing it still changes your code.' : `Nothing on the page shows these ${n} places right now. They’re in parts this page shows only sometimes. Fixing them still changes your code.`,
  // a cause whose every place is inside something closed: counted from your code, but nothing on screen to point at
  unseen: (n) => n === 1 ? 'You can’t see this place right now. It’s inside something closed, like a menu or a dialog. Fixing it still changes your code.' : `You can’t see these ${n} places right now. They’re inside something closed, like a menu or a dialog. Fixing them still changes your code.`,
  appliedSome: (done, total, why) => `${done} of ${count(total, 'change', 'changes')} applied. ${why ?? 'Couldn’t apply the rest. Check again.'}`,
  // a fix in hand: what is wrong, in a few words
  what(mark) {
    if (mark.family === 'craft') return mark.what ?? 'Doesn’t follow the craft rules';
    if (/framework/.test(mark.rule)) return 'Tailwind’s default, not yours';
    if (/by-value|matches/.test(mark.rule)) return 'Same value as a token, typed by hand';
    if (/tier/.test(mark.rule)) return 'A raw token where a named one fits';
    if (/dead-class/.test(mark.rule)) return 'Class does nothing';
    if (/existence/.test(mark.rule)) return 'Uses a variable that doesn’t exist';
    if (mark.family === 'color' && (mark.props ?? []).includes('box-shadow')) return 'Shadow colour not in your theme';
    const name = (mark.family === 'type' && TYPE[mark.props?.[0]]) || FAMILY[mark.family] || 'Value';
    return `${name} not in your theme`;
  },
  // what to do, in a sentence
  adopt: 'Add it to your theme and it’s yours. Nothing in your code changes.',
  adds: (name, value, file) => ({ code: `${name}: ${value}`, file }),
  newStep: (what, value) => `Your theme has no ${what.toLowerCase()} of ${value}. Name it to add it.`,
  newStepHint: (n) => (n === 1 ? 'Then this place uses it' : n === 2 ? 'Then both places use it' : `Then all ${n} places use it`),
  becomes: (n) => (n === 1 ? 'This place becomes' : n === 2 ? 'Both places become' : `All ${n} places become`),
  newStepBad: 'Use lowercase letters, numbers and dashes',
  newStepExample: 'wide',
  // a first name for a new step, by what it is (edited freely; Enter takes it as it is)
  nameFor(namespace, value) {
    const n = parseFloat(value);
    if (namespace === '--tracking') return n < 0 ? 'tight' : 'wide';
    if (namespace === '--leading') return n < 1.3 ? 'tight' : 'loose';
    if (/clamp\(|vw|vh/.test(value)) return 'fluid';
    return { '--spacing': 'gutter', '--radius': 'round', '--shadow': 'soft', '--text': 'display', '--font-weight': 'strong' }[namespace] ?? 'custom';
  },
  craftToken: 'Your theme has no step for this. This adds it, then uses it here.',
  // a value as the code has it: typed by hand (p-[18px]), or worked out from names that aren't tokens (H_TICKS + GAP)
  typed: (value, alone = true, worked = false) => `${worked ? `This works out to ${value}` : `${value} is typed by hand`}${alone ? ', and your theme has nothing close.' : '.'}`,
  // the value a class or a style expression writes, and whether it is worked out rather than typed
  valueOf: (mark, cls) => { const w = written(cls); return w != null ? { value: w, worked: false } : { value: mark.value, worked: !!cls && mark.value != null && !String(cls).includes(String(mark.value)) }; },
  // one place, in a sentence: what its outline says to a screen reader, and what the panel says when it has nothing to offer
  line(mark, cls = mark.text) {
    if (mark.family === 'craft') return mark.title;
    if (/dead-class/.test(mark.rule)) return `${cls} makes no CSS, so it does nothing.`;
    if (mark.family === 'color' && (mark.props ?? []).includes('box-shadow')) return 'This shadow’s colour isn’t in your theme.';
    if (/framework/.test(mark.rule) && mark.value) return FIX.tailwinds(cls, String(mark.value));
    const { value, worked } = FIX.valueOf(mark, cls);
    if (/^provenance\//.test(mark.rule) && !/by-value|matches|tier/.test(mark.rule) && value != null) return FIX.typed(value, false, worked);
    return mark.title;
  },
  outside: (file) => `Can’t check this. It’s written in ${file}, outside this project’s source. Add it to source in plumber.config.ts to check it.`,
  unreachable: 'Can’t reach this in your code, so it can’t be checked.',
  elementClear: 'Nothing to fix on this element.',
  shadowColour: 'The colour is part of this shadow. Use a shadow token for the whole value, or change the colour by hand.',
  tailwinds: (cls, value) => `${cls} is ${value}, from Tailwind’s defaults. Your theme doesn’t set it.`,
  // buttons
  use: (label) => `Use ${label}`,
  addToTheme: 'Add to theme',
  keep: 'Keep as is',
  keepWhy: 'Why keep it?',
  keepExample: 'Set by the brand guide',
  keepPlaces: (n) => `Keep ${count(n, 'place', 'places')}`,
  cancel: 'Cancel',
  skip: 'Skip',
};

// ── the dock ──────────────────────────────────────────────
// what the hover tag says about an element: its problems, or why there are none to say
export const TAG = {
  off: (n) => count(n, 'problem', 'problems'),
  clean: 'Matches your theme',
  styledBy: (name) => `Styled by ${name}`,
  computed: 'Classes built in code',
  unstyled: 'No styles of its own',
  trying: 'Trying a fix',
  checking: 'Checking…',
  outside: 'Outside this project',
  notReact: 'Not drawn by React',
  library: 'Drawn by a library',
  noMap: 'No source map',
  notPlaced: 'Not in your code',
  known: 'Known, recorded as intended',
};

// the first time: one fix, walked through
export const WALK = {
  1: (line) => `${line} Click it.`,
  2: '↑ ↓ to try another option. Enter puts it in your code.',
  3: 'In your code now. Undo is right above it.',
  4: 'Fixed. Nothing left to fix here.',
};

export const DOCK = {
  starting: 'Checking your project…',
  failed: 'Couldn’t start. Check your dev server’s terminal.',
  select: 'Click an element to inspect it · Esc',
  idle: 'Hold Alt to inspect',
  // while Blueprint is on, the fix bar has the count: the dock only says how to leave
  blueprint: 'Alt+B to close',
  // one element is read: Alt+B widens to the whole page, it does not close
  blueprintScoped: 'Alt+B for the whole page',
  applyChanges: (n) => `Apply ${count(n, 'change', 'changes')}`,
  history: 'History',
  historyTitle: 'Changes you applied. Undo any of them.',
  help: 'Keyboard shortcuts',
  helpTitle: 'Keyboard shortcuts (?)',
  blueprintTitle: 'Show every problem on this page (Alt+B)',
  pick: 'Select an element',
  pickTitle: 'Select an element (or hold Alt)',
  setup: (n) => count(n, 'setup step left', 'setup steps left'),
  setupTitle: (first) => `${first} Open setup to finish it.`,
};

// ── setup ─────────────────────────────────────────────────
// A setup step in the person's terms, by its readiness id; a step not listed keeps the server's words.
const FAMILY_WORDS = { spacing: 'spacing', color: 'colours', radius: 'corner radii', type: 'text styles', motion: 'timings', elevation: 'shadows', z: 'layer order (z-index) steps' };
export const SETUP = {
  title: 'Your setup',
  lead: (n) => `${count(n, 'setup step', 'setup steps')} left. Tick the ones to fix.`,
  required: 'Required',
  recommended: 'Recommended',
  unconfirmed: 'Not confirmed yet',
  fixed: 'Fixed',
  saved: (file) => `Saved to ${file}. Your dev server restarts, then this list updates.`,
  checkAgain: 'Check again',
  selected: (n) => (n ? `${n} selected` : 'Nothing selected'),
  written: (n) => `${count(n, 'change', 'changes')} written`,
  runThem: (n) => (n === 1 ? '1 selected · run it in your terminal, or copy it for your agent' : `${n} selected · run them in your terminal, or copy them for your agent`),
  copyForAgent: 'Copy for agent',
  copied: 'Copied',
  apply: (n) => `Apply ${n}`,
  applying: 'Applying…',
  applyTitle: 'Writes these changes to your config',
  step(q) {
    const tokens = /^read\.tokens\.(\w+)$/.exec(q.id)?.[1];
    if (tokens) return { title: `Add ${FAMILY_WORDS[tokens] ?? tokens} to your theme`, loses: `Without them, ${FAMILY_WORDS[tokens] ?? tokens} can’t be checked against your theme.` };
    return {
      'fast.config': { title: 'Make checks faster', loses: 'Without a config file, every check starts from scratch.' },
      'remember.baseline': { title: 'Start from today’s problems', loses: 'Every problem counts as new, so CI fails on all of them. Record today’s once you’ve looked them over, and only new ones fail.' },
      'write.watcher': { title: 'Check that saving updates the page', loses: 'Save any file once. If the page doesn’t update, applied changes won’t show until you reload.' },
      'locate.react-dev': { title: 'Use the development build', loses: 'In a production build, clicking an element may not find its component.' },
    }[q.id] ?? { title: q.title, loses: q.loses };
  },
};

// The history timeline (history.js): one tick per change, one segment per step
export const TIMELINE = {
  title: 'History',
  slider: 'Changes, oldest to newest',
  now: 'Now',
  notHere: 'Not on this page',
  // a run of changes edited outside React Plumber (a git checkout, a hand edit), drawn as one tick
  outside: 'Edited outside',
  changedSince: 'Changed since',
  changedRun: (n) => `${n === 1 ? 'A change' : `${n} changes`} changed again by later ones. Undo those first.`,
  outsideRun: (n) => `${n === 1 ? 'A change' : `${n} changes`} edited outside React Plumber since. Undo ${n === 1 ? 'it' : 'them'} in your editor.`,
  goBack: 'Go back to here',
  applied: (n) => `Applied ${n} changes`,
  past: (n) => `Showing the page as it was before the last ${n === 1 ? 'change' : `${n} changes`}. Nothing is written until you choose.`,
  empty: 'Nothing changed yet. What you write shows up here.',
  error: 'Couldn’t read the history. Check the dev server, then reopen this.',
  undoChange: 'Undo change',
  undoStep: 'Undo step',
  close: 'Close history',
  undo: 'Undo',
  undoing: 'Undoing…',
  undone: (from, to) => `Undone: ${from} → ${to}`,
  undoneStep: (n) => `Undid ${n} ${n === 1 ? 'change' : 'changes'}`,
  // why a change can't be taken back here, and what to do instead
  undoneAlready: 'This change is already undone.',
  changedByHand: 'Edited outside React Plumber, so it can’t be undone here. Undo it in your editor.',
  changedLater: 'Changed again by a later change. Undo that one first.',
  failed: (why) => `Couldn’t undo. ${why}`,
  // a step's name when its write didn't name it and it only undoes
  undoStepName: 'Undo',
  valuetextOutside: (i, n, said) => `Change ${i} of ${n}: ${said}`,
  valuetext: (i, n, step, from, to, laws) => `Change ${i} of ${n}, ${step}: ${from || 'nothing'} to ${to || 'nothing'}${laws.length ? `, ${laws.join(', ')}` : ''}`,
};

// Clean up this page (cleanup.js): the page in passes, each applied as one step
export const CLEANUP = {
  start: 'Clean up this page',
  passes: 'Passes',
  pass: { text: 'Text', spacing: 'Spacing', colour: 'Colour', icons: 'Icons' },
  reading: 'Reading the text on this page…',
  head: (before, n) => `Your site uses ${before} text sizes. These ${n} styles cover them.`,
  why: 'Worked out from every page Plumber has read, so every page ends up with the same styles.',
  law: 'Why: text that does the same job should look the same everywhere (law of similarity).',
  ladder: 'Text styles',
  onPage: (n) => `${n} on this page`,
  sizesPage: 'text sizes on this page',
  sizesSite: 'text sizes on the site',
  changes: 'bits of text change size',
  apply: 'Apply to this page',
  preview: 'Preview',
  skip: (what) => `Skip ${what}`,
  previewing: (n) => `Previewing ${n} ${n === 1 ? 'change' : 'changes'}`,
  holdSpace: 'Hold <kbd>Space</kbd> to compare',
  cancel: 'Cancel',
  writing: (n) => `Saving ${n} ${n === 1 ? 'change' : 'changes'}…`,
  // every place rewritten to a style (some keep their size, so this can be more than the changes previewed)
  saved: (places, files) => `${places} ${places === 1 ? 'place' : 'places'} in ${files} ${files === 1 ? 'file' : 'files'} now use${places === 1 ? 's' : ''} these styles`,
  undo: 'Undo',
  undone: 'Text changes undone.',
  lost: 'Your dev server restarted while saving, so nothing was written. Try again.',
  reloaded: 'The page reloaded before saving finished, so nothing was written. Try again.',
  close: 'Close',
  done: 'Done',
  next: 'Next pass',
  nothing: (n) => `This page already uses your ${n} text styles.`,
  nothingWhy: 'Nothing on this page needs to change size.',
  doneHead: 'Text is cleaned up on this page.',
  doneSkipped: 'You skipped text on this page.',
  notYet: 'Spacing, colour and icons come to Plumber next.',
  noCensus: 'Plumber hasn’t read your whole site yet.',
  noCensusWhy: 'Text styles are worked out from every page, so each page ends up the same. Run this once in your project, then try again.',
  copy: 'Copy',
  copied: 'Copied',
  retry: 'Try again',
  couldNot: 'Couldn’t read this page’s text.',
  nextSpacing: 'Next: the space between things.',
  spacing: {
    reading: 'Reading the space between things on this page…',
    head: (before, after) => `This page has ${before} different spaces between things. After this, ${after}.`,
    // what the app's own scale is, said plainly: the pass stays on it
    scale: (s) => (s?.kind === 'linear' ? `Your spacing is a ${s.unit}px grid, so every new space is on it.`
      : s?.kind === 'geometric' ? `Your spacing grows by ×${s.ratio} a step, so every new space is one of those steps.`
      : s?.kind === 'hybrid' ? `Your spacing is a ${s.unit}px grid that grows by ×${s.ratio} for bigger spaces, so every new space is on it.`
      : `Plumber can’t tell your spacing’s scale yet, so it keeps to your ${s?.unit ?? 4}px spacing unit.`),
    law: 'Why: things that belong together sit closer than things that don’t (law of proximity).',
    list: 'Spaces that change',
    row: (n) => `${n} ${n === 1 ? 'place' : 'places'}`,
    sizesPage: 'spaces on this page',
    changes: 'spaces change',
    nothing: 'The space on this page already follows your scale.',
    nothingWhy: 'Nothing here needs to move.',
    saved: (places, files) => `${places} ${places === 1 ? 'space' : 'spaces'} in ${files} ${files === 1 ? 'file' : 'files'} now follow${places === 1 ? 's' : ''} your scale`,
    refused: (n) => `${n} left as ${n === 1 ? 'it is' : 'they are'}: Plumber couldn’t find where ${n === 1 ? 'its class is' : 'their classes are'} written.`,
    undone: 'Spacing changes undone.',
    doneHead: 'Spacing is cleaned up on this page.',
    doneSkipped: 'You skipped spacing on this page.',
    notYet: 'Colour and icons come to Plumber next.',
    couldNot: 'Couldn’t read this page’s spacing.',
  },
};
