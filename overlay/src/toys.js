// The toy set: the icons of React Plumber's visual language (docs/design/visual-language.md), one place for every
// page of the kit to take them from. Proposed: lives beside the demo until it is approved, then moves to overlay/src.
//
//   import { TOY_DEFS, PROPS, PARTS, toyOf } from './toys.js';
//   root.innerHTML = `...${TOY_DEFS}...${toyOf('corner')}`;   // TOY_DEFS once per root: the patterns two toys use
// ── the toy set ──
// The rules (written out on the page too): one solid body in one hue; details cut out in white or drawn on in the
// hue's own ink, never a tint with an outline; it says what the thing does; nothing finer than 1.5 on the 24 grid and
// no more than four parts, so it still reads at 16; a pattern only ever means space; no stock faces.
const h = (hue) => `var(--pl-${hue})`, ink = (hue) => `var(--pl-${hue}-ink)`, soft = (hue) => `var(--pl-${hue}-soft)`;
// a mark drawn on a body is the hue's -on: its lettering colour, which changes with the scheme (never the ink, which is
// white at night and would vanish on a pastel body)
const on = (hue) => `var(--pl-${hue}-on)`;
// a hole cut in a body shows what is behind it: white on a light page, the dark ground on a dark one (--pl-cut)
const W = 'var(--pl-cut)';
const line = (d, color, w = 2.2) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const box = (x, y, w, hh, r, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="${r}" fill="${fill}"${extra}/>`;
const dot = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${extra}/>`;
const svg = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const tile = (hue, mark) => box(2.5, 2.5, 19, 19, 5.5, h(hue)) + mark;
// two patterns are drawn as patterns (the hatch of padding, the checker of see-through); dots and stripes are placed
// one by one, so each sits where it should at every size
export const TOY_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <pattern id="hatch-mint" width="4.6" height="4.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2.1" height="4.6" fill="${h('mint')}"/></pattern>
  <pattern id="check-lilac" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="${h('lilac')}" opacity=".5"/><rect x="3" y="3" width="3" height="3" fill="${h('lilac')}" opacity=".5"/></pattern>
  <clipPath id="pad-clip"><rect x="2" y="2" width="20" height="20" rx="6"/></clipPath></defs></svg>`;
// margin's halo: sixteen dots on a ring around the block, none behind it
const halo = [3.1, 7.55, 12, 16.45, 20.9].flatMap((x) => [[x, 3.1], [x, 20.9]]).concat([7.55, 12, 16.45].flatMap((y) => [[3.1, y], [20.9, y]])).map(([x, y]) => dot(x, y, 1.25, h('butter'))).join('');
// a ring of eight dots, each a little smaller and fainter than the one before: something turning
const turning = [[12, 4], [17.66, 6.34], [20, 12], [17.66, 17.66], [12, 20], [6.34, 17.66], [4, 12], [6.34, 6.34]].map(([x, y], k) => dot(x, y, 2.5 - k * 0.2, h('sky'), ` opacity="${(1 - k * 0.09).toFixed(2)}"`)).join('');

export const PROPS = [
  ['padding', 'the cushion inside: hatched', svg(`<g clip-path="url(#pad-clip)"><rect x="2" y="2" width="20" height="20" fill="url(#hatch-mint)"/></g><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="${h('mint')}" stroke-width="2"/>${box(8, 8, 8, 8, 2.4, h('mint'))}`)],
  ['margin', 'the room outside: dotted', svg(halo + box(6.6, 6.6, 10.8, 10.8, 3.2, h('butter')))],
  ['line-height', 'the space from one line of text to the next', svg(box(3, 3, 18, 4.2, 2.1, h('lilac')) + box(3, 16.8, 13, 4.2, 2.1, h('lilac')) + line('M12 9.300v5.400', ink('lilac'), 1.8) + line('M10.300 10.800 12 9.100l1.700 1.700M10.300 13.200 12 14.900l1.700-1.700', ink('lilac'), 1.8))],
  ['letter-spacing', 'the space between letters', svg(box(2.5, 4, 5.6, 16, 2.4, h('butter')) + box(15.9, 4, 5.6, 16, 2.4, h('butter')) + line('M10.200 12h3.600', ink('butter'), 1.8) + line('M11.300 10.400 9.700 12l1.600 1.600M12.700 10.400 14.300 12l-1.600 1.600', ink('butter'), 1.8))],
  ['font-weight', 'how heavy the letters are', svg(tile('mint', `<path d="M8.600 6.800h4.200a2.600 2.600 0 0 1 0 5.200H8.600zM8.600 12h4.900a2.600 2.600 0 0 1 0 5.200H8.600z" fill="none" stroke="${on('mint')}" stroke-width="2.4" stroke-linejoin="round"/>`)), 1],
  ['gap', 'the space between: striped', svg(box(2, 4, 7.2, 16, 2.6, h('lilac')) + box(14.8, 4, 7.2, 16, 2.6, h('lilac')) + [6.4, 9.55, 12.7, 15.85].map((y) => box(10.3, y, 3.4, 1.75, 0.875, h('lilac'))).join(''))],
  ['corner', 'the arc, and the arc inside it', svg(`<path d="M3.500 20.500V12a8.500 8.500 0 0 1 8.500-8.500h8.500v17z" fill="${h('pink')}"/>${line('M8.500 20.500V13a4.500 4.500 0 0 1 4.500-4.500h7.500', W, 1.9)}`)],
  ['border', 'only the edge', svg(`<rect x="4.300" y="4.300" width="15.400" height="15.400" rx="4.800" fill="none" stroke="${h('sky')}" stroke-width="4.600"/>`)],
  ['size', 'pulled from two corners', svg(tile('mint', line('M7.600 12V7.600H12M16.400 12v4.400H12', W, 2.2) + line('M8.400 8.400l7.200 7.200', W, 1.8)))],
  ['width', '', svg(box(1.8, 6.5, 20.4, 11, 3.6, h('sky')) + line('M6.800 12h10.400', W, 2) + line('M8.700 9.700 6.400 12l2.300 2.300M15.300 9.700 17.600 12l-2.300 2.300', W, 2))],
  ['height', '', svg(box(6.5, 1.8, 11, 20.4, 3.6, h('sky')) + line('M12 6.800v10.400', W, 2) + line('M9.700 8.700 12 6.400l2.300 2.300M9.700 15.300 12 17.600l2.300-2.300', W, 2))],
  ['ratio', 'the same shape, small and large', svg(box(2, 4.8, 20, 14.4, 3.4, h('butter')) + box(4.4, 10.6, 8.6, 6.2, 1.7, W) + dot(15.4, 8.9, 1.15, on('butter')) + dot(18, 7.1, 1.15, on('butter'))), 1],
  ['position', 'a pin where it sits', svg(`<path d="M12 2.200a7.300 7.300 0 0 1 7.300 7.300c0 5.200-7.300 12.300-7.300 12.300S4.700 14.700 4.700 9.500A7.300 7.300 0 0 1 12 2.200z" fill="${h('lilac')}"/>${dot(12, 9.5, 2.7, W)}`)],
  ['layer', 'what sits on top', svg(`<path d="M12 12.600 21.500 17 12 21.400 2.500 17z" fill="${h('sky')}"/><path d="M12 8.100 21.500 12.500 12 16.900 2.500 12.500z" fill="${h('butter')}"/><path d="M12 3.600 21.500 8 12 12.400 2.500 8z" fill="${h('pink')}"/>`)],
  ['rotate', 'turned about its middle', svg(`<rect x="7.500" y="9.800" width="9" height="9" rx="2.600" fill="${h('pink')}" transform="rotate(-13 12 14.300)"/>${line('M3.640 7.150A10.200 10.200 0 0 1 20.350 7.150', ink('pink'), 2.2)}${line('M20.350 3.900v3.250l-3 -1', ink('pink'), 2.2)}`), 1],
  ['type', '', svg(tile('sky', line('M7.600 17 12 6.800 16.400 17M9.400 13.400h5.200', W, 2.3)))],
  ['weight', 'how heavy the letters are', svg(tile('sky', `<path d="M8.600 6.800h4.200a2.600 2.600 0 0 1 0 5.200H8.600zM8.600 12h4.900a2.600 2.600 0 0 1 0 5.200H8.600z" fill="none" stroke="${W}" stroke-width="2.4" stroke-linejoin="round"/>`)), 1],
  ['line height', 'the air between lines', svg(tile('sky', box(10.6, 7, 7.6, 2.6, 1.3, W) + box(10.6, 14.4, 7.6, 2.6, 1.3, W) + line('M7 7.400v9.200', W, 1.9) + line('M5.400 9 7 7.400 8.600 9M5.400 15 7 16.600 8.600 15', W, 1.9))), 1],
  ['letter spacing', 'the air between letters', svg(tile('sky', line('M6.400 7v10M17.600 7v10', W, 2) + line('M9.500 16 12 9.200 14.500 16', W, 2))), 1],
  ['text colour', '', svg(`${line('M6.800 14.600 12 3.200l5.200 11.400M8.900 10.600h6.200', 'var(--pl-ink)', 2.6)}${box(2.5, 17.6, 5.4, 4, 2, h('pink'))}<rect x="7.100" y="17.600" width="5" height="4" fill="${h('butter')}"/><rect x="11.900" y="17.600" width="5" height="4" fill="${h('mint')}"/>${box(16.1, 17.6, 5.4, 4, 2, h('sky'))}`)],
  ['fill', 'a drop of paint', svg(`<path d="M12 2c4 4.800 6.600 8 6.600 11.400a6.600 6.600 0 0 1-13.200 0C5.400 10 8 6.800 12 2z" fill="${h('pink')}"/>${line('M8.800 13.800a3.200 3.200 0 0 0 2.600 3.400', W, 1.9)}`)],
  ['shadow', 'the block and what it casts', svg(box(6.5, 7, 15.5, 14.5, 4.4, 'var(--pl-butter-line)', ' opacity=".45"') + box(2, 2.5, 15.5, 14.5, 4.4, h('butter')))],
  ['opacity', 'half there', svg(`<circle cx="12" cy="12" r="9.500" fill="url(#check-lilac)"/><path d="M12 2.500a9.500 9.500 0 0 0 0 19z" fill="${h('lilac')}"/><circle cx="12" cy="12" r="8.500" fill="none" stroke="${h('lilac')}" stroke-width="2"/>`)],
  ['motion', 'it bounces', svg(dot(4.2, 18.5, 1.3, h('mint'), ' opacity=".35"') + dot(7.6, 13.8, 1.9, h('mint'), ' opacity=".55"') + dot(11.6, 10, 2.5, h('mint'), ' opacity=".78"') + dot(17, 7, 4.6, h('mint')) + dot(15.5, 5.5, 1.1, W))],
  ['alignment', 'everything against one edge', svg(box(2.5, 2.5, 3, 19, 1.5, ink('lilac')) + box(7.5, 4.5, 14, 4.2, 2.1, h('lilac')) + box(7.5, 9.9, 8, 4.2, 2.1, h('lilac')) + box(7.5, 15.3, 11, 4.2, 2.1, h('lilac')))],
  ['direction', 'which way things flow', svg(`<path d="M2.800 9.200h9.700V4.800L21.600 12l-9.100 7.200v-4.400H2.800z" fill="${h('lilac')}"/>`), 1],
  ['wrap', 'the fourth one goes below', svg(box(2.2, 4.2, 5.6, 5.6, 1.8, h('lilac')) + box(9.2, 4.2, 5.6, 5.6, 1.8, h('lilac')) + box(16.2, 4.2, 5.6, 5.6, 1.8, h('lilac')) + box(2.2, 14.2, 5.6, 5.6, 1.8, h('pink')) + line('M19 12v2.200a2.800 2.800 0 0 1-2.800 2.800H11.200', ink('lilac'), 2) + line('M13.200 14.800 11 17l2.200 2.200', ink('lilac'), 2)), 1],
  ['grid', 'rows and columns', svg(box(2.6, 2.6, 8.4, 8.4, 2.6, h('mint')) + box(13, 2.6, 8.4, 8.4, 2.6, h('mint')) + box(2.6, 13, 8.4, 8.4, 2.6, h('mint')) + box(13, 13, 8.4, 8.4, 2.6, h('butter'))), 1],
  ['scroll', 'up and down, with a thumb to drag', svg(tile('sky', line('M6 10.400 9.200 7.200l3.200 3.200M6 13.600l3.200 3.200 3.200-3.200', W, 2.3) + box(15.6, 5.2, 3.2, 13.6, 1.6, W, ' opacity=".4"') + box(15.6, 5.2, 3.2, 6.4, 1.6, W))), 1],
  ['cursor', 'the pointer itself', svg(`<path d="M5.400 2.600v15.800l4.300-3.700 2.800 6.300 2.900-1.300-2.800-6.200h5.800z" fill="${h('pink')}" stroke="${h('pink')}" stroke-width="1.200" stroke-linejoin="round"/>`), 1],
].map(([name, note, icon, fresh]) => ({ name, note, icon, fresh }));

export const PARTS = [
  ['button', 'with something about to press it', svg(box(1.8, 5.5, 20.4, 11.5, 5.75, h('pink')) + box(6.5, 10.15, 9, 2.2, 1.1, W) + `<path d="M14.800 12.800 21.600 15.800l-2.900.900-.900 2.900z" fill="${ink('pink')}" stroke="${W}" stroke-width="1" stroke-linejoin="round"/>`)],
  ['link', 'two rings, joined', svg(`<rect x="2.400" y="8.200" width="11.300" height="7.600" rx="3.800" fill="none" stroke="${h('sky')}" stroke-width="3"/><rect x="10.300" y="8.200" width="11.300" height="7.600" rx="3.800" fill="none" stroke="${h('mint')}" stroke-width="3"/><path d="M10.300 12a3.800 3.800 0 0 1 1.700-3.170" fill="none" stroke="${h('sky')}" stroke-width="3"/>`)],
  ['input', 'a caret, waiting', svg(box(1.8, 5, 20.4, 14, 4.6, h('sky')) + box(5.8, 8.5, 2.3, 7, 1.15, W) + dot(11.6, 12, 1.25, W) + dot(15, 12, 1.25, W) + dot(18.4, 12, 1.25, W))],
  ['textarea', 'room to write, and a corner to pull', svg(box(2.5, 2.5, 19, 19, 5, h('sky')) + box(6, 6.6, 11, 2.4, 1.2, W) + box(6, 10.8, 7.5, 2.4, 1.2, W) + line('M14.400 18.200l3.800-3.800M17.300 18.300l1-1', W, 1.8)), 1],
  ['select', 'one of a few', svg(box(1.8, 5, 20.4, 14, 4.6, h('lilac')) + box(5.4, 10.8, 7, 2.4, 1.2, W) + line('M15.200 10.800l1.900 2 1.900-2', W, 2))],
  ['checkbox', '', svg(box(3, 3, 18, 18, 5.6, h('mint')) + line('M7.400 12.400l3.100 3.100 6.100-7', W, 2.6))],
  ['radio', 'a ring, and the dot that says chosen', svg(`<circle cx="12" cy="12" r="8.300" fill="none" stroke="${h('lilac')}" stroke-width="3"/>${dot(12, 12, 3.9, h('lilac'))}`), 1],
  ['switch', 'on', svg(box(1.8, 5.8, 20.4, 12.4, 6.2, h('mint')) + dot(16, 12, 4.3, W))],
  ['slider', 'a knob on a track', svg(box(1.8, 10.1, 20.4, 3.8, 1.9, h('sky')) + dot(14.8, 12, 5.4, h('pink')) + dot(14.8, 12, 1.7, W)), 1],
  ['label', 'the name above a field', svg(box(2.5, 3.6, 11, 3.8, 1.9, h('pink')) + box(2, 10, 20, 10.6, 4, soft('sky'))), 1],
  ['form', 'two answers and a way to send them', svg(box(2, 2.4, 20, 5.2, 2.6, h('sky')) + box(2, 9.4, 20, 5.2, 2.6, h('sky')) + box(11.4, 16.4, 10.6, 5.2, 2.6, h('pink'))), 1],
  ['date', 'a calendar with today marked', svg(box(2.5, 4.4, 19, 17.1, 4.6, h('sky')) + box(7, 1.8, 2.4, 5.4, 1.2, ink('sky')) + box(14.6, 1.8, 2.4, 5.4, 1.2, ink('sky')) + [12.4, 16.9].flatMap((y) => [7.4, 12, 16.6].map((x) => dot(x, y, 1.3, W))).slice(0, 5).join('') + dot(16.6, 16.9, 1.9, h('butter'))), 1],
  ['upload', 'up, into the tray', svg(`<path d="M12 2.400 18.400 9.200h-4v6.400H9.600V9.200h-4z" fill="${h('mint')}" stroke="${h('mint')}" stroke-width="1" stroke-linejoin="round"/>${box(3, 17.6, 18, 4, 2, h('mint'))}`), 1],
  ['key', 'a key, pressed', svg(box(3, 5.4, 18, 15.6, 4.2, 'var(--pl-butter-line)') + box(3, 3, 18, 14.6, 4.2, h('butter')) + line('M15.400 7.400v3.400H9', on('butter'), 2) + line('M10.900 8.800 8.800 10.800l2.100 2.100', on('butter'), 2)), 1],
  ['heading', '', svg(tile('pink', line('M8 7.200v9.600M16 7.200v9.600M8 12h8', W, 2.5)))],
  ['text', 'the last line runs short', svg(box(3, 4.2, 18, 3.8, 1.9, h('lilac')) + box(3, 10.1, 18, 3.8, 1.9, h('lilac')) + box(3, 16, 10.5, 3.8, 1.9, h('lilac')))],
  ['image', 'sun, hills', svg(box(2, 3.5, 20, 17, 4.8, h('sky')) + dot(8, 8.8, 2.5, h('butter')) + `<path d="M2.300 17.800 8.600 12.200l3.800 3.300 3.300-2.800 6 5.100a4.800 4.800 0 0 1-4.500 2.700H6.800a4.800 4.800 0 0 1-4.500-2.700z" fill="${h('mint')}"/>`)],
  ['icon', 'a spark', svg(`<path d="M12 1.800 14.500 9.500 22.200 12l-7.700 2.500L12 22.200l-2.500-7.700L1.800 12l7.700-2.500z" fill="${h('butter')}"/>${dot(19.2, 4.8, 1.6, h('pink'))}`)],
  ['video', '', svg(box(2, 4, 20, 16, 4.8, h('pink')) + `<path d="M9.800 8.600v6.800l6-3.400z" fill="${W}" stroke="${W}" stroke-width="1.400" stroke-linejoin="round"/>`), 1],
  ['code', '', svg(tile('mint', line('M9.300 8.200 5.800 12l3.500 3.800M14.700 8.200 18.200 12l-3.500 3.800', W, 2.3))), 1],
  ['chart', 'three bars on a line', svg(box(3.4, 11.6, 4.8, 8.4, 1.8, h('pink')) + box(9.6, 4.6, 4.8, 15.4, 1.8, h('butter')) + box(15.8, 8.6, 4.8, 11.4, 1.8, h('mint')) + box(2, 19.3, 20, 2.3, 1.15, 'var(--pl-ink)')), 1],
  ['rating', '', svg(`<path d="M12 2.800l2.800 5.800 6.400.900-4.600 4.500 1.100 6.300L12 17.300l-5.700 3 1.100-6.300L2.800 9.500l6.400-.900z" fill="${h('butter')}" stroke="${h('butter')}" stroke-width="1.400" stroke-linejoin="round"/>`), 1],
  ['avatar', 'someone, and they are online', svg(`<clipPath id="face"><circle cx="12" cy="12" r="9.800"/></clipPath>${dot(12, 12, 9.8, h('pink'))}<g clip-path="url(#face)">${dot(12, 9.4, 3.5, W)}<ellipse cx="12" cy="20.600" rx="6.800" ry="5.600" fill="${W}"/></g>${dot(19.2, 19.2, 3.9, 'var(--pl-paper-2)')}${dot(19.2, 19.2, 2.7, h('mint'))}`)],
  ['tag', 'with a hole for the string', svg(`<path d="M2.600 12 8 5.600h11.200A2.800 2.800 0 0 1 22 8.400v7.200a2.800 2.800 0 0 1-2.800 2.800H8z" fill="${h('lilac')}" stroke="${h('lilac')}" stroke-width="1.200" stroke-linejoin="round"/>${dot(8.9, 12, 1.8, W)}`)],
  ['badge', 'one new thing', svg(dot(12, 12, 9.6, h('pink')) + line('M9.600 9.400 12.700 7.100v10', W, 2.6)), 1],
  ['card', 'a picture, then two lines', svg(box(2.5, 2.5, 19, 19, 5, h('butter')) + box(5.6, 5.6, 12.8, 6, 2, W) + box(5.6, 13.8, 9, 2.2, 1.1, on('butter')) + box(5.6, 17.1, 6, 2.2, 1.1, on('butter')))],
  ['list', '', svg(dot(4.5, 5.8, 2.2, h('pink')) + dot(4.5, 12, 2.2, h('butter')) + dot(4.5, 18.2, 2.2, h('mint')) + box(9, 4.3, 12.5, 3, 1.5, 'var(--pl-ink)') + box(9, 10.5, 9.5, 3, 1.5, 'var(--pl-ink)') + box(9, 16.7, 11.5, 3, 1.5, 'var(--pl-ink)'))],
  ['row', 'one item, and where it leads', svg(box(1.8, 6.5, 20.4, 11, 3.8, h('sky')) + dot(6.8, 12, 2.5, W) + box(10.8, 10.8, 5.6, 2.4, 1.2, W) + line('M18.200 10.200l1.700 1.800-1.700 1.800', W, 1.9))],
  ['table', 'a header, then cells', svg(box(2, 3, 20, 18, 4.6, h('mint')) + [9.7, 15.3].flatMap((y) => [3.7, 9.9, 16.1].map((x) => box(x, y, 4.9, 4.2, 1.1, W))).join(''))],
  ['tabs', 'one is in front', svg(`<path d="M2 19.500V9a3.200 3.200 0 0 1 3.200-3.200h3.600A3.200 3.200 0 0 1 12 9v10.500z" fill="${h('pink')}"/>${box(13.2, 9.2, 4, 10.3, 1.6, soft('pink'))}${box(18.2, 9.2, 3.8, 10.3, 1.6, soft('pink'))}${box(1.5, 18.8, 21, 2.4, 1.2, ink('pink'))}`)],
  ['navigation', 'a rail of places', svg(box(2, 3, 20, 18, 4.8, h('lilac')) + box(4.4, 5.4, 5.2, 13.2, 1.9, W) + dot(7, 8.2, 1.2, h('lilac')) + dot(7, 12, 1.2, h('lilac')) + dot(7, 15.8, 1.2, h('lilac')) + box(12, 7, 7, 2.4, 1.2, W) + box(12, 11.2, 5, 2.4, 1.2, W))],
  ['header', 'the bar across the top', svg(box(2, 3, 20, 18, 4.8, soft('lilac')) + `<path d="M6.800 3h10.400A4.800 4.800 0 0 1 22 7.800v2H2v-2A4.800 4.800 0 0 1 6.800 3z" fill="${h('lilac')}"/>` + dot(5.8, 6.4, 1.4, W) + box(12.4, 5.3, 3.2, 2.2, 1.1, W) + box(16.8, 5.3, 3.2, 2.2, 1.1, W)), 1],
  ['breadcrumb', 'where you are, and how you got here', svg(box(1.6, 9.4, 5.2, 5.2, 2.6, h('lilac')) + box(9.4, 9.4, 5.2, 5.2, 2.6, h('lilac')) + box(17.2, 9.4, 5.2, 5.2, 2.6, h('pink')) + line('M7.600 10.500l1 1.500-1 1.500M15.400 10.500l1 1.500-1 1.500', ink('lilac'), 1.6)), 1],
  ['pagination', 'the page you are on, between the others', svg(box(1.8, 9.2, 5.6, 5.6, 1.9, h('lilac')) + box(8.4, 8.2, 7.2, 7.6, 2.4, h('pink')) + dot(12, 12, 1.4, W) + box(16.6, 9.2, 5.6, 5.6, 1.9, h('lilac'))), 1],
  ['accordion', 'one open, two shut', svg(box(2, 2.4, 20, 9.6, 3, h('butter')) + box(5, 6, 6.5, 2.4, 1.2, on('butter')) + line('M15.200 6.300l1.800 1.900 1.800-1.900', on('butter'), 1.9) + box(2, 13.6, 20, 3.6, 1.8, h('butter')) + box(2, 18.8, 20, 3.6, 1.8, h('butter'))), 1],
  ['divider', 'the line between two things', svg(box(4, 2.8, 16, 5.4, 2.2, soft('lilac')) + box(2, 10.8, 20, 2.4, 1.2, h('pink')) + box(4, 15.8, 16, 5.4, 2.2, soft('lilac'))), 1],
  ['drawer', 'a panel in from the side', svg(box(2, 3, 20, 18, 4.8, soft('sky')) + `<path d="M11.400 3h5.800A4.800 4.800 0 0 1 22 7.800v8.400a4.800 4.800 0 0 1-4.800 4.800h-5.800z" fill="${h('sky')}"/>` + box(13.8, 7.2, 5.4, 2.3, 1.15, W) + box(13.800, 11.200, 3.800, 2.300, 1.150, W) + line('M8.400 9.800 6.200 12l2.200 2.200', h('sky'), 2)), 1],
  ['popover', 'a little card that hangs off a button', svg(`<path d="M5.800 2.400h12.400A3.800 3.800 0 0 1 22 6.200v6a3.800 3.800 0 0 1-3.800 3.800H9.600l-2.300 2.700L5 16A3.800 3.800 0 0 1 2 12.200v-6A3.800 3.800 0 0 1 5.800 2.400z" fill="${h('lilac')}"/>${dot(6.9, 7.4, 1.9, W)}${box(10.400, 6.300, 8, 2.200, 1.100, W)}${box(5.200, 10.900, 10, 2.200, 1.100, W)}${box(3.800, 19.400, 7, 3, 1.5, h('pink'))}`), 1],
  ['alert', 'read this first', svg(box(1.8, 5.8, 20.4, 12.4, 4.4, h('butter')) + box(5.8, 8.6, 2.4, 4.6, 1.2, on('butter')) + dot(7, 15.2, 1.25, on('butter')) + box(10.800, 10.800, 8, 2.400, 1.200, on('butter'))), 1],
  ['skeleton', 'the shape of what is coming', svg(dot(6, 7.4, 3.6, soft('lilac')) + box(11.4, 5.6, 10, 3.6, 1.8, soft('lilac')) + box(2.4, 13.200, 19, 3.600, 1.800, soft('lilac')) + box(2.400, 18.400, 12, 3.600, 1.800, soft('lilac')) + `<path d="M18.600 12.400l.900 2.700 2.700.900-2.700.900-.900 2.700-.900-2.700-2.700-.900 2.700-.900z" fill="${h('butter')}"/>`), 1],
  ['dialog', 'three dots, of course', svg(box(2, 3.5, 20, 17, 4.8, h('sky')) + box(4.2, 5.6, 15.600, 4.2, 2.1, W) + dot(6.9, 7.7, 1.15, h('pink')) + dot(10.1, 7.7, 1.15, h('butter')) + dot(13.3, 7.7, 1.15, h('mint')) + box(4.6, 12.200, 8, 2.3, 1.15, W) + box(13.2, 14.6, 6.4, 3.8, 1.9, h('pink')))],
  ['menu', 'one row under the pointer', svg(box(3, 2.5, 18, 19, 4.8, h('lilac')) + box(6, 5.6, 11, 2.5, 1.25, W) + box(4.8, 9.900, 14.4, 4.4, 2.2, W) + box(6.8, 11, 6.5, 2.2, 1.1, h('lilac')) + box(6, 16, 8, 2.5, 1.25, W)), 1],
  ['tooltip', 'a word about the thing under it', svg(`<path d="M5.400 2.400h13.200A3.400 3.400 0 0 1 22 5.800v4.400a3.400 3.400 0 0 1-3.400 3.400h-4.400L12 16.200l-2.200-2.600H5.400A3.400 3.400 0 0 1 2 10.200V5.800A3.400 3.400 0 0 1 5.400 2.400z" fill="${h('butter')}"/>${box(6, 6.8, 12, 2.400, 1.2, on('butter'))}${dot(12, 19.6, 2.5, h('pink'))}`)],
  ['toast', 'it worked, and it will leave by itself', svg(box(1.8, 5.4, 20.4, 10.8, 5.4, h('mint')) + dot(7.2, 10.8, 2.9, W) + line('M5.900 10.900l1 1 1.700-2', h('mint'), 1.5) + box(11.8, 9.6, 7, 2.4, 1.2, W) + box(4.6, 18.4, 14.8, 2.2, 1.1, soft('mint')) + box(4.6, 18.4, 8.6, 2.2, 1.1, h('mint')))],
  ['search', 'a lens with a glint', svg(`<circle cx="10.400" cy="10.400" r="6.400" fill="${soft('sky')}" stroke="${h('lilac')}" stroke-width="3.200"/>${line('M15.600 15.600l4.800 4.800', ink('lilac'), 3.6)}${line('M7.600 9.400a3 3 0 0 1 2-2', W, 1.7)}`), 1],
  ['progress', 'three quarters round', svg(`<circle cx="12" cy="12" r="8" fill="none" stroke="${soft('mint')}" stroke-width="4.200"/><path d="M12 4a8 8 0 1 1-8 8" fill="none" stroke="${h('mint')}" stroke-width="4.200" stroke-linecap="round"/>`), 1],
  ['loading', 'going round', svg(turning), 1],
  ['empty', 'nobody home', svg(`<path d="M12 2.600a7.400 7.400 0 0 1 7.400 7.400v11l-2.470-1.900-2.470 1.900L12 19.100 9.540 21l-2.470-1.900L4.600 21V10A7.400 7.400 0 0 1 12 2.600z" fill="${h('lilac')}" stroke="${h('lilac')}" stroke-width=".8" stroke-linejoin="round"/>${dot(9.3, 10.4, 1.4, on('lilac'))}${dot(14.7, 10.4, 1.4, on('lilac'))}${dot(12, 14.4, 1.150, on('lilac'))}`), 1],
  ['error', 'something went wrong', svg(`<path d="M12 2.800c.900 0 1.700.500 2.200 1.300l7.300 12.600a2.500 2.500 0 0 1-2.200 3.800H4.700a2.500 2.500 0 0 1-2.200-3.800L9.800 4.100c.500-.800 1.300-1.300 2.200-1.300z" fill="${h('coral')}"/>${box(10.8, 8, 2.4, 6.4, 1.2, W)}${dot(12, 17.1, 1.4, W)}`), 1],
].map(([name, note, icon, fresh]) => ({ name, note, icon, fresh }));


/** A toy's svg by its name ('corner', 'tag'), from either list; '' when there is none. */
export const toyOf = (name) => [...PROPS, ...PARTS].find((i) => i.name === name)?.icon ?? '';
