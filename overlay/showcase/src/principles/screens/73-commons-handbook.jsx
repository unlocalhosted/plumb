// #73 anchor targets clear the sticky header. Commons, a team wiki: Halyard's onboarding page, scrolling in its own
// pane under a sticky header that carries the section links. Every link jumps to a heading, and the browser puts the
// heading at the very top of the pane, exactly where the header sits: you land on each section with its title (and
// its first lines) underneath the header. None of the headings has a scroll margin, so it happens on every link.
// plumber gives the headings a scroll margin the header's height, so a jump stops just below it.
import { useEffect, useRef } from 'react';
import linearLogo from '../../media/logos/linear.svg';
import slackLogo from '../../media/logos/slack.svg';
import ruth from '../../media/people/person-07.jpg';
import arlo from '../../media/people/person-06.jpg';
import maya from '../../media/people/person-05.jpg';
import sam from '../../media/people/person-08.jpg';
import theo from '../../media/people/person-02.jpg';
import ines from '../../media/people/person-01.jpg';
import graham from '../../media/people/person-04.jpg';

export const n = 73;

const SECTIONS = [['before', 'Before you start'], ['first-week', 'First week'], ['tools', 'Tools'], ['people', 'People']];
const DAYS = [
  { day: 'Mon', what: 'Meet your buddy', face: maya, done: true },
  { day: 'Tue', what: 'Ship a small fix', face: sam, done: true },
  { day: 'Wed', what: 'Sit in on a design crit', face: ruth, now: 'Today, 15:00' },
  { day: 'Thu', what: 'Pair on a support ticket', face: theo },
  { day: 'Fri', what: 'Write down three questions', you: true },
];
const TOOLS = [
  { name: 'Linear', what: 'Plans and issues', color: '#5e6ad2', logo: linearLogo },
  { name: 'Slack', what: '#design, #help', color: '#4a154b', logo: slackLogo },
];
const PEOPLE = [
  { name: 'Ruth Calder', role: 'Design lead · sets your goals', face: ruth },
  { name: 'Arlo Kim', role: 'Engineering · front end', face: arlo },
  { name: 'Ines Duarte', role: 'Research · runs the crits', face: ines },
];

// what the browser does on a jump to #id: the heading's top, less its scroll margin, at the top of the pane
const jump = (pane, id) => {
  const h = pane?.querySelector(`#${id}`);
  if (h) pane.scrollTop = h.offsetTop - (parseFloat(getComputedStyle(h).scrollMarginTop) || 0);
};
const Img = ({ src, className }) => <img src={src} alt="" className={'shrink-0 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10 ' + className} />;
const Check = ({ done }) => (
  <span className={'grid size-[18px] shrink-0 place-items-center rounded-[5px] ' + (done ? 'bg-positive' : 'ring-[1.5px] ring-ink/20 ring-inset')}>
    {done ? <svg viewBox="0 0 10 10" className="size-2.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 5.2 4.2 7.4 8 3" /></svg> : null}
  </span>
);
const H = ({ id, children }) => <h2 id={id} data-target={id === 'first-week' || undefined} className="text-[21px] leading-7 font-semibold tracking-[-0.015em] text-balance">{children}</h2>;
const P = ({ children }) => <p className="mt-2 max-w-[26rem] text-sm leading-[22px] text-pretty text-ink-muted">{children}</p>;

