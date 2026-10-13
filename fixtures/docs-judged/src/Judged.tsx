import './styles.css';

export function Judged() {
  return (
    <section>
      <div className="gap-[13px]">Arbitrary class</div>
      <div className="judged-apply">Applied class</div>
      <div style={{ gap: 13 }}>Inline style</div>
      <div className="judged-css">Plain declaration</div>
      <div className="gap-3">On-scale class</div>
    </section>
  );
}
