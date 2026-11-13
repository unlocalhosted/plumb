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
  spec: { access: { 'control-name': {} } },
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
  },
  // the criteria each rule measures
  laws: {
    'control-name': [GUIDE('accessibility', '3. Accessible Names and Descriptions'), WCAG('4.1.2', 'Name, Role, Value'), WCAG('3.3.2', 'Labels or Instructions')],
  },
};

// Every pack described as data, in the order they are listed. Craft is not here: its rules, words and numbers are
// the original tables (craft-rules.js, words.js, craft-spec.js), which this list sits beside.
export const PACK_DATA = [A11Y];
