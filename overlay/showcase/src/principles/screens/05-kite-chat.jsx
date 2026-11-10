// #5 trim the text's leading. Kite, a chat: Sana and you between 2:41 and 2:44 pm, before the walkthrough: a location
// for the shoot, a question, the shot list, "On my way". Every message is one bubble component, px-3.5 py-2 with 15px
// words on a 24px line. The line's leading adds itself to the padding above and below the letters, so every short
// reply looks puffy, taller than its sides. plumber's fix trims the text box to the letters, in every bubble at once.
import { FileIcon, PlusIcon, SearchIcon, SendIcon } from '@unlocalhosted/dither-icons';
import sana from '../../media/people/person-03.jpg';
import shed from '../../media/s05-shed.jpg';

export const n = 5;

const Face = ({ className }) => <img src={sana} alt="" className={'shrink-0 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10 ' + className} />;
// every message's words: one bubble, theirs on the sunken grey, yours on the brand
const Bubble = ({ mine, id, children }) => (
  <p data-bubble={id} className={'rounded-[18px] px-3.5 py-2 text-[15px] leading-6 text-pretty ' + (mine ? 'bg-accent text-accent-ink' : 'bg-sunken')}>{children}</p>
);
// a run of Sana's messages: her face once, on the last line, as chat apps group them
const Theirs = ({ children }) => (
  <div className="flex items-end gap-2">
    <Face className="size-[26px]" />
    <span className="flex max-w-[78%] flex-col items-start gap-1">{children}</span>
  </div>
);
const Mine = ({ children, className = '' }) => <div className={'flex max-w-[78%] flex-col items-end gap-1 self-end ' + className}>{children}</div>;

