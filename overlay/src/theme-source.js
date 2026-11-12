/* ─────────────────────────────────────────────────────────
 * THEME SOURCE · React Plumber overlay
 *
 * The project's own stylesheets as written, for what the page's CSS leaves out: Tailwind emits only the utilities a
 * page uses, so a theme's named speed or state nothing uses yet is in the source alone. Vite hands any file out as text
 * (?raw); the entry stylesheets are the ones it injected (data-vite-dev-id, outside node_modules), and their relative
 * @imports are followed. On other hosts: nothing (callers fall back to the page's CSS).
 *
 *  sourceTexts() → [{ path, text }], read once per page
 * ───────────────────────────────────────────────────────── */

let TEXTS = null;
export function sourceTexts() {
  if (TEXTS) return TEXTS;
  TEXTS = (async () => {
    const out = [], seen = new Set();
    const read = async (path, depth) => {
      if (seen.has(path) || depth > 3) return;
      seen.add(path);
      let text;
      try {
        const r = await fetch(`/@fs${path}?raw`);
        if (!r.ok) return;
        text = JSON.parse(/export default (".*")/s.exec(await r.text())?.[1] ?? '""');
      } catch { return; }
      out.push({ path, text });
      for (const m of text.matchAll(/@import\s+["'](\.{1,2}\/[^"']+\.css)["']/g)) await read(new URL(m[1], `file://${path}`).pathname, depth + 1);
    };
    for (const s of document.querySelectorAll('style[data-vite-dev-id]')) {
      const id = s.getAttribute('data-vite-dev-id');
      if (id?.startsWith('/') && /\.css$/.test(id) && !id.includes('/node_modules/')) await read(id, 0);
    }
    return out;
  })();
  return TEXTS;
}
