// A screen as plain data: every element's place in the tree, its box, its own words, the line it was written on and
// the style values the checks read. Taken from the live page when a judge finishes a screen, so the marks can later be
// tied to elements and an engine can be run on the same screen after the app has changed. Each style value is stored
// once in `values` and pointed at by number (docs/briefs/engine-foundations.md, F1).

const PROPS = [
  'display', 'position', 'z-index', 'opacity', 'visibility', 'overflow-x', 'overflow-y', 'cursor',
  'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration-line',
  'color', 'background-color', 'background-image', 'box-shadow',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-top-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'row-gap', 'column-gap', 'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'grid-template-columns',
];
const SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE', 'PLUMB-OVERLAY', 'NEXTJS-PORTAL']);
const round = (n) => Math.round(n * 100) / 100;

export function snapshot(win) {
  const doc = win.document, sx = win.scrollX, sy = win.scrollY;
  const values = [], seen = new Map();
  const point = (text) => { let i = seen.get(text); if (i === undefined) { i = values.length; values.push(text); seen.set(text, i); } return i; };
  const tag = [], parent = [], box = [], text = [], source = [], classes = [], role = [], style = PROPS.map(() => []);
  const walk = (el, up) => {
    if (SKIP.has(el.tagName)) return;
    const me = tag.length, r = el.getBoundingClientRect(), cs = win.getComputedStyle(el);
    tag.push(point(el.tagName.toLowerCase())); parent.push(up);
    box.push(round(r.left + sx), round(r.top + sy), round(r.width), round(r.height));
    let own = '';
    for (const node of el.childNodes) if (node.nodeType === 3) own += node.nodeValue;
    text.push(point(own.replace(/\s+/g, ' ').trim().slice(0, 120)));
    source.push(point(el.getAttribute('data-plumb-source') ?? ''));
    classes.push(point(typeof el.className === 'string' ? el.className : el.getAttribute('class') ?? ''));
    role.push(point([el.getAttribute('role') ?? '', el.getAttribute('aria-label') ?? '', el.getAttribute('href') !== null ? 'href' : '',
      el.disabled ? 'disabled' : '', el.getAttribute('aria-selected') ?? '', el.getAttribute('aria-current') ?? ''].join('|')));
    PROPS.forEach((prop, i) => style[i].push(point(cs.getPropertyValue(prop))));
    for (const kid of el.children) walk(kid, me);
  };
  walk(doc.body, -1);
  return {
    takenAt: new Date().toISOString(), path: win.location.pathname + win.location.search, title: doc.title,
    view: { width: win.innerWidth, height: win.innerHeight, scrollX: sx, scrollY: sy, pageWidth: doc.documentElement.scrollWidth, pageHeight: doc.documentElement.scrollHeight, pixelRatio: win.devicePixelRatio },
    browser: win.navigator.userAgent, scheme: win.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    // columns, one entry per element in tree order; `box` has four numbers per element (x, y, width, height from the page's corner)
    count: tag.length, props: PROPS, values, tag, parent, box, text, source, classes, role, style,
  };
}
