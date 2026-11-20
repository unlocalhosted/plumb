// Crafting attention's lifetime offer as a template with named slots, built from the product's own classes and parts
// (LifetimePricing.tsx). A slot shows the product's own part unless a variant places a library part in it.
import { PixelArrowRight } from '@/components/home/HomeIdentity';
import { ADAPTERS } from './adapters.jsx';
import { content as c } from './content.js';

const HOUSE = {
  price: () => <><span className="lifetime-current-price">{c.money(c.price)}</span><span className="lifetime-strike-price">{c.money(c.next)}</span></>,
  position: () => <p>Launch price for the first 500 learners. Price rises to {c.money(c.next)} after the first 500.</p>,
};

export function OfferCard({ parts = {} }) {
  const slot = (name) => { const p = parts[name] && ADAPTERS[parts[name]]; return <div data-slot={name} data-part={parts[name] ?? 'house'} className={name === 'price' ? 'lifetime-price-figures' : undefined}>{p ? (name === 'price' ? <span className="lifetime-current-price">{p.render(c)}</span> : p.render(c)) : HOUSE[name]()}</div>; };
  return (
    <section className="lifetime-pricing" data-revealed="true">
      <div className="pricing-layout">
        <article className="lifetime-offer" aria-label="Lifetime offer">
          <div className="lifetime-offer-top"><span>CraftingAttention</span><span>Lifetime access</span></div>
          <div className="lifetime-offer-copy">
            <h3>For the ones who build.</h3>
            <div className="lifetime-offer-summary">
              <div className="lifetime-price">{slot('price')}<span className="lifetime-cadence">{c.currency}<br />one payment</span></div>
              <span data-pass-slot />
            </div>
            {slot('position')}
            <button type="button" className="home-button primary cursor-pointer">Get Lifetime Access <PixelArrowRight aria-hidden /></button>
            <small>Instant lifetime access · Or start with a free account</small>
          </div>
        </article>
      </div>
    </section>
  );
}
