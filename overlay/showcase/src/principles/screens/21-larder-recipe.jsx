// #21 tinted shadows on a coloured ground. Larder, a home cook's recipe app: tonight's saffron risotto, mid-cook. The
// recipe sits on its own saffron ground, and everything white on it (the ingredients, the step you're on, the button)
// floats with Tailwind's shadow-lg: 10% black. Black over saffron isn't a darker saffron, it's a grey smudge, so every
// edge looks dusty. plumber tints each shadow with the ground's own hue.
import { ArrowRightIcon, HeartIcon } from '@unlocalhosted/dither-icons';
import risotto from '../../media/s21-risotto.jpg';
import lucia from '../../media/people/person-10.jpg';

export const n = 21;

const INGREDIENTS = [
  { what: 'Carnaroli rice', much: '320 g', got: true },
  { what: 'Saffron threads', much: '1 pinch', got: true },
  { what: 'Warm chicken stock', much: '1.2 l' },
  { what: 'Shallots, finely chopped', much: '2' },
  { what: 'Dry white wine', much: '120 ml' },
  { what: 'Butter, cold', much: '50 g' },
  { what: 'Parmesan, grated', much: '60 g' },
];
// the 35 minutes as three stages, the one you're in marked
const STAGES = [['Prep', 10, '#3d2a12'], ['Stir', 22, '#c9781c'], ['Rest', 3, 'rgb(61 42 18 / 0.18)']];
// the step's timer: 6:42 left of 10:00
const RING = { left: 402, of: 600 };

