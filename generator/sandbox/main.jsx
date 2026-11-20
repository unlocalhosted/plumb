// Renders one harvested part (?part=<id>), in an error boundary, on a neutral stage. window.__sandbox says how it went.
import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
const entries = import.meta.glob('./parts/*/entry.jsx');
class Guard extends Component { state = { error: null }; static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(e) { window.__sandbox = { ok: false, error: String(e?.message ?? e).slice(0, 300) }; }
  render() { return this.state.error ? <p data-failed>{String(this.state.error.message ?? this.state.error)}</p> : this.props.children; } }
const id = new URLSearchParams(location.search).get('part');
const load = entries[`./parts/${id}/entry.jsx`];
const root = createRoot(document.getElementById('root'));
if (!load) { window.__sandbox = { ok: false, error: 'not installed' }; root.render(<p>not installed: {id}</p>); }
else load().then(({ default: Demo }) => { root.render(<StrictMode><div id="stage" data-stage><Guard><Demo /></Guard></div></StrictMode>); setTimeout(() => { window.__sandbox ??= { ok: !document.querySelector('[data-failed]') }; }, 800); })
  .catch((e) => { window.__sandbox = { ok: false, error: String(e?.message ?? e).slice(0, 300) }; root.render(<p data-failed>{String(e)}</p>); });
