import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SECTIONS, PAGES } from '../../../docs/manifest.js';
import { Toy } from '../../../site/Toy.jsx';

const HUE = { Start: ['mint', 'direction'], Concepts: ['lilac', 'layer'], Guides: ['sky', 'position'], Reference: ['butter', 'table'] };
const find = (slug) => PAGES.find((p) => p.slug === (slug?.[0] ?? PAGES[0].slug) && p.load);

export function generateStaticParams() { return [{ slug: [] }, ...PAGES.filter((p) => p.load).map((p) => ({ slug: [p.slug] }))]; }
export async function generateMetadata({ params }) { const page = find((await params).slug); return { title: page ? `${page.title} · Docs` : 'Docs' }; }

export default async function Docs({ params }) {
  const page = find((await params).slug);
  if (!page) notFound();
  const { default: Body } = await page.load();
  const at = PAGES.filter((p) => p.load).indexOf(page), ready = PAGES.filter((p) => p.load);
  const before = ready[at - 1], after = ready[at + 1];
  const [hue, toy] = HUE[page.section] ?? HUE.Start;
  return (
    <main className="docs">
      <nav className="side" aria-label="Docs">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <b><Toy name={(HUE[s.title] ?? HUE.Start)[1]} size={20} />{s.title}</b>
            {s.pages.map((p) => p.load
              ? <Link key={p.slug} href={`/docs/${p.slug}`} aria-current={p.slug === page.slug ? 'page' : undefined}>{p.title}</Link>
              : <span key={p.slug} className="planned">{p.title}</span>)}
          </div>
        ))}
      </nav>
      <article className="prose" data-hue={hue}>
        <p className="over"><Toy name={toy} size={22} />{page.section}</p>
        <h1>{page.title}</h1>
        <Body />
        <footer className="turn">
          {before ? <Link className="key" href={`/docs/${before.slug}`}><span>← {before.title}</span></Link> : <span />}
          {after && <Link className="key on" href={`/docs/${after.slug}`}><span>{after.title} →</span></Link>}
        </footer>
      </article>
    </main>
  );
}
