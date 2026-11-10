import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Part } from '../../../design/Part.jsx';
import { PARTS, partOf } from '../../../design/registry.js';

export function generateStaticParams() { return PARTS.filter((p) => p.ready).map((p) => ({ part: p.id })); }
export async function generateMetadata({ params }) { const part = partOf((await params).part); return { title: part ? `${part.name} · Design` : 'Design' }; }

export default async function Page({ params }) {
  const part = partOf((await params).part);
  if (!part?.ready) notFound();
  // the overlay's token file, as it is in the product: the page's tables and every colour on it come from this text
  const css = await readFile(path.resolve(process.cwd(), '../overlay/src/tokens.css'), 'utf8').catch(() => readFile(path.resolve(process.cwd(), 'overlay/src/tokens.css'), 'utf8'));
  return (
    <main className="wrap">
      {!part.own && <><Link className="crumb" href="/design">← Design</Link><h1>{part.name}</h1><p className="lede">{part.lede}</p></>}
      <Part id={part.id} css={css} />
    </main>
  );
}
