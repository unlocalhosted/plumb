// #25 no pure black on large areas. Inkwell, a notes app, announcing Focus sessions on its Today page: the card shows
// the feature mid-use. It's set on bg-black, the most contrast a screen can make. On an area this large that's harsh
// rather than rich: the white words glow and smear into the black (worse on OLED, where black pixels switch off and
// smear as you scroll), and the card reads as a hole in the page instead of a dark surface. plumber moves it to the
// theme's near-black.
import hana from '../../media/people/person-07.jpg';
import ama from '../../media/people/person-03.jpg';
import leo from '../../media/people/person-08.jpg';

export const n = 25;

// the session: 18:42 in, 6:18 left of 25 minutes; the second of four, 75% through
const SESSION = { done: 18 * 60 + 42, of: 25 * 60, index: 1, count: 4, words: 412 };
const mmss = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
// the week's focus, minutes a day; today is Wednesday
const WEEK = [['M', 90], ['T', 120], ['W', 170], ['T', 0], ['F', 0], ['S', 0], ['S', 0]];
const TODAY = 2;
const most = Math.max(...WEEK.map(([, m]) => m));
const total = WEEK.reduce((a, [, m]) => a + m, 0);

function FeatureCard() {
  // Slate's type and radii; a dark promo, words on it in white at three strengths
  const through = SESSION.done / SESSION.of;
  return (
    <article data-dark className="flex w-full max-w-[28rem] flex-col gap-5 rounded-card bg-black p-6 text-white">
      {/* the feature itself, mid-session */}
      <section aria-label="A focus session running" className="flex flex-col rounded-control shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
        <span className="flex items-center gap-2 px-4 py-3 text-[13px] text-white/70 shadow-[inset_0_-0.5px_0_rgb(255_255_255/0.14)]">
          <span className="size-1.5 rounded-full bg-[#7cd4a9] ring-3 ring-[#7cd4a9]/20" />
          <span>Focusing on <span className="font-medium text-white">Q3 offsite plan</span></span>
          <span className="ml-auto tabular-nums">Session {SESSION.index + 1} of {SESSION.count}</span>
        </span>
        <span className="flex items-baseline-last justify-between px-4 pt-[18px]">
          <span className="text-[56px] leading-none font-medium tracking-[-0.03em] tabular-nums">{mmss(SESSION.done)}</span>
          <span className="text-right text-[13px] text-white/70 tabular-nums">
            <b className="block text-[15px] font-medium text-white">{mmss(SESSION.of - SESSION.done)} left</b>{SESSION.words} words so far
          </span>
        </span>
        <span className="flex gap-1 px-4 pt-3.5" role="img" aria-label={`Session ${SESSION.index + 1} of ${SESSION.count}, ${Math.round(through * 100)}% through`}>
          {Array.from({ length: SESSION.count }, (_, i) => (
            <span key={i} className={'h-1 flex-1 overflow-hidden rounded-[2px] ' + (i < SESSION.index ? 'bg-white' : 'bg-white/12')}>
              {i === SESSION.index ? <span className="block h-full rounded-[2px] bg-white" style={{ width: `${through * 100}%` }} /> : null}
            </span>
          ))}
        </span>
        {/* the note being written, fading out under its caret */}
        <p className="mx-4 mt-4 h-[60px] pl-3 text-[13px] leading-5 text-white/70 shadow-[inset_2px_0_0_rgb(255_255_255/0.16)] [mask-image:linear-gradient(to_bottom,#000_45%,transparent)]">
          <b className="font-medium text-white">Day one, Lisbon.</b> Land by noon, drop bags at the guesthouse in Alfama, walk the team down to the river for lunch. Workshop starts at three in the old print shop<span className="ml-px inline-block h-[15px] w-[1.5px] translate-y-[2px] bg-white" />
        </p>
        <span className="flex items-end gap-3 px-4 pt-1 pb-4">
          <span className="text-xs text-white/70">This week<b className="block text-[15px] leading-5 font-medium text-white tabular-nums">{Math.floor(total / 60)}h {total % 60}m</b></span>
          <span className="ml-auto flex items-end gap-1.5" role="img" aria-label="Focus each day this week">
            {WEEK.map(([d, m], i) => (
              <span key={i} className={'flex flex-col items-center gap-1 text-[10px] leading-3 ' + (i === TODAY ? 'font-semibold text-white' : 'text-white/70')}>
                <span className={'w-3.5 rounded-[3px] ' + (i === TODAY ? 'bg-white' : 'bg-white/22')} style={{ height: Math.max(4, (m / most) * 38) }} />{d}
              </span>
            ))}
          </span>
        </span>
      </section>
      <span className="flex items-center gap-2.5 text-[13px] text-white/70">
        <span className="flex">
          {/* overlapping faces cut out of each other, so no ring has to match the card's colour */}
          {[hana, ama, leo].map((src, i) => <img key={src} src={src} alt="" className={'size-6 rounded-full object-cover ' + (i ? '-ml-1.5 [mask:radial-gradient(circle_at_-6px_50%,transparent_14px,#000_14.5px)]' : '')} />)}
        </span>
        <span><b className="font-medium text-white">Hana, Ama and Leo</b> are in a session now</span>
      </span>
      <span className="flex flex-col gap-1.5">
        <span className="text-xs font-medium tracking-caps text-white/70 uppercase">New in Inkwell</span>
        <span className="text-[22px] leading-7 font-medium tracking-[-0.015em]">Focus sessions</span>
        <span className="text-sm leading-[22px] text-white/80 text-pretty">Pick a note, set a time, and everything else in Inkwell goes quiet until the timer ends. Your sessions add up on the Today page.</span>
      </span>
      <span className="flex items-center gap-2">
        <button type="button" className="h-9 rounded-control bg-white px-3.5 text-sm font-medium text-ink hover:bg-white/90">Try a session</button>
        <button type="button" className="h-9 rounded-control px-3.5 text-sm font-medium text-white/80 hover:bg-white/10">Not now</button>
      </span>
    </article>
  );
}
FeatureCard.stage = true;
FeatureCard.names = ['Pure black', 'Near-black'];
FeatureCard.lesson = {
  why: 'Black under white is the most contrast a screen can make: 21 to 1. On a large area that much is harsh, not rich: white words glow and smear into the black, especially on OLED screens, and the card reads as a hole cut in the page rather than a dark surface on it.',
  habit: 'Use a near-black, a few percent toward your brand’s hue, for any dark area bigger than a button.',
};
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (c) => { const [r, g, b] = c.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
// What the eye sees: the card's dark ground behind its words. The pill is the contrast of white on it, out of 21.
FeatureCard.measure = (root) => {
  const card = root?.querySelector('[data-dark]');
  if (!card) return null;
  const r = card.getBoundingClientRect(), k = r.width / card.offsetWidth || 1;
  const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = getComputedStyle(card).backgroundColor; ctx.fillRect(0, 0, 1, 1);
  const g = [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((v) => v / 255), ratio = 1.05 / (lum(g) + 0.05);
  return {
    lines: [], off: ratio > 19,
    bands: [{ key: 'ground', left: r.right - 120 * k, right: r.right - 16 * k, top: r.top + 16 * k, bottom: r.top + 52 * k, pattern: 'dots' }],
    pills: [{ key: 'contrast', x: r.right - 68 * k, y: r.top + 34 * k, text: (ratio * k).toFixed(1), ok: ratio <= 19 }],
    cut: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, r: 10 * k },
    subject: { left: r.left - 20 * k, right: r.right + 20 * k, top: r.top - 20 * k, bottom: r.bottom + 20 * k },
  };
};

export default FeatureCard;
