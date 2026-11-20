// Crafting attention's offer card in whole-card directions: its own parts, laid out by each kept reference's grammar.
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { LifetimePricing } from '@/components/home/pricing/LifetimePricing';
import { Compose } from '../compose.jsx';
import { PARTS, SYSTEM } from './parts.jsx';
import directions from './directions.generated.json';
import './playground.css';

function Page() {
  // the pass isn't exported by the product: the shipped card's own drawing is placed where a direction asks for it
  useEffect(() => { const t = setInterval(() => { const art = document.querySelector('[data-variant="shipped"] svg.lifetime-art'); if (!art) return; for (const s of document.querySelectorAll('[data-pass-slot]')) if (!s.firstChild) s.append(art.cloneNode(true)); clearInterval(t); }, 100); return () => clearInterval(t); }, []);
  return (
    <main className="pg ca-landing home-redesign home-discovery">
      <div data-variant="shipped" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}><LifetimePricing authenticated={false} initialConfig={{ currency: 'INR' }} /></div>
      {directions.map((d) => (
        <section key={d.id} data-variant={d.id} style={{ maxWidth: 1200, margin: '56px auto 0', padding: '0 32px' }}>
          <h2 className="pg-label" style={{ margin: '0 0 16px', padding: 0 }}>{d.id}</h2>
          <Compose grammar={d.grammar} parts={PARTS} system={SYSTEM} />
        </section>))}
    </main>
  );
}
createRoot(document.getElementById('root')).render(<Page />);
