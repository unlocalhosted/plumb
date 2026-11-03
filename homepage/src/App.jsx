// The new homepage, one part at a time (docs/homepage-skill/02-prototype-loop.md). Part 1: the hero.
// In development a switch flips light and dark, to review both.
import { useEffect, useState } from 'react';
import { Hero } from './hero/Hero.jsx';

export function App() {
  const [scheme, setScheme] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  useEffect(() => { document.documentElement.dataset.scheme = scheme; }, [scheme]);
  return (
    <>
      <Hero />
      {import.meta.env.DEV && (
        <aside aria-label="Light or dark" className="picker">
          {['light', 'dark'].map(s => <button key={s} type="button" aria-pressed={scheme === s} onClick={() => setScheme(s)}>{s}</button>)}
        </aside>
      )}
    </>
  );
}
