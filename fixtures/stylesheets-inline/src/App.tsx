import './page.css';
import './reference.css';
const STYLE = { marginTop: -2, opacity: 0.5, msFlex: 2 } as const;
export function App({ c, rest }) {
  return <>
    <div className="page forgotten applied room-gap outer responsive mixed plain imported source-only embedded referenced" />
    <div style={{ gap: 10, lineHeight: 1.5, '--x': '13px', color: c }} />
    <Button style={{ ...rest }} />
    <div style={STYLE} />
    <div style={{ ['paddingTop']: 0, WebkitLineClamp: 2, strokeWidth: 3 }} />
    <style>{`
      .embedded { gap: 12px; }
      @media (pointer: fine) { .embedded:hover { opacity: 0.5; } }
    `}</style>
    <style>{'.escaped {\n gap: 5px; }'}</style>
  </>;
}
