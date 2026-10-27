// Every craft rule the overlay checks live, as the pages the e2e tests prove (open /?rules, then Alt+B). Each page holds
// an element that breaks a rule beside one that follows it; the test of that wave loads the very same file, so what you
// try here is what is proved there. One wave at a time: the census rules judge a page against its own habits.
import { App as Wave1 } from './rules/wave1.jsx';
import { App as Wave2 } from './rules/wave2.jsx';
import { App as Wave3 } from './rules/wave3.jsx';
import { App as Wave4 } from './rules/wave4.jsx';
import { App as Wave5 } from './rules/wave5.jsx';
import { App as Wave6 } from './rules/wave6.jsx';
import { App as Wave7 } from './rules/wave7.jsx';

const WAVES = [
  { n: '1', name: 'Corners and spacing', page: Wave1, rules: 'concentric corners, group spacing, faded text, half pixels' },
  { n: '2', name: 'Shadows and lines', page: Wave2, rules: 'hairlines, image edges, layered shadows, scale from zero, z-index, content edge' },
  { n: '3', name: 'Type and reach', page: Wave3, rules: 'button sides, icon side, measure, leading, tracking, numbers, contrast, tap size, truncation…' },
  { n: '4', name: 'Judgement', page: Wave4, rules: 'wrapping, corner shape, optical size, tinted shadow, scrim, pure black, fixed width' },
  { n: '5', name: 'Font metrics', page: Wave5, rules: 'baselines, icon on the capitals, padding the line adds' },
  { n: '6', name: 'The page’s habits', page: Wave6, rules: 'weights, greys, rhythm' },
  { n: '7', name: 'Ink and motion', page: Wave7, rules: 'optical centre, round icons, stroke weight, scroll cue, press, exit, reversal' },
];

export function Rules() {
  const at = new URLSearchParams(location.search).get('rules') || '1';
  const wave = WAVES.find((w) => w.n === at) ?? WAVES[0];
  const Page = wave.page;
  return (
    <>
      <nav aria-label="Rule pages" className="mx-auto flex max-w-5xl flex-wrap gap-s2 px-s4 pt-s6">
        {WAVES.map((w) => (
          <a key={w.n} href={`?rules=${w.n}`} aria-current={w === wave ? 'page' : undefined} title={w.rules}
            className={`inline-flex h-8 items-center rounded-control px-s3 text-small ${w === wave ? 'bg-ink text-surface' : 'bg-surface text-ink'}`}>{w.n} · {w.name}</a>
        ))}
      </nav>
      <p className="mx-auto max-w-5xl px-s4 pt-s3 text-small text-ink-muted">{wave.rules}. Alt+B to see them.</p>
      <Page />
    </>
  );
}
