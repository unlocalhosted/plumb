// #4 an icon beside words centres on the capitals, not the line box. Satchel, a team drive: the Activity on Moss &
// Fern's Spring launch drive mid-morning, five events, two unread. Each row is an icon beside a title that may wrap,
// with where and when under it and what changed under that, so the row is built to the top (items-start), and every
// icon sits on the top of its first line's box, about 2.5px above the middle of the capitals. plumber nudges them down.
import { FolderIcon, LayersIcon, MessageIcon, UploadIcon, UserIcon } from '@unlocalhosted/dither-icons';
import shelves from '../../media/s04-shelves.jpg';
import mira from '../../media/people/person-05.jpg';
import theo from '../../media/people/person-02.jpg';
import sana from '../../media/people/person-03.jpg';
import june from '../../media/people/person-10.jpg';

export const n = 4;

// the homepage frame June changed, at three widths: Moss & Fern's nav, the shelves as its hero, a heading and a line
function Frame({ width, hero, label }) {
  return (
    <span className="flex flex-col gap-1 text-[11.5px] text-ink-subtle">
      <span className="relative flex flex-col gap-[3px] rounded-[4px] bg-[#fbfaf7] p-[5px] shadow-[0_0_0_0.5px_rgb(18_35_61/0.16)]" style={{ width }}>
        <b className="h-[3px] w-2/5 rounded-[1px] bg-[#2f6b4f]" />
        <img src={shelves} alt="" className="block w-full rounded-[2px] object-cover outline-1 -outline-offset-1 outline-black/10" style={{ height: hero }} />
        <i className="h-0.5 w-[70%] rounded-[1px] bg-ink/18" />
        <i className="h-0.5 w-1/2 rounded-[1px] bg-ink/18" />
        <b aria-label="Changed" className="absolute -top-[3px] -right-[3px] size-2 rounded-full bg-accent ring-2 ring-surface" />
      </span>
      {label}
    </span>
  );
}

const EVENTS = [
  { Icon: UploadIcon, face: mira, who: 'Mira', did: 'uploaded', what: 'Brand guidelines v3.pdf', where: 'Design · 4 min ago', unread: true,
    more: (
      <span className="mt-2 flex items-center gap-3 rounded-lg bg-surface p-2 shadow-[0_0_0_0.5px_rgb(18_35_61/0.16),0_1px_2px_rgb(18_35_61/0.05)]">
        <span aria-hidden="true" className="flex h-[46px] w-9 shrink-0 flex-col gap-[3px] rounded-[2px] bg-white p-[5px] shadow-[0_0_0_0.5px_var(--color-line),0_1px_2px_rgb(18_35_61/0.08)]">
          <b className="h-[9px] rounded-[1px] bg-[#2f6b4f]" />
          {[80, 60, 70].map((w) => <i key={w} className="h-0.5 rounded-[1px] bg-ink/18" style={{ width: `${w}%` }} />)}
          <span className="mt-auto flex gap-0.5">{['#3f63a8', '#e9b93c', '#2f6b4f'].map((c) => <b key={c} className="h-[5px] flex-1 rounded-[1px]" style={{ background: c }} />)}</span>
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-medium">Brand guidelines v3.pdf</span>
          <span className="truncate text-xs text-ink-muted tabular-nums">24 pages · 8.2 MB · replaces v2</span>
        </span>
      </span>
    ) },
  { Icon: MessageIcon, face: theo, who: 'Theo', did: 'commented on', what: 'Launch timeline', where: 'Planning · 22 min ago', unread: true,
    more: <q className="relative mt-2 block py-0.5 pl-3 text-[13.5px] leading-5 text-pretty text-ink before:absolute before:inset-y-0.5 before:left-0 before:w-0.5 before:rounded-[1px] before:bg-ink/14 before:content-[''] after:content-none">Can we move the shoot to the 14th? The kiln is booked until then, so the new glazes won’t be out.</q> },
  { Icon: LayersIcon, face: june, who: 'June', did: 'edited', what: 'Homepage, spring.plate', where: 'Design · 1 hr ago',
    more: (
      <span className="mt-2 flex items-end gap-2">
        <Frame width={128} hero={44} label="Desktop" />
        <Frame width={72} hero={40} label="Tablet" />
        <Frame width={40} hero={34} label="Phone" />
        <span className="ml-auto self-center text-[12.5px] text-ink-subtle">3 frames changed</span>
      </span>
    ) },
  { Icon: FolderIcon, face: sana, who: 'Sana', did: 'moved 12 files to', what: 'Archive / 2025', where: 'Shared drive · 2 hr ago',
    more: (
      <span className="mt-2 flex flex-wrap gap-1.5">
        {[['#3f63a8', '7 photos'], ['#b02a3a', '3 PDFs'], ['#2f6b4f', '2 sheets']].map(([c, t]) => (
          <span key={t} className="flex h-6 items-center gap-1.5 rounded-control bg-sunken px-2 text-xs text-ink-muted"><i className="size-2 rounded-[2px]" style={{ background: c }} />{t}</span>
        ))}
      </span>
    ) },
  { Icon: UserIcon, face: mira, who: 'Mira', did: 'invited', what: 'June', tail: 'to edit', where: 'Spring launch · 3 hr ago' },
];

