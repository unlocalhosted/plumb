// The atoms page every product shares: the product's component as shipped (off screen), the original atom cut out of
// it, its skin read off the page, and every form of the atom's job wearing that skin, live.
//   mountAtoms({ Shipped, product })   → /atoms.html?atom=<id>
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { readSkin } from './skin.js';
import { FORMS } from './forms.jsx';
import './atoms.css';

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
  // the words default to the original's own; the gesture forms say the same thing as a gesture
  const label = atom.label ?? skin?.text ?? '', lower = label ? label[0].toLowerCase() + label.slice(1) : '';
  const a = { slideLabel: `Slide to ${lower}`, holdLabel: `Hold to ${lower}`, doneLabel: 'One moment', ...atom, label, iconHTML: skin?.iconHTML };
  const vars = skin ? { ...skin.vars, '--atom-width': `${skin.width}px` } : {};
  return (
    <main className={`atoms-page ${product.wrapper ?? ''}`}>
      <div className="atoms-shipped" ref={shipped} aria-hidden><Shipped /></div>
      <h1>{product.name}: {atom.name}, in every form its job has</h1>
      <p className="skin">{skin ? `skin read off the page: ${skin.measured.height}px tall, fill and ink as shipped; the stronger fill is ${skin.deepFrom}` : 'reading the skin…'}</p>
      <div className="atoms">
        <section className="atom" data-form="house" data-gesture={atom.gesture ?? 'press'}>
          {/* the original is often a link: here a press stays on the page */}
          <div className="atom-stage" data-atom ref={house} style={vars} onClickCapture={(e) => e.preventDefault()} />
          <div><h3>As shipped</h3><p>{atom.is}</p><code>shipped</code></div>
        </section>
        {skin && forms.map((f) => (
          <section key={f.id} className="atom" data-form={f.id} data-gesture={f.gesture}>
            <div className="atom-stage" data-atom style={{ ...vars, ...f.roles }}>{f.render(a)}</div>
            <div><h3>{f.name}</h3><p>{f.why}</p><code>{f.id}</code></div>
          </section>))}
      </div>
    </main>
  );
}

export function mountAtoms({ Shipped, product }) {
  const want = new URLSearchParams(location.search).get('atom');
  const atom = product.atoms.find((x) => x.id === want) ?? product.atoms[0];
  createRoot(document.getElementById('root')).render(<Page Shipped={Shipped} product={product} atom={atom} />);
}
