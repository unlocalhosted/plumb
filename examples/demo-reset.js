// "Reset demo": a small button in the corner of an example app that puts its files back to what is committed, so a
// fix tried on it is undone in one click. A Vite plugin: the dev server answers POST /__demo/reset by running
// git checkout on the app's own folder (src, index.html, the theme), then the page reloads. Used by examples/*.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const BUTTON = `<button id="demo-reset" type="button" title="Put this app's files back the way they are committed"
  style="position:fixed;left:14px;bottom:14px;z-index:2147483000;font:600 12px/1 system-ui;padding:8px 12px;border-radius:10px;border:0;
  background:#1c1b19;color:#fff;box-shadow:0 4px 14px -6px rgb(0 0 0 / .45);cursor:pointer">↺ Reset demo</button>
<script>document.getElementById('demo-reset').onclick=async(e)=>{const b=e.currentTarget;b.disabled=true;b.textContent='Resetting…';
const r=await fetch('/__demo/reset',{method:'POST'}).then(x=>x.json()).catch(()=>({ok:false}));
b.textContent=r.ok?'Reset · reloading':'Couldn’t reset';if(r.ok)setTimeout(()=>location.reload(),300);else setTimeout(()=>{b.disabled=false;b.textContent='↺ Reset demo'},1600);};</script>`;

export function demoReset() {
  let root = process.cwd();
  return {
    name: 'demo-reset',
    configResolved(config) { root = config.root; },
    configureServer(server) {
      server.middlewares.use('/__demo/reset', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
        try {
          // only the app's own files go back: src and index.html under its folder, never anything else in the repo
          await run('git', ['checkout', '--', 'src', 'index.html'], { cwd: root });
          res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true }));
        } catch (error) { res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: false, why: String(error?.message ?? error) })); }
      });
    },
    transformIndexHtml: { order: 'post', handler: (html) => html.replace('</body>', `${BUTTON}</body>`) },
  };
}
