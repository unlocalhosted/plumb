// The test page for the checks from CSS Protips (docs/research/harvests/css-protips/tips.md): each fault once, with
// the cases its check must stay quiet on beside it.
import { useMemo } from 'react';

const ONE_PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const VECTOR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3C/svg%3E";
const rows = ['Profile', 'Billing', 'Members', 'Security'];

export function App() {
  // a bitmap with pixels to spare, drawn here so the page needs no file
  const sharp = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d'); g.fillStyle = '#4f46e5'; g.fillRect(0, 0, 96, 96); return c.toDataURL('image/png'); }, []);
  const error = '';
  return (
    <main className="mx-auto grid max-w-xl gap-8 p-10">
      <h1 className="text-2xl font-semibold text-slate-900">Account</h1>

      {/* image-broken: nothing at this address */}
      <img id="broken" src="/missing-team-photo.png" alt="The team at the offsite" className="h-32 w-48 rounded-lg bg-slate-100" />
      {/* quiet: a picture that loaded */}
      <img id="loaded" src={sharp} alt="A plain tile" className="h-32 w-48 rounded-lg" />

      {/* empty-box: an error line with nothing to say, still drawing its box */}
      <p id="error" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      {/* quiet: the same line with words, and a divider that is empty by design */}
      <p id="said" className="rounded-md bg-red-50 p-3 text-sm text-red-700">That card was declined.</p>
      <div id="rule" className="h-px bg-slate-200" />
      {/* quiet: a status line kept for screen readers, hidden from the eye, empty until there is news */}
      <p id="announce" role="status" className="sr-only">{error}</p>
      {/* quiet: an empty line given its height on purpose, holding the place of what is still to come */}
      <p id="reserved" className="flex h-9 items-center text-xs text-slate-500">{error}</p>

      {/* link-in-text: a link in a sentence, told apart by colour alone */}
      <p className="text-base text-slate-700">Read the <a id="plain" href="#terms" className="text-indigo-600">terms of service</a> before you continue with the upgrade to the team plan.</p>
      {/* quiet: underlined in a sentence, and links with no sentence around them */}
      <p className="text-base text-slate-700">You can also see the <a id="lined" href="#prices" className="text-indigo-600 underline">full price list</a> for every plan we offer today.</p>
      <nav className="flex gap-4 text-sm"><a href="#a" className="text-slate-700">Overview</a><a href="#b" className="text-slate-700">Usage</a><a href="#c" className="text-slate-700">Invoices</a></nav>

      {/* last-divider: every row has a line, the last one against the box's own edge */}
      <ul id="lined-rows" className="overflow-hidden rounded-lg border border-slate-200">
        {rows.map((r) => <li key={r} className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800">{r}</li>)}
      </ul>
      {/* quiet: the last row drops its line */}
      <ul id="clean-rows" className="overflow-hidden rounded-lg border border-slate-200">
        {rows.map((r) => <li key={r} className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800 last:border-b-0">{r}</li>)}
      </ul>

      {/* box-overflow: told to fill its parent, its padding added on top */}
      <div className="w-64 rounded-lg bg-slate-100">
        <div id="wide" className="box-content w-full bg-indigo-100 px-4 py-2 text-sm text-slate-800">Usage this month</div>
      </div>
      {/* quiet: the same box with its padding counted inside */}
      <div className="w-64 rounded-lg bg-slate-100">
        <div id="fits" className="w-full bg-indigo-100 px-4 py-2 text-sm text-slate-800">Usage this month</div>
      </div>

      {/* icon-soft: a one-pixel bitmap drawn at 24px */}
      <p className="flex items-center gap-2 text-sm text-slate-800"><img id="soft" src={ONE_PIXEL} alt="" className="h-6 w-6" /> Exported as a bitmap</p>
      {/* quiet: a bitmap with four times the pixels, and a vector */}
      <p className="flex items-center gap-2 text-sm text-slate-800"><img id="crisp" src={sharp} alt="" className="h-6 w-6" /><img id="vector" src={VECTOR} alt="" className="h-6 w-6" /> Sharp either way</p>

      {/* css-words: a word drawn by CSS */}
      <p className="text-sm text-slate-800"><span id="badge" className="after:ml-2 after:rounded after:bg-emerald-100 after:px-1.5 after:content-['New']">Reports</span></p>
      {/* quiet: a mark drawn by CSS */}
      <p className="text-sm text-slate-800"><span id="arrow" className="after:ml-1 after:content-['→']">All reports</span></p>

      {/* type-viewport: sized by the window alone */}
      <h2 id="fluid" className="text-[4vw] font-semibold text-slate-900">Quarterly review</h2>
      {/* quiet: the same idea with ends that follow the text size */}
      <h2 id="clamped" className="text-[clamp(1.5rem,4vw,3rem)] font-semibold text-slate-900">Quarterly review</h2>

      {/* br-spacing: a gap made of blank lines */}
      <p id="breaks" className="text-sm text-slate-800">Ship to the office on Hill Street.<br /><br />Bill to the address on file.</p>
      {/* quiet: one break, for a new line */}
      <p id="break" className="text-sm text-slate-800">12 Hill Street<br />London</p>
    </main>
  );
}
