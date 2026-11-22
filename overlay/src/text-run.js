/* TEXT RUN · one run of words among other elements, edited where the page drew it (text-edit.js).
 *
 *   <p>words <b>bold words</b></p>      the run is "words": one text node, not the paragraph
 *
 * The words shown are the words edited: the paragraph takes the caret, so hit testing, lines, centring and selection
 * are the browser's own reading of the page. (A copy of the run laid over it can't be: a run's lines are placed by the
 * whole paragraph, so the copy's second line sat up to 135px from the words, and Backspace took another letter.)
 *
 * The paragraph being editable must not make the rest of it editable:
 *  selection   kept inside the run
 *  edits       every one is made here, on the run's own node, from the range the browser says it would change. Left to
 *              itself, typing at either end lands in the element next to it, and emptying the run removes the node
 *              React holds. So undo is kept here too
 *  spaces      a space HTML would collapse is held as a no-break space while editing; saving reads it as a space
 *  composing   the one edit that can't be prevented (IME, dead keys): put back when it ends, then made here
 */
const HELD = ' ';  // a space that must show
const EMPTY = '​'; // what keeps a caret in a run with no words
const DELETES = /^delete(?!ByDrag)/;
// How far a deletion reaches from a caret. Chrome names no target range for one in plaintext-only, so the selection is
// stretched the way that key would have, by the browser's own measure of a character, a word and a line
const REACH = {
  deleteContentBackward: ['backward', 'character'], deleteContentForward: ['forward', 'character'],
  deleteWordBackward: ['backward', 'word'], deleteWordForward: ['forward', 'word'],
  deleteSoftLineBackward: ['backward', 'lineboundary'], deleteSoftLineForward: ['forward', 'lineboundary'],
  deleteHardLineBackward: ['backward', 'lineboundary'], deleteHardLineForward: ['forward', 'lineboundary'],
};
const INSERTS = new Set(['insertText', 'insertReplacementText', 'insertFromPaste', 'insertFromPasteAsQuotation', 'insertFromYank', 'insertTranspose']);
// what plaintext-only changes by itself, each of which can move a word; and what editing needs of any element
const KEPT = ['white-space-collapse', 'overflow-wrap', 'line-break'];

// Runs of spaces touching a..b, rewritten at the same length so each one shows and a line can still break.
function showSpaces(text, a, b) {
  return text.replace(/[  ]+/g, (run, at) => {
    if (at > b || at + run.length < a) return run;
    let out = '', plain = false;
    for (let i = at; i < at + run.length; i++) {
      plain = !plain && i > 0 && i < text.length - 1;
      out += plain ? ' ' : HELD;
    }
    return out;
  });
}

export class TextRun {
  #el; #node; #lead; #trail; #kids; #styles = []; #prior; #styled;
  #undo = []; #redo = []; #typedTo = -1; #composing = null;

  constructor(el, node, caret) {
    this.#el = el;
    this.#node = node;
    this.#lead = node.data.match(/^\s*/)[0].length;
    this.#trail = node.data.match(/\s*$/)[0].length;
    this.#kids = [...el.childNodes];
    this.#prior = el.getAttribute('contenteditable');
    this.#styled = el.hasAttribute('style');
    const cs = getComputedStyle(el);
    const set = KEPT.map((name) => [name, cs.getPropertyValue(name)]).filter(([, value]) => value);
    set.push(['-webkit-user-select', 'text'], ['user-select', 'text'], ['outline', 'none'], ['caret-color', caret]);
    this.#styles = set.map(([name]) => [name, el.style.getPropertyValue(name), el.style.getPropertyPriority(name)]);
    for (const [name, value] of set) el.style.setProperty(name, value, 'important');
    el.setAttribute('contenteditable', 'plaintext-only');
    el.focus({ preventScroll: true });
  }

