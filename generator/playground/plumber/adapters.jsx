// One adapter per library part the generator may place in React Plumber's section: the slot it fills, what it does,
// and how the section's content (the install command, the three steps, each family's share) becomes its props.
// Arc's gauge was looked at for the shares and doesn't fit: seven dials stacked in a column, where one vial a row reads.
import { CodeBlock } from '../vendor/arc/code-block/code-block.tsx';
import { CopyButton } from '../vendor/arc/copy-button/copy-button.tsx';
import { ActionSwapBlurButton } from '../vendor/beui/components/action-swap-blur.tsx';
import { AnimatedCounter } from '../vendor/arc/animated-counter/animated-counter.tsx';
import { DigitSwap } from '../vendor/beui/components/digit-swap.tsx';
import { Stepper } from '../vendor/arc/stepper/stepper.tsx';
import { useState } from 'react';

// the house strip (Plumber.tsx Install) with another Copy button in it
const Strip = ({ install, children }) => (
  <div className="flex w-full max-w-[34rem] items-center gap-3 rounded-[10px] bg-draw-tint py-2 pr-2 pl-4">
    <span aria-hidden className="font-mono text-[13px] text-draw">$</span>
    <code className="min-w-0 flex-1 overflow-x-auto font-mono type-body-small whitespace-nowrap text-fg [scrollbar-width:none]">{install}</code>
    {children}
  </div>
);
function SwapCopy({ install }) {
  const [v, setV] = useState('copy');
  return <ActionSwapBlurButton size="sm" value={v} items={[{ id: 'copy', label: 'Copy' }, { id: 'copied', label: 'Copied ✓' }]}
    onClick={() => { navigator.clipboard?.writeText(install); setV('copied'); setTimeout(() => setV('copy'), 1600); }} />;
}

export const ADAPTERS = {
  'arc/code-block': { slot: 'action', does: 'the install command in a code block with its file name and a copy button that confirms with a tick', why: 'An install line is something you paste into a terminal. Setting it as code, labelled terminal, says exactly where it goes.',
    render: (c) => <div className="w-full max-w-[34rem]"><CodeBlock code={c.install} filename="terminal" language="bash" /></div> },
  'arc/copy-button': { slot: 'action', does: 'the blue strip stays; its Copy button swaps its icon for a tick when the command is copied', why: 'The strip already stands out. What it lacks is a clear moment of success, and a tick in place is the confirmation people look for.',
    render: (c) => <Strip install={c.install}><CopyButton value={c.install} label="Copy" variant="plain" /></Strip> },
  'beui/action-swap-blur': { slot: 'action', does: 'the blue strip stays; Copy blurs into Copied in place', why: 'Today the button grows when it says Copied and nudges the line beside it. Swapping the word in place keeps the strip still.',
    render: (c) => <Strip install={c.install}><SwapCopy install={c.install} /></Strip> },
  'arc/animated-counter': { slot: 'value', does: 'each share rolls up digit by digit while its bubble travels to its place', why: 'Each share is the result of a check. Rolling it up while the bubble travels makes the number and the level one movement.',
    render: (c) => <><AnimatedCounter value={c.run ? c.pct : 0} animateOnView />%</> },
  'beui/digit-swap': { slot: 'value', does: 'each share drops in one digit at a time, the percent sign holding still', why: 'Digits dropping in one at a time read as a measurement settling, which is what these numbers are.',
    render: (c) => <DigitSwap value={`${c.run ? c.pct : 0}%`} suffixLength={1} /> },
  'arc/stepper': { slot: 'proof', does: 'check, see and fix as a track of three steps, each with its one line', why: 'Check, see and fix are an order, not a list. A track says you do them one after another.',
    render: (c) => <div className="max-w-[30rem]"><Stepper steps={c.steps.map(([verb, line]) => ({ id: verb, label: verb, description: line }))} current={0} details="all" orientation="vertical" label="How it works" /></div> },
};
