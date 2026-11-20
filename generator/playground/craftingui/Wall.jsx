// crafting-ui's wall of live lessons as a template with named slots, built from the product's own parts (Wall.tsx):
// the stickers from its store, its lettering, its arrows. A slot shows the product's own part unless a variant places
// a library part in it. navigation: the count of live lessons and the arrows that page the row.
import { useEffect, useRef, useState } from 'react';
import { INK } from '@/components/SeenIn-shared';
import { liveCount, sheets, totalCount } from '@/content/registry';
import { Link } from '@/lib/router';
import { drawOf } from '@/stickers';
import { ADAPTERS } from './adapters.jsx';

const lettering = 'measure text-[11px] tracking-[0.1em] uppercase';
const LIVE = Object.entries(sheets).map(([slug, s]) => ({ slug, name: s.pattern.name }));
const CROP = '18 -1 60 51';

function Entry({ slug, name, order }) {
  const draw = drawOf(`gesture-${slug}`, 'paper');
  return (
    <Link to={`/patterns/${slug}`} className="group/entry flex w-40 shrink-0 snap-start flex-col items-center gap-[12px] text-center">
      {draw && <svg viewBox={CROP} className="w-full overflow-visible" aria-hidden>{draw(INK, `wall${order}`)}</svg>}
      <span className="font-read type-body-large text-fg transition-colors duration-fast group-hover/entry:text-draw">{name}</span>
    </Link>
  );
}

function Arrow({ dir, can, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={!can} aria-label={dir < 0 ? 'Earlier entries' : 'More entries'}
      className="press grid size-8 place-items-center rounded-full border border-draw-line text-draw transition-[opacity,border-color] duration-fast hover:border-draw disabled:pointer-events-none disabled:opacity-30">
      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={dir < 0 ? 'M10 3L5 8l5 5' : 'M6 3l5 5-5 5'} /></svg>
    </button>
  );
}

// where the track is: its pages (as many whole entries as fit, less one), the page in view, and a way to go to one
function useTrack() {
  const ref = useRef(null);
  const [t, setT] = useState({ page: 0, pages: 1, back: false, on: false });
  const per = (el) => { const step = el.firstElementChild?.offsetWidth ?? 160; const gap = parseFloat(getComputedStyle(el).columnGap) || 0; return { w: Math.max(1, Math.floor(el.clientWidth / (step + gap)) - 1) * (step + gap) }; };
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const read = () => { const { w } = per(el); setT({ page: Math.round(el.scrollLeft / w), pages: Math.max(1, Math.ceil((el.scrollWidth - el.clientWidth) / w) + 1), back: el.scrollLeft > 1, on: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 }); };
    read(); el.addEventListener('scroll', read, { passive: true }); const ro = new ResizeObserver(read); ro.observe(el);
    return () => { el.removeEventListener('scroll', read); ro.disconnect(); };
  }, []);
  const go = (page) => { const el = ref.current; if (el) el.scrollTo({ left: page * per(el).w, behavior: 'smooth' }); };
  return { ref, ...t, go, step: (d) => go(t.page + d) };
}

export const content = { live: liveCount, total: totalCount };

export function Organism({ parts = {} }) {
  const track = useTrack();
  const part = parts.navigation && ADAPTERS[parts.navigation];
  const house = (
    <div className="flex items-center gap-5">
      <Link to="/interfaces#register" className={`${lettering} text-draw`}>{liveCount} live of {totalCount} →</Link>
      {(track.back || track.on) && <div className="flex gap-2"><Arrow dir={-1} can={track.back} onClick={() => track.step(-1)} /><Arrow dir={1} can={track.on} onClick={() => track.step(1)} /></div>}
    </div>
  );
  return (
    <section aria-labelledby="wall-title" className="grid gap-8">
      <div className="flex items-center justify-between gap-6">
        <h2 id="wall-title" className={`${lettering} text-muted`}>Live now</h2>
        <div data-slot="navigation" data-part={parts.navigation ?? 'house'}>{part ? part.render(content, track) : house}</div>
      </div>
      <div ref={track.ref} className="flex snap-x snap-mandatory items-start gap-6 overflow-x-auto overscroll-x-contain pt-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LIVE.map((e, i) => <Entry key={e.slug} {...e} order={i} />)}
      </div>
    </section>
  );
}
