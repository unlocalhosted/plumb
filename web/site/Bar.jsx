'use client';
// The site's one bar: where you are, and light or dark. The scheme is kept on <html data-scheme>, where the design
// pages read it, and remembered for the next visit.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { soften } from '../../overlay/src/soft.js';

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

// the mark: a plumb bob on its line
const BOB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.500v6" fill="none" stroke="var(--pl-ink)" stroke-width="2.200" stroke-linecap="round"/><path d="M6.200 8.800h11.600L12 22z" fill="var(--pl-pink)" stroke="var(--pl-pink)" stroke-width="2.400" stroke-linejoin="round"/><circle cx="12" cy="12.400" r="1.700" fill="#fff"/></svg>';

export function Bar() {
  const path = usePathname();
  const [scheme, flip] = useScheme();
  useEffect(() => { soften(document); }, []); // every soft block on the site answers a press
  const here = (href) => (href === '/' ? path === '/' : path.startsWith(href));
  return (
    <header className="bar">
      <Link className="name" href="/"><i className="toy" style={{ width: 26, height: 26 }} dangerouslySetInnerHTML={{ __html: BOB }} />React Plumber</Link>
      <nav aria-label="Site">
        {PLACES.map(([href, text]) => <Link key={href} href={href} className={`s-btn ${here(href) ? '' : 'bare'}`} aria-current={here(href) ? 'page' : undefined}><span>{text}</span></Link>)}
      </nav>
      <span className="end"><button type="button" className="s-btn q" onClick={flip} aria-label={scheme === 'dark' ? 'Switch to light' : 'Switch to dark'}><span>{scheme === 'dark' ? 'Light' : 'Dark'}</span></button></span>
    </header>
  );
}
