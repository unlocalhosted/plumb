// Sloppy screens from unslop-ui's own examples (MIT, Felipe Basurto), in JSX, plus a surface screen; the last
// screen is their "clean" one, where nothing should be said.
const Icon = (p) => <svg viewBox="0 0 16 16" width="16" height="16" {...p}><circle cx="8" cy="8" r="6" fill="currentColor" /></svg>;
const Card = ({ children }) => <div className="grid gap-1 rounded-lg border p-4">{children}</div>;
const CardTitle = ({ children }) => <h3 className="text-sm font-medium">{children}</h3>;
const CardDescription = ({ children }) => <p className="text-sm text-slate-500">{children}</p>;
const Badge = ({ children }) => <span className="rounded-full bg-emerald-100 px-2 text-xs">{children}</span>;

function Landing() {
  return (
    <div id="landing">
      <header className="flex items-center justify-between p-6">
        <span className="font-bold">Ledger</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>Live · v2.4 · All systems operational</span>
        </div>
      </header>
      <section className="px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-widest text-indigo-500">Introducing Ledger</p>
        <h1 className="text-5xl font-bold">Finance. Simplified. Finally.</h1>
        <p className="mt-4 text-lg">The all-in-one platform that helps modern teams seamlessly manage their money — without the hassle.</p>
        <a href="/signup" className="mt-8 inline-block rounded bg-indigo-600 px-6 py-3 text-white">🚀 Get started</a>
        <p className="mt-2 text-sm text-slate-500">Click the button above to create your free account in seconds.</p>
      </section>
      <section className="grid grid-cols-3 gap-6 px-6">
        <div>
          <span className="font-mono text-sm">01 //</span>
          <p className="text-xs uppercase tracking-wider">Feature</p>
          <h3 className="text-lg">Smart sync <span className="rounded-full bg-indigo-100 px-2 text-xs">NEW</span></h3>
          <p>Our smart sync feature automatically keeps your files in sync across all of your devices.</p>
        </div>
        <div>
          <span className="font-mono text-sm">02 //</span>
          <p className="text-xs uppercase tracking-wider">Feature</p>
          <h3 className="text-lg">✨ AI receipts <span className="rounded-full bg-indigo-100 px-2 text-xs">AI</span></h3>
          <p>Leverage cutting-edge AI to effortlessly capture receipts — so you can focus on what matters.</p>
        </div>
        <div>
          <span className="font-mono text-sm">03 //</span>
          <p className="text-xs uppercase tracking-wider">Feature</p>
          <h3 className="text-lg">Card controls</h3>
          <p>This section explains how card controls work (you can set limits per card).</p>
        </div>
      </section>
    </div>
  );
}

