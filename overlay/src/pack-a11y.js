/* ─────────────────────────────────────────────────────────
 * PACK · ACCESSIBILITY · React Plumber overlay
 *
 * What the accessibility pack is (docs/briefs/rule-packs.md): its name, its ground, its rules' words, numbers and
 * grounding. Plain data: the spec (craft-spec.js, also read by the server), the words (words.js) and the grounding
 * (laws.js) read it without loading any rule. The rules themselves are in a11y-rules.js; packs.js puts the two together.
 *
 * Where the rules come from: Chrome's Modern Web Guidance (github.com/GoogleChrome/modern-web-guidance-src, published as
 * the npm package modern-web-guidance, read at 1.0.0 on 2026-11-13, Apache-2.0), its `accessibility` guide: 107 dos and
 * don'ts, each tied to a WCAG 2.2 success criterion or marked best practice. A rule here is one of those bullets made
 * into something plumber can see on the page; it names the guide, the section and the criterion. Nothing of the guide's
 * text is copied: an agent retrieves it with `npx modern-web-guidance retrieve accessibility`.
 * What plumber already says about access stays where it is (contrast, hit-target, input-zoom and disabled-contrast in
 * craft; focus-outline and hover-gate as habits).
 * ───────────────────────────────────────────────────────── */

const WCAG = (sc, name) => ({ id: `wcag-${sc}`, name: `WCAG ${sc} ${name}` });
const GUIDE = (id, section) => ({ id: `mwg-${id}`, name: `Modern Web Guidance: ${id}, ${section}`, guide: id });

