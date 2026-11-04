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
</head><body><div id="page"></div><script type="module">
  import { mountProjectPage } from '/__plumb/src/project-page.js';
  const get = (path) => fetch(path, { headers: { 'x-plumb-token': ${JSON.stringify(token)} } });
  const [data, tokens] = await Promise.all([get('/__plumb/system').then(r => r.json()),
    fetch('/__plumb/src/tokens.css').then(r => r.text())]);
  mountProjectPage(document.getElementById('page'), data, tokens);
</script></body></html>
`;
}
