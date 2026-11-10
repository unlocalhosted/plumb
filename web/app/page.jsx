import Link from 'next/link';

export default function Home() {
  return (
    <main className="wrap">
      <h1>React Plumber</h1>
      <p className="lede">Keep your app on your design system. This is the new home of the site: the homepage, the docs with a live demo, and the design system, in one place.</p>
      <div className="tiles">
        <Link className="tile" href="/design"><b>Design</b><span>The design system: colour, type, icons, buttons, the fix bar.</span><em className="review">here</em></Link>
        <div className="tile"><b>Homepage</b><span>The product page. Still in <code>homepage/</code>; moves here next.</span><em className="soon">to move</em></div>
        <Link className="tile" href="/docs"><b>Docs</b><span>How to install and use it. Still in <code>site/</code>; moves here next.</span><em className="soon">to move</em></Link>
        <Link className="tile" href="/demo"><b>Demo</b><span>A page that moves, with the overlay on it.</span><em className="soon">to move</em></Link>
      </div>
    </main>
  );
}
