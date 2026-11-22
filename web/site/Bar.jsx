'use client';
// The site's one bar: where you are on the left; on the right where else it lives, and light or dark. The scheme is kept on <html data-scheme>, where the design
// pages read it, and remembered for the next visit.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { soften } from '../../overlay/src/soft.js';
import { markR } from '../../overlay/src/mark.js';
import { short, useCount } from './counts.js';
import { Download, Fetched, GitHub, LinkedIn, Moon, Star, Sun, X } from './marks.jsx';
import { AUTHOR, GITHUB_URL, NPM_URL } from './project.js';

const PLACES = [['/', 'Home'], ['/docs', 'Docs'], ['/demo', 'Demo'], ['/design', 'Design']];

export function useScheme() {
  const [scheme, setScheme] = useState('light');
  useEffect(() => {
    const root = document.documentElement;
    let saved = null;
    try { saved = localStorage.getItem('plumber:scheme'); } catch {}
    if (saved === 'dark' || saved === 'light') { root.dataset.scheme = saved; }
    setScheme(root.dataset.scheme === 'dark' ? 'dark' : 'light');
    const seen = new MutationObserver(() => setScheme(root.dataset.scheme === 'dark' ? 'dark' : 'light'));
    seen.observe(root, { attributes: true, attributeFilter: ['data-scheme'] });
    return () => seen.disconnect();
  }, []);
  const flip = () => {
    const next = document.documentElement.dataset.scheme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.scheme = next;
    try { localStorage.setItem('plumber:scheme', next); } catch {}
  };
  return [scheme, flip];
}

// the mark: a solid P inside a drawn R (overlay/src/mark.js, one source with the overlay and the films), in the drawing
// its size calls for; its leg takes the tool's blue for the page's scheme (--rp-leg, app/globals.css)
const MARK = markR({ h: 26, id: 'bar', leg: 'var(--rp-leg)' });

// Where else it lives: the package, the code with its stars, and who makes it. Quiet blocks, each with one tile; each
// says its name below it when pointed at or focused. As the window narrows the least needed leaves first (X and
// LinkedIn, which the foot also has, then GitHub and npm, which the hero and the foot have).
// A value with its picture, each character on its own wheel (globals.css rolls them).
const Face = ({ name, picture, text }) => (
  <span className={`face ${name}`}>
    <i className="cell">{picture}</i>
    <b>{[...text].map((ch, i) => <i className="cell" key={i} style={{ '--i': i + 1 }}>{ch}</i>)}</b>
  </span>
);

// GitHub's block holds two counts in one place: its stars, and, pointed at, last month's downloads. Both always have
// their room, so the swap moves nothing beside it. With no downloads to show it stays on the stars.
function Elsewhere() {
  const stars = useCount('stars'), downloads = useCount('downloads');
  const pulls = typeof downloads === 'number';
  const starred = stars == null ? '' : `, ${stars} ${stars === 1 ? 'star' : 'stars'}`;
  return (
    <>
      <a className="s-btn q tool get" href={NPM_URL} aria-label="Install package from npm" data-say="On npm">
        <span><Download /><b className="get-word">Install package</b></span>
      </a>
      <a className="s-btn q tool code" href={GITHUB_URL} aria-label={`GitHub${starred}${pulls ? `. ${downloads} npm downloads last month` : ''}`} data-rolls={pulls} data-say={pulls ? 'Downloads last month' : `GitHub${starred}`}>
        <span>
          <GitHub />
          <span className="tally" data-in={stars !== undefined} aria-hidden="true">
            <Face name="starred" picture={<Star />} text={stars === undefined ? '' : stars === null ? 'Star' : short(stars)} />
            {pulls && <Face name="pulled" picture={<Fetched />} text={short(downloads)} />}
          </span>
        </span>
      </a>
      <a className="s-btn q tool round who" href={AUTHOR.url} rel="me" aria-label={`${AUTHOR.name} on X`} data-say={`@${AUTHOR.x}`}><span><X /></span></a>
      <a className="s-btn q tool round who" href={AUTHOR.linkedin} rel="me" aria-label={`${AUTHOR.name} on LinkedIn`} data-say="LinkedIn"><span><LinkedIn /></span></a>
    </>
  );
}

export function Bar() {
  const path = usePathname();
  const [scheme, flip] = useScheme();
  useEffect(() => { soften(document); }, []); // every soft block on the site answers a press
  const here = (href) => (href === '/' ? path === '/' : path.startsWith(href));
  return (
    <header className="bar">
      <Link className="name" href="/"><i className="toy mark" style={{ width: 22, height: 26 }} dangerouslySetInnerHTML={{ __html: MARK }} /><span className="word">React Plumber</span></Link>
      <nav aria-label="Site">
        {PLACES.map(([href, text]) => <Link key={href} href={href} className={`s-btn ${here(href) ? '' : 'bare'}`} aria-current={here(href) ? 'page' : undefined}><span>{text}</span></Link>)}
      </nav>
      <span className="end">
        <Elsewhere />
        {/* the picture is where a press takes you: a moon by day, a sun by night (swapped by the page's scheme) */}
        <button type="button" className="s-btn q tool round scheme" onClick={flip} aria-label={scheme === 'dark' ? 'Switch to light' : 'Switch to dark'} data-say={scheme === 'dark' ? 'Light' : 'Dark'}>
          <span><i className="sky"><Moon /><Sun /></i></span>
        </button>
      </span>
    </header>
  );
}
