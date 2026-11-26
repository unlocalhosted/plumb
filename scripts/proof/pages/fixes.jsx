// A control page for scripts/proof/fix-undo.mjs: a small settings screen with a few faults whose fixes plumber can
// write (a tall list with no room kept for its scrollbar, a header whose parts are apart only by leftover space, a
// card whose inner corner copies the outer one), all in one file so undo order matters.
const people = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Edsger Dijkstra', 'Barbara Liskov', 'Donald Knuth', 'Margaret Hamilton', 'Ken Thompson', 'Radia Perlman', 'Leslie Lamport', 'Frances Allen', 'John Backus', 'Niklaus Wirth', 'Tony Hoare'];

export function App() {
  return (
    <main className="mx-auto grid max-w-xl gap-6 p-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Team members</h1>
        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Invite</button>
      </header>
      <div className="rounded-[20px] bg-indigo-100 p-2">
        <div className="rounded-[20px] bg-white p-4">
          <p className="text-base text-slate-700">Fourteen people can see this workspace. Remove someone to free a seat.</p>
        </div>
      </div>
      <ul className="h-80 overflow-y-auto rounded-lg bg-slate-50 p-2">
        {people.map((name) => (
          <li key={name} className="flex items-center justify-between rounded-md px-3 py-3 text-sm text-slate-800">
            <span>{name}</span>
            <span className="text-slate-500">Member</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