function Hero() {
  return (
    <section id="hero" className="mt-16 p-6">
      <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 px-3 py-1 text-xs font-medium uppercase tracking-widest text-sky-700">
        <span className="size-2 rounded-full bg-sky-500" />
        Polar expeditions
      </p>
      <h1 className="text-6xl font-semibold">Discover Untamed Wilderness</h1>
      <ul className="mt-6 grid gap-1">
        {['Svalbard', 'Greenland'].map((name) => (
          <li key={name}>
            <a href={`/${name}`} className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-sky-100"><Icon className="size-4" /></span>
              <span><span className="block font-medium">{name}</span><span className="block text-sm text-slate-500">The land of fire and ice</span></span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Dashboard() {
  return (
    <main id="dashboard" className="grid gap-6 p-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">Overview</p>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-slate-500">A real-time overview of your key business metrics, all in one place.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Card><CardTitle>💰 Total revenue</CardTitle><strong>$48,200</strong><span className="text-green-600">▲ 12% up</span><CardDescription>Revenue grew 12% compared to last month, showing strong momentum.</CardDescription></Card>
        <Card><CardTitle>👥 Active users</CardTitle><strong>1,204</strong><span className="flex items-center gap-1 text-xs"><span className="size-2 rounded-full bg-emerald-500 animate-ping" />Live</span><CardDescription>This card shows the number of users active right now (updates in real time).</CardDescription></Card>
        <Card><CardTitle>📉 Churn</CardTitle><strong>2.1%</strong><span className="text-xs">Last 30 days · All plans · Excl. trials</span></Card>
      </div>
      <figure className="rounded-lg border p-4">
        <h2 className="font-medium">Bar chart of monthly revenue</h2>
        <p className="text-xs text-slate-500">Each bar represents one month. Hover for details.</p>
        <svg viewBox="0 0 120 40" className="h-24 w-full"><rect x="10" y="20" width="10" height="20" fill="#6366f1" /><rect x="30" y="10" width="10" height="30" fill="#6366f1" /></svg>
      </figure>
    </main>
  );
}

function Deploys() {
  const connection = { status: 'online' }, deploys = [{ id: 'a', name: 'api', isLive: true }, { id: 'b', name: 'web', isLive: false }];
  return (
    <section id="deploys" className="grid gap-6 p-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-sky-500">Deployments</p>
        <h2 className="text-xl font-semibold">🚀 Recent deploys <span className="rounded-full bg-sky-100 px-2 text-xs">NEW</span></h2>
        <p className="text-sm text-slate-500">This section lists your most recent deployments (refreshes automatically).</p>
      </div>
      {connection.status === 'online' && <span aria-label="Connected" className="size-2 rounded-full bg-emerald-500" />}
      <ol className="grid gap-2">
        <li><span className="font-mono">01</span> Install the CLI</li>
        <li><span className="font-mono">02</span> Log in</li>
        <li><span className="font-mono">03</span> Deploy</li>
      </ol>
      {deploys.map((deploy) => (
        <article key={deploy.id} className="flex items-center gap-2">
          <h3>{deploy.name}</h3>
          {deploy.isLive && <Badge>Live</Badge>}
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs">Healthy</span>
        </article>
      ))}
    </section>
  );
}

function Surface() {
  return (
    <section id="surface" className="grid gap-6 p-8">
      <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 p-10 text-white">
        <h2 className="text-4xl font-black">Ship faster</h2>
        <p className="bg-gradient-to-r from-sky-400 to-fuchsia-500 bg-clip-text text-xl font-bold text-transparent">Built different.</p>
        <button className="mt-4 rounded-lg bg-white px-4 py-2 text-purple-700 shadow-[0_0_30px_rgba(168,85,247,0.6)]">Start now</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <a href="/a" className="block rounded-xl border p-6 transition-all duration-300 hover:scale-105">
          <h3 className="font-semibold">Projects</h3><p className="text-sm">Every project you own.</p>
        </a>
        <div className="rounded-xl bg-gradient-to-b from-slate-50 to-slate-100 p-6"><h3 className="font-semibold">Within one hue</h3><p className="text-sm">A tone shift, which is fine.</p></div>
      </div>
    </section>
  );
}

// unslop-ui's clean screen: nothing here should be said
function Members() {
  const members = [{ id: '1', name: 'Ada', role: 'Admin', isOwner: true, lastSeen: null }, { id: '2', name: 'Lin', role: 'Editor', isOwner: false, lastSeen: 'Today' }];
  return (
    <main id="clean" className="grid gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Members</h1>
        <button className="rounded bg-slate-900 px-3 py-1 text-white">Invite</button>
      </header>
      <table>
        <thead><tr><th className="text-xs uppercase tracking-wide">Name</th><th className="text-xs uppercase tracking-wide">Role</th><th className="text-xs uppercase tracking-wide">Last seen</th></tr></thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}><td>{m.name}</td><td>{m.role}{m.isOwner && <span className="ml-2 rounded bg-slate-100 px-1.5 text-xs">Owner</span>}</td><td>{m.lastSeen ?? '—'}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

export function App() {
  return (<><Landing /><Hero /><Dashboard /><Deploys /><Surface /><Members /></>);
}