export default function ChatThread() {
  return (
    <article className="flex w-full max-w-[25.5rem] flex-col overflow-hidden rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-3 border-b-hairline border-line px-4 py-3">
        <span className="relative shrink-0">
          <Face className="block size-[38px]" />
          <i aria-label="Active now" className="absolute -right-px -bottom-px size-[11px] rounded-full bg-[#1f9d6b] ring-2 ring-surface" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">Sana Okafor</span>
          <span className="truncate text-xs text-ink-muted">Producer, Moss & Fern · active now</span>
        </span>
        <button type="button" aria-label="Search this conversation" className="grid size-9 place-items-center rounded-control text-ink-muted hover:bg-sunken hover:text-ink"><SearchIcon size={18} texture="dither" /></button>
      </header>

      <div className="flex flex-col gap-1.5 px-4 pt-3.5 pb-[18px]">
        <span className="self-center pb-1.5 text-xs text-ink-muted">Today, 2:41 pm</span>
        <Theirs>
          <Bubble id={1}>Found the spot for the shoot: the old rail shed on Pier Road. The light at four is unreal.</Bubble>
          <img src={shed} alt="A long empty rail shed, its tall windows letting in low sun" className="block h-40 w-[228px] rounded-[18px] object-cover outline-1 -outline-offset-1 outline-black/10" />
          <span className="flex h-6 items-center gap-1.5 text-xs text-ink-muted"><b className="font-medium text-ink">Pier Road shed</b> · 25 min from the studio</span>
        </Theirs>
        <Mine><Bubble mine id={2}>That’s the one.</Bubble><Bubble mine id={4}>Still on for the walkthrough at 3?</Bubble></Mine>
        <Theirs><Bubble id={5}>Yes, finishing the last slides.</Bubble></Theirs>
        <Mine>
          <span className="flex items-center gap-2.5 rounded-[18px] bg-accent py-2 pr-3.5 pl-2 text-accent-ink">
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white/18"><FileIcon size={18} texture="dither" /></span>
            <span className="flex flex-col">
              <span className="text-sm leading-[18px] font-medium">Shot list v2.pdf</span>
              <span className="text-xs leading-4 text-[#e2e1fa]">4 pages · 18 shots</span>
            </span>
          </span>
        </Mine>
        <Theirs>
          <span className="relative">
            <Bubble id={3}>Perfect, thanks!</Bubble>
            <span aria-label="Sana loved this" className="absolute -right-1.5 -bottom-3 flex h-[22px] items-center rounded-full bg-surface px-1.5 text-xs shadow-[0_0_0_0.5px_var(--color-line),var(--shadow-raised)]">❤️</span>
          </span>
        </Theirs>
        <Mine className="mt-2"><Bubble mine id={6}>On my way</Bubble></Mine>
        <span className="flex items-center gap-1.5 self-end pt-0.5 text-xs text-ink-muted">Read 2:44 pm <Face className="size-3.5" /></span>
      </div>

      <footer className="flex items-center gap-2 border-t-hairline border-line px-3 py-2.5">
        <button type="button" aria-label="Attach a file" className="grid size-9 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-sunken hover:text-ink"><PlusIcon size={18} texture="dither" /></button>
        <span className="flex h-9 min-w-0 flex-1 items-center rounded-full bg-sunken px-4 text-sm text-ink-subtle">Message Sana</span>
        <button type="button" aria-label="Send" className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-ink hover:bg-accent-deep"><SendIcon size={16} texture="dither" /></button>
      </footer>
    </article>
  );
}
ChatThread.stage = true;
ChatThread.names = ['Line box', 'Trimmed'];
ChatThread.lesson = {
  why: 'A 24px line around 15px letters puts about 3px of invisible leading above and below them, on top of the room every font keeps above its capitals. It adds itself to py-2, so every one-line reply looks taller than it is wide.',
  habit: 'Measure padding from the letters: trim the text box to the capitals and the baseline (text-box: trim-both cap alphabetic), then set the padding you mean.',
};
// What the eye sees on each one-line reply: the bubble's padding, and the space the line adds between it and the
// letters (the hatch), above the capitals and below the baseline. The pill is that unseen space above, in px, on
// "Perfect, thanks!".
let ctx;
ChatThread.measure = (root) => {
  const all = [...(root?.querySelectorAll('[data-bubble]') ?? [])];
  const b = root?.querySelector('[data-bubble="3"]');
  if (!b) return null;
  const rules = [], bands = [];
  let pill = null, k = 1, off = false;
  for (const el of all) {
    const br = el.getBoundingClientRect(), s = getComputedStyle(el);
    k = br.width / el.offsetWidth || 1;
    const r = document.createRange(); r.selectNodeContents(el);
    const qs = r.getClientRects(), q = qs[0];
    if (!q || [...qs].some((x) => Math.abs(x.top - q.top) > 4)) continue; // one-line replies only
    ctx ??= document.createElement('canvas').getContext('2d');
    ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const m = ctx.measureText('H'), asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent, cap = m.actualBoundingBoxAscent;
    const baseline = q.top + ((q.height / k - (asc + desc)) / 2 + asc) * k, capTop = baseline - cap * k;
    const top = br.top + parseFloat(s.paddingTop) * k, bottom = br.bottom - parseFloat(s.paddingBottom) * k, unseen = (capTop - top) / k;
    const id = el.dataset.bubble;
    rules.push({ key: `cap${id}`, y: capTop, left: br.left - 10 * k, right: br.right + 10 * k }, { key: `base${id}`, y: baseline, left: br.left - 10 * k, right: br.right + 10 * k });
    bands.push({ key: `above${id}`, left: br.left, right: br.right, top, bottom: capTop, pattern: 'hatch' }, { key: `below${id}`, left: br.left, right: br.right, top: baseline, bottom, pattern: 'hatch' });
    if (el === b) { off = unseen >= 0.5; pill = { key: 'unseen', x: br.right + 22 * k, y: (top + capTop) / 2, text: (Math.max(0, unseen) * k).toFixed(1), ok: unseen < 0.5 }; }
  }
  const br = b.getBoundingClientRect();
  return {
    lines: [], rules, bands, pills: pill ? [pill] : [], off,
    cut: { left: br.left, right: br.right, top: br.top, bottom: br.bottom, r: 18 * k },
    subject: { left: br.left - 40 * k, right: br.right + 60 * k, top: br.top - 50 * k, bottom: br.bottom + 50 * k },
  };
};