  /** False where the element can't take a caret (it is not focusable, or the browser has no plaintext-only). */
  get ready() { return this.#el.isContentEditable && this.#el.matches(':focus'); }

  // Where the run is in its node now: between the space it had on either side of it
  #bounds() {
    const data = this.#node.data;
    const lo = Math.min(this.#lead, data.match(/^\s*/)[0].length);
    return [lo, Math.max(lo, data.length - Math.min(this.#trail, data.match(/\s*$/)[0].length))];
  }
  get text() {
    const [lo, hi] = this.#bounds(), text = this.#node.data.slice(lo, hi);
    return text === EMPTY ? '' : text;
  }
  range() {
    const [lo, hi] = this.#bounds(), range = document.createRange();
    range.setStart(this.#node, lo); range.setEnd(this.#node, hi);
    return range;
  }

  // A position anywhere in the element, as a place in the node inside the run
  #inside(container, offset) {
    const [lo, hi] = this.#bounds();
    if (container === this.#node) return Math.max(lo, Math.min(hi, offset));
    const start = document.createRange();
    start.setStart(this.#node, 0); start.collapse(true);
    return start.comparePoint(container, offset) <= 0 ? lo : hi;
  }
  // The selection, in the run's words
  #selected(range) {
    const r = range ?? (getSelection().rangeCount ? getSelection().getRangeAt(0) : null);
    const length = this.text.length;
    if (!r || !this.#el.contains(r.startContainer)) return [length, length];
    const [lo] = this.#bounds();
    return [r.startContainer, r.endContainer].map((node, i) => Math.min(length, this.#inside(node, i ? r.endOffset : r.startOffset) - lo));
  }
  select(a, b = a) {
    const [lo, hi] = this.#bounds();
    getSelection().setBaseAndExtent(this.#node, Math.min(hi, lo + a), this.#node, Math.min(hi, lo + b));
  }
  /** The word at an offset of the node, the way the page's own double-click selects it. */
  selectWord(offset) {
    const [lo] = this.#bounds(), text = this.text;
    let a = Math.max(0, Math.min(text.length, (offset ?? Infinity) - lo)), b = a;
    while (a > 0 && /\S/.test(text[a - 1])) a--;
    while (b < text.length && /\S/.test(text[b])) b++;
    if (a === b) { a = 0; b = text.length; }
    this.select(a, b);
  }

  #put(text) {
    const [lo, hi] = this.#bounds();
    this.#node.replaceData(lo, hi - lo, text || EMPTY);
  }
  #replace(a, b, words) {
    const was = this.text;
    if (a === b && !words) return;
    // typing on is one step of undo; a space, a deletion or a move starts the next
    const typing = a === b && words.length === 1 && /\S/.test(words);
    if (!typing || this.#typedTo !== a) this.#undo.push({ text: was, a, b });
    this.#typedTo = typing ? a + 1 : -1;
    this.#redo = [];
    this.#put(showSpaces(was.slice(0, a) + words + was.slice(b), a, a + words.length));
    this.select(a + words.length);
  }
  #step(from, to) {
    const back = from.pop();
    if (!back) return;
    const [a, b] = this.#selected();
    to.push({ text: this.text, a, b });
    this.#typedTo = -1;
    this.#put(back.text);
    this.select(back.a, back.b);
  }

  /** The editor's keys first: true when the run took it. */
  key(event) {
    const key = event.key.toLowerCase(), command = event.metaKey || event.ctrlKey;
    // in a button or a link, Space presses it rather than typing
    if (key === ' ' && !command) { const [a, b] = this.#selected(); this.#replace(a, b, ' '); }
    else if (command && key === 'z') this.#step(...(event.shiftKey ? [this.#redo, this.#undo] : [this.#undo, this.#redo]));
    else if (event.ctrlKey && key === 'y') this.#step(this.#redo, this.#undo);
    else return false;
    event.preventDefault();
    return true;
  }

  #before = (event) => {
    if (this.#composing && /Composition/.test(event.inputType)) return;
    event.preventDefault();
    if (event.inputType === 'historyUndo') return this.#step(this.#undo, this.#redo);
    if (event.inputType === 'historyRedo') return this.#step(this.#redo, this.#undo);
    const insert = INSERTS.has(event.inputType);
    if (!insert && !DELETES.test(event.inputType)) return; // a line break, a format, a drag: not edits a run takes
    const words = insert ? (event.data ?? event.dataTransfer?.getData('text/plain') ?? '').replace(/\s*[\r\n]+\s*/g, ' ').replace(/\t/g, ' ') : '';
    if (insert && !words) return;
    const target = event.getTargetRanges()[0], reach = REACH[event.inputType];
    let [a, b] = this.#selected(target);
    if (reach && !target && a === b) {
      getSelection().modify('extend', ...reach);
      [a, b] = this.#selected();
      if (a === b) this.select(a); // nothing of the run that way
    }
    this.#replace(a, b, words);
  };

  // the caret and either end of a selection stay in the run
  #keep = () => {
    if (this.#composing || !this.#node.isConnected) return;
    const { anchorNode, anchorOffset, focusNode, focusOffset } = getSelection();
    if (!anchorNode || !this.#el.contains(anchorNode) || !this.#el.contains(focusNode)) return;
    const a = this.#inside(anchorNode, anchorOffset), b = this.#inside(focusNode, focusOffset);
    if (anchorNode === this.#node && anchorOffset === a && focusNode === this.#node && focusOffset === b) return;
    getSelection().setBaseAndExtent(this.#node, a, this.#node, b);
  };

  #composeStart = () => {
    const [a, b] = this.#selected(), texts = [], walk = document.createTreeWalker(this.#el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) texts.push([n, n.data]);
    this.#composing = { a, b, texts, kids: [...this.#el.childNodes] };
  };
  #uncompose() {
    const was = this.#composing;
    this.#composing = null;
    if (!was) return null;
    if (!this.#node.isConnected) this.#el.replaceChildren(...was.kids);
    for (const [node, data] of was.texts) if (node.data !== data) node.data = data;
    return was;
  }
  #composeEnd = (event) => {
    const was = this.#uncompose();
    if (!was) return;
    if (event.data) this.#replace(was.a, was.b, event.data);
    else this.select(was.a, was.b);
  };
  // a click puts the caret down; in a link, a button or a label it must not also press it
  #click = (event) => {
    if (!this.#el.contains(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
  };

  /** Everything the run listens to, in the editor's scope for the edit. */
  listen(scope) {
    scope.listen(this.#el, 'beforeinput', this.#before);
    scope.listen(this.#el, 'compositionstart', this.#composeStart);
    scope.listen(this.#el, 'compositionend', this.#composeEnd);
    scope.listen(document, 'selectionchange', this.#keep);
    scope.listen(window, 'click', this.#click, true);
  }

  /** The element back the way it was. The words are the editor's to set. */
  end() {
    this.#uncompose();
    if (!this.#node.isConnected && this.#el.isConnected && !this.#el.childNodes.length) this.#el.replaceChildren(...this.#kids);
    if (this.#prior === null) this.#el.removeAttribute('contenteditable');
    else this.#el.setAttribute('contenteditable', this.#prior);
    for (const [name, value, priority] of this.#styles) {
      if (value) this.#el.style.setProperty(name, value, priority);
      else this.#el.style.removeProperty(name);
    }
    if (!this.#styled && !this.#el.style.length) this.#el.removeAttribute('style');
    this.#el.blur();
  }
}

// The boxes of the words, one a line.
export function lineBoxes(rects) {
  const lines = [];
  for (const r of [...rects].filter((r) => r.width > 0.5 && r.height > 0.5).sort((p, q) => p.top - q.top)) {
    const line = lines.at(-1), middle = (r.top + r.bottom) / 2;
    if (line && middle > line.top && middle < line.bottom) {
      line.left = Math.min(line.left, r.left); line.right = Math.max(line.right, r.right);
      line.top = Math.min(line.top, r.top); line.bottom = Math.max(line.bottom, r.bottom);
    } else lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
  }
  return lines;
}

// An outline round exactly those lines, in the coordinates of a box at x, y: one stepped shape where consecutive lines
// overlap, separate ones where they don't (the end of a line and the start of the next).
export function outlineOf(lines, x, y, radius = 3) {
  const shapes = [];
  for (const line of lines) {
    const last = shapes.at(-1)?.at(-1);
    if (last && Math.min(last.right, line.right) - Math.max(last.left, line.left) > radius * 4) shapes.at(-1).push(line);
    else shapes.push([line]);
  }
  return shapes.map((shape) => {
    const right = [], left = [];
    shape.forEach((line, i) => {
      const top = (i ? (shape[i - 1].bottom + line.top) / 2 : line.top - 2) - y;
      const bottom = (i < shape.length - 1 ? (line.bottom + shape[i + 1].top) / 2 : line.bottom + 2) - y;
      right.push([line.right + 3 - x, top], [line.right + 3 - x, bottom]);
      left.unshift([line.left - 3 - x, bottom], [line.left - 3 - x, top]);
    });
    const corners = [...right, ...left].filter(([px, py], i, all) => !i || Math.abs(px - all[i - 1][0]) + Math.abs(py - all[i - 1][1]) > 0.5);
    return corners.map(([px, py], i) => {
      const toward = ([qx, qy]) => {
        const d = Math.hypot(qx - px, qy - py) || 1, t = Math.min(radius, d / 2) / d;
        return `${(px + (qx - px) * t).toFixed(2)} ${(py + (qy - py) * t).toFixed(2)}`;
      };
      return `${i ? 'L' : 'M'}${toward(corners.at(i - 1))}Q${px.toFixed(2)} ${py.toFixed(2)} ${toward(corners[(i + 1) % corners.length])}`;
    }).join('') + 'Z';
  }).join('');
}
