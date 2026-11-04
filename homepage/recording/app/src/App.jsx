const MEMBERS = [
  { name: 'Maya Okafor', email: 'maya@northwind.studio', role: 'Owner', initial: 'M' },
  { name: 'Daniel Reyes', email: 'daniel@northwind.studio', role: 'Admin', initial: 'D' },
  { name: 'Priya Nair', email: 'priya@northwind.studio', role: 'Member', initial: 'P' },
];

function MemberRow({ name, email, role, initial }) {
  return (
    <li className="flex items-center gap-[10px] rounded-card border border-line bg-chip px-control py-control">
      <span className="flex size-avatar shrink-0 items-center justify-center rounded-pill bg-line text-sm font-medium text-ink">
        {initial}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-ink">{name}</span>
        <span className="truncate text-xs text-muted">{email}</span>
      </div>
      <span className="rounded-pill border border-line px-related py-tight text-xs text-muted">{role}</span>
    </li>
  );
}

export function App() {
  return (
    <main className="flex min-h-screen items-center justify-center p-stack">
      <section className="flex w-full max-w-panel flex-col gap-stack rounded-card border border-line bg-card p-stack">
        <header className="flex flex-col gap-tight">
          <h2 className="text-xl font-semibold text-ink">Members</h2>
          <p className="text-sm text-muted">3 of 5 seats · Northwind Studio</p>
        </header>
        <ul className="flex flex-col gap-related">
          {MEMBERS.map((m) => (
            <MemberRow key={m.email} {...m} />
          ))}
        </ul>
      </section>
    </main>
  );
}
