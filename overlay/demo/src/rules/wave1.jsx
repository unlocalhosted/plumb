export function App() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-s6 px-s4 py-s6">
      <section id="cc" className="flex flex-col gap-s6">
        <div id="cc-bad" className="rounded-card bg-surface p-s1 shadow-rest">
          <div id="cc-bad-child" className="rounded-card bg-ground p-s3 text-small">Not concentric: 12px inside 4px of a 12px corner</div>
        </div>
        <div id="cc-good" className="rounded-card bg-surface p-s1 shadow-rest">
          <div id="cc-good-child" className="rounded-control bg-ground p-s3 text-small">Concentric: 8px inside 4px of a 12px corner</div>
        </div>
      </section>
      <section id="io-bad" className="flex flex-col gap-s2">
        <div id="io-bad-a" className="flex flex-col gap-s4 text-small"><span>one</span><span>two</span></div>
        <div id="io-bad-b" className="flex flex-col gap-s4 text-small"><span>three</span><span>four</span></div>
      </section>
      <section id="io-good" className="flex flex-col gap-s4">
        <div id="io-good-a" className="flex flex-col gap-s2 text-small"><span>one</span><span>two</span></div>
        <div id="io-good-b" className="flex flex-col gap-s2 text-small"><span>three</span><span>four</span></div>
      </section>
      <p id="op-bad" className="text-body opacity-65">Faded through opacity</p>
      <p id="op-good" className="text-body text-ink-muted">Coloured with a token</p>
      <div className="relative h-10 rounded-card bg-surface" style={{ width: 300 }}>
        <span id="hp-bad" className="absolute left-1/2 top-0 -translate-x-1/2 text-small" style={{ width: 33 }}>odd</span>
      </div>
      <div className="relative h-10 rounded-card bg-surface" style={{ width: 300 }}>
        <span id="hp-good" className="absolute left-1/2 top-0 -translate-x-1/2 text-small" style={{ width: 34 }}>even</span>
      </div>
    </main>
  );
}
