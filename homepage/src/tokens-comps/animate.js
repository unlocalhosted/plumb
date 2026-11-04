// Motion for the three tokens illustrations. Each drawing has one timeline that plays while it's on screen, holds its
// end a moment, and starts again; reduced motion shows the end. The page's route is always quick (about a second);
// the prompt's is the long one. Positions come from the drawn paths themselves (getPointAtLength), so nothing drifts
// off the line.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = v => Math.max(0, Math.min(1, v));
const easeOut = v => 1 - (1 - v) ** 3;
const at = (path, len, p) => path.getPointAtLength(len * p);
const place = (dot, pt) => { dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); };
const draw = (path, len, p) => { path.style.strokeDasharray = `${len}`; path.style.strokeDashoffset = `${len * (1 - p)}`; };

function loop(fig, { duration, hold, frame }) {
  if (reduced) { frame(duration); return; }
  let raf = 0, start = 0;
  const tick = now => {
    start ||= now;
    const t = now - start;
    frame(Math.min(t, duration));
    if (t > duration + hold) start = now;
    raf = requestAnimationFrame(tick);
  };
  new IntersectionObserver(([e]) => {
    cancelAnimationFrame(raf);
    if (e.isIntersecting) { start = 0; raf = requestAnimationFrame(tick); }
  }, { threshold: 0.4 }).observe(fig);
}

// A · two routes: the page's dot crosses in 1.4s and taps each key on the way; the prompt's walks every stop.
{
  const fig = document.querySelector('[data-anim="routes"]');
  const long = fig.querySelector('.i-route-long'), trail = fig.querySelector('.i-trail'), short = fig.querySelector('.i-route-short');
  const L = long.getTotalLength(), S = short.getTotalLength();
  const stops = [...fig.querySelectorAll('.i-stop')], keys = [...fig.querySelectorAll('.i-key')], done = fig.querySelector('.i-end-done');
  for (const g of stops) { // each stop sits on the long route at its share of the way
    const p = at(long, L, +g.dataset.at), below = g.dataset.side === 'below';
    place(g.querySelector('circle'), p);
    const t = g.querySelector('text'); t.setAttribute('x', p.x); t.setAttribute('y', p.y + (below ? 28 : -18));
  }
  const runLong = fig.querySelector('.i-runner-long'), runShort = fig.querySelector('.i-runner-short');
  loop(fig, { duration: 8000, hold: 2200, frame: t => {
    const p = easeOut(clamp(t / 1400)), q = clamp((t - 300) / 7400);
    draw(short, S, p); place(runShort, at(short, S, p));
    draw(trail, L, q); place(runLong, at(long, L, q));
    keys.forEach(k => k.classList.toggle('on', p >= +k.dataset.at));
    stops.forEach(s => s.classList.toggle('lit', q >= +s.dataset.at));
    done.classList.toggle('arrived', p >= 1);
    done.classList.toggle('arrived-long', q >= 1);
    runShort.classList.toggle('home', p >= 1);
  } });
}

// B · the context: the agent's context fills a block at a time; the page taps three keys and stays empty.
{
  const fig = document.querySelector('[data-anim="context"]');
  const blocks = [...fig.querySelectorAll('.i-blk')], keys = [...fig.querySelectorAll('.i-ctx-keys kbd')], chip = fig.querySelector('.i-ctx-empty .chip');
  loop(fig, { duration: 6000, hold: 2400, frame: t => {
    blocks.forEach((b, i) => b.classList.toggle('on', t >= 400 + i * 900));
    keys.forEach((k, i) => { const s = 300 + i * 380; k.classList.toggle('tap', t >= s && t < s + 220); k.classList.toggle('done', t >= s); });
    chip.classList.toggle('lit', t >= 1500);
  } });
}

// C · the loop: round once, round again; the page goes straight across in 1.2s.
{
  const fig = document.querySelector('[data-anim="loop"]');
  const [r1, r2] = fig.querySelectorAll('.i-ring-run'), chord = fig.querySelector('.i-chord');
  const R1 = r1.getTotalLength(), R2 = r2.getTotalLength(), C = chord.getTotalLength();
  const ring = fig.querySelector('.i-ring-dot'), cross = fig.querySelector('.i-chord-dot');
  const nodes = [...fig.querySelectorAll('.i-node')], keys = [...fig.querySelectorAll('.i-key')], round = fig.querySelector('.i-round');
  loop(fig, { duration: 7600, hold: 2200, frame: t => {
    const p = easeOut(clamp(t / 1200));
    draw(chord, C, p); place(cross, at(chord, C, p));
    keys.forEach(k => k.classList.toggle('on', p >= +k.dataset.at));
    const q1 = clamp((t - 200) / 3500), q2 = clamp((t - 3800) / 3500), second = t >= 3800;
    place(ring, second ? at(r2, R2, q2) : at(r1, R1, q1));
    const q = second ? q2 : q1;
    nodes.forEach(n => { n.classList.toggle('lit', q >= +n.dataset.at && t > 200); n.classList.toggle('twice', second && q2 >= +n.dataset.at); });
    round.classList.toggle('on', second);
    cross.classList.toggle('home', p >= 1);
  } });
}
