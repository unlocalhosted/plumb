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
    line: heading ? `This heading breaks across ${lines} lines with uneven lengths. Use text-balance.` : `This text runs ${lines} lines with no care for its last one. Use text-pretty.`,
    reason: heading ? 'Balanced lines read as one thought.' : 'Pretty wrapping avoids a lonely last word.',
  }),
  'continuous-corners': ({ r }) => ({
    label: 'Corners could be smoother',
    line: `${px(r)} round corners on a large surface. A squircle corner looks softer at the same size.`,
    reason: 'Curvature that eases in looks gentler than a circle’s arc.',
  }),
  'optical-sizing': ({ family }) => ({
    label: 'Optical size turned off',
    line: `${family} has an optical-size axis, but it’s switched off here.`,
    reason: 'Small text gets sturdier shapes and large text finer ones when the font picks its optical size.',
  }),
  'tinted-shadow': ({ ground }) => ({
    label: 'Grey shadow on colour',
    line: `A grey shadow on a ${ground} ground looks dirty. Tint it with the ground’s hue.`,
    reason: 'Real shadows on colour take the colour, darker.',
  }),
  'eased-scrim': () => ({
    label: 'Scrim has a hard edge',
    line: 'This fade over the image is a straight line from dark to clear, so its edge shows.',
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
    line: `Text of two sizes side by side, centred, so their baselines are ${px(off)} apart. Line them up on the baseline.`,
    reason: 'Tops and centres of different sizes don’t line up to the eye; baselines do.',
  }),
  'icon-cap': ({ off }) => ({
    label: 'Icon sits off the text',
    line: `The icon’s centre is ${px(Math.abs(off))} ${off > 0 ? 'below' : 'above'} the middle of the capitals beside it.`,
    reason: 'Centring on the line box puts icons low; the eye reads the capitals’ middle.',
  }),
  'trim-leading': ({ pad, seen }) => ({
    label: 'Padding looks bigger than it is',
    line: `${px(pad)} of padding above these words looks like ${px(seen)}: the line adds its own space.`,
    reason: 'A text box carries invisible space above and below the letters.',
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
  // ── headless rules (pairs, probes, structure: craft-headless.js) ──
  // ── end of headless rules ──
};

// A rule's words as the finding's fields: what (its label), title (its line), because (its reason).
export function say(rule, n = {}) {
  const w = CRAFT[rule.replace(/^craft\//, '')]?.(n);
  return w ? { what: w.label, title: w.line, because: w.reason } : {};
}
