// React Plumber's own look on a showcase page: the overlay's tokens (overlay/src/tokens.css, served by the overlay at
// runtime) and the site's two faces (web/app/layout.jsx): Bricolage Grotesque for what a toy has printed on it (names,
// labels, buttons), Instrument Sans for words. Anything inside `.pl-light` is drawn with them. Loaded once per page.
const TOKENS = '/__plumb/src/tokens.css';
const FACES = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Instrument+Sans:wght@400..700&display=swap';
// the site puts its faces first in the product's two face tokens, and sets the toy face heavier (globals.css)
const FIRST = `.pl-light.pl-light { --pl-round: "Bricolage Grotesque", ui-rounded, system-ui, sans-serif; --pl-sans: "Instrument Sans", system-ui, -apple-system, sans-serif; --pl-round-w: 750; --pl-round-w2: 800; }`;

export function ensureLook() {
  if (typeof document === 'undefined' || document.getElementById('pl-look')) return;
  const head = document.head;
  head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: TOKENS }));
  head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: FACES }));
  head.append(Object.assign(document.createElement('style'), { id: 'pl-look', textContent: FIRST }));
}
