// The spacing card's loop: as written (13px, off the scale), tried at the control step (12px), kept on the related
// step (8px), a rest, and again. State changes only; the motion is CSS (a spring on the gap). Runs while on screen;
// reduced motion shows the kept state, still.
const STEPS = [['off', 1400], ['try', 900], ['on', 2600]];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

for (const demo of document.querySelectorAll('[data-demo="spacing"]')) {
  if (reduced) { demo.dataset.state = 'on'; continue; }
  let i = 0, timer = 0;
  const next = () => { const [state, ms] = STEPS[i]; demo.dataset.state = state; i = (i + 1) % STEPS.length; timer = setTimeout(next, ms); };
  new IntersectionObserver(([e]) => { clearTimeout(timer); if (e.isIntersecting) { i = 0; next(); } }, { threshold: 0.5 }).observe(demo);
}
