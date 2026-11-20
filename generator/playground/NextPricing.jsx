// Crafting attention's lifetime offer with three library parts installed in place of its own: Arc's animated counter
// for the price, Arc's stepper for the founder ladder. (beUI's expanding-arrow button was tried for the buy button and dropped.) Everything else is the
// product's: the card, its classes and CSS, the headline, the pass, the note, and the price worked out by the same
// tiers the shipped component reads (getPricingTier), so nothing here is a made-up number.
import { DEFAULT_CURRENCY_RATES, getCurrencyMeta, getPricingTier, roundToNearest9 } from '@/lib/currency-config';
import { AnimatedCounter } from './vendor/arc/animated-counter/animated-counter.tsx';
import { Stepper } from './vendor/arc/stepper/stepper.tsx';
import { PixelArrowRight } from '@/components/home/HomeIdentity';
// beUI's expanding-arrow button was tried here and read as beUI, not crafting attention: the product's own button stays
// (generator/shots/pg-next-with-beui-button.png)

const CUR = 'INR';
const meta = getCurrencyMeta(CUR), rate = DEFAULT_CURRENCY_RATES[CUR] ?? 1;
const at = (learners) => roundToNearest9(getPricingTier(learners).basePriceUsd * rate);
const PHASES = [
  { id: 'founding', label: 'Founding learners', description: `First 500 · ${meta.symbol}${at(0).toLocaleString('en-IN')}` },
  { id: 'early', label: 'Early learners', description: `Next 500 · ${meta.symbol}${at(500).toLocaleString('en-IN')}` },
  { id: 'standard', label: 'Standard', description: `After 1,000 · ${meta.symbol}${at(1000).toLocaleString('en-IN')}` },
];

export function NextPricing({ pass }) {
  return (
    <section className="lifetime-pricing" data-revealed="true">
      <div className="pricing-layout">
        <article className="lifetime-offer" aria-labelledby="next-offer-title">
          <div className="lifetime-offer-top"><span>CraftingAttention</span><span>Lifetime access</span></div>
          <div className="lifetime-offer-copy">
            <h3 id="next-offer-title">For the ones who build.</h3>
            <div className="lifetime-offer-summary">
              <div className="lifetime-price">
                <div className="lifetime-price-figures">
                  <span className="lifetime-current-price"><AnimatedCounter value={at(0)} prefix={meta.symbol} locale="en-IN" animateOnView /></span>
                </div>
                <span className="lifetime-cadence">{CUR}<br />one payment</span>
              </div>
              {pass}
            </div>
            <Stepper steps={PHASES} current={0} details="all" label="Launch pricing" />
            <button type="button" className="home-button primary cursor-pointer">Get Lifetime Access <PixelArrowRight aria-hidden /></button>
            <small>Instant lifetime access · Or start with a free account</small>
          </div>
        </article>
      </div>
    </section>
  );
}
