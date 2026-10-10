// A settings page with the drift a real one collects: hardcoded spacing, an off-scale radius, a hand-written shadow.
function SyncRow({ title, detail, action }) {
  return (
    <div id="sync-row" className="flex items-center gap-[10px] py-[10px] px-[14px] rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.12)]">
      <span className="size-8 shrink-0 rounded-full bg-ground" />
      <div className="flex min-w-0 flex-1 flex-col gap-s1">
        <span className="text-[13.5px] font-medium">{title}</span>
        <span className="text-small text-ink-muted">{detail}</span>
      </div>
      <button className="h-8 rounded-control px-s3 text-small font-medium shadow-[inset_0_0_0_1px_var(--color-rule)]">{action}</button>
    </div>
  );
}

function Chip({ children }) {
  return <span id="beta-chip" className="inline-flex items-center gap-[3px] rounded-[5px] bg-accent/10 px-[7px] py-[2px] text-[11px] font-semibold text-accent">{children}</span>;
}

export function App() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-s6 px-s4 py-s6">
      <header className="flex items-center gap-s2">
        <h1 className="text-body font-semibold">Integrations</h1>
        <Chip>Beta</Chip>
      </header>
      <section className="flex flex-col gap-s3">
        <SyncRow title="Sync calendar" detail="Last run 4 minutes ago" action="Run now" />
        <div className="flex items-center gap-s3 rounded-card bg-surface px-s4 py-s3 shadow-rest">
          <span className="size-8 shrink-0 rounded-full bg-ground" />
          <div className="flex flex-1 flex-col gap-s1">
            <span className="text-body font-medium">Import contacts</span>
            <span className="text-small text-ink-muted">Every night at 2:00</span>
          </div>
          <button className="h-8 rounded-control px-s3 text-small font-medium shadow-[inset_0_0_0_1px_var(--color-rule)]">Edit</button>
        </div>
      </section>
    </main>
  );
}
