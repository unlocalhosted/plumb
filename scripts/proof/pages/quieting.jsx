// A control page for scripts/proof/on-off.mjs: one check here quiets another, so switching it off must show up as a
// difference. A coloured button faded by opacity is craft/disabled-contrast's case, and that check quiets the general
// contrast and faded-text checks on the same button.
export function App() {
  return (
    <main className="mx-auto grid max-w-md gap-6 p-10">
      <h1 className="text-2xl font-semibold text-slate-900">Billing details</h1>
      <p className="text-base text-slate-700">Change the card we charge each month. The next payment is on the first.</p>
      <div className="flex gap-3">
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Update card</button>
        <button disabled className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white opacity-40">Save changes</button>
      </div>
    </main>
  );
}
