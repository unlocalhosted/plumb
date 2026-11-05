// Runs the nextapps corpus: per app, per bundler (its own, then the other), a stamped run and a plain run, each a
// real `next dev` on port 0 killed with its tree. Rows are tagged corpus=<app>, host=<bundler>-<stamped|plain>.
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { freeMemoryPercent, workRoot } from './lib.mjs';
import { measureWithRetry } from './measure.mjs';
import { nextApps, prepareCopy, startFontMock, startNextApp, stopFontMock, waitForMemory } from './nextapps.mjs';

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// A route that answers 5xx is not a page; the body's first lines say why (a Next error page).
async function preflight(url, lastError = () => null) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(600_000) });
    if (res.status < 500) return null;
    const body = (await res.text()).replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ');
    // the page's own error text is not in the 500 body (Next sends it to the dev server log); keep the server's last error line
    const why = /Passing props on "Fragment"[^.]*\./.exec(body)?.[0] ?? 'dev server log: ' + (lastError() ?? 'no error line');
    return `HTTP ${res.status}: ${why}`;
  } catch (error) { return 'no answer: ' + error.message; }
}

export async function runNextApps(browser, keys, opts, sink) {
  const destRoot = join(workRoot, `nextapps-${process.pid}`);
  await mkdir(destRoot, { recursive: true });
  sink.nextapps ??= {};
  await startFontMock();
  try {
    for (const key of keys) {
      const def = nextApps[key];
      const info = sink.nextapps[key] = { name: def.name, sha: def.sha, next: def.next, ownBundler: def.ownBundler, note: def.note, edits: [], runs: [], notRun: [] };
      let app;
      try {
        await waitForMemory(log);
        ({ app, edits: info.edits } = await prepareCopy(key, destRoot));
      } catch (error) { info.notRun.push({ what: 'copy', why: String(error.message).slice(0, 600) }); log(key, 'COPY FAILED', error.message); continue; }
      const other = def.ownBundler === 'turbopack' ? 'webpack' : 'turbopack';
      for (const bundler of opts.bundlers ? [def.ownBundler, other].filter((b) => opts.bundlers.includes(b)) : [def.ownBundler, other]) {
        // stamped first. If full stamping leaves no route rendering, the run is recorded as failed and repeated with
        // host tags only, which then serves as the ground truth.
        let fullStampWorks = true;
        for (const mode of ['full', 'host', 'plain']) {
          if (mode === 'host' && fullStampWorks) continue;
          const stamp = mode === 'plain' ? false : mode;
          const host = mode === 'plain' ? `${bundler}-plain` : `${bundler}-stamped`;
          const run = { host, mode, startMs: null, routes: [] };
          info.runs.push(run);
          let server;
          try {
            await waitForMemory(log);
            await rm(join(app, '.next'), { recursive: true, force: true });
            server = await startNextApp(key, app, bundler, stamp);
            run.startMs = Math.round(server.startMs);
            log(key, host, mode, 'up at', server.url);
            // the overlay's own script must be served, or no page can ever report ready: fail the run at once
            const client = await fetch(new URL('/__plumb/client.js', server.url)).catch((e) => ({ status: 0, text: async () => e.message }));
            if (client.status !== 200) throw new Error(`/__plumb/client.js answered ${client.status}: ` + (server.logs().replace(/\x1b\[[0-9;]*m/g, '').match(/(?:⨯|Error)[^\n]{0,240}/)?.[0] ?? ''));
            let failedInRow = 0;
            for (const route of def.routes.filter((r) => !opts.routes || opts.routes.includes(r))) {
              if (failedInRow >= 3) { sink.screenFailures.push({ host: `${key} ${host} ${mode}`, screen: route, why: 'skipped: the 3 routes before it failed on this run' }); continue; }
              const t = performance.now();
              const url = new URL(route, server.url).href;
              const probe = await preflight(url, () => /(?:⨯|Error:)[^\n]{0,200}(?:\n[^\n]{0,200}){0,3}/.exec(server.logs().slice(-3000).replace(/\x1b\[[0-9;]*m/g, ''))?.[0]?.replace(/\s+/g, ' '));
              const result = probe ? { failed: probe } : await measureWithRetry(browser, url, { rootSelector: null, cap: opts.cap, deadlineMs: 420_000, localOnly: true });
              failedInRow = result.failed ? failedInRow + 1 : 0;
              if (result.failed) { sink.screenFailures.push({ host: `${key} ${host} ${mode}`, screen: route, why: result.failed }); run.routes.push({ route, failed: result.failed }); log(key, host, mode, route, 'FAILED', result.failed.slice(0, 160)); continue; }
              sink.rows.push(...result.rows.map((r) => ({ corpus: key, host, mode, screen: route, ...r })));
              run.routes.push({ route, total: result.total, sampled: result.rows.length, loadMs: Math.round(result.loadMs), pageErrors: result.pageErrors.slice(0, 5) });
              log(key, host, mode, route, `${result.rows.length}/${result.total} elements, ${Math.round(performance.now() - t)} ms`);
            }
            if (mode === 'full' && !run.routes.some((r) => !r.failed)) { fullStampWorks = false; run.rowsDiscarded = 0; }
          } catch (error) {
            run.failed = String(error.message).slice(0, 800);
            if (mode === 'full') fullStampWorks = false;
            info.notRun.push({ what: `${bundler} ${mode}`, why: run.failed });
            log(key, host, mode, 'FAILED', run.failed.slice(0, 300));
          } finally {
            await server?.stop();
            if (server) run.logTail = server.logs().slice(-1500);
          }
        }
      }
      await rm(join(destRoot, def.clone), { recursive: true, force: true });
    }
  } finally { stopFontMock(); await rm(destRoot, { recursive: true, force: true }).catch(() => {}); }
}
export { freeMemoryPercent };
