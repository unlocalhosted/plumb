// #76 truncate paths in the middle. Seam, code review: the changed files of PR #482, in a side panel you can narrow by
// dragging its edge. Every row's path is one `truncate` span, so the browser cuts each at its end, and the end is the
// file name: drag the panel in and all six rows read src/components/forms…, the same on every row, since the comment
// and line-count columns are fixed and every path gets the same width. Fixed: each path keeps its file name whole and
// gives up the middle instead (a truncating start and a whole end), the full path in its title.
// The marks are what the lesson turns on: on the broken side the rows that now read alike, on the fixed side the file
// name each row kept. The middle-truncate rule (craft-rules.js) marks the broken rows.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileIcon, MessageIcon } from '@unlocalhosted/dither-icons';
import ada from '../../media/people/person-03.jpg';

export const n = 76;
export const handsOn = true;

// plumber's marks live in a shadow root with plumber's tokens, so reading [data-example] never reads them
const TOKENS = '/__plumb/src/tokens.css';
function MarksLayer({ children }) {
  const host = useRef(null);
  const [root, setRoot] = useState(null);
  useEffect(() => {
    const r = host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' });
    r.innerHTML = `<link rel="stylesheet" href="${TOKENS}"><style>:host { position: absolute; inset: 0; pointer-events: none; overflow: visible; }</style>`;
    setRoot(r);
  }, []);
  return <div ref={host} data-scheme="light" aria-hidden="true" className="pointer-events-none absolute inset-0">{root ? createPortal(children, root) : null}</div>;
}
const hue = (off) => (off ? 'var(--pl-off)' : 'var(--pl-on)');
const Outline = ({ x, y, w, h, off, r = 4 }) => (
  <span style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, boxShadow: `inset 0 0 0 1px ${hue(off)}`, opacity: 0.7 }} />
);
const Tag = ({ x, y, off, children }) => (
  <span style={{ position: 'absolute', left: x, top: y, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', height: 20, padding: '0 var(--pl-space-3)',
    borderRadius: 'var(--pl-radius-tag)', font: '500 11px/1 var(--pl-mono)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
    color: 'var(--pl-on-accent)', background: hue(off), boxShadow: '0 0 0 1px var(--pl-halo)' }}>{children}</span>
);
// a box in the example's own pixels, whatever the stage's camera does to it
function local(root) {
  const o = root.getBoundingClientRect(), k = o.width / root.offsetWidth || 1;
  return (el) => { const r = el.getBoundingClientRect(); return { x: (r.left - o.left) / k, y: (r.top - o.top) / k, w: r.width / k, h: r.height / k }; };
}

const FILES = [
  { path: 'src/components/forms/inputs/TextField.tsx', st: 'M', add: 48, del: 31, notes: 3, sel: true },
  { path: 'src/components/forms/inputs/Checkbox.tsx', st: 'M', add: 22, del: 19 },
  { path: 'src/components/forms/inputs/Select.tsx', st: 'M', add: 35, del: 28 },
  { path: 'src/components/forms/inputs/RadioGroup.tsx', st: 'M', add: 27, del: 18 },
  { path: 'src/components/forms/inputs/FieldLabel.tsx', st: 'A', add: 64, del: 0 },
  { path: 'src/components/forms/inputs/index.ts', st: 'M', add: 18, del: 0 },
];
const MIN = 220, MAX = 420, START = 320;

function MiddlePath({ path }) {
  const cut = path.lastIndexOf('/') + 1;
  return (
    <span title={path} className="flex min-w-0 flex-1 font-mono text-xs">
      <span className="truncate">{path.slice(0, cut)}</span>
      <span className="shrink-0">{path.slice(cut)}</span>
    </span>
  );
}

