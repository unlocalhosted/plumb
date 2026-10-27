// The craft engine's showcase (open /?craft, then Alt+B): every wave-three rule as a pair, the element that breaks it on
// the left and the one that follows it on the right. The same page e2e/craft-wave3.test.mjs proves.
const LONG = 'Reading text that runs the full width of a wide column makes the eye travel a long way back to find the start of the next line, and readers lose their place; a measure of forty-five to seventy-five characters keeps the return sweep short and the reading easy, which is why books and good sites hold it. Reading text that runs the full width of a wide column makes the eye travel a long way back to find the start of the next line, and readers lose their place; a measure of forty-five to seventy-five characters keeps the return sweep short and the reading easy, which is why books and good sites hold it.';
const PATH = 'src/components/forms/inputs/TextField.tsx';
const ICON = <svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6" /></svg>;
const rows = (id, odd) => (
  <ul id={odd ? undefined : id} className="flex flex-col gap-s2">
    {[0, 1, 2, 3].map((i) => <li key={i} className="flex items-center gap-s2 text-body"><img id={odd && i === 2 ? id : undefined} src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGP48+c3VsQwtCQAwE+8wUiVX/4AAAAASUVORK5CYII=" alt="" className={odd && i === 2 ? 'size-9' : 'size-8'} />Name {i}</li>)}
  </ul>
);
const table = (good) => (
  <table><tbody>{['1,204.50', '87.10', '12.00'].map((n, i) => <tr key={n}><td id={i === 0 ? (good ? 'tabular-nums-good' : 'tabular-nums-bad') : undefined} className={good ? 'tabular-nums' : ''}>{n}</td></tr>)}</tbody></table>
);

export function Craft() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s6 px-s4 pb-s6">
      {/* each row: the one that breaks a craft rule (left) beside the one that follows it (right). Alt+B to see. */}
      <header className="sticky top-0 h-12 w-full bg-surface" />
      <div className="grid grid-cols-2 gap-s6">
        <div><button id="composed-bad" className="flex items-center gap-s2 rounded-control bg-surface px-s3 py-s3 text-body">{ICON}Save</button></div>
        <div><button id="composed-good" className="flex items-center gap-s2 rounded-control bg-surface pl-s4 pr-s6 py-s3 text-body">{ICON}Save</button></div>
        <div><button id="button-padding-bad" className="rounded-control bg-surface p-s2 text-body">Save</button></div>
        <div><button id="button-padding-good" className="rounded-control bg-surface px-s4 py-s2 text-body">Save</button></div>
        <div><button id="icon-side-bad" className="flex items-center gap-s2 rounded-control bg-surface px-s4 py-s2 text-body">{ICON}Add</button></div>
        <div><button id="icon-side-good" className="flex items-center gap-s2 rounded-control bg-surface pl-s3 pr-s4 py-s2 text-body">{ICON}Add</button></div>
        <div><h2 id="leading-bad" className="text-[40px] leading-[1.6]">Big</h2></div>
        <div><h2 id="leading-good" className="text-[40px] leading-tight">Big</h2></div>
        <div><span id="tracking-bad" className="text-[11px] uppercase">Status</span></div>
        <div><span id="tracking-good" className="text-[11px] uppercase tracking-wider">Status</span></div>
        <div>{table(false)}</div>
        <div>{table(true)}</div>
        <div><h3 id="heading-widow-bad" className="w-[9ch] font-mono text-[20px]">aaaa bbbb cccc</h3></div>
        <div><h3 id="heading-widow-good" className="w-[9ch] font-mono text-[20px] text-balance">aaaa bbbb cccc</h3></div>
        <div><div id="one-light-bad" className="h-12 w-32 bg-surface shadow-[0_-4px_8px_rgba(0,0,0,0.1)]" /></div>
        <div><div id="one-light-good" className="h-12 w-32 bg-surface shadow-[0_4px_8px_rgba(0,0,0,0.1)]" /></div>
        <div><div id="border-on-shadow-bad" className="h-12 w-32 border border-rule bg-surface shadow-[0_4px_12px_rgba(0,0,0,0.1)]" /></div>
        <div><div id="border-on-shadow-good" className="h-12 w-32 border border-black/10 bg-surface shadow-[0_4px_12px_rgba(0,0,0,0.1)]" /></div>
        <div><span id="contrast-bad" className="text-[12px] text-[#b8bcc2]">faint words</span></div>
        <div><span id="contrast-good" className="text-[12px] text-ink">clear words</span></div>
        <div><button id="disabled-contrast-bad" disabled className="rounded-control bg-accent px-s4 py-s2 text-body text-surface opacity-40">Pay</button></div>
        <div><button id="disabled-contrast-good" disabled className="rounded-control bg-ground px-s4 py-s2 text-body text-ink-muted">Pay</button></div>
        <div><button id="hit-target-bad" aria-label="Close" className="size-4 bg-surface" /></div>
        <div><button id="hit-target-good" aria-label="Close" className="size-6 bg-surface" /></div>
        <div>{rows('media-size-bad', true)}</div>
        <div>{rows('media-size-good', false)}</div>
        <div><p id="truncate-intent-bad" className="w-40 truncate text-body">A sentence far too long for its box</p></div>
        <div><p id="truncate-intent-good" title="A sentence far too long for its box" className="w-40 truncate text-body">A sentence far too long for its box</p></div>
        <div><div id="scrollbar-gutter-bad" className="h-[220px] w-[300px] overflow-y-auto bg-surface"><div className="h-[400px]" /></div></div>
        <div><div id="scrollbar-gutter-good" className="h-[220px] w-[300px] overflow-y-auto bg-surface [scrollbar-gutter:stable]"><div className="h-[400px]" /></div></div>
        <div><span id="bold-hover-bad" className="hover:font-bold">Docs</span></div>
        <div><span id="bold-hover-good" className="hover:text-accent">Docs</span></div>
        <div><blockquote><p id="hanging-quote-bad">“Make it work, then make it right.”</p></blockquote></div>
        <div><blockquote><p id="hanging-quote-good" style={{ textIndent: '-0.45em' }}>“Make it work, then make it right.”</p></blockquote></div>
        <div><span id="caps-case-bad" className="uppercase">sign-in (beta)</span></div>
        <div><span id="caps-case-good" className="uppercase [font-feature-settings:'case']">sign-in (beta)</span></div>
        <div><div id="gradient-space-bad" className="h-12 w-48" style={{ backgroundImage: 'linear-gradient(to right, rgb(255, 0, 0), rgb(0, 0, 255))' }} /></div>
        <div><div id="gradient-space-good" className="h-12 w-48" style={{ backgroundImage: 'linear-gradient(in oklch to right, rgb(255, 0, 0), rgb(0, 0, 255))' }} /></div>
        <div><input id="input-zoom-bad" className="h-8 bg-surface text-sm" /></div>
        <div><input id="input-zoom-good" className="h-8 bg-surface text-base" /></div>
        <nav className="flex gap-s3 text-small"><a href="#anchor-offset-bad">Section one</a><a href="#anchor-offset-good">Section two</a></nav><div />
        <div><h4 id="anchor-offset-bad" className="text-body">Section one</h4></div>
        <div><h4 id="anchor-offset-good" className="scroll-mt-12 text-body">Section two</h4></div>
        <div><p id="middle-truncate-bad" className="w-40 truncate text-body">{PATH}</p></div>
        <div><p id="middle-truncate-good" title={PATH} className="w-96 truncate text-body">src/…/TextField.tsx</p></div>
      </div>
      <p id="measure-bad" className="text-body">{LONG}</p>
      <p id="measure-good" className="max-w-prose text-body">{LONG}</p>
    </main>
  );
}
