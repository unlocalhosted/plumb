import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { LifetimePricing } from '@/components/home/pricing/LifetimePricing';
import { OfferCard } from './OfferCard.jsx';
import variants from './variants.generated.json';
import './playground.css';

// every variant the generator wrote, beside the product's own component as shipped from its source
function Page() {
  // the lifetime pass isn't exported by the product: the shipped card's own drawing is placed in each variant
  useEffect(() => { const t = setInterval(() => { const art = document.querySelector('[data-variant="shipped"] svg.lifetime-art'); if (!art) return; for (const slot of document.querySelectorAll('[data-pass-slot]')) if (!slot.firstChild) slot.append(art.cloneNode(true)); clearInterval(t); }, 100); return () => clearInterval(t); }, []);
  return (
    <main className="pg ca-landing home-redesign home-discovery">
      <h2 className="pg-label">shipped</h2>
      <div data-variant="shipped"><LifetimePricing authenticated={false} initialConfig={{ currency: 'INR' }} /></div>
      {variants.map((v) => (<div key={v.id}><h2 className="pg-label">{v.id}</h2><div data-variant={v.id}><OfferCard parts={v.parts} /></div></div>))}
    </main>
  );
}
createRoot(document.getElementById('root')).render(<Page />);
