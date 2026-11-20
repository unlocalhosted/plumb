// One adapter per library part the generator may place: which slot it fills and how the product's content becomes its
// props. A catalogue part with no adapter is reported as a candidate, never placed. (Arc's timeline was looked at for
// the ladder and doesn't fit: it is a feed of timestamped events. Arc's progress needs a current count of learners,
// which the product doesn't expose.)
import { AnimatedCounter } from '../vendor/arc/animated-counter/animated-counter.tsx';
import { Stepper } from '../vendor/arc/stepper/stepper.tsx';
import { NumberTicker } from '../vendor/beui/components/number-ticker.tsx';
import { AnimatedNumber } from '../vendor/beui/components/animated-number.tsx';

export const ADAPTERS = {
  'arc/animated-counter': { slot: 'price', does: 'the price rolls in digit by digit, each column in the direction the number moved', why: 'The price is worked out for where you are. Letting it roll in says so, where a printed number reads as the same for everyone.',
    render: (c) => <AnimatedCounter value={c.price} prefix={c.symbol} locale="en-IN" animateOnView /> },
  'beui/number-ticker': { slot: 'price', does: 'the price ticks up from zero as the card comes into view, digits blurring as they pass', why: 'A price that arrives gets looked at first, before the button, which is the order you want someone to read this card in.',
    render: (c) => <NumberTicker value={c.price} prefix={c.symbol} locale="en-IN" startOnView /> },
  'beui/animated-number': { slot: 'price', does: 'the price counts up from zero as the card comes into view', why: 'A price that arrives gets looked at first, before the button, which is the order you want someone to read this card in.',
    render: (c) => <AnimatedNumber value={c.price} startOnView format={(n) => c.money(Math.round(n))} /> },
  'arc/stepper': { slot: 'position', does: 'the three launch stages as a track, the current one marked, each with its price', why: 'The struck-through price only says it will go up. Three stages with you in the first say when, and that now is the cheapest it will be, which is the real reason to buy today.',
    render: (c) => <Stepper steps={c.stages} current={0} details="all" label="Launch pricing" /> },
};
