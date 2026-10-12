import './styles.css';
export function App() {
  return <main className="bg-primary text-muted-foreground fixture-use">
    <p className="text-xs text-sm text-lg text-2xl text-5xl">Theme type scale</p>
    <p className="font-mono font-serif font-medium">Theme faces and weight</p>
    <button className="transition-all">Theme transition</button>
    <span className="transition-opacity">Theme fade</span>
    <section className="p-[13px]" style={{ color: '#ff0000' }}>Deliberate drift</section>
  </main>;
}
