// The test page for the larger-text reality (docs/briefs/realities.md): the page is opened again with the browser's
// default text size at 24px. Text written in rem grows; text written in pixels does not; a box sized for one text
// size cuts its words.
export function App() {
  return (
    <main className="mx-auto grid max-w-xl gap-8 p-10">
      <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>

      {/* quiet: sized in rem, it follows the setting */}
      <p id="follows" className="text-base text-slate-700">Your next invoice is due on the first of the month.</p>

      {/* text-fixed, with a written fix: a pixel size in a class */}
      <p id="fixed-class" className="text-[14px] text-slate-700">Payment is taken from the card ending 4242.</p>

      {/* text-fixed, as advice: a pixel size written inline */}
      <p id="fixed-inline" style={{ fontSize: '13px' }} className="text-slate-700">Receipts are sent to the billing address.</p>

      {/* text-clips: a box sized in pixels; one line fits today, and is cut when the text is larger */}
      <div id="clips" className="h-[40px] w-[288px] overflow-hidden rounded-md bg-slate-100 px-3 py-2 text-base text-slate-800">Download every invoice as a PDF</div>

      {/* quiet: the same words in a box that grows */}
      <div id="grows" className="min-h-10 w-72 rounded-md bg-slate-100 px-3 py-2 text-base text-slate-800">Download every invoice as a PDF</div>
    </main>
  );
}
