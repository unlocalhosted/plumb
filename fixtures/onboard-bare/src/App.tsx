import './styles.css';

export function App() {
  return (
    <main style={{ padding: 20, maxWidth: 640 }}>
      <h1>Projects</h1>
      <section className="card">
        <h2>Website</h2>
        <p>Last deployed yesterday.</p>
        <div className="row">
          <button className="button">Open</button>
          <button className="button ghost">Share</button>
          <span className="badge" style={{ marginLeft: 6 }}>Live</span>
        </div>
      </section>
      <section className="card" style={{ background: '#fafafa', padding: 18 }}>
        <h2 style={{ fontSize: 17, color: '#333' }}>Mobile app</h2>
        <p style={{ fontSize: 14 }}>Waiting for review.</p>
        <small style={{ color: '#999' }}>2 days ago</small>
      </section>
    </main>
  );
}
