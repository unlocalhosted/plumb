import Link from 'next/link';

export const metadata = { title: 'Demo' };

export default function Page() {
  return (
    <main className="wrap">
      <div className="page-title"><h1>Demo</h1></div>
      <p className="lede">The interactive demo isn’t on this site yet. To try React Plumber on your own app, follow the <Link href="/docs/quick-start">Quick start</Link>.</p>
    </main>
  );
}
