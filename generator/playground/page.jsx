// The playground page every product shares: its organism as shipped, from source, then each variant the generator
// wrote, in the product's template. Each sits in the product's own page wrapper so its styles apply.
import { createRoot } from 'react-dom/client';
export function mount({ Shipped, Organism, variants, wrap = '' }) {
  createRoot(document.getElementById('root')).render(
    <main className="pg">
      <h2 className="pg-label">shipped</h2>
      <div className={wrap} data-variant="shipped"><div className="pg-organism"><Shipped /></div></div>
      {variants.map((v) => (<div key={v.id}><h2 className="pg-label">{v.id}</h2><div className={wrap} data-variant={v.id}><div className="pg-organism"><Organism parts={v.parts} /></div></div></div>))}
    </main>,
  );
}
