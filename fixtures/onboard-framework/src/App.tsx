import './index.css';

export function App() {
  return (
    <main className="flex flex-col gap-3 p-6 text-sm text-gray-900">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <ul className="flex flex-col gap-3">
        <li className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-base text-gray-700">Website</span>
        </li>
        <li className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-base text-gray-700">Mobile app</span>
        </li>
      </ul>
      <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">New project</button>
      <button className="rounded-lg bg-blue-600 p-[13px] text-sm text-white">Import</button>
    </main>
  );
}
