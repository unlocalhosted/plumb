#!/usr/bin/env node
// Turns a file of pinned reviews (docs/research/harvests/<name>/reviews.json) into judged sets, with the reviewer as
// a judge: one set per reviewed site, one screen per page a pin sits on, one mark per pin. A point pinned on a
// picture of today's page becomes a box in that page's own pixels. A point pinned on the web archive's copy becomes a
// box marked `approx`, because the page may have moved since. A point pinned on the reviewer's own frame or picture,
// or on nothing, becomes a mark with no box: it is listed beside the page.
//
//   node bench/judged/from-reviews.mjs docs/research/harvests/raunofreiberg-portfolio-reviews/reviews.json rauno
//
// A box is also tied to the words under it, when the element list captured with the picture is at hand (a .json
// beside each picture's name in <reviews folder>/local/shots-data/): the nearest element with text, and how far the
// box sits from it. The review page looks that element up on the live page and moves the box with it, so a page
// that lays out differently in another window still has its boxes in the right place.
//
// The sets are written to bench/judged/sets/<judge>-<number>-<site>/ and are ignored by git: they are made again
// from the reviews file whenever it changes.
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [file, judge = 'reviewer'] = process.argv.slice(2);
if (!file) { console.error('usage: from-reviews.mjs <reviews.json> <judge>'); process.exit(1); }
const data = JSON.parse(await readFile(resolve(file), 'utf8'));
const slug = (text) => text.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28);
const screenId = (path) => (path === '/' ? 'home' : slug(path));

const dataDir = join(dirname(resolve(file)), 'local/shots-data');
const lists = new Map();
async function elements(shot) {
  const path = join(dataDir, shot.file.replace(/\.(jpg|png)$/, '.json'));
  if (!lists.has(path)) lists.set(path, existsSync(path) ? JSON.parse(await readFile(path, 'utf8')).els : null);
  return lists.get(path);
}
// the element with words that the box hugs (it starts at the box's top); failing that, the nearest one, counting
// distance above or below four times as much as distance to the side. An element near the top of a box keeps its
// distance to that top when the page lays out differently; one at the far end of a tall box does not.
// [tag, own text, x, y, w, h, ...]
function anchorFor(pin, els) {
  let best = null;
  for (const [tag, text, x, y, w, h] of els ?? []) {
    if (!text || text.length < 3 || w <= 0 || h <= 0) continue;
    const ix = Math.max(0, Math.min(pin.x + pin.w, x + w) - Math.max(pin.x, x)), iy = Math.max(0, Math.min(pin.y + pin.h, y + h) - Math.max(pin.y, y));
    const covered = (ix * iy) / (w * h);
    const far = Math.abs(y - pin.y) + 0.25 * Math.abs(x - pin.x);
    const score = covered >= 0.5 && Math.abs(y - pin.y) <= 60 ? 1e6 - far : far < 700 ? 1000 - far : -1;
    if (score > 0 && (!best || score > best.score)) best = { score, tag, text: text.slice(0, 48), dx: Math.round(pin.x - x), dy: Math.round(pin.y - y) };
  }
  return best ? { tag: best.tag, text: best.text, dx: best.dx, dy: best.dy } : undefined;
}

let sets = 0, boxes = 0, loose = 0, tied = 0;
for (const review of data.reviews) {
  if (!review.site || !review.points?.length) continue;
  const name = `${judge}-${String(review.n).padStart(2, '0')}-${slug(review.site)}`;
  const dir = join(here, 'sets', name);
  const shots = Object.fromEntries(review.shots.map((s) => [s.id, s]));
  const screens = new Map([['/', { id: 'home', path: '/' }]]);
  const marks = new Map([['home', []]]);
  for (const point of review.points) {
    const text = { ref: point.k, level: point.level, words: point.says, shows: point.shows, how: point.how, engine: point.engine, today: point.today ?? '' };
    // today's page first; the archive's copy only when no pin sits on today's page
    const pins = (point.pins ?? []).filter((pin) => shots[pin.shot]?.path);
    const live = pins.filter((pin) => shots[pin.shot].of === 'live');
    const placed = live.length ? live : pins.filter((pin) => shots[pin.shot].of === 'archive');
    if (!placed.length) { marks.get('home').push({ ...text, placed: false }); loose++; continue; }
    for (const pin of placed) {
      const shot = shots[pin.shot];
      if (!screens.has(shot.path)) { screens.set(shot.path, { id: screenId(shot.path), path: shot.path }); marks.set(screenId(shot.path), []); }
      const screen = screens.get(shot.path);
      if (shot.w !== 1440) screen.width = shot.w;
      const anchor = anchorFor(pin, await elements(shot));
      marks.get(screen.id).push({ ...text, placed: true, approx: shot.of === 'archive', x: pin.x, y: pin.y, w: pin.w, h: pin.h, anchor, from: shot.label });
      boxes++; if (anchor) tied++;
    }
  }
  await rm(dir, { recursive: true, force: true });
  await mkdir(join(dir, 'judgements'), { recursive: true });
  const origin = new URL(review.site).origin;
  await writeFile(join(dir, 'set.json'), `${JSON.stringify({ name, title: review.who, app: origin, width: 1440, review: { judge, reply: `https://x.com/raunofreiberg/status/${review.reply}`, date: review.date, note: review.note ?? '' }, screens: [...screens.values()] }, null, 1)}\n`);
  for (const screen of screens.values()) {
    const list = marks.get(screen.id).map((m, i) => ({ n: i + 1, ...m }));
    await writeFile(join(dir, 'judgements', `${screen.id}.${judge}.json`), `${JSON.stringify({ screen: screen.id, judge, path: screen.path, width: screen.width ?? 1440, source: file, looks: [], looksSkipped: true, marks: list, done: true }, null, 1)}\n`);
  }
  sets++;
}
console.log(`${sets} sets for judge "${judge}": ${boxes} boxes on pages (${tied} tied to an element), ${loose} points with no place on today's page`);
