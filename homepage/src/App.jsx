// The new homepage, one part at a time, in the story STORY.md records: the hero, then keep AI slop out, live editing,
// save tokens on iteration, install. Sections are set in the homepage's own foundations (foundations/foundations.css).
// In development a switch flips light and dark, to review both.
import { useEffect, useState } from 'react';
import { Hero } from './hero/Hero.jsx';
import { Slop } from './sections/Slop.jsx';
import { Live } from './sections/Live.jsx';
import './foundations/foundations.css';

export function App() {
  const [scheme, setScheme] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  useEffect(() => { document.documentElement.dataset.scheme = scheme; }, [scheme]);
  return (
    <>
      <main className="pb-page-4">
        <Hero />
        <Slop />
        <Live />
      </main>
      {import.meta.env.DEV && (
        <aside aria-label="Light or dark" className="picker">
          {['light', 'dark'].map(s => <button key={s} type="button" aria-pressed={scheme === s} onClick={() => setScheme(s)}>{s}</button>)}
        </aside>
      )}
    </>
  );
}
