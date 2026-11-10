'use client';
// The site's one bar: where you are, and light or dark. The scheme is kept on <html data-scheme>, where the design
// pages read it, and remembered for the next visit.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

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

export function Bar() {
  const path = usePathname();
  const [scheme, flip] = useScheme();
  return (
    <header className="bar">
      <Link className="name" href="/"><i aria-hidden="true" />React Plumber</Link>
      <nav aria-label="Site">
        {PLACES.map(([href, text]) => <Link key={href} href={href} aria-current={(href === '/' ? path === '/' : path.startsWith(href)) ? 'page' : undefined}>{text}</Link>)}
      </nav>
      <span className="end"><button type="button" onClick={flip}>{scheme === 'dark' ? 'Light' : 'Dark'}</button></span>
    </header>
  );
}
