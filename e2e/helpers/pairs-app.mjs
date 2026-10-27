// The fixture app for the pairs test (also read by the scratch debugger).
// one skeleton block: a list behind a fetch, a skeleton of `sk` px rows, rows of 96px when it lands
const list = (name, id, sk) => `function ${name}() {
  const [items, setItems] = useState(null);
  useEffect(() => { fetch('/api/items').then((r) => r.json()).then(setItems); }, []);
  return <section id="${id}" className="flex flex-col gap-s2">{items ? items.map((i) => <article key={i.id} className="rounded-card bg-surface p-s3 text-body text-ink" style={{ height: 96 }}>{i.title}</article>) : [0, 1].map((n) => <div key={n} className="animate-pulse rounded-card bg-neutral-200" style={{ height: ${sk} }} />)}</section>;
}
`;
// one spinner block: shown at once (flashes on a fast reply) or after a 300ms wait
const spin = (name, id, wait) => `function ${name}() {
  const [done, setDone] = useState(false);
  const [show, setShow] = useState(${wait === 0});
  useEffect(() => { ${wait ? `const t = setTimeout(() => setShow(true), ${wait});` : ''} fetch('/api/items').then((r) => r.json()).then(() => setDone(true)); ${wait ? 'return () => clearTimeout(t);' : ''} }, []);
  return <section id="${id}" className="rounded-card bg-surface p-s3 text-body text-ink">{done ? 'Loaded' : show ? <div role="status" className="size-5 animate-spin rounded-full border-2 border-ink" /> : null}</section>;
}
`;
const scroller = (id, extra) => `<div id="${id}" className="h-40 overflow-y-auto rounded-card text-body text-ink"${extra}><div style={{ height: 600 }}>rows of text that go on</div></div>`;
const LOCAL = `style={{ background: 'linear-gradient(white 30%, rgba(255,255,255,0)) center top, linear-gradient(rgba(255,255,255,0), white 70%) center bottom, radial-gradient(farthest-side at 50% 0, rgba(0,0,0,.25), rgba(0,0,0,0)) center top, radial-gradient(farthest-side at 50% 100%, rgba(0,0,0,.25), rgba(0,0,0,0)) center bottom', backgroundRepeat: 'no-repeat', backgroundColor: 'white', backgroundSize: '100% 40px, 100% 40px, 100% 14px, 100% 14px', backgroundAttachment: 'local, local, scroll, scroll' }}`;

export const APP = `import { useEffect, useState } from 'react';
${list('SkeletonShort', 'sk-bad', 56)}${list('SkeletonMatch', 'sk-good', 96)}${spin('SpinnerFlash', 'sp-bad', 0)}${spin('SpinnerWaits', 'sp-good', 300)}
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s6 px-s4 pb-s6 text-body text-ink dark:text-night-ink">
      <p id="dw" className="text-small font-label text-ink dark:text-night-ink">Settings</p>
      <p id="dw-ok" className="text-small text-ink dark:text-night-ink">Plain words</p>
      <section id="lift-bad" className="rounded-card bg-surface p-s4 shadow-lifted dark:bg-night">raised, but not in the dark</section>
      <section id="lift-good" className="rounded-card bg-surface p-s4 shadow-lifted dark:bg-night-raised">raised in both</section>
      <SkeletonShort />
      <SkeletonMatch />
      <SpinnerFlash />
      <SpinnerWaits />
      ${scroller('sc-bad', '')}
      ${scroller('sc-mask', ' style={{ maskImage: "linear-gradient(to bottom, black 80%, transparent)" }}')}
      ${scroller('sc-local', ' ' + LOCAL)}
    </main>
  );
}
`;


export const STYLES = '@theme { --color-night: #0a0a0a; --color-night-raised: #262626; --color-night-ink: #f5f5f5; --font-weight-label: 500; --shadow-lifted: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); } body { background: white; } @media (prefers-color-scheme: dark) { body { background: #0a0a0a; } }';
