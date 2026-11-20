// Crafting attention's own parts, by the job each does on its offer card (LifetimePricing.tsx), for the composer.
// Each takes the size its rank earns and the ink its colour role reads from the ground; faces, icons, the button and
// the pass are the product's. Content is the product's own (content.js: the INR founding price).
import { PixelArrowRight } from '@/components/home/HomeIdentity';
import { LearningModeIcon } from '@/components/home/LearningModeIcon';
import { ink } from '../compose.jsx';
import { content as c } from './content.js';

const DISPLAY = 'var(--home-font-display)';
const label = { fontSize: 'var(--home-type-meta)', letterSpacing: '0.08em', textTransform: 'uppercase' };
const PROOF = [
  ['tutorial', 'Interactive tutorials', 'Move a vector. Trace a gradient. See the idea click.'],
  ['lab', 'Build-from-scratch Labs', 'Write attention, autograd, and a tiny GPT yourself.'],
  ['path', 'Paths that connect the dots', 'Follow the math all the way to working AI systems.'],
];

export const PARTS = {
  // what you are buying: a small label when it doesn't lead, a heading when it does
  identity: ({ size, rank, colour, ground }) => rank <= 2
    ? <h3 style={{ margin: 0, font: `600 ${size}px/1.15 var(--home-font-sans, inherit)`, color: ink(colour, ground) }}>Lifetime access</h3>
    : <span style={{ ...label, color: ink('quieter', ground) }}>CraftingAttention · Lifetime access</span>,
  // who it is for, in the card's heading voice
  meta: ({ size, colour, ground }) => <p style={{ margin: 0, font: `600 ${Math.max(size, 18)}px/1.2 var(--home-font-sans, inherit)`, color: ink(colour === 'quieter' ? 'ink' : colour, ground) }}>For the ones who build.</p>,
  status: ({ ground }) => <span style={{ ...label, display: 'inline-flex', padding: '4px 10px', borderRadius: 999, background: 'color-mix(in oklab, var(--ca-violet) 16%, transparent)', color: ground.chip }}>Founding price · first 500</span>,
  // the price in the brand's pixel face: its size is the lead's strength
  price: ({ size, colour, ground }) => (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
      <span style={{ font: `${size}px/1 ${DISPLAY}`, letterSpacing: '-0.06em', color: colour === 'quieter' ? ground.quiet : ground.action }}>{c.money(c.price)}</span>
      <span style={{ font: `${Math.round(size * 0.38)}px/1 ${DISPLAY}`, color: ground.quiet, textDecoration: 'line-through' }}>{c.money(c.next)}</span>
      <span style={{ ...label, color: ground.quiet }}>INR · one payment</span>
    </div>),
  media: () => <span data-pass-slot style={{ display: 'block', width: 120 }} />,
  help: ({ ground }) => <p style={{ margin: 0, fontSize: 'var(--home-type-body)', lineHeight: 1.55, color: ground.quiet, maxWidth: '44ch' }}>Launch price for the first 500 learners. It rises to {c.money(c.next)} after that.</p>,
  action: ({ colour, ground }) => colour === 'link'
    ? <a href="#" style={{ display: 'inline-flex', gap: 8, alignItems: 'center', color: ground.action, fontWeight: 600 }}>Get lifetime access <PixelArrowRight aria-hidden /></a>
    : <button type="button" className={`home-button ${colour === 'the-action-quiet' ? 'secondary' : 'primary'}`} style={{ width: '100%' }}>Get Lifetime Access <PixelArrowRight aria-hidden /></button>,
  proof: ({ colour, ground }) => (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 18 }}>
      {PROOF.map(([kind, name, line]) => (
        <li key={kind} style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
          <LearningModeIcon kind={kind} detail="illustrated" />
          <div><strong style={{ display: 'block', fontSize: 'var(--home-type-intro)', fontWeight: 550, color: ground.ink }}>{name}</strong>
            <span style={{ fontSize: 'var(--home-type-body)', lineHeight: 1.55, color: ink(colour === 'ink' ? 'quieter' : colour, ground) }}>{line}</span></div>
        </li>))}
    </ul>),
};
// the job the shipped card calls `value` is the one the references call `meta`: the line that says who it is for
PARTS.value = PARTS.meta;

// which of its tokens play each role, on each ground a reference may ask for
const light = { ink: 'var(--color-text-primary)', quiet: 'var(--color-text-muted)', edge: 'var(--color-border-default)', action: 'var(--ca-violet)', onAction: 'var(--color-on-accent)', chip: 'var(--ca-violet)' };
export const SYSTEM = {
  body: 16, radius: 11,
  sizes: { hero: 92, display: 68, title: 28, body: 16, small: 13 },
  grounds: {
    none: { ...light, bg: 'transparent' },
    surface: { ...light, bg: 'var(--color-surface)' },
    tinted: { ...light, bg: 'var(--home-quiet-surface)', edge: 'color-mix(in oklab, var(--ca-violet) 35%, var(--home-edge))' },
    // the page flips its ink scale by mode, so the darkest thing it paints in light is its own text ink
    inverse: { bg: 'var(--ca-ink)', ink: 'var(--color-surface)', quiet: 'color-mix(in oklab, var(--color-surface) 66%, transparent)', edge: 'color-mix(in oklab, var(--color-surface) 16%, transparent)', action: 'color-mix(in oklab, var(--ca-violet) 55%, white)', onAction: 'var(--color-on-accent)', chip: 'color-mix(in oklab, var(--ca-violet) 45%, white)' },
  },
};
