import { useState } from 'react';

// ---------- icons ----------
function Icon({ children, size = 16, stroke = 2, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}
const Home = (p) => <Icon {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></Icon>;
const Folder = (p) => <Icon {...p}><path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></Icon>;
const Users = (p) => <Icon {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0 1 14 0" /><path d="M17 4a4 4 0 0 1 0 8" /><path d="M22 21a6 6 0 0 0-4-5.6" /></Icon>;
const Chart = (p) => <Icon {...p}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></Icon>;
const Settings = (p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></Icon>;
const Search = (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Icon>;
const Plus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
const Bell = (p) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 21a2 2 0 0 0 4 0" /></Icon>;
const Check = (p) => <Icon {...p}><path d="m5 12 5 5L20 7" /></Icon>;
const Clock = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>;
const Arrow = (p) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;
const Dots = (p) => <Icon {...p}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></Icon>;
const Flag = (p) => <Icon {...p}><path d="M4 22V4" /><path d="M4 4h13l-2 4 2 4H4" /></Icon>;
const Message = (p) => <Icon {...p}><path d="M21 12a8 8 0 0 1-12 7l-5 1 1-4.5A8 8 0 1 1 21 12Z" /></Icon>;

// ---------- sidebar ----------
function NavItem({ icon, label, active, count }) {
  return (
    <a href="#" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${active ? 'bg-accent-soft text-accent font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
      {icon}
      <span className="flex-1">{label}</span>
      {count ? <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{count}</span> : null}
    </a>
  );
}

function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-gray-200 bg-white p-4 flex flex-col gap-6">
      <div className="flex items-center gap-2 px-2">
        <div className="w-7 h-7 rounded-md bg-accent text-white flex items-center justify-center font-bold text-sm">T</div>
        <span className="font-semibold text-[15px]">Tally</span>
      </div>
      <nav className="flex flex-col gap-1">
        <NavItem icon={<Home size={18} />} label="Overview" active />
        <NavItem icon={<Folder size={18} />} label="Projects" count={12} />
        <NavItem icon={<Users size={18} />} label="Team" />
        <NavItem icon={<Chart size={16} stroke={1.5} />} label="Reports" />
        <NavItem icon={<Settings size={18} />} label="Settings" />
      </nav>
      <div className="mt-auto rounded-xl bg-gray-50 p-3.5 border border-gray-200">
        <p className="text-[13px] font-medium text-gray-900">Upgrade to Pro</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">Unlimited projects, guests and reports for your whole team.</p>
        <button className="mt-3 w-full rounded-md bg-gray-900 text-white text-xs font-medium py-1.5">See plans</button>
      </div>
    </aside>
  );
}

// ---------- top bar ----------
function TopBar() {
  return (
    <header className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 h-9 w-80">
        <Search size={16} className="text-gray-400" />
        <input className="bg-transparent outline-none text-sm flex-1 placeholder:text-gray-400" placeholder="Search projects, tasks, people" />
        <kbd className="text-[10px] text-gray-400 border border-gray-300 rounded px-1">⌘K</kbd>
      </div>
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><Bell size={20} /></button>
        <button className="flex items-center gap-1.5 bg-accent text-white text-sm font-medium px-3.5 py-2 rounded-[10px]"><Plus size={16} stroke={2.5} />New project</button>
        <img alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' fill='%23d9c7f0'/%3E%3C/svg%3E" className="w-8 h-8 rounded-full" />
      </div>
    </header>
  );
}

// ---------- hero ----------
function Hero() {
  return (
    <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-500 text-white p-8 flex items-center justify-between">
      <div>
        <p className="text-sm text-indigo-100 uppercase tracking-wide">Sprint 14 · 6 days left</p>
        <h1 className="text-[40px] leading-tight font-bold mt-2">Good morning, Priya</h1>
        <p className="text-lg text-indigo-100 mt-2 max-w-xl">Your team closed 23 tasks this week. Three projects need a decision before Friday.</p>
        <div className="flex gap-3 mt-6">
          <button className="bg-white text-indigo-700 font-semibold px-5 py-2.5 rounded-lg text-sm">Review decisions</button>
          <button className="border border-white/40 text-white px-5 py-2.5 rounded-lg text-sm">View sprint board</button>
        </div>
      </div>
      <div className="hidden lg:flex flex-col items-end">
        <span className="text-6xl font-bold">78%</span>
        <span className="text-indigo-100 text-sm">of sprint goal done</span>
      </div>
    </section>
  );
}

// ---------- stats ----------
function Stat({ label, value, delta, good }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-semibold mt-1 text-gray-900">{value}</p>
      <p className={`text-xs mt-2 ${good ? 'text-green-600' : 'text-red-600'}`}>{delta}</p>
    </div>
  );
}

function Stats() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <Stat label="Open tasks" value="142" delta="▲ 12 since Monday" />
      <Stat label="Completed" value="23" delta="▲ 8% vs last week" good />
      <Stat label="Overdue" value="7" delta="▼ 2 since Monday" good />
      <Stat label="Cycle time" value="3.2d" delta="▲ 0.4d slower" />
    </div>
  );
}

// ---------- tasks ----------
const TASKS = [
  { title: 'Rewrite onboarding email sequence', project: 'Growth', due: 'Today', who: 'AK', priority: 'High', done: false },
  { title: 'Fix timezone bug in weekly digest', project: 'Platform', due: 'Tomorrow', who: 'JM', priority: 'High', done: false },
  { title: 'Draft Q3 roadmap for review', project: 'Planning', due: 'Thu', who: 'PS', priority: 'Medium', done: true },
  { title: 'Audit colour contrast on billing pages', project: 'Design system', due: 'Fri', who: 'LW', priority: 'Low', done: false },
  { title: 'Interview three churned customers', project: 'Research', due: 'Next week', who: 'RT', priority: 'Medium', done: false },
];

function Priority({ level }) {
  const cls = level === 'High' ? 'bg-red-100 text-red-700' : level === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600';
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${cls}`}>{level}</span>;
}

function TaskRow({ task }) {
  return (
    <li className="flex items-center gap-3 py-3 px-4 border-b border-gray-100 last:border-0">
      <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${task.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
        {task.done ? <Check size={12} stroke={3} /> : null}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] font-medium truncate ${task.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
        <p className="text-[13px] text-gray-500 mt-0.5">{task.project}</p>
      </div>
      <Priority level={task.priority} />
      <span className="flex items-center gap-1 text-xs text-gray-500 w-24"><Clock size={14} />{task.due}</span>
      <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-semibold flex items-center justify-center">{task.who}</span>
      <button className="text-gray-400 hover:text-gray-600"><Dots size={18} /></button>
    </li>
  );
}

function Tasks() {
  const [tab, setTab] = useState('mine');
  return (
    <section className="bg-surface rounded-card shadow-rest">
      <div className="flex items-center justify-between px-s4 pt-s4 pb-s3">
        <h2 className="text-title font-semibold text-fg">Tasks</h2>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {['mine', 'team', 'all'].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 text-[13px] rounded-md capitalize ${tab === t ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>{t}</button>
          ))}
        </div>
      </div>
      <ul>{TASKS.map((t) => <TaskRow key={t.title} task={t} />)}</ul>
      <div className="px-4 py-3 border-t border-gray-100">
        <a href="#" className="text-sm text-accent font-medium inline-flex items-center gap-1">View all tasks <Arrow size={14} /></a>
      </div>
    </section>
  );
}

// ---------- activity ----------
const ACTIVITY = [
  { who: 'Jonas', what: 'commented on', target: 'Fix timezone bug in weekly digest', when: '12m ago', icon: 'message' },
  { who: 'Amara', what: 'completed', target: 'Set up staging database', when: '1h ago', icon: 'check' },
  { who: 'Lin', what: 'flagged', target: 'Billing page redesign', when: '3h ago', icon: 'flag' },
  { who: 'Rafa', what: 'commented on', target: 'Draft Q3 roadmap for review', when: 'Yesterday', icon: 'message' },
];

function Activity() {
  return (
    <section className="bg-white rounded-[14px] border border-[#e5e7eb] p-[18px]">
      <h3 className="text-[16px] font-semibold text-[#111827] mb-[14px]">Recent activity</h3>
      <div className="flex flex-col gap-[14px]">
        {ACTIVITY.map((a) => (
          <div key={a.target + a.when} className="flex gap-[10px]">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-[#f3f4f6] flex items-center justify-center text-[#6b7280] shrink-0">
              {a.icon === 'message' ? <Message size={15} stroke={1.75} /> : a.icon === 'check' ? <Check size={15} stroke={1.75} /> : <Flag size={15} stroke={1.75} />}
            </div>
            <div>
              <p className="text-[13.5px] text-[#374151] leading-[1.45]"><span className="font-semibold text-[#111827]">{a.who}</span> {a.what} <span className="font-medium">{a.target}</span></p>
              <p className="text-[11.5px] text-[#9ca3af] mt-[2px]">{a.when}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- team ----------
const TEAM = [
  { name: 'Amara Kone', role: 'Engineering lead', load: 82, status: 'On track' },
  { name: 'Jonas Meyer', role: 'Backend engineer', load: 96, status: 'At risk' },
  { name: 'Lin Wei', role: 'Product designer', load: 54, status: 'On track' },
  { name: 'Rafa Torres', role: 'Researcher', load: 31, status: 'Available' },
];

function Team() {
  return (
    <section className="bg-white rounded-lg border border-gray-200">
      <div className="p-5 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Team workload</h2>
          <p className="text-sm text-gray-500">Who has room this sprint, and who is stretched.</p>
        </div>
        <button className="text-sm border border-gray-300 rounded-md px-3 py-1.5 text-gray-700">Manage team</button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-gray-400 tracking-wider">
            <th className="px-5 py-2.5 font-medium">Member</th>
            <th className="px-5 py-2.5 font-medium">Load</th>
            <th className="px-5 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {TEAM.map((m) => (
            <tr key={m.name} className="border-t border-gray-100">
              <td className="px-5 py-3">
                <p className="font-medium text-gray-900">{m.name}</p>
                <p className="text-xs text-gray-500">{m.role}</p>
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-28 rounded-full bg-gray-100"><div className={`h-1.5 rounded-full ${m.load > 90 ? 'bg-red-500' : 'bg-accent'}`} style={{ width: `${m.load}%` }} /></div>
                  <span className="text-xs text-gray-600 tabular-nums">{m.load}%</span>
                </div>
              </td>
              <td className="px-5 py-3">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${m.status === 'At risk' ? 'bg-red-50 text-red-600' : m.status === 'Available' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-700'}`}>{m.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ---------- projects ----------
const PROJECTS = [
  { name: 'Billing redesign', desc: 'New invoices, proration and a clearer plan picker.', progress: 64, due: 'Jun 28', members: 5 },
  { name: 'Mobile onboarding', desc: 'Cut the first-run flow from seven screens to three.', progress: 38, due: 'Jul 12', members: 3 },
  { name: 'Search v2', desc: 'Typo tolerance, filters and results that load as you type.', progress: 91, due: 'Jun 20', members: 4 },
];

function ProjectCard({ p }) {
  return (
    <div className="bg-surface rounded-card p-s4 shadow-rest flex flex-col gap-s3">
      <div className="flex items-start justify-between">
        <h3 className="text-title font-semibold">{p.name}</h3>
        <span className="text-caption text-muted">{p.due}</span>
      </div>
      <p className="text-body text-muted">{p.desc}</p>
      <div className="h-2 rounded-full bg-sunken"><div className="h-2 rounded-full bg-accent" style={{ width: `${p.progress}%` }} /></div>
      <div className="flex items-center justify-between text-caption text-muted">
        <span className="flex items-center gap-s1"><Users size={14} />{p.members} people</span>
        <span>{p.progress}%</span>
      </div>
    </div>
  );
}

// ---------- page ----------
export function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="p-6 flex flex-col gap-6 max-w-[1200px]">
          <Hero />
          <Stats />
          <div className="grid grid-cols-3 gap-5">
            <div className="col-span-2 flex flex-col gap-5">
              <Tasks />
              <Team />
            </div>
            <div className="flex flex-col gap-4">
              <Activity />
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-heading font-semibold">Projects</h2>
                  <a href="#" className="text-body text-accent">See all</a>
                </div>
                <div className="flex flex-col gap-s3">{PROJECTS.map((p) => <ProjectCard key={p.name} p={p} />)}</div>
              </section>
            </div>
          </div>
          <footer className="text-center text-xs text-gray-400 py-4">Tally · Made for teams that ship · <a href="#" className="underline">Changelog</a></footer>
        </main>
      </div>
    </div>
  );
}
