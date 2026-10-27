const words = Array.from({ length: 8 }, (_, i) => 'Item ' + i);
const Stack = ({ id, gap }) => <div id={id} className={'flex flex-col ' + gap}>{['a', 'b', 'c'].map((n) => <span key={n} className="text-body text-ink">{n}</span>)}</div>;
export function App() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-s6 px-s4 py-s6">
      <div className="grid grid-cols-4 gap-s4">
        {words.map((w) => <p key={'r' + w} className="text-body font-normal text-ink">{w}</p>)}
        {words.map((w) => <p key={'s' + w} className="text-body font-semibold text-ink-muted">{w}</p>)}
        {words.map((w) => <p key={'b' + w} className="text-body font-bold text-[#8a8f98]">{w}</p>)}
        <p id="weight-levels-bad" className="text-body font-light text-ink">Light</p>
        <p id="weight-levels-good" className="text-body font-normal text-ink">Normal</p>
        <p id="grey-levels-bad" className="text-body font-normal text-[#c4c7cc]">Pale</p>
        <p id="grey-levels-good" className="text-body font-normal text-ink">Ink</p>
      </div>
      <div className="grid grid-cols-4 gap-s4">
        <Stack gap="gap-s4" /><Stack gap="gap-s4" /><Stack gap="gap-s4" /><Stack gap="gap-s4" />
        <Stack gap="gap-s2" /><Stack gap="gap-s2" />
        <Stack id="rhythm-bad" gap="gap-[20px]" />
        <Stack id="rhythm-good" gap="gap-s4" />
      </div>
    </main>
  );
}
