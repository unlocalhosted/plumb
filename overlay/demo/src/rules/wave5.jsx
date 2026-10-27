const Dot = ({ id }) => <svg id={id} width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6" /></svg>;
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s6 px-s4 py-s6">
      <div className="grid grid-cols-2 gap-s6">
        <div><div id="baseline-align-bad" className="flex items-center gap-s2"><span className="text-[28px]">Total</span><span className="text-[12px]">USD</span></div></div>
        <div id="baseline-align-good" className="flex flex-col gap-s4"><div className="flex items-baseline gap-s2"><span className="text-[28px]">Total</span><span className="text-[12px]">USD</span></div><div className="flex items-center gap-s2"><span className="text-[14px] font-semibold">Integrations</span><span className="rounded-[5px] bg-accent/10 px-[7px] py-[2px] text-[11px]">Beta</span></div></div>
        <div><div id="icon-cap-bad" className="flex items-center gap-s2"><Dot /><span className="pt-[10px] text-[20px]">Title</span></div></div>
        <div><div id="icon-cap-good" className="flex items-center gap-s2"><Dot /><span className="text-[20px] leading-[20px]">Title</span></div></div>
        <div><span id="trim-leading-bad" className="inline-block bg-surface px-s2 py-s2 text-[14px] leading-[32px]">Label</span></div>
        <div><span id="trim-leading-good" className="inline-block bg-surface px-s2 py-s2 text-[14px] leading-none">Label</span></div>
      </div>
    </main>
  );
}
