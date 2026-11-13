'use client';
// The product homepage, on the site's front page. Its sections are the homepage's own (homepage/src), imported, not
// copied, so there is one homepage; its foundations point at the overlay's tokens, which the site puts on its root.
// The site's bar is the navigation, so the homepage's own nav is not drawn here (homepage.css).
import '../../homepage/src/foundations/foundations.css';
import '../../homepage/src/hero/hero.css';
import './homepage.css';
import { Hero } from '../../homepage/src/hero/Hero.jsx';
import { Insights } from '../../homepage/src/sections/Insights.jsx';
import { Slop } from '../../homepage/src/sections/Slop.jsx';
import { Live } from '../../homepage/src/sections/Live.jsx';
import { Tokens } from '../../homepage/src/sections/Tokens.jsx';
import { Install } from '../../homepage/src/sections/Install.jsx';

export function Homepage() {
  return (
    <main className="homepage pb-page-4">
      <Hero />
      <Insights />
      <Slop />
      <Live />
      <Tokens />
      <Install />
    </main>
  );
}
