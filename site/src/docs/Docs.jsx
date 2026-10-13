/* ─────────────────────────────────────────────────────────
 * DOCS SHELL (site/DOCS.md §3.1)
 *
 *  header    the brand and wrench from the homepage, Home · Docs, GitHub, Day/Night
 *  left      the sections and their pages; the current page marked; planned pages shown as planned, not links.
 *            On a phone the nav folds into a "Pages" sheet under the header.
 *  centre    the page, on a ~70ch measure
 *  right     "On this page": the page's h2/h3, the one being read marked as you scroll
 *  routing   real paths: /docs/<slug>; links move without a reload and keep their place in history
 * ───────────────────────────────────────────────────────── */
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SECTIONS, pageFor } from './manifest.js';
import { prose } from './prose.jsx';
import { Wrench } from '../system/Wrench.jsx';
import { SPRING } from '../site/motion.js';

const REPO = 'https://github.com/unlocalhosted/plumb';
const slugFromPath = () => location.pathname.replace(/^\/docs\/?/, '').replace(/\/$/, '');

export function Docs() {
  const [slug, setSlug] = useState(slugFromPath);
  const page = pageFor(slug);
  useEffect(() => {
    const back = () => setSlug(slugFromPath());
    addEventListener('popstate', back);
    return () => removeEventListener('popstate', back);
  }, []);
  // a docs link moves without a reload
  const go = (e, to) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    history.pushState(null, '', `/docs/${to}`);
    setSlug(to);
    scrollTo({ top: 0 });
  };
  // links inside a page to another docs page move the same way
  useEffect(() => {
    const click = (e) => {
      const a = e.target.closest?.('article a[href^="/docs/"]');
      if (a) go(e, a.getAttribute('href').replace(/^\/docs\//, ''));
    };
    document.addEventListener('click', click);
    return () => document.removeEventListener('click', click);
  }, []);
  const Page = useMemo(() => lazy(page.load), [page.slug]);
  useEffect(() => {
    document.title = `${page.title} · Plumb docs`;
  }, [page.slug]);

  return (
    <div className="min-h-svh">
      <Header />
      <div className="mx-auto grid max-w-7xl gap-10 px-6 pt-24 pb-24 md:px-12 lg:grid-cols-[14rem_minmax(0,1fr)_12rem]">
        <Nav current={page.slug} go={go} />
        <main className="min-w-0">
          <span className="text-sm font-semibold text-primary">{page.section}</span>
          <h1 className="mt-2 text-4xl font-semibold text-balance max-sm:text-2xl">{page.title}</h1>
          <article className="mt-6 max-w-2xl">
            <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
              <Page components={prose} />
            </Suspense>
          </article>
        </main>
        <Outline key={page.slug} />
      </div>
    </div>
  );
}

function Header() {
  const flip = () => {
    const dark = document.documentElement.classList.toggle('dark');
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {}
  };
  return (
    <header className="fixed inset-x-0 top-0 z-(--z-bar) border-b border-border bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-6 md:px-12">
        <span className="flex items-center gap-2">
          <a href="/" className="flex items-center gap-2 text-lg font-semibold">
            Plumb
          </a>
          <Wrench mood="idle" scale={0.72} compact />
          <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">Docs</span>
        </span>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <a href="/" className="text-muted-foreground hover:text-foreground">
            Home
          </a>
          <a href={REPO} className="text-muted-foreground hover:text-foreground max-sm:hidden">
            GitHub
          </a>
          <button type="button" onClick={flip} className="text-muted-foreground hover:text-foreground">
            Day / Night
          </button>
        </nav>
      </div>
    </header>
  );
}

function Nav({ current, go }) {
  const [open, setOpen] = useState(false);
  const list = (
    <div className="flex flex-col gap-8">
      {SECTIONS.map((s) => (
        <div key={s.title} className="flex flex-col gap-1">
          <span className="mb-1 text-xs font-semibold text-muted-foreground uppercase">{s.title}</span>
          {s.pages.map((p) =>
            p.load ? (
              <a
                key={p.slug}
                href={`/docs/${p.slug}`}
                onClick={(e) => (go(e, p.slug), setOpen(false))}
                aria-current={p.slug === current ? 'page' : undefined}
                className="relative rounded-sm px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground aria-[current]:bg-tint-2 aria-[current]:text-primary"
              >
                {p.title}
              </a>
            ) : (
              <span key={p.slug} className="flex items-center justify-between px-3 py-1.5 text-sm text-muted-foreground/60" title="Planned: not written yet">
                {p.title}
                <span className="text-xs">planned</span>
              </span>
            ),
          )}
        </div>
      ))}
    </div>
  );
  return (
    <>
      <aside className="sticky top-24 hidden max-h-[calc(100svh-8rem)] self-start overflow-y-auto lg:block">{list}</aside>
      {/* phones: the nav folds into a sheet */}
      <div className="lg:hidden">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between rounded-md bg-card px-4 py-3 text-sm font-semibold shadow-plate">
          Pages <span aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING.settle} className="overflow-hidden">
              <div className="pt-6">{list}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// "On this page": read from the rendered article. The section being read is the last heading scrolled past the
// header (or the first, at the top of the page).
function Outline() {
  const [items, setItems] = useState([]);
  const [here, setHere] = useState(null);
  useEffect(() => {
    let hs = [];
    const mark = () => {
      // at the very bottom the last sections can't reach the top: the last one is the one being read
      const bottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
      const past = hs.filter((h) => h.getBoundingClientRect().top < 120);
      setHere((bottom ? hs.at(-1) : past.at(-1) ?? hs[0])?.id ?? null);
    };
    const read = () => {
      hs = [...document.querySelectorAll('article h2[id], article h3[id]')];
      setItems(hs.map((h) => ({ id: h.id, text: h.firstChild?.textContent ?? h.textContent, level: h.tagName })));
      mark();
    };
    // the page arrives lazily: read once it has rendered
    const mo = new MutationObserver(read);
    const article = document.querySelector('article');
    if (article) mo.observe(article, { childList: true, subtree: true });
    read();
    addEventListener('scroll', mark, { passive: true });
    return () => (mo.disconnect(), removeEventListener('scroll', mark));
  }, []);
  if (!items.length) return <span className="hidden lg:block" />;
  return (
    <nav aria-label="On this page" className="sticky top-24 hidden max-h-[calc(100svh-8rem)] self-start overflow-y-auto lg:flex lg:flex-col lg:gap-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase">On this page</span>
      {items.map((i) => (
        <a
          key={i.id}
          href={`#${i.id}`}
          aria-current={i.id === here ? 'location' : undefined}
          className={`text-sm text-muted-foreground transition-colors hover:text-foreground aria-[current]:font-semibold aria-[current]:text-primary ${i.level === 'H3' ? 'pl-3' : ''}`}
        >
          {i.text}
        </a>
      ))}
    </nav>
  );
}