export default function DriveActivity() {
  return (
    <article className="w-full max-w-[27.5rem] rounded-card bg-surface shadow-card">
      <header className="flex items-center gap-3 px-5 pt-[18px] pb-3.5">
        <span className="flex min-w-0 flex-col">
          <span className="text-[17px] leading-6 font-medium tracking-[-0.01em]">Activity</span>
          <span className="truncate text-[13px] text-ink-muted">Spring launch · shared drive</span>
        </span>
        <span className="ml-auto flex shrink-0 -space-x-1.5" aria-label="Mira, Theo, Sana, June and 3 more">
          {[mira, theo, sana, june].map((f) => <img key={f} src={f} alt="" className="size-[26px] rounded-full object-cover ring-2 ring-surface" />)}
          <span className="grid size-[26px] place-items-center rounded-full bg-sunken text-[11px] font-semibold text-ink-muted ring-2 ring-surface">+3</span>
        </span>
      </header>
      <div role="tablist" className="mx-5 flex gap-0.5 rounded-lg bg-sunken p-0.5">
        {[['All', 18, true], ['Comments', 4], ['Files', 11]].map(([t, c, on]) => (
          <button key={t} type="button" role="tab" aria-selected={!!on}
            className="flex h-7 flex-1 items-center justify-center rounded-control text-[13px] text-ink-muted aria-selected:bg-surface aria-selected:font-medium aria-selected:text-ink aria-selected:shadow-[var(--shadow-raised),0_0_0_0.5px_var(--color-line)]">
            {t}<span className="ml-1.5 text-xs font-normal text-ink-subtle tabular-nums">{c}</span>
          </button>
        ))}
      </div>

      <h3 className="px-5 pt-4 pb-1 text-xs font-medium text-ink-muted">Today</h3>
      <ul data-activity className="px-5">
        {EVENTS.map(({ Icon, face, who, did, what, tail, where, unread, more }) => (
          <li key={where} className="flex items-start gap-3 border-t-hairline border-line py-3.5">
            <Icon size={16} texture="dither" className="shrink-0 text-ink-muted" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm text-pretty text-ink-muted">
                <img src={face} alt="" className="mr-1.5 inline-block size-[18px] rounded-full object-cover align-[-4px] outline-1 -outline-offset-1 outline-black/10" />
                <b className="font-medium text-ink">{who}</b> {did} <b className="font-medium text-ink">{what}</b>{tail ? ` ${tail}` : null}
              </span>
              <span className="text-[12.5px] text-ink-subtle">{where}</span>
              {more}
            </span>
            {unread ? <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" /> : null}
          </li>
        ))}
      </ul>
      <footer className="flex items-center justify-between border-t-hairline border-line px-5 pt-2.5 pb-3.5 text-[13px]">
        <a href="#activity" className="-my-1 inline-flex min-h-6 items-center font-medium text-accent hover:text-accent-deep">View all activity</a>
        <span className="text-ink-subtle">13 more today</span>
      </footer>
    </article>
  );
}
DriveActivity.stage = true;
DriveActivity.names = ['Line box', 'Cap height'];
DriveActivity.lesson = {
  why: 'A row built to the top puts the icon at the top of the first line’s box, but a line box holds room above the capitals and below the baseline. The eye reads the capitals, so the icon sits high beside every title.',
  habit: 'Centre an icon on the middle of the capitals beside it, not on the line box: in a row built to wrap, on the first line’s.',
};
// What the eye sees: in each row, the middle of the title's capitals and the middle of the icon, carried across as
// guides; the hatch is the gap between them. The pill is the first row's gap, in px.
let ctx;
DriveActivity.measure = (root) => {
  const list = root?.querySelector('[data-activity]');
  if (!list) return null;
  const k = list.getBoundingClientRect().width / list.offsetWidth || 1;
  const rules = [], bands = [];
  let first = null;
  [...list.children].forEach((li, i) => {
    const icon = li.querySelector(':scope > svg').getBoundingClientRect(), words = li.querySelector(':scope > span > span');
    const s = getComputedStyle(words);
    ctx ??= document.createElement('canvas').getContext('2d');
    ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    const m = ctx.measureText('H'), asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent, cap = m.actualBoundingBoxAscent;
    const lh = parseFloat(s.lineHeight) * k, top = words.getBoundingClientRect().top;
    const capMid = top + ((lh / k - (asc + desc)) / 2 + asc - cap / 2) * k, iconMid = icon.top + icon.height / 2;
    // the guides stay in the gutter and the gap: never across the words
    rules.push({ key: `cap${i}`, y: capMid, left: icon.left - 8 * k, right: icon.right + 9 * k }, { key: `icon${i}`, y: iconMid, left: icon.left - 8 * k, right: icon.right + 3 * k });
    bands.push({ key: `gap${i}`, left: icon.left, right: icon.right, top: Math.min(capMid, iconMid), bottom: Math.max(capMid, iconMid), pattern: 'hatch' });
    first ??= { off: (iconMid - capMid) / k, x: icon.left + icon.width / 2, y: icon.top };
  });
  const lr = list.getBoundingClientRect(), r0 = list.children[0].getBoundingClientRect();
  return {
    lines: [], rules, bands, off: Math.abs(first.off) > 1,
    pills: [{ key: 'off', x: first.x, y: first.y - 16 * k, text: (Math.abs(first.off) * k).toFixed(1), ok: Math.abs(first.off) <= 1 }],
    cut: { left: lr.left, right: lr.left + 44 * k, top: lr.top, bottom: lr.bottom },
    subject: { left: lr.left - 8 * k, right: lr.left + lr.width * 0.62, top: r0.top - 30 * k, bottom: r0.top + 90 * k },
  };
};