export default function PathList({ side = 'broken', onStatus }) {
  const root = useRef(null), panel = useRef(null);
  const [w, setW] = useState(START), drag = useRef(null);
  const [held, setHeld] = useState(false);
  const [seen, setSeen] = useState([]);
  const fixed = side === 'fixed';
  // what each row shows: its rendered text, read back (the truncation is the browser's)
  useLayoutEffect(() => {
    const rows = [...(panel.current?.querySelectorAll('[data-path]') ?? [])];
    setSeen(rows.map((r) => {
      const spans = [...r.querySelectorAll('[data-words] span, [data-words]')].filter((x) => !x.children.length && x.textContent.trim());
      const visible = spans.map((x) => (x.scrollWidth > x.clientWidth + 1 ? x.textContent.slice(0, Math.max(0, Math.floor((x.clientWidth / x.scrollWidth) * x.textContent.length) - 1)) + '…' : x.textContent)).join('');
      const at = local(root.current), box = at(r), text = spans.map(at), name = spans.length > 1 ? at(spans.at(-1)) : null;
      return { visible, box, cut: spans.some((x) => x.scrollWidth > x.clientWidth + 1), text: { x: text[0].x, y: box.y + 6, w: text.at(-1).x + text.at(-1).w - text[0].x, h: box.h - 12 }, name };
    }));
  }, [w, side]);
  const cut = seen.some((r) => r.cut), same = new Set(seen.map((r) => r.visible)).size < seen.length;
  useEffect(() => {
    onStatus?.(!cut ? 'Drag the panel’s edge to the left, narrower.'
      : !fixed ? (same ? `Now the rows read alike: ${seen.length} paths lost their ends, and the end is the file you were looking for.` : 'Each path lost its end first, the part that tells them apart. Keep going.')
      : 'Each row keeps its file name whole and gives up the middle of the path instead.');
  }, [seen, cut, same, fixed, onStatus]);
  // a drag ends however the hand ends it
  useEffect(() => {
    const move = (e) => { if (!drag.current) return; if (e.buttons === 0) return end(); setW(Math.max(MIN, Math.min(MAX, drag.current.w + (e.clientX - drag.current.x) / drag.current.k))); };
    const end = () => { drag.current = null; setHeld(false); };
    addEventListener('pointermove', move); addEventListener('pointerup', end); addEventListener('pointercancel', end); addEventListener('blur', end);
    return () => { removeEventListener('pointermove', move); removeEventListener('pointerup', end); removeEventListener('pointercancel', end); removeEventListener('blur', end); };
  }, []);
  const grab = (e) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    const o = root.current.getBoundingClientRect();
    drag.current = { x: e.clientX, w, k: o.width / root.current.offsetWidth || 1 }; setHeld(true);
  };
  const total = FILES.reduce((a, f) => [a[0] + f.add, a[1] + f.del], [0, 0]);
  return (
    <div ref={root} className={'relative w-[34rem] max-w-full select-none ' + (held ? 'cursor-col-resize' : '')}>
      <article ref={panel} style={{ width: w }} className="relative flex flex-col rounded-card bg-surface shadow-card">
        <header className="flex flex-col gap-2 border-b-hairline px-4 pt-3.5 pb-3">
          <span className="flex items-center gap-2 text-xs text-ink-subtle">
            <span className="inline-flex h-5 items-center rounded-chip bg-positive-soft px-1.5 text-[11.5px] font-medium text-positive">Open</span>
            <span className="tabular-nums">#482</span><span className="truncate">· Approved by 2</span>
          </span>
          <span className="text-sm leading-5 font-semibold tracking-[-0.01em] text-pretty">Form inputs share one label component</span>
          <span className="flex min-w-0 items-center gap-2 text-xs text-ink-muted">
            <img src={ada} alt="" className="size-5 shrink-0 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10" />
            <span className="truncate">Ada Mensah into</span><code className="rounded-chip bg-accent-soft px-1.5 font-mono text-[11.5px] text-accent-deep">main</code>
          </span>
          <span className="flex items-center gap-2.5 text-xs tabular-nums">
            <span className="font-medium text-positive">+{total[0]}</span><span className="font-medium text-negative">−{total[1]}</span><span className="text-ink-muted">{FILES.length} files</span>
            <span className="ml-auto flex gap-0.5" aria-hidden="true">
              {['bg-positive', 'bg-positive', 'bg-positive', 'bg-negative', 'bg-sunken'].map((c, i) => <span key={i} className={'size-2 rounded-[2px] ' + c} />)}
            </span>
          </span>
        </header>
        <span className="flex items-center gap-2 px-4 pt-2.5 pb-1.5 text-[13px] font-medium">
          <FileIcon size={14} texture="dither" className="text-ink-muted" />Changed files<span className="ml-auto text-xs font-normal text-ink-subtle tabular-nums">2 of 6 viewed</span>
        </span>
        <ul>
          {FILES.map((f) => (
            <li key={f.path} data-path className={'flex h-8 min-w-0 items-center gap-2 px-4 ' + (f.sel ? 'bg-accent-soft text-ink' : 'text-ink-muted')}>
              <span className={'grid size-4 shrink-0 place-items-center rounded-chip font-mono text-[10px] font-semibold ' + (f.st === 'A' ? 'bg-positive-soft text-positive' : 'bg-caution-soft text-caution')}>{f.st}</span>
              {fixed ? <span data-words className="flex min-w-0 flex-1"><MiddlePath path={f.path} /></span>
                : <span data-words title={f.path} className="min-w-0 flex-1 truncate font-mono text-xs">{f.path}</span>}
              <span className="flex w-7 shrink-0 items-center justify-end gap-0.5 text-[11px] text-accent-deep tabular-nums">{f.notes ? <><MessageIcon size={11} texture="solid" />{f.notes}</> : null}</span>
              <span className="flex w-[4.25rem] shrink-0 justify-end gap-1 font-mono text-[11px] tabular-nums">
                <span className="text-positive">+{f.add}</span><span className="w-[1.625rem] text-right text-negative">{f.del ? `−${f.del}` : ''}</span>
              </span>
            </li>
          ))}
        </ul>
        <footer className="mt-1.5 flex items-center gap-2 border-t-hairline px-4 pt-2.5 pb-3 text-xs text-ink-muted">
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-sunken"><span className="block h-full w-1/3 rounded-full bg-accent" /></span>Mark all viewed
        </footer>
        <span role="separator" aria-orientation="vertical" aria-label="Panel width" aria-valuenow={Math.round(w)} aria-valuemin={MIN} aria-valuemax={MAX} onPointerDown={grab}
          className={'group absolute top-3 -right-1.5 bottom-3 w-3 cursor-col-resize rounded-full touch-none ' + (held ? 'bg-accent/15' : 'hover:bg-accent/15')}>
          <span className={'absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full ' + (held ? 'bg-accent' : 'bg-line group-hover:bg-accent')} />
        </span>
      </article>
      <MarksLayer>
        {/* what the lesson turns on: rows that now read alike (coral), or the file names each row kept (mint) */}
        {seen.map((r, i) => (!r.cut ? null : !fixed ? (same ? <Outline key={i} {...r.text} x={r.text.x - 3} w={r.text.w + 6} off /> : null)
          : r.name ? <Outline key={i} x={r.name.x - 2} y={r.box.y + 6} w={r.name.w + 4} h={r.box.h - 12} off={false} /> : null))}
        {cut ? <Tag x={w + 22} y={seen[0].box.y + seen[0].box.h / 2} off={!fixed}>{!fixed ? (same ? `${seen.length} rows read the same` : 'the file is cut') : 'file names kept ✓'}</Tag> : null}
      </MarksLayer>
    </div>
  );
}
PathList.names = ['Cut at the end', 'Cut in the middle'];
PathList.lesson = {
  why: 'A path’s two ends carry its meaning: where it lives, and which file it is. Truncating at the end keeps the part every row shares and drops the file name, so a narrow list of paths reads src/components/forms…, six times over.',
  habit: 'Truncate paths and IDs in the middle: keep the start and the end, give up the middle, and put the full value in a title.',
};
