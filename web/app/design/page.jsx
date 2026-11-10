import Link from 'next/link';
import { GROUPS } from '../../design/registry.js';
import { Toy } from '../../site/Toy.jsx';

export const metadata = { title: 'Design' };

function Box({ part }) {
  const inside = <span className="in"><span className="plate"><Toy name={part.toy} size={part.ready ? 42 : 30} /></span><b>{part.name}</b><em>{part.says}</em></span>;
  return part.ready
    ? <Link className="s-box" data-hue={part.hue} href={`/design/${part.id}`}>{inside}</Link>
    : <div className="s-box soon" data-hue={part.hue}>{inside}<i className="when">to draw</i></div>;
}

export default function Design() {
  return (
    <main className="wrap">
      <div className="title"><Toy name="grid" size={56} /><h1>Design</h1></div>
      <p className="lede">React Plumber’s design system, one box per part. <b>This site is drawn with it</b>: the same tokens, the same toys, the same buttons the product ships.</p>
      {GROUPS.map(([title, parts]) => (
        <section key={title}>
          <h2 className="shelf">{title}<small>{parts.filter((p) => p.ready).length} of {parts.length} drawn</small></h2>
          <div className="boxes">{parts.map((p) => <Box key={p.id} part={p} />)}</div>
        </section>
      ))}
    </main>
  );
}
