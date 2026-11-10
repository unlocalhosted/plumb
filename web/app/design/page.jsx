import Link from 'next/link';
import { GROUPS } from '../../design/registry.js';

export const metadata = { title: 'Design' };

export default function Design() {
  return (
    <main className="wrap">
      <h1>Design</h1>
      <p className="lede">React Plumber’s design system, one page per part, drawn with the product’s own code and tokens. A part is done when its page shows every state.</p>
      {GROUPS.map(([title, parts]) => (
        <section key={title}>
          <h2>{title}</h2>
          <div className="tiles">
            {parts.map((p) => p.ready
              ? <Link key={p.id} className="tile" href={`/design/${p.id}`}><b>{p.name}</b><span>{p.says}</span><em className="review">in review</em></Link>
              : <div key={p.id} className="tile"><b>{p.name}</b><span>{p.says}</span><em className="todo">to draw</em></div>)}
          </div>
        </section>
      ))}
    </main>
  );
}
