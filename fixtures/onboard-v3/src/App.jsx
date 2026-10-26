import './index.css';

export function App() {
  return (
    <main className="flex flex-col gap-4 bg-surface p-6 text-body">
      <h1 className="text-title font-semibold text-primary">Projects</h1>
      <button className="rounded-field bg-primary px-4 py-2 text-caption text-surface">New project</button>
    </main>
  );
}
