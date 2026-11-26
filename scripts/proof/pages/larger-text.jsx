// The test page for the larger-text reality (docs/briefs/realities.md): the page is opened again with the browser's
// default text size at 24px. Text written in rem grows; text written in pixels does not; a box sized for one text
// size cuts its words.
// a size held in a variable two lines read, and one passed into a component: the fix is written where each class is
const lettering = 'text-[11px] uppercase tracking-wide text-slate-500';
function Note({ className, children }) { return <p className={className}>{children}</p>; }

export function App() {
  return (
    <main className="mx-auto grid max-w-xl gap-8 p-10">
      <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>

      {/* quiet: sized in rem, it follows the setting */}
      <p id="follows" className="text-base text-slate-700">Your next invoice is due on the first of the month.</p>

      {/* text-fixed, with a written fix: a pixel size in a class */}
      <p id="fixed-class" className="text-[14px] text-slate-700">Payment is taken from the card ending 4242.</p>

      {/* text-fixed again, another size: the same habit, so the page gets one note and one fix that writes both */}
      <p id="fixed-class-2" className="text-[12px] text-slate-500">Card details are kept by the payment provider.</p>

      {/* text-fixed through a variable: both lines read it, and one edit to the variable fixes both */}
      <p id="fixed-var-1" className={lettering}>Billing period</p>
      <p id="fixed-var-2" className={`${lettering} mt-1`}>Next charge</p>

      {/* text-fixed through a component: the class is written here, where Note is used */}
      <Note className="text-[13px] text-slate-600">Prices include tax where it applies.</Note>

      {/* text-fixed, as advice: a pixel size written inline */}
      <p id="fixed-inline" style={{ fontSize: '13px' }} className="text-slate-700">Receipts are sent to the billing address.</p>

      {/* text-clips: a box sized in pixels; one line fits today, and is cut when the text is larger */}
      <div id="clips" className="h-[40px] w-[288px] overflow-hidden rounded-md bg-slate-100 px-3 py-2 text-base text-slate-800">Download every invoice as a PDF</div>

      {/* quiet: the same words in a box that grows */}
      <div id="grows" className="min-h-10 w-72 rounded-md bg-slate-100 px-3 py-2 text-base text-slate-800">Download every invoice as a PDF</div>
    </main>
  );
}
