// A still prototype (2026-11-15): film 55's marks drawn with plumber's own pieces instead of the film's outline boxes.
// /proto/marks shows three moments side by side: measure, up close, fixed. Not a film; for the owner to judge the look.
//   - a colour is judged with a dashed ring, never a fill (show.js .sh-mark.ink): the ring sits on each bar's grey middle
//   - the lead bar gets a name tag with its toy (language.js .pl-tag, toys.js) and a chip whose number rolls (show.js)
//   - up close, the bar's colour along its length as colour chips (show.js .sh-chip .sw), each with how colourful it is
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LANGUAGE_CSS } from '../../../../src/language.js';
import { SHOW_CSS, roll } from '../../../../src/show.js';
import { TOY_DEFS, toyOf } from '../../../../src/toys.js';
import { ensureLook } from '../look.js';
import Forecast, { film } from '../screens/55-forecast.jsx';

const CSS = LANGUAGE_CSS + SHOW_CSS + `
  .mp { display: flex; gap: 40px; padding: 40px; background: var(--pl-desk, #f7f6f3); min-height: 100vh; box-sizing: border-box; align-items: flex-start; }
  .mp-col { display: flex; flex-direction: column; gap: 14px; }
  .mp-cap { font: 600 13px/1 var(--pl-round); letter-spacing: .06em; text-transform: uppercase; color: var(--pl-ink-2, #6b6b6b); }
  .mp-frame { position: relative; width: 432px; }
  .mp-layer { position: absolute; inset: 0; pointer-events: none; }
  .mp-ring { position: absolute; border: 1.5px dashed var(--ring); border-radius: 6px; box-sizing: border-box; }
  .mp-at { position: absolute; translate: -50% -100%; display: flex; gap: 4px; }
  .mp-below { position: absolute; translate: -50% 0; }
  .mp .sh-chip { height: 24px; }
  .mp .sh-chip .u { margin-left: -4px; }
  .mp-zoom { position: relative; width: 432px; height: 236px; overflow: hidden; border-radius: 16px; background: var(--pl-paper, #fff); box-shadow: 0 0 0 1px rgb(0 0 0 / .06), 0 12px 32px -12px rgb(0 0 0 / .2); }
  .mp-bar { position: absolute; left: 36px; right: 36px; top: 64px; height: 34px; border-radius: 17px; }
  .mp-chips { position: absolute; left: 36px; right: 36px; top: 128px; display: grid; grid-template-columns: repeat(9, 1fr); gap: 6px; }
  .mp-sw { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .mp-sw span { width: 34px; height: 34px; border-radius: 10px; background: var(--sw); box-shadow: inset 0 0 0 1px rgb(0 0 0 / .08); }
  .mp-sw[data-dull] span { outline: 1.5px dashed var(--pl-coral); outline-offset: 3px; }
  .mp-sw b { font: 600 11px/1 var(--pl-mono); color: var(--pl-ink-2, #6b6b6b); }
  .mp-sw[data-dull] b { color: var(--pl-coral-ink); }
`;

// where each bar's colour drops below half of its ends' colour: the ring goes round that stretch
function dullOf(el) {
  const oklch = /in oklch/.test(getComputedStyle(el).backgroundImage);
  const s = film.samples(oklch), ends = s.ends;
  const dull = s.points.filter((p) => p.c < ends * 0.5);
  return dull.length ? { from: dull[0].t, to: dull.at(-1).t } : null;
}

function Marked({ side }) {
  const frame = useRef(null), [marks, setMarks] = useState(null), chip = useRef(null);
  useLayoutEffect(() => {
    const go = () => {
      const root = frame.current; if (!root) return;
      const o = root.getBoundingClientRect(), bars = [...root.querySelectorAll('[data-range]')];
      setMarks(bars.map((b, i) => {
        const r = b.getBoundingClientRect(), d = dullOf(b);
        const x = r.left - o.left, y = r.top - o.top;
        return { i, x, y, w: r.width, h: r.height, ring: side === 'fixed' ? { left: x - 4, w: r.width + 8 } : d && { left: x + r.width * d.from - 4, w: r.width * (d.to - d.from) + 8 } };
      }));
    };
    document.fonts.ready.then(() => requestAnimationFrame(go));
  }, [side]);
  useEffect(() => { if (marks && chip.current) setTimeout(() => roll(chip.current, side === 'fixed' ? 100 : 32), 300); }, [marks, side]);
  const lead = marks?.[film.lead], fixed = side === 'fixed', ring = fixed ? 'var(--pl-mint)' : 'var(--pl-coral)';
  return (
    <div className="mp-frame" ref={frame}>
      <Forecast side={side} />
      {marks ? (
        <div className="mp-layer pl-light">
          {marks.map((m) => m.ring ? <span key={m.i} className="mp-ring" style={{ '--ring': ring, left: m.ring.left, width: m.ring.w, top: m.y - 4, height: m.h + 8 }} /> : null)}
          {lead ? (
            <>
              <span className="mp-at" style={{ left: lead.x + lead.w / 2, top: lead.y - 9 }}>
                <span className="pl-tag" data-hue={fixed ? 'mint' : 'coral'} dangerouslySetInnerHTML={{ __html: `${toyOf('fill')}${fixed ? 'Stays bright' : 'Goes grey'}` }} />
              </span>
              <span className="mp-below" style={{ left: lead.x + lead.w / 2, top: lead.y + lead.h + 9 }}>
                <span ref={chip} className="pl-pill sh-chip" data-tone={fixed ? 'mint' : 'pink'} data-on="" style={fixed ? undefined : { '--hue': 'var(--pl-coral)', '--hue-soft': 'var(--pl-coral-soft)' }}
                  dangerouslySetInnerHTML={{ __html: `<i>${toyOf('fill')}</i><span class="v">100</span><span class="u">% colour</span>` }} />
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Close({ side }) {
  const fixed = side === 'fixed', s = film.samples(fixed);
  const nine = Array.from({ length: 9 }, (_, i) => s.points[Math.round((i / 8) * (s.points.length - 1))]);
  return (
    <div className="mp-zoom pl-light">
      <span className="mp-at" style={{ left: '50%', top: 50 }}>
        <span className="pl-tag" data-hue={fixed ? 'mint' : 'coral'} dangerouslySetInnerHTML={{ __html: `${toyOf('fill')}Monday · 7° to 15°` }} />
      </span>
      <span className="mp-bar" style={{ backgroundImage: film.gradient(fixed) }} />
      <div className="mp-chips">
        {nine.map((p, i) => (
          <span key={i} className="mp-sw" data-dull={p.c < s.ends * 0.5 ? '' : undefined} style={{ '--sw': p.hex }}>
            <span /><b>{Math.round(Math.min(1, p.c / s.ends) * 100)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

export function MarksProto() {
  useEffect(() => { ensureLook(); }, []);
  return (
    <div className="mp pl-light">
      <style>{CSS}</style>
      <div dangerouslySetInnerHTML={{ __html: TOY_DEFS }} />
      <div className="mp-col"><span className="mp-cap">1 · Measure</span><Marked side="broken" /></div>
      <div className="mp-col"><span className="mp-cap">2 · Up close, before</span><Close side="broken" /><span className="mp-cap">3 · Up close, fixed</span><Close side="fixed" /></div>
      <div className="mp-col"><span className="mp-cap">4 · Fixed</span><Marked side="fixed" /></div>
    </div>
  );
}
