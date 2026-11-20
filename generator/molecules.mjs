// The molecules of the four house specimens (docs/briefs/organism-generator.md, layer 2b): pulled out of each product's
// real, shipped component, never drawn from the generator's rules. Each names its job, says what it is the way its
// designer would, points at the code that draws it, and says how to find it on the live page so it can be cut out
// and shown at work (node generator/molecules-cut.mjs).
export const MOLECULES = [
  // ── crafting attention · pricing (app/src/components/home/pricing/LifetimePricing.tsx) ──
  { house: 'craftingattention', specimen: 'craftingattention-lifetime', id: 'offer-header', job: 'identity', url: 'https://craftingattention.com/',
    is: 'The brand on the left and what you are buying on the right, small, on one line: the card says whose it is before it says anything else.',
    code: 'LifetimePricing.tsx · .lifetime-offer-top', pick: `document.querySelector('#pricing .lifetime-offer-top')` },
  { house: 'craftingattention', specimen: 'craftingattention-lifetime', id: 'pixel-price', job: 'price', url: 'https://craftingattention.com/',
    is: 'The price set in the brand’s pixel type with its cadence beside it ("INR · one-time"), and an old price struck through when there is one.',
    code: 'LifetimePricing.tsx · .lifetime-price', pick: `document.querySelector('#pricing .lifetime-price')` },
  { house: 'craftingattention', specimen: 'craftingattention-lifetime', id: 'lifetime-pass', job: 'media', url: 'https://craftingattention.com/',
    is: 'The thing you would own, drawn: an isometric pass in the dithered material, engraved with the name.',
    code: 'LifetimePricing.tsx · LifetimeArtifact', pick: `document.querySelector('#pricing svg.lifetime-art')` },
  { house: 'craftingattention', specimen: 'craftingattention-lifetime', id: 'buy-button', job: 'action', url: 'https://craftingattention.com/',
    is: 'The one solid purple thing on the card, full width, with an arrow: the only place the eye can end up.',
    code: 'LifetimePricing.tsx · .home-button.primary', pick: `document.querySelector('#pricing .home-button.primary')` },
  { house: 'craftingattention', specimen: 'craftingattention-lifetime', id: 'benefit', job: 'proof', url: 'https://craftingattention.com/',
    is: 'What you get, one line each: an isometric icon of the way you learn, its name, and one sentence of what you do there.',
    code: 'LifetimePricing.tsx · .pricing-included li', pick: `document.querySelector('#pricing .pricing-included li')` },

  // ── algorecall · review stack (src/pages/today/DueStack.tsx, MiniSlab.tsx) ──
  { house: 'algorecall', specimen: 'algorecall-today-stack', id: 'lit-slab', job: 'status', url: 'https://algorecall.com/today', wait: 6000,
    is: 'The top slab, lit in its pattern’s hue: it alone is a button, and pressing it sinks it onto its edge and starts the review.',
    code: 'DueStack.tsx · the top slab', pick: `slabOf('Arrays & Hashing')` },
  { house: 'algorecall', specimen: 'algorecall-today-stack', id: 'paper-slab', job: 'identity', url: 'https://algorecall.com/today', wait: 6000,
    is: 'A waiting slab in paper with its pattern’s coin; its front edge grows thicker the more its recall has faded.',
    code: 'DueStack.tsx · a paper slab', pick: `slabOf('Stack')` },
  { house: 'algorecall', specimen: 'algorecall-today-stack', id: 'ghost-slab', job: 'navigation', url: 'https://algorecall.com/today', wait: 6000,
    is: 'A dashed place, not a laid slab: the rest of the stack folded into a count.',
    code: 'MiniSlab.tsx · ghost', pick: `upTo(find(document.body, /^\\+\\d+ more$/), (e) => e.getBoundingClientRect().width > 200)` },

  // ── crafting-ui · lesson tile (src/pages/home/Wall.tsx) ──
  { house: 'crafting-ui', specimen: 'craftingui-lesson-tile', id: 'gesture-sticker', job: 'media', url: 'https://craftingui.com/',
    is: 'The gesture as a sticker: the thing it acts on and the hand acting on it, in ink and red pencil, on a hatched shadow, no box. It plays once as the row comes into view.',
    code: 'Wall.tsx · each entry', pick: `upTo(find(document.body, /^Pull to refresh$/), (e) => e.querySelector('svg, img') && e.getBoundingClientRect().height > 120)` },
  { house: 'crafting-ui', specimen: 'craftingui-lesson-tile', id: 'live-count', job: 'navigation', url: 'https://craftingui.com/',
    is: 'How much is live out of how much there will be, in small capitals, with arrows that page the row and fade at either end.',
    code: 'Wall.tsx · the count and arrows', pick: `upTo(find(document.body, /LIVE OF \\d+/i), (e) => e.querySelector('button'))` },

  // ── React Plumber · its section on craftingui.com (crafting-ui src/pages/home/Plumber.tsx) ──
  { house: 'react-plumber', specimen: 'plumber-companion', id: 'step', job: 'proof', url: 'https://craftingui.com/',
    is: 'One of the three things you do with the tool, as a verb in small capitals and one sentence, with the keys drawn as keys.',
    code: 'Plumber.tsx · the steps', pick: `upTo(find(document.body, /^SEE$/i), (e) => /Alt/.test(e.innerText) && /running page/.test(e.innerText))` },
  { house: 'react-plumber', specimen: 'plumber-companion', id: 'install-strip', job: 'action', url: 'https://craftingui.com/',
    is: 'The install command on its own blue strip with its own Copy button: the line that has to stand out.',
    code: 'Plumber.tsx · the install line', pick: `upTo(find(document.body, /^COPY$/i), (e) => /npm install/.test(e.innerText))` },
  { house: 'react-plumber', specimen: 'plumber-companion', id: 'spirit-level', job: 'value', url: 'https://craftingui.com/',
    is: 'One family of the site’s design, checked: its mark, a vial graduated with the family’s own steps, the bubble where the site sits, and the share on its steps.',
    code: 'Plumber.tsx · the report', pick: `upTo(find(document.body, /^radius$/), (e) => /%/.test(e.innerText) && e.getBoundingClientRect().width > 300)` },
];
