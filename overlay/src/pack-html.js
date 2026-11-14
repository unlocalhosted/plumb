/* ─────────────────────────────────────────────────────────
 * PACK · HTML · React Plumber overlay
 *
 * What the HTML pack is (docs/briefs/rule-packs.md): its name, its ground, its rules' words and grounding. Plain data,
 * as pack-a11y.js is; the rules are in html-rules.js.
 *
 * Where the rules come from: Chrome's Modern Web Guidance (npm modern-web-guidance, read at 1.0.0 on 2026-11-14,
 * Apache-2.0), its `html` guide: 82 dos and don'ts in nine sections (semantics, grouping, resource priority, overlays,
 * disclosures, focus, forms, media, interactivity). A rule here is one of those bullets a drawn page shows. What the
 * accessibility, forms and components packs already say (names, headings in order, tabindex, autocomplete, dialogs)
 * is not said again. Nothing of the guide's text is copied: `npx modern-web-guidance retrieve html` has it.
 * ───────────────────────────────────────────────────────── */

const WCAG = (sc, name) => ({ id: `wcag-${sc}`, name: `WCAG ${sc} ${name}` });
const GUIDE = (section) => ({ id: 'mwg-html', name: `Modern Web Guidance: html, ${section}`, guide: 'html' });
const ADVISORY = { tier: 'advisory' };
const S1 = '1. Fundamental Semantics and Validation', S2 = '2. Content Grouping and Attribution', S3 = '3. Resource Prioritization and Performance', S5 = '5. Disclosures: Details and Summary', S8 = '8. Native Media Elements', S9 = '9. Dynamic Styles and Interactivity';