export default function Handbook() {
  const pane = useRef(null);
  useEffect(() => jump(pane.current, 'first-week'), []);
  return (
    <article ref={pane} data-pane className="relative h-[35rem] w-full max-w-[30rem] overflow-y-auto rounded-card bg-surface [scrollbar-gutter:stable] [background:linear-gradient(var(--color-surface)_30%,_transparent)_center_top_/_100%_40px_no-repeat_local,_linear-gradient(transparent,_var(--color-surface)_70%)_center_bottom_/_100%_40px_no-repeat_local,_radial-gradient(farthest-side_at_50%_0,_rgb(0_0_0_/_0.12),_transparent)_center_top_/_100%_12px_no-repeat_scroll,_radial-gradient(farthest-side_at_50%_100%,_rgb(0_0_0_/_0.12),_transparent)_center_bottom_/_100%_12px_no-repeat_scroll,_var(--color-surface)] shadow-card">
      <header data-header className="sticky top-0 z-10 border-b-hairline bg-surface/95 px-6 pt-3.5 backdrop-blur">
        <span className="flex items-center gap-2 text-xs text-ink-subtle">
          <span className="grid size-4 place-items-center rounded-chip bg-[#0e5a6d] text-[10px] font-semibold text-white">H</span>
          Halyard<span aria-hidden="true">/</span>Handbook
          <span className="ml-auto flex items-center gap-1.5">
            <span className="flex"><Img src={ruth} className="size-5 ring-2 ring-surface" /><Img src={arlo} className="-ml-1.5 size-5 ring-2 ring-surface" /></span>
            Edited by Ruth · 3d
          </span>
        </span>
        <span className="mt-1.5 flex items-baseline gap-2.5">
          <h1 className="text-lg leading-6 font-semibold tracking-[-0.015em]">Onboarding</h1>
          <span className="text-xs text-ink-subtle">6 min read</span>
        </span>
        <nav aria-label="Sections" className="mt-1 flex gap-4.5 text-[13px]">
          {SECTIONS.map(([id, title]) => (
            <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); jump(pane.current, id); }} aria-current={id === 'first-week' ? 'location' : undefined}
              className={'inline-flex h-8 items-center ' + (id === 'first-week' ? 'font-medium text-ink shadow-[inset_0_-2px_0_var(--color-accent)]' : 'text-ink-muted hover:text-ink')}>{title}</a>
          ))}
        </nav>
      </header>
      <div className="flex flex-col gap-7 px-6 pt-6 pb-[26rem]">
        <section>
          <H id="before">Before you start</H>
          <P>Your laptop and accounts arrive the Friday before. Set up two-factor sign-in first; everything else asks for it.</P>
        </section>
        <section>
          <H id="first-week">First week</H>
          <P>Each day has one thing to finish. By Friday you’ll have shipped something small and written down what confused you.</P>
          <ul className="mt-4 rounded-card ring-1 ring-line ring-inset">
            {DAYS.map((d) => (
              <li key={d.day} className={'grid grid-cols-[18px_2.25rem_1fr_auto] items-center gap-2.5 border-b-hairline px-3.5 py-2.5 last:hairline-none first:rounded-t-card last:rounded-b-card ' + (d.now ? 'bg-accent-soft' : '')}>
                <Check done={d.done} />
                <span className={'text-xs font-medium ' + (d.now ? 'text-accent-deep' : 'text-ink-subtle')}>{d.day}</span>
                <span className={'truncate text-[13.5px] ' + (d.done ? 'text-ink-muted line-through decoration-ink/30' : '')}>{d.what}</span>
                <span className="flex items-center gap-2 text-xs text-ink-subtle">
                  {d.now ? <span className="flex h-5 items-center rounded-chip bg-surface px-1.5 text-[11.5px] font-medium text-accent-deep tabular-nums">{d.now}</span> : null}
                  {d.you ? 'You' : <Img src={d.face} className="size-[22px]" />}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center gap-3 rounded-card bg-sunken px-3.5 py-3">
            <Img src={maya} className="size-10" />
            <span className="flex min-w-0 flex-col">
              <span className="text-[13.5px] font-medium">Your buddy: Maya Chen</span>
              <span className="truncate text-[12.5px] text-ink-muted">Product designer · Lisbon, an hour behind</span>
            </span>
            <button type="button" className="ml-auto inline-flex h-8 shrink-0 items-center rounded-control bg-surface px-3 text-[13px] font-medium shadow-raised ring-1 ring-line ring-inset hover:bg-canvas active:bg-sunken">Message</button>
          </div>
        </section>
        <section>
          <H id="tools">Tools</H>
          <P>We plan in Linear, talk in Slack, and keep every decision here.</P>
          <span className="mt-3 grid grid-cols-2 gap-3">
            {TOOLS.map((t) => (
              <span key={t.name} className="flex items-center gap-2.5 rounded-card px-3 py-2.5 ring-1 ring-line ring-inset">
                <span className="grid size-7 shrink-0 place-items-center rounded-[7px]" style={{ background: t.color }}>
                  <img src={t.logo} alt="" className="size-3.5 invert" />
                </span>
                <span className="flex flex-col"><span className="text-[13px] font-medium">{t.name}</span><span className="text-xs text-ink-subtle">{t.what}</span></span>
              </span>
            ))}
          </span>
        </section>
        <section>
          <H id="people">People</H>
          <P>Your buddy is your first stop for anything. These three are the next.</P>
          <ul className="mt-3 flex flex-col">
            {PEOPLE.map((p) => (
              <li key={p.name} className="flex items-center gap-3 border-b-hairline py-2.5 last:hairline-none">
                <Img src={p.face} className="size-8" />
                <span className="flex flex-col"><span className="text-[13.5px] font-medium">{p.name}</span><span className="text-xs text-ink-subtle">{p.role}</span></span>
              </li>
            ))}
            <li className="flex items-center gap-3 py-2.5"><Img src={graham} className="size-8" /><span className="flex flex-col"><span className="text-[13.5px] font-medium">Graham Lowe</span><span className="text-xs text-ink-subtle">Operations · laptops and access</span></span></li>
          </ul>
        </section>
      </div>
    </article>
  );
}
Handbook.stage = true;
Handbook.names = ['No scroll margin', 'Scroll margin'];
Handbook.lesson = {
  why: 'A jump to a section scrolls its heading to the very top of the scrolling area, and a sticky header lives at the very top too. So every link in the header lands you on a section with its title under the header.',
  habit: 'Give every anchor target a scroll margin the height of the sticky header, so a jump stops just below it.',
};
// What the eye sees after the jump: the header's bottom edge and the heading you jumped to. The hatch is the part of
// the heading under the header; the pill is how much of it is hidden, in px.
Handbook.measure = (root) => {
  const pane = root?.querySelector('[data-pane]'), header = pane?.querySelector('[data-header]'), target = pane?.querySelector('[data-target]');
  if (!target) return null;
  jump(pane, target.id);
  const hr = header.getBoundingClientRect(), tr = target.getBoundingClientRect(), k = hr.width / header.offsetWidth || 1;
  const hidden = Math.max(0, Math.round((hr.bottom - tr.top) / k));
  return {
    lines: [],
    rules: [{ key: 'header', y: hr.bottom, left: hr.left, right: hr.right }, { key: 'heading', y: tr.top, left: tr.left, right: tr.left + 140 * k }],
    bands: [{ key: 'hidden', left: tr.left, right: tr.left + 140 * k, top: Math.min(tr.top, hr.bottom), bottom: hr.bottom, pattern: 'hatch' }],
    pills: [{ key: 'hidden', x: tr.left + 170 * k, y: hr.bottom, text: String(hidden * k), ok: hidden === 0 }],
    off: hidden > 0,
    cut: { left: hr.left, right: hr.right, top: hr.top, bottom: Math.max(tr.bottom, hr.bottom) + 30 * k, r: 10 * k },
    subject: { left: hr.left - 20 * k, right: hr.right + 20 * k, top: hr.top - 30 * k, bottom: Math.max(tr.bottom, hr.bottom) + 70 * k },
  };
};
