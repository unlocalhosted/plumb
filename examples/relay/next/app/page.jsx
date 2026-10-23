'use client';
// Relay's shell reads the URL hash and the window, so it renders on the client only.
import dynamic from 'next/dynamic';

const Shell = dynamic(() => import('@/app/Shell').then((m) => m.Shell), { ssr: false });

export default function Page() {
  return <div id="root"><Shell /></div>;
}
