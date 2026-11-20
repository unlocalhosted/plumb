const FADE = 'linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0))';
const EASED = 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.5) 30%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0) 100%)';
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s6 px-s4 py-s6">
      <div className="grid grid-cols-2 gap-s6">
        <div><h2 id="text-wrap-role-bad" className="w-[14ch] font-mono text-[24px]">aaaa bbbb cccc dddd e</h2></div>
        <div><h2 id="text-wrap-role-good" className="w-[14ch] font-mono text-[24px] text-balance">aaaa bbbb cccc dddd e</h2></div>
        <div><div id="continuous-corners-bad" className="h-[200px] w-[200px] rounded-[24px] bg-surface" /></div>
        <div><div id="continuous-corners-good" className="h-[200px] w-[200px] rounded-[24px] bg-surface [corner-shape:squircle]" /></div>
        <div><p id="optical-sizing-bad" className="text-body" style={{ fontOpticalSizing: 'none' }}>Small words set without their optical size.</p></div>
        <div><p id="optical-sizing-good" className="text-body">Small words set with their optical size.</p></div>
        <div className="bg-accent p-s6"><div id="tinted-shadow-bad" className="h-16 w-32 bg-surface shadow-[0_8px_16px_rgba(0,0,0,0.3)]" /></div>
        <div className="bg-ground p-s6"><div id="tinted-shadow-good" className="h-16 w-32 bg-surface shadow-[0_8px_16px_rgba(0,0,0,0.3)]" /></div>
        <div className="relative h-[200px] w-[300px]"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGP48+c3VsQwtCQAwE+8wUiVX/4AAAAASUVORK5CYII=" alt="" className="h-full w-full" /><div id="eased-scrim-bad" className="absolute inset-0" style={{ backgroundImage: FADE }} /></div>
        <div className="relative h-[200px] w-[300px]"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGP48+c3VsQwtCQAwE+8wUiVX/4AAAAASUVORK5CYII=" alt="" className="h-full w-full" /><div id="eased-scrim-good" className="absolute inset-0" style={{ backgroundImage: EASED }} /></div>
        <div><div id="pure-black-white-bad" className="h-[400px] w-[560px]" style={{ background: '#000' }} /></div>
        <div><div id="pure-black-white-good" className="h-[400px] w-[560px] bg-ink" /></div>
        <div><button id="content-size-bad" className="w-[60px] rounded-control bg-surface px-s2 py-s1 text-body">Invite everyone</button></div>
        <div><button id="content-size-good" className="w-auto rounded-control bg-surface px-s2 py-s1 text-body">Invite everyone</button></div>
      </div>
    </main>
  );
}
