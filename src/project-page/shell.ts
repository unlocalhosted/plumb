import { projectName } from './system.js';

const escape = (text: string): string => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * The page the command opens: a shell that loads the project page module and hands it your numbers.
 * The session's token is written into the body, never into a URL. The server only answers this request for the
 * person's own tab on loopback (server.ts), so another site open in the browser can't read it.
 */
export async function pageShell(root: string, token: string): Promise<string> {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(projectName(root))} · React Plumber</title>
<style>
  /* while the page's numbers load (seconds on a large app): one sentence, then the page draws over it in its shadow root */
  body { margin: 0; background: Canvas; color: CanvasText; font: 15px/1.5 system-ui, sans-serif; }
  :root { color-scheme: light dark; }
  .wait { min-height: 100vh; display: grid; place-content: center; text-align: center; gap: 6px; }
  .wait b { font-size: 18px; }
  .wait span { opacity: 0.7; }
  .wait i { justify-self: center; width: 10px; height: 10px; border-radius: 50%; background: currentColor; animation: wait 1.2s ease-in-out infinite; }
  @keyframes wait { 50% { opacity: 0.25; } }
  @media (prefers-reduced-motion: reduce) { .wait i { animation: none; } }
</style>
</head><body><div id="page"><div class="wait" role="status"><i></i><b>Reading ${escape(projectName(root))}…</b><span>A large app takes a few seconds.</span></div></div><script type="module">
  import { mountProjectPage } from '/__plumb/src/project-page.js';
  const get = (path) => fetch(path, { headers: { 'x-plumb-token': ${JSON.stringify(token)} } });
  const said = (title, line) => { const wait = document.querySelector('.wait'); if (wait) wait.innerHTML = '<b></b><span></span>', wait.querySelector('b').textContent = title, wait.querySelector('span').textContent = line; };
  const [data, tokens] = await Promise.all([get('/__plumb/system').then(async (r) => { const answer = await r.json(); if (!r.ok) throw new Error(answer?.error?.message ?? answer?.error ?? ('The server said ' + r.status + '.')); return answer; }),
    fetch('/__plumb/src/tokens.css').then(r => r.text())]).catch((err) => { said('Your app couldn’t be read.', String(err?.message ?? err) + ' The terminal that ran plumber says more.'); throw err; });
  // the page may write too (the system you settle on it): the same token, sent as a header
  const post = (path, body) => fetch(path, { method: 'POST', headers: { 'x-plumb-token': ${JSON.stringify(token)}, 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then(async (r) => { const answer = await r.json().catch(() => ({})); if (!r.ok) throw new Error(answer?.error?.message ?? (typeof answer?.error === 'string' ? answer.error : undefined) ?? answer?.message ?? ('The server said ' + r.status + '.')); return answer; });
  mountProjectPage(document.getElementById('page'), data, tokens, { post });
</script></body></html>
`;
}
