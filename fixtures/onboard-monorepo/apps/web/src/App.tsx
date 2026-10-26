import './index.css';

export function App() {
  return (
    <main className="flex flex-col gap-3 p-6 text-sm">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <ul className="flex flex-col gap-3">
        <li className="rounded-lg border p-4"><span className="text-base">Website</span></li>
        <li className="rounded-lg border p-4"><span className="text-base">Mobile app</span></li>
      </ul>
      <button className="rounded-lg px-4 py-2 text-sm">New project</button>
    </main>
  );
}
