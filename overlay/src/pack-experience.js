/* ─────────────────────────────────────────────────────────
 * PACK · EXPERIENCE · React Plumber overlay
 *
 * What only the drawn page shows, and what usually gets skipped (docs/briefs/rule-packs.md §4g). The owner's brief for
 * this pack: "triage and prioritise which often gets ignore and non obvious to linters". So none of these can be read
 * off the source: each needs the computed style, the laid-out box, what is on top of what, the fonts and requests the
 * page really made, or two elements far apart in the code compared with each other.
 *
 * Where they come from: Chrome's Modern Web Guidance 1.0.0 (Apache-2.0), across typography, respect-os-text-scale,
 * natural-interactions, accessibility, performance, dark-mode, motion, card and scrollability-affordance-hints. What
 * craft already says from the same advice is not repeated (line length, cut-off text, fixed heights, anchors under a
 * sticky header). Nothing of the guides' text is copied.
 * ───────────────────────────────────────────────────────── */

const WCAG = (sc, name) => ({ id: `wcag-${sc}`, name: `WCAG ${sc} ${name}` });
const GUIDE = (id) => ({ id: `mwg-${id}`, name: `Modern Web Guidance: ${id}`, guide: id });
const ADVISORY = { tier: 'advisory' };

// rule short name → [the guide it comes from, its spec entry, its words, further grounding]
const TABLE = {
  'nowrap-sentence': ['respect-os-text-scale', {}, ({ words }) => ({ label: 'Sentence that cannot wrap', line: `These ${words} words are held on one line.`, reason: 'On a narrow screen, or with larger text, the line runs off the side.' }), [WCAG('1.4.10', 'Reflow')]],
  'justify-rivers': ['typography', {}, () => ({ label: 'Justified with no hyphens', line: 'This text is justified and words are never broken.', reason: 'The spaces stretch to fill each line and open rivers of white down the paragraph.' }), []],
  'caps-long': ['typography', {}, ({ words }) => ({ label: 'A sentence in capitals', line: `${words} words here are set in capitals.`, reason: 'Capitals have no word shapes, so a sentence of them is read letter by letter.' }), []],
  'page-overflow-x': ['responsive-design', {}, ({ by, what }) => ({ label: 'Page scrolls sideways', line: `The page is ${by}px wider than the screen: ${what} runs past the edge.`, reason: 'Everything can be dragged sideways, and on a phone the page loads zoomed out.' }), [WCAG('1.4.10', 'Reflow')]],
  'motion-no-opt-out': ['motion', {}, ({ what }) => ({ label: 'Motion that cannot be turned off', line: `${what} moves for ever, and no style here answers "reduce motion".`, reason: 'People who get dizzy from movement set that preference, and this page does not listen.' }), [WCAG('2.2.2', 'Pause, Stop, Hide'), WCAG('2.3.3', 'Animation from Interactions')]],
  'font-display': ['visually-stable-font-fallbacks', {}, ({ family }) => ({ label: 'Text hidden while its font loads', line: `"${family}" loads with no font-display.`, reason: 'On a slow connection the words are invisible for up to three seconds, then appear.' }), []],
  'preconnect-missing': ['performance', ADVISORY, ({ host, count }) => ({ label: 'Cold start to another site', line: `${count} files come from ${host} with no preconnect.`, reason: 'The first of them waits for a lookup, a connection and a handshake that could have started with the page.' }), []],
  'script-blocking': ['performance', {}, ({ count }) => ({ label: 'Scripts that hold the page', line: `${count} scripts in the head stop the page being read until they run.`, reason: 'Nothing is drawn until each is fetched and run, in order.' }), []],
  'link-target-renamed': ['accessibility', ADVISORY, ({ name, other }) => ({ label: 'One place, two names', line: `"${name}" and "${other}" lead to the same page.`, reason: 'In a list of links they look like two places.' }), [WCAG('3.2.4', 'Consistent Identification')]],
  'button-name-reused': ['accessibility', {}, ({ name, count }) => ({ label: 'Many buttons, one name', line: `${count} buttons here are all named "${name}".`, reason: 'Out of their rows, in a screen reader’s list or said to voice control, they cannot be told apart.' }), [WCAG('4.1.2', 'Name, Role, Value'), WCAG('2.4.6', 'Headings and Labels')]],
  'state-in-label': ['accessibility', {}, ({ word, attr }) => ({ label: 'State said twice', line: `The label says "${word}", and so does ${attr}.`, reason: 'A screen reader reads the label, then the state: it is heard twice, or two ways that disagree.' }), []],
  'page-title': ['accessibility', {}, () => ({ label: 'Page with no title', line: 'The page has no title.', reason: 'The tab, the history and a screen reader’s first words are the address.' }), [WCAG('2.4.2', 'Page Titled')]],
  'skip-link': ['accessibility', ADVISORY, ({ count }) => ({ label: 'No way past the navigation', line: `${count} stops come before the page’s content and there is no skip link.`, reason: 'Someone on a keyboard presses Tab that many times on every page.' }), [WCAG('2.4.1', 'Bypass Blocks')]],
  'color-scheme-missing': ['dark-mode', {}, () => ({ label: 'Dark page, light browser parts', line: 'The page is dark and never tells the browser.', reason: 'Scrollbars, form controls and the flash before the page loads stay white.' }), []],
  'scroll-no-hint': ['scrollability-affordance-hints', {}, ({ hidden }) => ({ label: 'More to the side, and no sign of it', line: `${hidden}px of this row is off to the side, with no scrollbar and nothing cut off to show it.`, reason: 'Nothing says it scrolls, so what is past the edge is never found.' }), []],
  'scroll-keyboard': ['accessibility', {}, () => ({ label: 'Scrolls for the mouse only', line: 'This area scrolls and nothing in it takes focus.', reason: 'In browsers that do not focus scroll areas themselves, a keyboard cannot reach what is below.' }), [WCAG('2.1.1', 'Keyboard')]],
  'control-covered': ['card', {}, ({ what, by }) => ({ label: 'Something sits on top of this', line: `A ${by} covers this ${what} where it would be pressed.`, reason: 'The press lands on what is on top. It looks pressable and is not.' }), [WCAG('2.4.11', 'Focus Not Obscured (Minimum)')]],
};

export const EXPERIENCE = {
  id: 'experience',
  title: 'Experience',
  ground: 'Chrome Modern Web Guidance 1.0.0: what only the drawn page shows',
  source: { package: 'modern-web-guidance', version: '1.0.0', guide: 'typography, respect-os-text-scale, accessibility, performance, dark-mode, motion' },
  runs: 'page',
  guides: Object.fromEntries(Object.entries(TABLE).map(([short, [guide]]) => [short, guide])),
  spec: { access: Object.fromEntries(Object.entries(TABLE).map(([short, [, entry]]) => [short, entry])) },
  words: Object.fromEntries(Object.entries(TABLE).map(([short, [, , words]]) => [short, words])),
  laws: Object.fromEntries(Object.entries(TABLE).map(([short, [guide, , , more]]) => [short, [GUIDE(guide), ...more]])),
};
