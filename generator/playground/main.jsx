import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { LifetimePricing } from '@/components/home/pricing/LifetimePricing';
import { NextPricing } from './NextPricing.jsx';
import './playground.css';

function Page() {
  // the lifetime pass isn't exported by the product; the shipped card's own drawing is placed in the new card
  useEffect(() => { const t = setInterval(() => { const art = document.querySelector('[data-variant="shipped"] svg.lifetime-art'), slot = document.querySelector('[data-variant="next"] .lifetime-offer-summary'); if (art && slot && !slot.querySelector('svg.lifetime-art')) { slot.append(art.cloneNode(true)); clearInterval(t); } }, 100); return () => clearInterval(t); }, []);
  return (
    <main className="pg ca-landing home-redesign home-discovery">
      <h2 className="pg-label">As shipped</h2>
      <div data-variant="shipped"><LifetimePricing authenticated={false} initialConfig={{ currency: 'INR' }} /></div>
      <h2 className="pg-label">With library parts: Arc’s counter and stepper</h2>
      <div data-variant="next"><NextPricing /></div>
    </main>
  );
}
createRoot(document.getElementById('root')).render(<Page />);
