// Crafting attention's buy button, and every library form of the same action, each wearing the button's own skin
// (atoms.css). Same job everywhere: commit to buying lifetime access. Only the way you commit changes.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PixelArrowRight } from '@/components/home/HomeIdentity';
import { SlideActionButton } from '../vendor/beui/components/slide-action-button.tsx';
import { HoldActionButton } from '../vendor/beui/components/hold-action-button.tsx';
import { StatefulButton } from '../vendor/beui/components/button/stateful.tsx';
import { MagneticButton } from '../vendor/beui/components/button/magnetic.tsx';
import { HoldToConfirm } from '../vendor/arc/hold-to-confirm/hold-to-confirm.tsx';
import { ConfirmMorph } from '../vendor/arc/confirm-morph/confirm-morph.tsx';
import { content as c } from './content.js';
import './atoms.css';

const LABEL = 'Get Lifetime Access';
const shape = 'h-12 rounded-[5px] text-[14px] font-medium';

function Stateful() {
  const [state, setState] = useState('idle');
  // the library measures its label once, before the product's face has loaded, and clips it: measure again after
  const [fonts, setFonts] = useState(0);
  useEffect(() => { document.fonts.ready.then(() => setFonts(1)); }, []);
  return <StatefulButton key={fonts} state={state} className={`${shape} w-full`} loadingText="Opening checkout" successText="Checkout ready"
    onClick={() => { setState('loading'); setTimeout(() => setState('success'), 1100); setTimeout(() => setState('idle'), 2800); }}
    icon={<PixelArrowRight aria-hidden />}>{LABEL}</StatefulButton>;
}

// each form: what it is, the reason a designer would give for it on this card, and how it is drawn
export const FORMS = [
  { id: 'house', from: 'shipped', name: 'Press', why: 'The card as it ships: one solid violet button, the only filled thing on the card, so the eye ends there.',
    render: () => <button type="button" className="home-button primary cursor-pointer" style={{ width: '100%' }}>{LABEL} <PixelArrowRight aria-hidden /></button> },
  { id: 'beui/slide-action-button', name: 'Slide to buy', why: 'A one-time payment deserves a deliberate gesture. Sliding the thumb across is a small ceremony, and nobody buys by accident.',
    render: () => <SlideActionButton className="h-14 w-full rounded-[7px] p-1" thumbClassName="size-12 rounded-[5px] shadow-[0_3px_0_var(--atom-edge)]" completeLabel="Opening checkout">Slide to get lifetime access</SlideActionButton> },
  { id: 'beui/hold-action-button', name: 'Hold to buy', why: 'Holding fills the button with the price’s colour. You feel the commitment build before it lands, and letting go early takes it back.',
    render: () => <HoldActionButton type="horizontal" className="h-12 w-full min-w-0 [--hold-radius:5px] px-6" labelClassName="text-[14px]" fillClassName="bg-[color:var(--atom-fill-deep)]" holdingLabel="Keep holding" completeLabel="Opening checkout">Hold to get lifetime access</HoldActionButton> },
  { id: 'arc/hold-to-confirm', name: 'Hold to confirm', why: 'The same commitment as holding, but the colour flips exactly at the fill’s edge, so the words never get lost while you hold.',
    render: () => <HoldToConfirm label="Hold to get lifetime access" confirmedLabel="Opening checkout" onConfirm={() => {}} icon={<PixelArrowRight />} duration={1100} style={{ width: '100%' }} /> },
  { id: 'arc/confirm-morph', name: 'Press, then confirm the price', why: 'The button opens into the price and a confirm, right where you pressed. You see exactly what you are paying before you pay it.',
    render: () => <ConfirmMorph label={LABEL} icon={<PixelArrowRight />} prompt={`Pay ${c.money(c.price)} once?`} confirmLabel="Pay" cancelLabel="Not yet" pendingLabel="Opening checkout" doneLabel="Checkout ready" tone="neutral" onConfirm={() => new Promise((r) => setTimeout(r, 900))} /> },
  { id: 'beui/button-stateful', name: 'Press, and it tells you', why: 'The press answers in place: the label becomes "Opening checkout", then a tick, so the wait before the payment window opens has a voice.',
    render: () => <Stateful /> },
  { id: 'beui/button-magnetic', name: 'Press, and it leans in', why: 'The button leans toward the pointer as it nears. The one thing to do on the card meets you halfway.',
    render: () => <MagneticButton className={`${shape} w-full shadow-[var(--atom-lip)]`} strength={0.35}>{LABEL} <PixelArrowRight aria-hidden /></MagneticButton> },
];

createRoot(document.getElementById('root')).render(
  <main className="pg ca-landing home-redesign home-discovery">
    <h1 className="pg-label" style={{ fontSize: 15, margin: '24px auto 20px', maxWidth: 1200 }}>The buy button, in every form the libraries have for it</h1>
    <div className="atoms">
      {FORMS.map((f) => (
        <section key={f.id} className="atom" data-form={f.id}>
          <div className={`atom-stage${f.id === 'arc/confirm-morph' ? ' morph' : ''}`} data-atom>{f.render()}</div>
          <div><h3>{f.name}</h3><p>{f.why}</p><code>{f.from ?? f.id}</code></div>
        </section>))}
    </div>
  </main>,
);
