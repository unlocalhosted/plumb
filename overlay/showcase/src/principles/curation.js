// Which principles get a showcase screen (docs/craft/showcase-curation.md, owner 2026-11-04): only the insights craft
// people share, obvious once shown and missed until then. The rest are hygiene, or mistakes nobody really ships; plumber
// keeps checking them, and the showcase doesn't stage them. A merged principle is shown on its sibling's screen.
export const OFF = new Set([7, 9, 10, 11, 12, 13, 14, 17, 22, 24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 47, 53, 58, 67, 71, 72]);
export const MERGED = { 41: 8, 48: 18, 52: 21 };
export const shown = (n) => !OFF.has(n) && !(n in MERGED);
