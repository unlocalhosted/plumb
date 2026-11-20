// The atoms page every product shares: the product's component as shipped (off screen), the original atom cut out of
// it, its skin read off the page, and every form of the atom's job wearing that skin, live.
//   mountAtoms({ Shipped, product })   → /atoms.html?atom=<id>
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { readSkin } from './skin.js';
import { FORMS } from './forms.jsx';
import './atoms.css';
import './verdict.css';
// how each form does as an interaction, against published standards (generator/data/interaction-judge.mjs)
const VERDICTS = import.meta.glob('./verdicts/*.json', { eager: true, import: 'default' });
const VERDICT_WORDS = { works: 'Works', 'needs-work': 'Needs work', breaks: 'Breaks for some people' };

function Verdict({ v }) {
  if (!v) return null;
  const off = v.results.filter((r) => !r.ok), on = v.results.filter((r) => r.ok);
  return (
    <div className="verdict pl-light">
      <span className={`verdict-chip ${v.verdict}`}>{VERDICT_WORDS[v.verdict]}</span>
      {off.map((r) => (
        <div key={r.id} className={`verdict-off ${r.severity}`}>
          <h4>{r.name}</h4>
          <p>{r.says}</p>
          <p className="verdict-fix"><b>What to do:</b> {r.fix}</p>
          <p className="verdict-src">{r.sources.map((s, i) => { const x = typeof s === 'string' ? { says: s } : s;
            return <span key={i}>{i ? ' · ' : ''}{x.url ? <a href={x.url} target="_blank" rel="noreferrer">{x.says}</a> : x.says}</span>; })}
            {r.checked ? '' : ' (source not yet checked against the page)'}</p>
        </div>))}
      {on.length > 0 && <details className="verdict-on"><summary>Meets {on.length} standard{on.length > 1 ? 's' : ''}{off.length ? '' : ', all it is held to'}</summary>
        <ul>{on.map((r) => <li key={r.id}><b>{r.name}.</b> {r.says}</li>)}</ul></details>}
    </div>);
}

function Choose({ data, forms }) {
  if (!data) return null;
  const { choose, moment } = data;
  return (
    <aside className="choose pl-light">
      <p className="choose-kicker">Which to choose, for {moment.name}</p>
      <h2>{choose.name}</h2>
      <p>{choose.why}</p>
      {choose.instead && <p className="choose-instead"><b>If you want more than that: {choose.instead.name}.</b> {choose.instead.why}</p>}
      <p className="choose-how">Each form below was used for real in a browser: pressed, held or slid to the end; started and abandoned; done from the keyboard; and done again with reduced motion turned on. Plumber read it every tenth of a second. Judged {data.judged}.</p>
    </aside>);
}


function Page({ Shipped, product, atom }) {
  const shipped = useRef(null), house = useRef(null);
  const [skin, setSkin] = useState(null);
  useLayoutEffect(() => {
    let tries = 0;
    const t = setInterval(async () => {
      const el = shipped.current?.querySelector(atom.pick);
      if (!el && ++tries < 60) return;
      clearInterval(t); if (!el) return;
      await document.fonts.ready;
      const s = readSkin(el), copy = el.cloneNode(true);
      copy.style.width = '100%'; house.current.replaceChildren(copy);
      setSkin({ ...s, iconHTML: el.querySelector('svg')?.outerHTML ?? null, width: s.measured.width, text: el.innerText.trim().split('\n')[0] });
    }, 100);
    return () => clearInterval(t);
  }, [atom.pick]);
  const forms = FORMS[atom.job] ?? [];
  const verdicts = VERDICTS[`./verdicts/${product.id}-${atom.id}.json`];
  const verdictOf = (id) => verdicts?.forms.find((f) => f.form === id);
  // the words default to the original's own; the gesture forms say the same thing as a gesture
  const label = atom.label ?? skin?.text ?? '', lower = label ? label[0].toLowerCase() + label.slice(1) : '';
  const a = { slideLabel: `Slide to ${lower}`, holdLabel: `Hold to ${lower}`, doneLabel: 'One moment', ...atom, label, iconHTML: skin?.iconHTML };
  const vars = skin ? { ...skin.vars, '--atom-width': `${skin.width}px` } : {};
  return (
    <main className={`atoms-page ${product.wrapper ?? ''}`}>
      <div className="atoms-shipped" ref={shipped} aria-hidden><Shipped /></div>
      <h1>{product.name}: {atom.name}, in every form its job has</h1>
      <p className="skin">{skin ? `skin read off the page: ${skin.measured.height}px tall, fill and ink as shipped; the stronger fill is ${skin.deepFrom}` : 'reading the skin…'}</p>
      <Choose data={verdicts} />
      <div className="atoms">
        <section className="atom" data-form="house" data-gesture={atom.gesture ?? 'press'}>
          {/* the original is often a link: here a press stays on the page */}
          <div className="atom-stage" data-atom ref={house} style={vars} onClickCapture={(e) => e.preventDefault()} />
          <div><h3>As shipped</h3><p>{atom.is}</p><code>shipped</code></div>
          <Verdict v={verdictOf('house')} />
        </section>
        {skin && forms.map((f) => (
          <section key={f.id} className="atom" data-form={f.id} data-gesture={f.gesture}>
            <div className="atom-stage" data-atom style={{ ...vars, ...f.roles }}>{f.render(a)}</div>
            <div><h3>{f.name}</h3><p>{f.why}</p><code>{f.id}</code></div>
            <Verdict v={verdictOf(f.id)} />
          </section>))}
      </div>
    </main>
  );
}

export function mountAtoms({ Shipped, product }) {
  // the prototypes of how plumber shows faults that live in time: ?proto=scrub, ?proto=thermal
  const proto = new URLSearchParams(location.search).get('proto');
  if (proto === 'scrub') import('./proto-scrub.js');
  if (proto === 'thermal') import('./proto-thermal.js');
  if (proto === 'dial') import('./proto-dial.js');
  const want = new URLSearchParams(location.search).get('atom');
  const atom = product.atoms.find((x) => x.id === want) ?? product.atoms[0];
  createRoot(document.getElementById('root')).render(<Page Shipped={Shipped} product={product} atom={atom} />);
}
