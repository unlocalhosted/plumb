// The homepage: the visitor fixes a drifted card with Plumb's real overlay, then sees how Plumb reads their system,
// fixes a decision everywhere at once, keeps it true in CI, and installs. Plumb's overlay runs on the page, so any
// part of it can be pointed at (site/HOMEPAGE.md).
import { PageState, usePageState } from './site/Sheet.jsx';
import { TitleStrip } from './site/TitleStrip.jsx';
import { Hero } from './hero/Hero.jsx';
import { Reads } from './sections/Reads.jsx';
import { Everywhere } from './sections/Everywhere.jsx';
import { KeptTrue } from './sections/KeptTrue.jsx';
import { Install } from './sections/Install.jsx';
import { Footer } from './sections/Footer.jsx';

export function Home() {
  const page = usePageState();
  return (
    <PageState.Provider value={page}>
      <TitleStrip />
      <main id="top">
        <Hero />
        <Reads />
        <Everywhere />
        <KeptTrue />
        <Install />
      </main>
      <Footer />
    </PageState.Provider>
  );
}
