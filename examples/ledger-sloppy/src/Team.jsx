// A page like a real app's, with honest mistakes in it (open /?team, then Alt+B): the fix-in-place flow end to end.
// The same page e2e/verdict.test.mjs, select.test.mjs, inplace.test.mjs and walkthrough.test.mjs prove.
const Icon = () => <svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="6" /></svg>;
const members = [['Ada Lovelace', 'Owner'], ['Grace Hopper', 'Admin'], ['Alan Turing', 'Member']];
export function Team() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-s6 px-s4 py-s6">
      <header className="flex items-center justify-between">
        <h1 id="title" className="text-body font-semibold">Team settings</h1>
        <button id="invite" className="flex items-center gap-s2 rounded-control bg-accent px-s3 py-s3 text-body text-surface"><Icon />Invite</button>
      </header>
      <section className="flex flex-col gap-s3 rounded-card bg-surface p-s4">
        <span id="status" className="text-[11px] uppercase text-ink-muted">Status</span>
        <p className="text-body">Three people can see this workspace.</p>
        <ul className="flex flex-col gap-s2">
          {members.map(([name, role]) => <li key={name} className="flex items-center justify-between text-body"><span>{name}</span><span className="text-small text-ink-muted">{role}</span></li>)}
        </ul>
      </section>
    </main>
  );
}
