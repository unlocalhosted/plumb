'use client';
// The site's one bar: where you are, and light or dark. The scheme is kept on <html data-scheme>, where the design
// pages read it, and remembered for the next visit.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { soften } from '../../overlay/src/soft.js';
import { markR } from '../../overlay/src/mark.js';

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

// light or dark, for a phone too narrow for the word: a disc, half of it the ink
const DISC = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.600" fill="var(--pl-bg-surface)" stroke="var(--pl-text-primary)" stroke-width="2.200"/><path d="M12 4.400a7.600 7.600 0 0 1 0 15.200z" fill="var(--pl-text-primary)"/></svg>';

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
      <span className="end"><button type="button" className="s-btn q" onClick={flip} aria-label={scheme === 'dark' ? 'Switch to light' : 'Switch to dark'}><span><i className="toy disc" aria-hidden="true" dangerouslySetInnerHTML={{ __html: DISC }} /><b className="word">{scheme === 'dark' ? 'Light' : 'Dark'}</b></span></button></span>
    </header>
  );
}
