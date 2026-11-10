import Link from 'next/link';
import { Toy } from '../site/Toy.jsx';

const PLACES = [
  { href: '/design', hue: 'pink', toy: 'icon', name: 'Design', says: 'The design system this site is drawn with.', ready: true },
  { href: '/docs', hue: 'sky', toy: 'text', name: 'Docs', says: 'Install it, run it, read what it tells you.' },
  { href: '/demo', hue: 'mint', toy: 'cursor', name: 'Demo', says: 'A page that moves, with the overlay on it.' },
  { href: '/', hue: 'lilac', toy: 'image', name: 'Homepage', says: 'The product page.' },
];

export default function Home() {
  return (
    <main className="wrap">
      <div className="title"><h1>Keep your app on your design system.</h1></div>
      <p className="lede">React Plumber shows where a page drifts from your scale and fixes it in your code. This is the new home of the site. <b>Design is here</b>; the rest moves in next.</p>
      <div className="boxes">
        {PLACES.map((p) => {
          const inside = <span className="in"><span className="plate"><Toy name={p.toy} size={p.ready ? 42 : 30} /></span><b>{p.name}</b><em>{p.says}</em></span>;
          return p.ready
            ? <Link key={p.name} className="s-box" data-hue={p.hue} href={p.href}>{inside}</Link>
            : <div key={p.name} className="s-box soon" data-hue={p.hue}>{inside}<i className="when">moving in</i></div>;
        })}
      </div>
    </main>
  );
}
