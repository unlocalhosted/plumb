import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Part } from '../../../design/Part.jsx';
import { PARTS, partOf } from '../../../design/registry.js';
import { Toy } from '../../../site/Toy.jsx';
import { tokenFile } from '../../../site/tokens.js';

export function generateStaticParams() { return PARTS.filter((p) => p.ready).map((p) => ({ part: p.id })); }
export async function generateMetadata({ params }) { const part = partOf((await params).part); return { title: part ? `${part.name} · Design` : 'Design' }; }

export default async function Page({ params }) {
  const part = partOf((await params).part);
  if (!part?.ready) notFound();
  // the overlay's token file, as it is in the product: the page's tables and every colour on it come from this text
  const css = await tokenFile();
  return (
    <main className="wrap">
      <Link className="crumb" href="/design">← Design</Link>
      <div className="title"><Toy name={part.toy} size={56} /><h1>{part.name}</h1></div>
      <p className="lede">{part.lede ?? part.says}</p>
      <Part id={part.id} css={css} />
    </main>
  );
}
