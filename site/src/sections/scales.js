// This site's own spacing scale, the same ladder Plumber reads from site/plumber.config.mjs, beside Tailwind's default
// one, both up to 40px. The reasons are the config's; Tailwind's steps have none, which is the point.
const WHY = {
  3: 'related parts and compact controls',
  6: 'card padding',
  10: 'between a figure and its text',
};

const ladder = (keys, why) => keys.map((k) => ({ key: String(k), v: k * 4, why: why(k) }));

// A step without its own reason has why: null. The config's shared 'manual spacing ladder' is a group reason, which
// Plumber never shows against a single step; Tailwind's steps have none at all.
export const THEME = ladder([0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10], (k) => WHY[k] ?? null);
export const DEFAULTS = ladder([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10], () => null);

// A few of the theme's other decisions, with the reasons written beside them in site/src/styles.css.
export const CHIPS = [
  { family: 'radius', name: 'rounded-sm', value: '5px', why: 'chips, keys, small controls', draw: { radius: 5 } },
  { family: 'radius', name: 'rounded-lg', value: '12px', why: 'cards and panels you hold', draw: { radius: 12 } },
  { family: 'type', name: 'text-base', value: '17px', why: 'reading text, a long measure set loose', draw: { size: 17 } },
  { family: 'type', name: 'text-4xl', value: '40px', why: 'section titles, so sections neither shout nor go flat', draw: { size: 26 } },
  { family: 'elevation', name: 'shadow-plate', value: 'hairline', why: "a plate's hairline edge, drawn inside so plates tile", draw: { shadow: 'plate' } },
  { family: 'elevation', name: 'shadow-lift', value: 'held', why: 'a card held over the page', draw: { shadow: 'lift' } },
];
