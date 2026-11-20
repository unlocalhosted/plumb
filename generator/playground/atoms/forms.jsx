// The forms of an atom, by its job, written once for every product. A form is a library part and the role each of
// the skin's colours plays in it (`roles`: the part's own variable names, answered by the skin), so any product's
// atom wears it. Each says why a designer would choose it, in words that hold for any atom of the job.
// An atom: { label, doneLabel, slideLabel, holdLabel, confirm, iconHTML } (iconHTML: the original's own icon).
import { useEffect, useState } from 'react';
import { SlideActionButton } from '../vendor/beui/components/slide-action-button.tsx';
import { HoldActionButton } from '../vendor/beui/components/hold-action-button.tsx';
import { StatefulButton } from '../vendor/beui/components/button/stateful.tsx';
import { MagneticButton } from '../vendor/beui/components/button/magnetic.tsx';
import { HoldToConfirm } from '../vendor/arc/hold-to-confirm/hold-to-confirm.tsx';
import { ConfirmMorph } from '../vendor/arc/confirm-morph/confirm-morph.tsx';
import { Pour } from './native/pour.jsx';
import { Lead } from './native/lead.jsx';
import { Answer } from './native/answer.jsx';
import { Sheen } from './native/sheen.jsx';

const Icon = ({ atom }) => atom.iconHTML ? <span aria-hidden className="atom-icon" dangerouslySetInnerHTML={{ __html: atom.iconHTML }} /> : null;
const face = 'h-[var(--atom-height)] rounded-[var(--atom-radius)] text-[length:var(--atom-size)] font-[number:var(--atom-weight)] shadow-[var(--atom-lip)]';
// beUI paints with Tailwind's colour names; Arc reads its own variables. Both are answered per form.
const tw = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [`--tw-${k}`, v]));
const PRESS = tw({ primary: 'var(--atom-fill)', 'primary-foreground': 'var(--atom-on-fill)' });

function Answering({ atom }) {
  const [state, setState] = useState('idle');
  // beUI measures its label once, before the product's face has loaded, and clips it: measure again once it has
  const [fonts, setFonts] = useState(0);
  useEffect(() => { document.fonts.ready.then(() => setFonts(1)); }, []);
  return <StatefulButton key={fonts} state={state} className={`${face} w-full`} loadingText={atom.doneLabel} successText={atom.readyLabel ?? 'Done'} icon={<Icon atom={atom} />}
    onClick={() => { setState('loading'); setTimeout(() => setState('success'), 1100); setTimeout(() => setState('idle'), 2800); }}>{atom.label}</StatefulButton>;
}