function Recipe() {
  // Slate's white surface on the recipe's own ground, its ink and the saffron itself
  const ready = INGREDIENTS.filter((i) => i.got).length;
  return (
    <article data-ground className="flex w-full max-w-[25.5rem] flex-col gap-[18px] overflow-hidden rounded-card bg-[#f4e2c3] px-3 pb-5 text-[#3d2a12]">
      <span className="relative -mx-3 block h-56">
        <img src={risotto} alt="Saffron risotto in a white bowl" className="size-full object-cover outline-1 -outline-offset-1 outline-black/10" />
        <button type="button" aria-label="Save recipe" className="absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-full bg-white/90 text-[#3d2a12] hover:bg-white"><HeartIcon size={16} texture="dither" /></button>
      </span>
      <header className="flex flex-col px-4">
        <span className="text-xs font-medium text-[#6e5128]">Dinner · 35 min · serves 4</span>
        <span className="mt-1 text-2xl leading-[30px] font-semibold tracking-[-0.02em]">Saffron risotto</span>
        <span className="mt-2.5 flex items-center gap-2 text-[13px] text-[#6e5128]">
          <img src={lucia} alt="" className="size-6 rounded-full object-cover outline-1 -outline-offset-1 outline-[#3d2a12]/15" />
          <span>From <b className="font-medium text-[#3d2a12]">Lucia Ferraro</b></span>
          <span className="ml-auto flex items-center gap-1 tabular-nums">
            <svg viewBox="0 0 16 16" className="size-[13px] text-[#c9781c]" fill="currentColor" aria-hidden="true"><path d="M8 1.5l1.9 4 4.4.5-3.3 3 .9 4.4L8 11.2l-3.9 2.2.9-4.4-3.3-3 4.4-.5z" /></svg>
            <b className="font-medium text-[#3d2a12]">4.8</b> · 412 cooks
          </span>
        </span>
      </header>
      {/* the 35 minutes, drawn */}
      <section aria-label="Time: prep 10, stir 22, rest 3 minutes" className="px-4">
        <span className="flex h-1.5 gap-[3px]">{STAGES.map(([k, m, c]) => <span key={k} className="rounded-[3px]" style={{ flex: m, background: c }} />)}</span>
        <span className="mt-1.5 flex text-[11px] leading-4 whitespace-nowrap text-[#6e5128] tabular-nums">
          <span style={{ flex: 10 }}>Prep 10</span><span style={{ flex: 22 }}>Stir 22 · you’re here</span><span className="text-right" style={{ flex: 3 }}>Rest 3</span>
        </span>
      </section>
      <section data-card className="rounded-card bg-surface px-4 pt-1 pb-1.5 text-ink shadow-lg">
        <span className="flex items-center justify-between border-b-hairline border-line py-2.5">
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Ingredients<span className="ml-1.5 text-[13px] font-normal tracking-normal text-ink-muted">{ready} of {INGREDIENTS.length} ready</span></span>
          <span className="flex h-7 items-center rounded-control shadow-[inset_0_0_0_1px_var(--color-line)] tabular-nums">
            <button type="button" aria-label="Fewer servings" className="h-full w-7 text-[13px] text-ink-muted hover:text-ink">−</button>
            <b className="min-w-5 text-center text-[13px] font-semibold">4</b>
            <button type="button" aria-label="More servings" className="h-full w-7 text-[13px] text-ink-muted hover:text-ink">+</button>
          </span>
        </span>
        <ul>
          {INGREDIENTS.map((i) => (
            <li key={i.what}>
              <label className="grid grid-cols-[18px_1fr_auto] items-center gap-3 border-b-hairline border-line py-[9px] text-sm last:hairline-none">
                <input type="checkbox" defaultChecked={i.got} className="peer sr-only" />
                <span aria-hidden="true" className={'grid size-[18px] place-items-center rounded-chip ' + (i.got ? 'bg-[#3d2a12]' : 'shadow-[inset_0_0_0_1.5px_rgb(18_35_61/0.22)]')}>
                  {i.got ? <svg viewBox="0 0 12 12" className="size-2.5"><path d="M2.5 6.2l2.4 2.4 4.6-5" stroke="#f4e2c3" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
                </span>
                <span className={i.got ? 'text-ink-subtle line-through decoration-ink/35' : ''}>{i.what}</span>
                <span className="text-ink-muted tabular-nums">{i.much}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>
      {/* where you are in the method */}
      <section data-card className="flex items-center gap-3.5 rounded-control bg-surface px-4 py-2.5 shadow-lg">
        <span className="relative grid size-12 shrink-0 place-items-center text-[11px] font-semibold tabular-nums">
          {/* the timer as a ring: a conic fill under a mask, it's a chart, not an icon */}
          <span aria-hidden="true" className="absolute inset-0 rounded-full [mask:radial-gradient(farthest-side,transparent_calc(100%-4.5px),#000_calc(100%-4px))]"
            style={{ background: `conic-gradient(#c9781c ${(RING.left / RING.of) * 360}deg, rgb(61 42 18 / 0.14) 0)` }} />
          {Math.floor(RING.left / 60)}:{String(RING.left % 60).padStart(2, '0')}
        </span>
        <span className="flex flex-col">
          <span className="text-xs font-medium text-[#6e5128]">Step 3 of 6 · stir</span>
          <span className="mt-0.5 text-[13px] leading-[18px] text-pretty">Add the stock a ladle at a time, stirring, until the rice is just tender.</span>
        </span>
      </section>
      <button type="button" data-card className="flex h-10 items-center justify-center gap-2 rounded-control bg-[#3d2a12] text-sm font-medium text-[#f4e2c3] shadow-lg hover:bg-[#3d2a12]/90">
        Continue to step 4 <ArrowRightIcon size={16} texture="dither" />
      </button>
    </article>
  );
}
Recipe.stage = true;
Recipe.names = ['Grey shadow', 'Tinted'];
Recipe.lesson = {
  why: 'A shadow is the ground with less light on it, so on saffron it should be a deeper saffron. Black at 10% doesn’t darken the colour, it greys it out: every card’s edge sits in a dusty band that belongs to no colour on the page.',
  habit: 'On a coloured ground, make the shadow a dark tint of that ground’s hue, not black.',
};

// colour science for the measure (as the shared examples do it): sRGB to OKLab, and its chroma
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toLab = (c) => {
  const [r, g, b] = c.map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const chromaOf = (lab) => Math.hypot(lab[1], lab[2]);
// What the eye sees: the band where the shadow falls under each white thing on the ground. The pill (on the
// ingredients) is how much of the ground's colour that band loses, in percent: a darker saffron keeps all of it,
// black laid over it greys it out.
Recipe.measure = (root) => {
  const cards = [...(root?.querySelectorAll('[data-card]') ?? [])], ground = root?.querySelector('[data-ground]');
  if (!cards.length || !ground) return null;
  const card = cards[0], r = card.getBoundingClientRect(), g = ground.getBoundingClientRect(), k = r.width / card.offsetWidth || 1;
  // the band right under the edge, where the shadow's layers overlap, painted the way the browser paints it
  const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
  const paint = (colours) => { ctx.clearRect(0, 0, 1, 1); for (const c of colours) { ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); } return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((v) => v / 255); };
  const base = getComputedStyle(ground).backgroundColor;
  const layers = getComputedStyle(card).boxShadow.split(/,(?![^(]*\))/).map((l) => l.match(/(rgba?|oklch)\([^)]*\)/)?.[0]).filter((c) => c && !/rgba\(0, 0, 0, 0\)/.test(c));
  const C = (c) => chromaOf(toLab(c));
  const loss = Math.max(0, Math.round((1 - C(paint([base, ...layers])) / C(paint([base]))) * 100));
  return {
    lines: [], off: loss > 8,
    rules: cards.map((c, i) => { const q = c.getBoundingClientRect(); return { key: `edge${i}`, y: q.bottom, left: q.left, right: q.right }; }),
    bands: cards.map((c, i) => { const q = c.getBoundingClientRect(); return { key: `shadow${i}`, left: q.left + 10 * k, right: q.right - 10 * k, top: q.bottom, bottom: q.bottom + 14 * k, pattern: 'dots' }; }),
    pills: [{ key: 'loss', x: r.right - 30 * k, y: r.bottom + 10 * k, text: String(loss * k), ok: loss <= 8 }],
    // the whole ground stays in colour: the shadow is judged against it
    cut: { left: g.left, right: g.right, top: g.top, bottom: g.bottom, r: 10 * k },
    subject: { left: r.left - 24 * k, right: r.right + 24 * k, top: r.bottom - 90 * k, bottom: r.bottom + 50 * k },
  };
};

export default Recipe;
