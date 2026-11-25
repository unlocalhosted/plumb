/* ─────────────────────────────────────────────────────────
 * THE NOTE · what the ride says at a stop (eggs.js), written beside the thing it is about
 *
 * An annotation, not a bar: a short sentence in plain words, set in free space next to the element, with a line
 * from the sentence to the element. The kind's toy sits at the head of the sentence, so it is never on the element.
 * Nothing the stop marks is covered (interaction-principles 10): the note takes the place around the element that
 * overlaps the marked pieces least.
 *
 *  show   coral line, what is wrong
 *  land   the line turns mint, the sentence becomes what changed
 *  hide   it fades; the toy is let go by its owner
 * ───────────────────────────────────────────────────────── */

// [what is wrong, what it became], said the way you would say it to a friend
export const SAY = {
  'provenance/motion': ['This animation’s speed is hard-coded.', 'Now it uses the page’s own speed.'],
  'provenance/spacing': ['This space is hard-coded.', 'Now it’s on the page’s spacing scale.'],
  'craft/layered-shadow': ['This shadow is one big blur, like a smudge.', 'Now it’s small shadows, stacked.'],
  'craft/tinted-shadow': ['A grey shadow on a colour looks dirty.', 'Now the shadow takes the colour under it.'],
  'craft/contrast': ['This text is too faint to read easily.', 'Now it’s dark enough to read.'],
  'craft/inner-outer-spacing': ['Things in one group sit further apart than the groups do.', 'Now what belongs together sits together.'],
  'craft/continuous-corners': ['These round corners look pinched on a big surface.', 'Now the curve is smooth all the way round.'],
  'craft/card-optical-padding': ['The text looks pushed down from the top.', 'Now the space looks even all round.'],
  'craft/baseline-align': ['These two don’t sit on the same line.', 'Now they do.'],
  'a11y/label-in-name': ['A screen reader calls this something else.', 'Now it’s read out as it’s written.'],
  'craft/text-opacity': ['This text is faded by making it see-through.', 'Now it has a real colour.'],
  'craft/scroll-cue': ['This scrolls sideways and nothing tells you.', 'Now it fades at the edge.'],
  'craft/touch-manipulation': ['This flashes grey when you tap it on a phone.', 'Now it doesn’t.'],
  'tells/eyebrow': ['A tiny label over the heading that adds nothing.', 'Gone.'],
  'craft/text-wrap-role': ['This heading breaks into uneven lines.', 'Now the lines are even.'],
  'a11y/heading-skip': ['The headings here skip a level.', 'Now they go in order.'],
  'craft/gradient-space': ['This gradient goes grey in the middle.', 'Now it stays colourful.'],
  'a11y/nav-unnamed': ['A screen reader can’t tell this menu from the others.', 'Now it has a name.'],
  'craft/hit-target': ['This is too small to tap.', 'Now it’s big enough.'],
  'craft/icon-side': ['There’s too much space on the icon’s side.', 'Now it looks centred.'],
  'craft/flex-min': ['This box grows when it should scroll.', 'Now it scrolls.'],
  'craft/truncate-intent': ['This text is cut off and you can’t read the rest.', 'Now pointing at it shows it all.'],
};
const SIZE = { w: 372, h: 84, toy: 72 };
const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class Note {
  #el; #line; #at = null;

  constructor(root = document.body) {
    this.#line = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.#line.setAttribute('class', 'note-line');
    this.#line.setAttribute('aria-hidden', 'true');
    this.#el = Object.assign(document.createElement('div'), { className: 'note', hidden: true });
    this.#el.setAttribute('role', 'status');
    this.#el.innerHTML = '<i class="note-toy"></i><p><b></b><span></span></p>';
    root.append(this.#line, this.#el);
  }

  /** Where a note about `target` would go, and how much of the marked pieces it would cover there. */
  fit(target, marked) {
    const r = target.getBoundingClientRect(), w = Math.min(SIZE.w, innerWidth - 32), h = SIZE.h;
    // a marked piece and the pill above it
    const keep = marked.map((el) => { const m = el.getBoundingClientRect(); return { left: m.left - 14, right: m.right + 14, top: m.top - 40, bottom: m.bottom + 14 }; });
    const midY = clamp(r.top + Math.min(r.height, 160) / 2 - h / 2, 88, innerHeight - h - 16), midX = clamp(r.left, 16, innerWidth - w - 16);
    const tries = [
      [r.right + 44, midY], [midX, r.bottom + 40], [midX, r.top - h - 64], [r.left - w - 44, midY],
      [innerWidth - w - 16, innerHeight - h - 16], [16, innerHeight - h - 16], [innerWidth - w - 16, 88],
    ].filter(([x, y]) => x >= 16 && x + w <= innerWidth - 16 && y >= 88 && y + h <= innerHeight - 16);
    const cost = ([x, y]) => keep.reduce((sum, k) => sum + overlap({ left: x, right: x + w, top: y, bottom: y + h }, k), 0);
    const [x, y] = tries.sort((a, b) => cost(a) - cost(b))[0] ?? [16, innerHeight - h - 16];
    return { x, y, w, h, cost: cost([x, y]) };
  }

  /**
   * @param target the element the note is about
   * @param marked every element this stop marks: none of them is covered if there is room
   * @returns where the toy waits, in the window
   */
  show(target, marked, { say, sub }) {
    const r = target.getBoundingClientRect(), { x, y, w, h } = this.fit(target, marked);
    return this.#place({ x, y, w, h }, r, { say, sub });
  }

  #place({ x, y, w, h }, r, { say, sub }) {
    Object.assign(this.#el.style, { left: `${x}px`, top: `${y}px`, width: `${w}px` });
    this.#el.querySelector('b').textContent = say;
    this.#el.querySelector('span').textContent = sub ?? '';
    this.#el.removeAttribute('data-done');
    this.#el.hidden = false;
    this.#el.animate([{ opacity: 0, translate: '0 8px' }, { opacity: 1, translate: '0 0' }], { duration: 260, easing: 'ease-out' });
    // the line: from the nearest edge of the note to the nearest edge of the element
    const cx = x + w / 2, cy = y + h / 2;
    const bx = clamp(cx, r.left, r.right), by = clamp(cy, r.top, r.bottom);
    const ax = clamp(bx, x, x + w), ay = clamp(by, y, y + h);
    this.#line.removeAttribute('data-done');
    this.#line.innerHTML = Math.hypot(ax - bx, ay - by) > 12 ? `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}"/><circle cx="${bx}" cy="${by}" r="4.5"/>` : '';
    this.#line.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
    this.#at = { x: x + SIZE.toy / 2, y: y + h / 2 };
    return () => this.#at;
  }

  land({ say, sub }) {
    this.#el.setAttribute('data-done', '');
    this.#line.setAttribute('data-done', '');
    const b = this.#el.querySelector('b');
    b.textContent = say;
    b.animate([{ opacity: 0, translate: '0 .4em' }, { opacity: 1, translate: '0 0' }], { duration: 300, easing: 'ease-out' });
    this.#el.querySelector('span').textContent = sub ?? '';
  }

  async hide() {
    if (this.#el.hidden) return;
    const out = [{ opacity: 1 }, { opacity: 0 }], t = { duration: 180, easing: 'ease-out' };
    await Promise.all([this.#el.animate(out, t).finished, this.#line.animate(out, t).finished]).catch(() => {});
    this.clear();
  }

  clear() { this.#el.hidden = true; this.#line.innerHTML = ''; }
  remove() { this.#el.remove(); this.#line.remove(); }
}
