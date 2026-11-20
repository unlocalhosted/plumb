// Crafting attention, as the generator needs to know it: where its source and tokens are, the organism it varies (the
// lifetime offer card), which of its own parts fills each slot, and what content the product really has, read from its
// code, so a library part is only offered where it has something true to show.
export const product = {
  id: 'craftingattention',
  name: 'Crafting attention',
  root: '/Users/vijaysingh/unlocalhosted/craftingattention/app',
  // the stylesheets that define its tokens, in load order (index.css :root; the home page's own scale)
  tokens: ['src/index.css', 'src/components/home/home-system.css', 'src/components/home/homepage.css'],
  // the wrapper and mode its home page sets, so its styles apply (LandingPage.tsx; lib/theme.ts)
  wrapper: 'ca-landing home-redesign home-discovery', mode: 'light',
  organism: { specimen: 'craftingattention-lifetime', component: 'src/components/home/pricing/LifetimePricing.tsx', card: '.lifetime-offer', name: 'the offer card',
    looks: { price: { color: 'var(--color-accent-solid)' } },
    // slot → the house molecule that fills it today (generator/molecules.mjs)
    slots: { price: 'pixel-price', position: 'price-ladder', action: 'buy-button', proof: 'benefit', status: 'offer-header' } },
  // its atoms: where each is on the shipped component, its job (which forms it can take), and the words a form needs
  atoms: [
    { id: 'buy', name: 'the buy button', job: 'commit', pick: '.lifetime-offer .home-button.primary', confirm: 'Pay ₹8,619 once?', doneLabel: 'Opening checkout', readyLabel: 'Checkout ready',
      is: 'The one solid purple thing on the card, full width, with an arrow: the only place the eye can end up.' },
  ],
  // content the product has (currency-config.ts getPricingTier: three launch stages; one lifetime price; no periods)
  content: {
    'a number that changes': true,       // the price, worked out per currency
    'ordered stages': true,               // founding 500, early 500, standard
    'two billing periods': false,         // one lifetime payment
    'people': false, 'a data series': false, 'several plans': false,
  },
};