export const A11Y = {
  id: 'a11y',
  title: 'Accessibility',
  ground: 'Chrome Modern Web Guidance 1.0.0, accessibility guide; WCAG 2.2',
  source: { package: 'modern-web-guidance', version: '1.0.0', guide: 'accessibility' },
  runs: 'page',
  // principle → rule short name → its numbers, as the craft standard has them (none yet: a name is there or it is not)
  // (advisory: the guide marks it best practice, not a WCAG failure)
  spec: { access: {
    'control-name': {}, 'image-alt': {}, 'alt-cliche': { tier: 'advisory' }, 'svg-name': {}, 'tabindex-positive': {}, 'tabindex-redundant': { tier: 'advisory' },
    'hidden-focusable': {}, 'role-presentation-control': {}, 'label-on-generic': {}, 'label-in-name': {}, 'role-in-label': { tier: 'advisory' }, 'link-name-reused': {},
    'heading-skip': { tier: 'advisory' }, 'heading-h1-many': { tier: 'advisory' }, 'main-many': {}, 'nav-unnamed': {}, 'iframe-title': {}, 'iframe-scroll': {}, 'table-headers': {},
    'heading-in-summary': { tier: 'advisory' }, 'redundant-role': { tier: 'advisory' }, 'role-on-structure': {}, 'native-over-role': { tier: 'advisory' }, 'field-autocomplete': {},
  } },
  words: {
    'control-name': ({ what, weak }) => weak ? {
      label: `Named only by its ${weak}`,
      line: `This ${what}'s only name is its ${weak}.`,
      reason: weak === 'placeholder' ? 'A placeholder goes away once someone types. Give it a label that stays.' : 'A title shows only on mouse hover, never to the keyboard. Give it words, or an aria-label.',
    } : {
      label: 'No name for screen readers',
      line: `This ${what} has nothing a screen reader can say.`,
      reason: 'Someone who cannot see it hears only its role. Give it words, or an aria-label.',
    },
    'image-alt': () => ({ label: 'Image with no alt', line: 'This image has no alt.', reason: 'A screen reader reads out its file name, or nothing. Say what it is for, or mark it as decoration.' }),
    'alt-cliche': ({ prefix }) => ({ label: 'Alt says it is an image', line: `The alt starts with "${prefix}".`, reason: 'A screen reader already announces an image, so it is said twice.' }),
    'svg-name': ({ kind }) => kind === 'decoration' ? { label: 'Icon read out beside its words', line: 'This icon sits beside words and is not hidden from screen readers.', reason: 'It is announced as a nameless graphic before the words that already say it.' }
      : { label: 'Graphic with no description', line: 'This graphic is marked as an image and has no description.', reason: 'A screen reader says "image" and nothing more.' },
    'tabindex-positive': ({ n }) => ({ label: 'Jumps the tab order', line: `tabindex="${n}" puts this ahead of everything else on the page.`, reason: 'Tab stops following the page’s order, and every later change has to keep the numbers right.' }),
    'tabindex-redundant': ({ tag }) => ({ label: 'tabindex it does not need', line: `This <${tag}> takes focus already.`, reason: 'tabindex="0" adds nothing here, and reads as if it were a custom control.' }),
    'hidden-focusable': ({ self }) => ({ label: 'Hidden, but takes focus', line: self ? 'This can be tabbed to and is hidden from screen readers.' : 'This can be tabbed to, inside something hidden from screen readers.', reason: 'Focus lands on something that is announced as nothing.' }),
    'role-presentation-control': ({ role, tag }) => ({ label: 'Control told to be nothing', line: `role="${role}" on a <${tag}> removes what it is.`, reason: 'A screen reader no longer says it can be pressed or typed into.' }),
    'label-on-generic': ({ tag }) => ({ label: 'Label on a plain box', line: `This <${tag}> has a label and no role.`, reason: 'A plain box has no name to give: most screen readers never read the label.' }),
    'label-in-name': ({ visible, label }) => ({ label: 'Label hides the words shown', line: `It shows "${visible}" and is named "${label}".`, reason: 'Someone using voice control says the words they see, and nothing answers.' }),
    'role-in-label': ({ word }) => ({ label: 'Role said twice', line: `The label says "${word}", and so does the role.`, reason: 'It is read out as "… ' + '${word}, ${word}".'.replace(/\$\{word\}/g, word) }),
    'link-name-reused': ({ name, targets }) => ({ label: 'Same link text, different places', line: `${targets} links here say "${name}" and go to different pages.`, reason: 'In a list of links, which is how many people move around, they cannot be told apart.' }),
    'heading-skip': ({ level, after }) => ({ label: 'Heading level skipped', line: `An h${level} follows an h${after}.`, reason: 'People who move by headings hear a level missing and look for what they skipped.' }),
    'heading-h1-many': ({ count }) => ({ label: 'More than one h1', line: `This page has ${count} main headings.`, reason: 'The h1 is how someone learns what the page is; with several, none of them says it.' }),
    'main-many': ({ count }) => ({ label: 'More than one main', line: `This page has ${count} main regions.`, reason: '"Skip to main content" has one place to go.' }),
    'nav-unnamed': ({ count, same }) => ({ label: same ? 'Navigations share a name' : 'Navigation with no name', line: same ? 'Another navigation here has the same name.' : `This page has ${count} navigations and this one has no name.`, reason: 'They are all read out as "navigation", so nobody can tell which is which.' }),
    'iframe-title': () => ({ label: 'Frame with no title', line: 'This frame has no title.', reason: 'A screen reader says "frame" and the address, and people have to go in to find out what it is.' }),
    'iframe-scroll': () => ({ label: 'Frame cannot scroll', line: 'Scrolling is turned off on this frame.', reason: 'Someone who zooms in cannot reach what no longer fits.' }),
    'table-headers': ({ rows }) => ({ label: 'Table with no header cells', line: `This table has ${rows} rows and no header cells.`, reason: 'A screen reader reads each cell with nothing to say what column or row it belongs to.' }),
    'heading-in-summary': ({ tag }) => ({ label: 'Heading inside a summary', line: `This <${tag}> is inside a <summary>.`, reason: 'Some browsers treat the summary as a button, and the heading stops being one.' }),
    'redundant-role': ({ twice, tag }) => ({ label: 'Says what the tag already says', line: `${twice} on a <${tag}> repeats the tag.`, reason: 'It adds nothing, and one day it will disagree with the tag.' }),
    'role-on-structure': ({ role, tag }) => ({ label: 'Role replaces the structure', line: `role="${role}" on a <${tag}> stops it being a <${tag}>.`, reason: 'The list, table or heading it belonged to loses an item, and the count read out is wrong.' }),
    'native-over-role': ({ role, tag, native }) => ({ label: `A ${tag} playing ${role}`, line: `This <${tag}> is given role="${role}".`, reason: `${native} does this without the keyboard and focus handling a role has to rebuild.` }),
    'field-autocomplete': ({ token }) => ({ label: 'Field the browser cannot fill', line: 'This field asks for something the browser knows, and does not say what.', reason: `With autocomplete="${token}" it is filled in for people who find typing hard.` }),
  },
  // the criteria each rule measures
  laws: {
    'control-name': [GUIDE('accessibility', '3. Accessible Names and Descriptions'), WCAG('4.1.2', 'Name, Role, Value'), WCAG('3.3.2', 'Labels or Instructions')],
    'image-alt': [GUIDE('accessibility', '6. Images'), WCAG('1.1.1', 'Non-text Content')],
    'alt-cliche': [GUIDE('accessibility', '6. Images')],
    'svg-name': [GUIDE('accessibility', '6. Inline SVGs'), WCAG('1.1.1', 'Non-text Content'), WCAG('4.1.2', 'Name, Role, Value')],
    'tabindex-positive': [GUIDE('accessibility', '5. Tab order and focusability'), WCAG('2.4.3', 'Focus Order')],
    'tabindex-redundant': [GUIDE('accessibility', '5. Tab order and focusability')],
    'hidden-focusable': [GUIDE('accessibility', '2. ARIA roles and states'), WCAG('4.1.2', 'Name, Role, Value')],
    'role-presentation-control': [GUIDE('accessibility', '2. ARIA roles and states'), WCAG('4.1.2', 'Name, Role, Value')],
    'label-on-generic': [GUIDE('accessibility', '3. Naming mechanisms'), WCAG('1.3.1', 'Info and Relationships')],
    'label-in-name': [GUIDE('accessibility', '3. Choosing the name'), WCAG('2.5.3', 'Label in Name')],
    'role-in-label': [GUIDE('accessibility', '3. Choosing the name')],
    'link-name-reused': [GUIDE('accessibility', '3. Choosing the name'), WCAG('2.4.4', 'Link Purpose (In Context)')],
    'heading-skip': [GUIDE('accessibility', '1. Headings')],
    'heading-h1-many': [GUIDE('accessibility', '1. Headings')],
    'main-many': [GUIDE('accessibility', '1. Landmarks'), WCAG('1.3.1', 'Info and Relationships')],
    'nav-unnamed': [GUIDE('accessibility', '1. Landmarks'), WCAG('1.3.1', 'Info and Relationships')],
    'iframe-title': [GUIDE('accessibility', '4. Iframes'), WCAG('4.1.2', 'Name, Role, Value')],
    'iframe-scroll': [GUIDE('accessibility', '4. Iframes'), WCAG('1.4.4', 'Resize Text')],
    'table-headers': [GUIDE('accessibility', '1. Tables'), WCAG('1.3.1', 'Info and Relationships')],
    'heading-in-summary': [GUIDE('accessibility', '1. Headings')],
    'redundant-role': [GUIDE('accessibility', '2. Prefer native HTML')],
    'role-on-structure': [GUIDE('accessibility', '2. Prefer native HTML'), WCAG('4.1.2', 'Name, Role, Value')],
    'native-over-role': [GUIDE('accessibility', '2. Prefer native HTML'), WCAG('4.1.2', 'Name, Role, Value')],
    'field-autocomplete': [GUIDE('accessibility', '7. Input assistance and validation'), WCAG('1.3.5', 'Identify Input Purpose')],
  },
};
