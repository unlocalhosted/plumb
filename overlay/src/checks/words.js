// Words and clarity: an example for each check. The words the check is about are boxed where they sit, then they
// go, change, or settle where they belong (check-motion.js plays them; checks/marks.js has the shared pieces).
import { at, make, box } from '../check-kit.js';
import { scene, phrase, wirePhrase, fold, marked } from './marks.js';

// the last word of an element's text, as something a guide can be drawn round
const lastWord = (el) => { const n = [...el.childNodes].filter((c) => c.nodeType === 3).pop(), t = n.textContent.trimEnd(), i = t.lastIndexOf(' ') + 1, r = document.createRange(); r.setStart(n, i); r.setEnd(n, t.length); return { getBoundingClientRect: () => r.getBoundingClientRect() }; };
// a slice of an element's box (its right end, say), for a guide
const slice = (el, from, to) => ({ getBoundingClientRect: () => { const r = el.getBoundingClientRect(); return new DOMRect(r.left + r.width * from, r.top, r.width * (to - from), r.height); } });
// set a text to break with its last word alone: as wide as all the words but that one
const widowed = (el) => { const t = el.textContent, head = t.slice(0, t.lastIndexOf(' ')); el.textContent = head; el.style.width = 'max-content'; const w = el.getBoundingClientRect().width; el.textContent = t; el.style.width = `${Math.ceil(w) + 2}px`; };
const chart = (extra = '') => `<div style="display:flex;align-items:end;gap:8px;height:70px">${[34, 52, 40, 66, 58].map((h) => `<i style="position:relative;width:22px;height:${h}px;border-radius:4px 4px 0 0;background:#818cf8"><b class="v" style="position:absolute;left:50%;top:-15px;translate:-50% 0;font:600 10px system-ui;color:#4b5563;opacity:0">${h * 3}</b></i>`).join('')}</div>${extra}`;
const card = (inner, w = 210) => `<div style="width:${typeof w === 'number' ? `${w}px` : w};padding:14px;border-radius:12px;background:#fff;box-shadow:inset 0 0 0 1px #e5e7eb;font:400 12.5px/1.45 system-ui;color:#4b5563">${inner}</div>`;

