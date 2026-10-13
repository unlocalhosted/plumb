/* ─────────────────────────────────────────────────────────
 * FOOTER (site/HOMEPAGE.md §4.6) — a stage band
 *
 *  band      the calm field, with a huge "Plumb" wordmark cut out of it (set in the page's own ground colour) and
 *            the wrench standing beside it. Click him and he fits and turns a nut, as often as you like.
 *  links     Product, Docs (README sections until the docs site exists), Project
 *  bottom    ©, the "plumb · 0 new drift" CI badge, the theme toggle, back to top
 * ───────────────────────────────────────────────────────── */
import { useState } from 'react';
import { Field } from '../system/Field.jsx';
import { Wrench } from '../system/Wrench.jsx';
import { Badge } from '../system/Sticker.jsx';

const REPO = 'https://github.com/unlocalhosted/plumb';
const COLUMNS = [
  { title: 'Product', links: [['Overlay', '#hero'], ['CLI', '#install'], ['CI', '#kept-true'], ['Agents', '#install']] },
  // README sections until the docs site exists; never a page that doesn't
  { title: 'Docs', links: [['Quick start', `${REPO}#quick-start`], ['Configuration', `${REPO}#configuration`], ['Agent installation', `${REPO}#agent-installation`], ['GitHub Action', `${REPO}#github-action`]] },
  { title: 'Project', links: [['GitHub', REPO], ['npm', 'https://www.npmjs.com/package/@unlocalhosted/plumb'], ['Issues', `${REPO}/issues`], ['License (MIT)', `${REPO}/blob/main/LICENSE`]] },
];

export function Footer() {
  const [nuts, setNuts] = useState(0);
  const flip = () => {
    const dark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {}
  };
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pt-8 pb-12 md:px-12">
      {/* the band */}
      <div className="relative flex h-64 items-end justify-between overflow-hidden rounded-lg bg-stage px-8 pb-2 shadow-lift max-sm:h-40">
        <Field turbulence={0} />
        <span aria-hidden="true" className="relative -mb-6 text-[11rem] leading-none font-semibold text-background select-none max-sm:text-7xl">
          Plumb
        </span>
        <button type="button" onClick={() => setNuts((n) => n + 1)} aria-label="Hand the wrench a nut" className="relative mb-6 cursor-pointer text-stage-foreground">
          <Wrench mood="content" cheer={nuts} scale={2} />
        </button>
      </div>

      <nav aria-label="Footer" className="grid gap-8 sm:grid-cols-3">
        {COLUMNS.map((c) => (
          <div key={c.title} className="flex flex-col gap-3">
            <span className="text-sm font-semibold">{c.title}</span>
            {c.links.map(([label, href]) => (
              <a key={label} href={href} className="w-fit text-sm text-muted-foreground transition-colors hover:text-foreground">
                {label}
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-6 border-t border-border pt-6 text-sm text-muted-foreground">
        <span>© 2026 Plumb · MIT</span>
        <Badge rest={-2} />
        <span className="flex items-center gap-4">
          <button type="button" onClick={flip} className="font-semibold hover:text-foreground">
            Day / Night
          </button>
          <a href="#top" className="font-semibold hover:text-foreground">
            Back to top ↑
          </a>
        </span>
      </div>
    </footer>
  );
}
