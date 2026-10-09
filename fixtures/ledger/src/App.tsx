import './styles.css';
export function App() {
  function Nested() { return <div className="gap-10" />; }
  return <>
    <div className="gap-10" />
    <div className="gap-10" />
    <div style={{ gap: 10, padding: '10px' }} />
    <div className="madeup-ledger-class" />
    <Nested />
  </>;
}