export const WORDS = {
  'craft/heading-widow': {
    code: ['text-wrap: wrap', 'text-wrap: balance'],
    note: ['The heading leaves one word alone on its last line.', 'Balanced, the two lines look meant.'],
    scene: (s) => {
      scene(s, '<h3 class="x" style="margin:0;font:750 21px/1.25 system-ui;color:#111827">Plan every launch with your whole team</h3>');
      const x = s.querySelector('.x'); widowed(x);
      return { ...marked(s, [lastWord(x)], ['one word alone', 'balanced'], { under: true, dy: 22 }), at: (p) => { x.style.textWrap = p ? 'balance' : 'wrap'; } };
    },
  },
  'craft/text-wrap-role': {
    code: ['text-wrap: wrap', 'text-wrap: pretty'],
    note: ['The paragraph ends on one lonely word.', 'Pretty wrapping takes a word down with it.'],
    scene: (s) => {
      scene(s, '<p class="x" style="margin:0;font:400 14px/1.5 system-ui;color:#374151">Every change lands at the line in your code that made it.</p>');
      const x = s.querySelector('.x'); widowed(x);
      return { ...marked(s, [lastWord(x)], ['a lonely last word', 'pretty'], { under: true, dy: 20 }), at: (p) => { x.style.textWrap = p ? 'pretty' : 'wrap'; } };
    },
  },
  'craft/truncate-intent': {
    code: ['truncate', 'truncate, title={name}'],
    note: ['The name is cut off and there is no way to read the rest.', 'Point at it and the whole name shows.'],
    scene: (s) => {
      scene(s, '<div style="position:relative"><div class="tip" style="position:absolute;left:0;bottom:calc(100% + 8px);padding:6px 9px;border-radius:8px;background:#111827;color:#fff;font:500 11.5px system-ui;white-space:nowrap;opacity:0;translate:0 4px">Quarterly revenue report for the board.pdf</div><div class="x" style="width:170px;padding:9px 12px;border-radius:9px;background:#f3f4f6;font:600 13px system-ui;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Quarterly revenue report for the board.pdf</div></div>');
      const x = s.querySelector('.x'), tip = s.querySelector('.tip');
      return { ...marked(s, [slice(x, 0.82, 0.97)], ['cut, nowhere to read it', 'the whole name on hover'], { under: true, dy: 22, anchor: x }), at: (p) => { tip.style.opacity = p ? 1 : 0; tip.style.translate = p ? '0 0' : '0 4px'; } };
    },
  },
  'craft/hanging-quote': {
    code: ['text-indent: 0', 'hanging-punctuation: first (or text-indent: -0.4em)'],
    note: ['The opening quote mark pushes the first line in: the letters don’t line up.', 'The mark hangs outside, and every line starts on one edge.'],
    scene: (s) => {
      scene(s, '<blockquote class="x" style="margin:0;width:200px;font:500 15px/1.45 Georgia,serif;color:#111827;text-indent:0">“Plumber found eleven things I had missed in a page I thought was done.”</blockquote>');
      const x = s.querySelector('.x'), n = x.firstChild, [col, first, pill] = [make(s, 'vl'), make(s, 'vl'), make(s, 'pill')];
      const letter = () => { const r = document.createRange(); r.setStart(n, 1); r.setEnd(n, 2); return r.getBoundingClientRect(); };
      // the column's edge, and where the first letter starts: apart while the mark sits inside, one line once it hangs
      return { labels: ['quote inside the edge', 'hung outside'], guides: [{ el: col, kind: 'v' }, { el: first, kind: 'v' }, { el: pill, kind: 'pill' }],
        at: (p) => { x.style.textIndent = p ? '-0.42em' : '0em'; },
        track: () => { const b = box(x, s), S = s.getBoundingClientRect(), l = letter().left - S.left; at(col, `left:${b.l}px;top:${b.t - 10}px;height:${b.h + 20}px;bottom:auto`); at(first, `left:${l}px;top:${b.t - 10}px;height:${b.h + 20}px;bottom:auto`); at(pill, `left:${b.l - 10}px;top:${b.t + 10}px;translate:-100% -50%`); } };
    },
  },
  'craft/middle-truncate': {
    code: ['truncate (cut at the end)', 'cut in the middle'],
    note: ['Cut at the end, every path looks the same and the file name is gone.', 'Cut in the middle: the start says where, the end says which file.'],
    scene: (s) => {
      const full = '/Users/ana/projects/atlas/src/components/Header.tsx';
      scene(s, `<div class="x" style="position:relative;width:210px;height:34px;border-radius:9px;background:#f3f4f6;font:500 12px/34px ui-monospace,Menlo,monospace;color:#111827"><span class="a" style="position:absolute;inset:0 10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${full}</span><span class="b" style="position:absolute;inset:0 10px;white-space:nowrap;overflow:hidden;opacity:0">/Users/ana/…/src/<b style="font-weight:700">Header.tsx</b></span></div>`);
      const x = s.querySelector('.x'), a = s.querySelector('.a'), b = s.querySelector('.b');
      return { ...marked(s, [slice(x, 0.62, 0.98)], ['cut at the end', 'cut in the middle'], { under: true, dy: 22, anchor: x }), at: (p) => { a.style.opacity = p ? 0 : 1; b.style.opacity = p ? 1 : 0; } };
    },
  },
  'tells/status-chain': {
    code: ['Synced · 3 files · 2 min ago · by Ana · main · v2.4.1', 'Synced 2 min ago'],
    note: ['Six facts in one line: nobody reads a chain.', 'The one fact people act on; the rest lives where it’s needed.'],
    scene: (s) => {
      scene(s, card(`<b style="display:block;font:700 14px system-ui;color:#111827;margin-bottom:4px">Atlas</b><span style="white-space:nowrap">Synced${phrase(' · 3 files ·', '', 'c1')} 2 min ago${phrase(' · by Ana · main · v2.4.1', '', 'c2')}</span>`, 'auto'));
      const c = [...s.querySelectorAll('.c1,.c2')], sets = c.map(wirePhrase);
      return { ...marked(s, c, ['six facts', 'one'], { pad: 2, round: 4, under: true, dy: 22, anchor: s.querySelector('.ck-scene > div') }), at: (p) => sets.forEach((f) => f(p)) };
    },
  },
  'tells/chart-type-title': {
    code: ['<h3>Bar chart</h3>', '<h3>Signups per week</h3>'],
    note: ['People can see it’s a bar chart; the title should say what it counts.', 'The title says what is measured.'],
    scene: (s) => {
      scene(s, card(`<b style="display:block;font:700 14px system-ui;color:#111827;margin-bottom:10px">${phrase('Bar chart', 'Signups per week', 't')}</b>${chart()}`));
      const t = s.querySelector('.t'), set = wirePhrase(t);
      return { ...marked(s, [t], ['names the chart', 'names the measure'], { pad: 3 }), at: set };
    },
  },
  'tells/reading-instructions': {
    code: ['“Hover over a bar to see its value.”', 'values on the bars'],
    note: ['A line tells people how to read the chart.', 'The values are on the bars; nothing to explain.'],
    scene: (s) => {
      scene(s, card(`<b style="display:block;font:700 14px system-ui;color:#111827;margin-bottom:4px">Signups per week</b><p class="x" style="margin:0 0 18px;font:500 11.5px system-ui;color:#6b7280">Hover over a bar to see its value.</p>${chart()}`));
      const x = s.querySelector('.x'), go = fold(x), vals = [...s.querySelectorAll('.v')];
      return { ...marked(s, [x], ['instructions', 'shown, not told'], { pad: 3, under: true, dy: 22, anchor: s.querySelector('.ck-scene > div') }), at: (p) => { go(p); vals.forEach((v) => { v.style.opacity = p ? 1 : 0; }); } };
    },
  },
  'tells/narrating': {
    code: ['“Below you can see your recent invoices.”', '(cut)'],
    note: ['The line narrates what the screen already shows.', 'Straight to the invoices.'],
    scene: (s) => {
      scene(s, card(`<b style="display:block;font:700 14px system-ui;color:#111827;margin-bottom:4px">Invoices</b><p class="x" style="margin:0 0 8px;color:#6b7280">Below you can see your recent invoices.</p>${['#204 · $480', '#203 · $120', '#202 · $480'].map((r) => `<div style="padding:6px 0;border-top:1px solid #f3f4f6;font:500 12.5px system-ui;color:#111827">${r}</div>`).join('')}`));
      const x = s.querySelector('.x'), go = fold(x);
      return { ...marked(s, [x], ['narrates', 'cut'], { pad: 3, under: true, dy: 22, anchor: s.querySelector('.ck-scene > div') }), at: go };
    },
  },
  'tells/subtitle-echo': {
    code: ['“Manage the members of your team.”', '“4 of 10 seats used”'],
    note: ['The subtitle says the heading again in more words.', 'A second line only for a fact the heading doesn’t say.'],
    scene: (s) => {
      scene(s, card(`<b style="display:block;font:700 16px system-ui;color:#111827;margin-bottom:2px">Team members</b>${phrase('Manage the members of your team.', '4 of 10 seats used', 'x')}`, 'auto'));
      const x = s.querySelector('.x'), set = wirePhrase(x);
      return { ...marked(s, [x], ['says it again', 'adds a fact'], { under: true, dy: 22, pad: 3 }), at: set };
    },
  },
  'tells/em-dash': {
    code: ['Fast — and private.', 'Fast and private.'],
    note: ['Generated copy leans on the dash.', 'Without it, the line reads as written by a person.'],
    scene: (s) => {
      scene(s, `<p style="margin:0;font:700 22px system-ui;color:#111827">Fast${phrase('&nbsp;—', '', 'x')} and private.</p>`);
      const x = s.querySelector('.x'), set = wirePhrase(x);
      return { ...marked(s, [x], ['an em dash', 'cut'], { pad: 3 }), at: set };
    },
  },
  'tells/stock-words': {
    code: ['Supercharge your workflow', 'See what changed on your page'],
    note: ['“Supercharge your workflow” could sit on any product’s page.', 'Say what this one does.'],
    scene: (s) => {
      scene(s, `<h3 style="margin:0;font:800 20px system-ui;color:#111827">${phrase('Supercharge your workflow', 'See what changed on your page', 'x')}</h3>`);
      const x = s.querySelector('.x'), set = wirePhrase(x);
      return { ...marked(s, [x], ['could be anyone’s', 'says what it does'], { pad: 4 }), at: set };
    },
  },
};
