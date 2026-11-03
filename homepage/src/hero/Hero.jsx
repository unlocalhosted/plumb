/* HERO (docs/homepage-skill/plumber/hero-brief.md, revised): one quiet column of words, then the demo, which is the
 * only loud thing on the screen. Learned from react-grab.com: a document, not a layout; cause and effect side by
 * side. */
import { CopyCommand } from './CopyCommand.jsx';
import { Carousel } from './Carousel.jsx';
import { CLAIM } from './headlines.js';

export const INSTALL = 'npm install -D @unlocalhosted/react-plumber';

export function Hero() {
  const copy = CLAIM;
  return (
    <main className="mx-auto max-w-column px-6 pt-page-3 pb-page-4">
      <h1 className="m-0 text-heading font-strong">React Plumber</h1>
      <p className="m-0 mt-2 text-body text-ink-2">{copy.title}</p>
      <p className="m-0 mt-8 text-body">{copy.lead}</p>
      <p className="m-0 mt-8 text-body">Run this in your project:</p>
      <div className="mt-5"><CopyCommand command={INSTALL} /></div>
      <Carousel />
    </main>
  );
}