export const FORMS = {
  commit: [
    { id: 'native/pour', name: 'Press, and it pours', gesture: 'press',
      why: 'The deeper shade floods out from the exact point you pressed, so the press feels like it lands where your finger did; the words stay readable on both sides of the edge, and sliding off before letting go drains it back.',
      roles: {}, render: (a) => <Pour label={a.label} doneLabel={a.doneLabel} icon={<Icon atom={a} />} /> },
    { id: 'native/lead', name: 'Press, and the arrow leads', gesture: 'press',
      why: 'Pressing sends the button’s own arrow on its way, and while checkout opens it keeps travelling, so the wait moves in the direction the customer is going.',
      roles: {}, render: (a) => <Lead label={a.label} doneLabel={a.doneLabel} icon={<Icon atom={a} />} /> },
    { id: 'native/answer', name: 'Press, and it says what’s happening', gesture: 'press',
      why: 'The label rolls up to “Opening checkout” and a thin line grows along the edge, so the moment between the press and the next screen has a voice; the words move but never fade.',
      roles: {}, render: (a) => <Answer label={a.label} doneLabel={a.doneLabel} icon={<Icon atom={a} />} /> },
    { id: 'native/sheen', name: 'A sheen, once', gesture: 'press',
      why: 'A soft light crosses the button when it comes into view and when the pointer arrives, never on a loop: the one thing to do catches the eye without nagging.',
      roles: {}, render: (a) => <Sheen label={a.label} doneLabel={a.doneLabel} icon={<Icon atom={a} />} /> },
    { id: 'beui/slide-action-button', name: 'Slide to commit', gesture: 'slide',
      why: 'Committing takes a deliberate gesture: drawing the thumb across is a small ceremony, and nobody does it by accident.',
      // the track carries the action colour, so the action keeps its weight; the trail is the stronger fill; the thumb is the ink
      roles: tw({ muted: 'var(--atom-fill)', primary: 'var(--atom-deep)', 'primary-foreground': 'var(--atom-on-deep)', foreground: 'var(--atom-on-fill)', background: 'var(--atom-on-fill)' }),
      render: (a) => <SlideActionButton className="h-[calc(var(--atom-height)+8px)] w-full rounded-[calc(var(--atom-radius)+3px)] p-1 shadow-[var(--atom-lip)]"
        thumbClassName="h-[var(--atom-height)] w-[var(--atom-height)] rounded-[var(--atom-radius)] bg-[var(--atom-on-fill)] text-[var(--atom-fill)]" completeLabel={a.doneLabel}>{a.slideLabel}</SlideActionButton> },
    { id: 'beui/hold-action-button', name: 'Hold to commit', gesture: 'hold',
      why: 'Holding fills the button with a deeper shade: the commitment builds under your finger, and letting go early takes it back.',
      roles: PRESS,
      render: (a) => <HoldActionButton type="horizontal" className={`${face} w-full min-w-0 px-6 [--hold-radius:var(--atom-radius)]`} labelClassName="text-[length:var(--atom-size)]" fillClassName="bg-[color:var(--atom-deep)]" holdingLabel="Keep holding" completeLabel={a.doneLabel}>{a.holdLabel}</HoldActionButton> },
    { id: 'arc/hold-to-confirm', name: 'Hold to confirm', gesture: 'hold',
      why: 'The same build-up as holding, with the words flipping colour exactly at the fill’s edge, so they never get lost while you hold.',
      roles: { '--surface': 'var(--atom-fill)', '--foreground': 'var(--atom-on-fill)', '--border-strong': 'var(--atom-edge)', '--accent': 'var(--atom-deep)', '--accent-foreground': 'var(--atom-on-deep)', '--radius-control': 'var(--atom-radius)', '--control-height-md': 'var(--atom-height)', '--text-sm': 'var(--atom-size)' },
      render: (a) => <HoldToConfirm label={a.holdLabel} confirmedLabel={a.doneLabel} onConfirm={() => {}} icon={<Icon atom={a} />} duration={1100} style={{ width: '100%', boxShadow: 'var(--atom-lip)' }} /> },
    { id: 'arc/confirm-morph', name: 'Press, then confirm', gesture: 'confirm',
      why: 'The button opens into what you are about to do and a confirm, right where you pressed, so you see the stakes before you commit.',
      roles: { '--surface-raised': 'var(--atom-fill)', '--foreground': 'var(--atom-on-fill)', '--text-secondary': 'var(--atom-on-fill)', '--accent': 'var(--atom-deep)', '--accent-strong': 'var(--atom-deep)', '--accent-foreground': 'var(--atom-on-deep)', '--radius-pill': 'var(--atom-radius)', '--control-height-sm': 'var(--atom-height)', '--shadow-resting': 'var(--atom-lip)', '--border-subtle': 'transparent', '--text-sm': 'var(--atom-size)' },
      render: (a) => <ConfirmMorph label={a.label} icon={<Icon atom={a} />} prompt={a.confirm} confirmLabel="Yes" cancelLabel="Not yet" pendingLabel={a.doneLabel} doneLabel={a.readyLabel ?? 'Done'} tone="neutral" onConfirm={() => new Promise((r) => setTimeout(r, 900))} /> },
    { id: 'beui/button-stateful', name: 'Press, and it answers', gesture: 'answer',
      why: 'The press answers in place, then confirms with a tick, so the wait before the next screen has a voice.',
      roles: PRESS, render: (a) => <Answering atom={a} /> },
    { id: 'beui/button-magnetic', name: 'Press, and it leans in', gesture: 'lean',
      why: 'The button leans toward the pointer as it nears: the one thing to do meets you halfway.',
      roles: PRESS, render: (a) => <MagneticButton className={`${face} w-full`} strength={0.35}>{a.label} <Icon atom={a} /></MagneticButton> },
  ],
};