// rule short name → [the guide's section, its spec entry, its words, further grounding]
const TABLE = {
  'page-lang': [S1, {}, () => ({ label: 'Page says no language', line: 'The page has no lang.', reason: 'A screen reader guesses the accent to read it in, and translation tools guess what to translate from.' }), [WCAG('3.1.1', 'Language of Page')]],
  'viewport-meta': [S1, {}, ({ has }) => ({ label: 'No viewport set for phones', line: has ? 'The viewport does not say width=device-width.' : 'The page has no viewport meta.', reason: 'A phone draws it as a 980px desktop page, shrunk.' }), []],
  'zoom-disabled': [S1, {}, ({ how }) => ({ label: 'Pinch zoom turned off', line: `The viewport says ${how}.`, reason: 'People who need bigger text cannot zoom in.' }), [WCAG('1.4.4', 'Resize Text')]],
  'quirks-mode': [S1, {}, () => ({ label: 'Page in quirks mode', line: 'The page has no <!DOCTYPE html>.', reason: 'The browser lays it out by the rules of the 1990s: boxes and tables size differently.' }), []],
  'landmark-main': [S1, {}, () => ({ label: 'Page with no main', line: 'Nothing on this page is marked as its main content.', reason: 'A screen reader user cannot jump past the header to what the page is about.' }), [WCAG('1.3.1', 'Info and Relationships'), WCAG('2.4.1', 'Bypass Blocks')]],
  'banner-many': [S1, {}, ({ what, count }) => ({ label: `More than one page ${what}`, line: `This page has ${count} page ${what}s.`, reason: 'A landmark that appears twice does not say where anything is.' }), [WCAG('1.3.1', 'Info and Relationships')]],
  'h1-missing': [S1, {}, () => ({ label: 'Page with no main heading', line: 'This page has no h1.', reason: 'The h1 is how someone, and a search engine, learns what the page is.' }), []],
  'list-fake': [S1, {}, ({ count, mark }) => ({ label: 'List typed by hand', line: `${count} lines here start with "${mark}" and are not a list.`, reason: `A screen reader reads the marks as text and never says "list, ${count} items".` }), [WCAG('1.3.1', 'Info and Relationships')]],
  'list-structure': [S1, {}, ({ tag, needs }) => ({ label: 'List item outside a list', line: `This <${tag}> is not inside ${needs}.`, reason: 'On its own it is not announced as part of any list.' }), [WCAG('1.3.1', 'Info and Relationships')]],
  'pointer-generic': [S1, {}, ({ tag }) => ({ label: 'Pressable for the mouse only', line: `This <${tag}> shows a hand cursor and is not a button or a link.`, reason: 'Tab skips it and a screen reader does not say it can be pressed.' }), [WCAG('2.1.1', 'Keyboard'), WCAG('4.1.2', 'Name, Role, Value')]],
  'link-as-button': [S1, {}, ({ href }) => ({ label: 'Link that goes nowhere', line: href ? `This link’s address is "${href}".` : 'This link has no address.', reason: 'It is announced as a link and does something else. An action is a <button>.' }), [WCAG('4.1.2', 'Name, Role, Value')]],
  'boolean-value': [S1, ADVISORY, ({ attr }) => ({ label: 'Value on an on/off attribute', line: `${attr}="${attr}" repeats its own name.`, reason: 'The attribute being there is what turns it on; even ="false" would.' }), []],
  'figure-caption': [S2, ADVISORY, ({ where }) => ({ label: where ? 'Caption in the middle' : 'Figure with no caption', line: where ? 'The caption is neither first nor last in its figure.' : 'This figure has no caption.', reason: where ? 'Browsers tie a caption to its figure only at the start or the end.' : 'A figure is for something with a caption. Without one it is a plain image.' }), []],
  'pre-no-code': [S2, ADVISORY, () => ({ label: 'Code block with no <code>', line: 'This <pre> holds code and no <code>.', reason: '<pre> keeps the spacing; <code> is what says it is code.' }), []],
  'pre-scroll-keyboard': [S2, {}, () => ({ label: 'Scrolls for the mouse only', line: 'This block scrolls sideways and cannot take focus.', reason: 'Someone on a keyboard cannot reach what runs off the edge.' }), [WCAG('2.1.1', 'Keyboard')]],
  'pre-scroll-region': [S2, ADVISORY, () => ({ label: 'Focus stop with no name', line: 'This block takes focus and has no role or name.', reason: 'A screen reader stops on it and says nothing about what it is.' }), [WCAG('4.1.2', 'Name, Role, Value')]],
  'img-size': [S3, {}, () => ({ label: 'Image with no size', line: 'This image has no width and height.', reason: 'The page has no room kept for it, so everything below jumps when it arrives.' }), [{ id: 'cls', name: 'Cumulative Layout Shift' }]],
  'lazy-above-fold': [S3, {}, () => ({ label: 'First-screen image loaded late', line: 'This image is on the first screen and is loading="lazy".', reason: 'The browser waits for layout before it even asks for it.' }), [{ id: 'lcp', name: 'Largest Contentful Paint' }]],
  'eager-below-fold': [S3, ADVISORY, ({ what, screens }) => ({ label: `Off-screen ${what} loaded at once`, line: `This ${what} is ${screens} screens down and loads with the page.`, reason: 'It competes for the network with what is on screen.' }), []],
  'fetchpriority-overused': [S3, {}, ({ count }) => ({ label: 'Everything is high priority', line: `${count} images here are fetchpriority="high".`, reason: 'Priority is shared out: when all are first, none is.' }), []],
  'hero-priority': [S3, ADVISORY, () => ({ label: 'Biggest image not put first', line: 'This is the largest image on the first screen and has no fetchpriority.', reason: 'The browser finds out it matters only after layout. fetchpriority="high" tells it at once.' }), [{ id: 'lcp', name: 'Largest Contentful Paint' }]],
  'img-oversized': [S3, {}, ({ natural, shown }) => ({ label: 'Image far bigger than drawn', line: `A ${natural}px-wide image is drawn ${shown}px wide.`, reason: 'A phone downloads all of it. srcset lets the browser pick a size that fits.' }), []],
  'picture-img': [S3, {}, () => ({ label: 'Picture with no image', line: 'This <picture> has no <img> inside.', reason: 'The <img> is what is drawn; the sources only offer it other files.' }), []],
  'summary-first': [S5, {}, ({ none }) => ({ label: none ? 'Details with no summary' : 'Summary is not first', line: none ? 'This <details> has no <summary>.' : 'The <summary> is not the first thing in its <details>.', reason: none ? 'The browser labels it "Details" in its own words.' : 'Only a first-child summary is the toggle; this one is hidden with the rest.' }), []],
  'summary-nested-control': [S5, {}, ({ tag }) => ({ label: 'Control inside a summary', line: `This summary holds a <${tag}>.`, reason: 'Pressing it also toggles the details, and screen readers announce the pair unpredictably.' }), []],
  'summary-no-cue': [S5, {}, () => ({ label: 'Toggle with no arrow', line: 'The marker is removed and nothing replaces it.', reason: 'Nothing shows that this opens.' }), []],
  'title-tooltip': [S5, ADVISORY, ({ title }) => ({ label: 'Tooltip from a title', line: `"${title}" is shown only as a title.`, reason: 'A title appears on mouse hover only: not on a keyboard, not on touch.' }), [WCAG('1.4.13', 'Content on Hover or Focus')]],
  'video-size': [S8, {}, () => ({ label: 'Video with no size', line: 'This video has no width and height.', reason: 'The page jumps when its first frame arrives.' }), [{ id: 'cls', name: 'Cumulative Layout Shift' }]],
  'video-poster': [S8, ADVISORY, () => ({ label: 'Video with no poster', line: 'This video has no poster image.', reason: 'Until someone presses play it is a black box.' }), []],
  'video-captions': [S8, ADVISORY, () => ({ label: 'Video with no captions', line: 'This video has controls and no captions track.', reason: 'Someone who cannot hear it, or has the sound off, gets the pictures only.' }), [WCAG('1.2.2', 'Captions (Prerecorded)')]],
  'background-video': [S8, {}, ({ why }) => ({ label: 'Background video read as content', line: why === 'controls' ? 'This looping, silent video has controls.' : 'This looping, silent video is not hidden from screen readers.', reason: why === 'controls' ? 'Decoration should not take focus.' : 'A screen reader stops on a video that has nothing to say.' }), []],
  'autoplay-sound': [S8, {}, ({ tag }) => ({ label: 'Plays sound by itself', line: `This ${tag} starts playing with sound.`, reason: 'It talks over a screen reader, and browsers block it for most people anyway.' }), [WCAG('1.4.2', 'Audio Control')]],
  'iframe-hidden': [S8, {}, () => ({ label: 'Hidden frame that takes focus', line: 'This frame is hidden from screen readers and Tab still goes in.', reason: 'Focus disappears into something announced as nothing.' }), [WCAG('4.1.2', 'Name, Role, Value')]],
  'inline-handler': [S9, ADVISORY, ({ attr }) => ({ label: 'Script written in the markup', line: `This has an inline ${attr} handler.`, reason: 'A strict content security policy blocks inline script, and the control stops working.' }), []],
};

export const HTML = {
  id: 'html',
  title: 'HTML',
  ground: 'Chrome Modern Web Guidance 1.0.0, html guide',
  source: { package: 'modern-web-guidance', version: '1.0.0', guide: 'html' },
  runs: 'page',
  spec: { access: Object.fromEntries(Object.entries(TABLE).map(([short, [, entry]]) => [short, entry])) },
  words: Object.fromEntries(Object.entries(TABLE).map(([short, [, , words]]) => [short, words])),
  laws: Object.fromEntries(Object.entries(TABLE).map(([short, [section, , , more]]) => [short, [GUIDE(section), ...more]])),
};
