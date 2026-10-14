import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function requestEvidence(url) {
  const started = performance.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  return { status: response.status, ok: response.ok, ms: performance.now() - started, body: await response.json() };
}
export const hasExactEdit = rows => rows.some(row => row.reading?.marks?.some(mark => mark.choices?.length === 1 && mark.choices[0].edit));

// Closed by default. Only the selected page's one exact overlay request can consume this allowance.
export function writeGate(origin, failures) {
  let allowance, consumed = 0;
  return {
    arm(value) { assert.equal(consumed, 0, 'Only one apply per app'); assert.equal(allowance, undefined); allowance = value; },
    disarm() { allowance = undefined; },
    get consumed() { return consumed; },
    async route(route) {
      const request = route.request(), url = new URL(request.url());
      if (request.method() === 'GET' && !/\/(apply|try|refresh)$/.test(url.pathname)) return route.continue();
      let body;
      try { body = request.postDataJSON(); } catch { /* A malformed write never passes. */ }
      if (allowance && consumed === 0 && request.method() === 'POST' && url.origin === origin
        && url.pathname === '/__plumb/apply' && !url.search && request.frame().page() === allowance.page
        && body?.file === allowance.file && body.hash === allowance.hash && body.edits?.length === 1
        && body.edits[0].id === allowance.id) {
        consumed++; allowance = undefined;
        return route.continue();
      }
      failures.push(`Write request blocked: ${request.method()} ${request.url()}`);
      return route.abort();
    },
  };
}

async function checkCLI(app, scratch, file, mark) {
  const args = ['--import', join(repo, 'bench/apps/readonly.mjs'), join(app.toolRoot ?? repo, 'dist/cli.js'),
    'check', '--json', '--root', app.root, ...(app.config ? ['--config', app.config] : [])];
  // Real app reports can exceed execFile's buffer limit. Stream the complete CLI JSON
  // into disposable scratch; retain only the selected site's evidence in the app report.
  const output = join(scratch, 'write-check.json'), handle = await fs.open(output, 'w');
  let result;
  try {
    result = await new Promise((resolveRun, reject) => {
      let stderr = '';
      const child = spawn(process.execPath, args, {
        cwd: app.app, timeout: 120_000, killSignal: 'SIGKILL', stdio: ['ignore', handle.fd, 'pipe'],
        env: { ...process.env, TMPDIR: scratch, XDG_CACHE_HOME: join(scratch, 'xdg-cache'), XDG_CONFIG_HOME: join(scratch, 'xdg-config'),
          PLUMB_CACHE_DIR: join(scratch, 'write-check-cache'), PLUMB_VERIFY_SCRATCH: scratch, PLUMB_VERIFY_APP: JSON.stringify(app) },
      });
      child.stderr.on('data', data => { stderr = (stderr + data).slice(-16_000); });
      child.once('error', reject);
      child.once('close', (code, signal) => {
        if (code !== 0 && code !== 1) reject(new Error(`plumb check failed (${code ?? signal}): ${stderr}`));
        else resolveRun({ exitCode: code, stderr });
      });
    });
  } finally { await handle.close(); }
  const report = JSON.parse(await fs.readFile(output, 'utf8'));
  assert.ok(Array.isArray(report.findings), 'CLI must return a findings report');
  const sites = report.findings.flatMap(finding => (finding.sites ?? []).filter(site =>
    resolve(app.root, site.file) === file && site.line === mark.line && site.column === mark.column && site.text === mark.text)
    .map(site => ({ rule: finding.rule, ...site })));
  return { command: [process.execPath, ...args], ...result, stdoutBytes: (await fs.stat(output)).size, sites };
}

async function target(page, i, props) {
  return page.evaluate(({ i, props }) => {
    const element = window.__plumbVerification.elements[i];
    if (!element?.isConnected) return null;
    const path = [];
    for (let node = element; node !== document.body; node = node.parentElement) {
      if (!node?.parentElement) return null;
      path.unshift([...node.parentElement.children].indexOf(node));
    }
    const css = getComputedStyle(element);
    return { path, tag: element.localName, classes: element.getAttribute('class'), attribute: element.getAttribute('style'),
      values: props.map(prop => css.getPropertyValue(prop)) };
  }, { i, props });
}

// Reads and token picks remain in the real overlay. Node only checks source bytes and invokes the CLI.
export async function writeInteraction(page, rows, app, scratch, gate, remember) {
  const dialog = page.locator('plumb-overlay').getByRole('dialog');
  const candidates = rows.flatMap(row => (row.reading?.marks ?? []).flatMap(mark =>
    mark.choices?.length === 1 && mark.choices[0].edit ? [{ row, mark }] : []));
  // Try differing token values first, but prove the difference with computed styles below.
  candidates.sort((a, b) => Number(b.mark.choices[0].value !== b.mark.value) - Number(a.mark.choices[0].value !== a.mark.value));
  let fallback, chosen, evidence, detached = 0;
  const busy = [], pendingResponses = [];
  const onResponse = response => {
    if (response.status() !== 503 || response.request().method() !== 'GET' || !new URL(response.url()).pathname.startsWith('/__plumb/')) return;
    const record = { url: response.url(), method: 'GET', status: 503 };
    busy.push(record);
    pendingResponses.push((async () => {
      record.body = await response.json();
      record.health = await requestEvidence(new URL('/__plumb/health', response.url()));
    })().catch(error => { record.error = error.message; }));
  };
  const pick = async candidate => {
    const { row, mark } = candidate;
    const before = await target(page, row.i, mark.props);
    if (!before) { detached++; return null; }
    await page.evaluate(async i => {
      const element = window.__plumbVerification.elements[i];
      element.scrollIntoView({ block: 'center', behavior: 'instant' });
      await window.__plumb.overlay.read(element, true);
      await window.__plumb.overlay.pin(element);
    }, row.i);
    await dialog.waitFor({ timeout: 10_000 });
    const reading = await page.evaluate(i => window.__plumb.overlay.read(window.__plumbVerification.elements[i]), row.i);
    const index = reading.marks.findIndex(current => current.key === mark.key && current.choices?.length === 1
      && current.choices[0].edit?.id === mark.choices[0].edit.id);
    assert.ok(index >= 0, 'Exact edit must still exist in the current reading');
    // Marks on animated SVG elements can overlap in the diagram. Use the overlay's
    // accessible keyboard control, without forcing a pointer through another mark.
    const marker = dialog.locator(`.pin[data-i="${index}"]`);
    await marker.focus();
    await marker.press('Enter');
    await page.waitForFunction(() => !document.querySelector('plumb-overlay')?.shadowRoot?.querySelector('.read')?.classList.contains('swapping'));
    const token = dialog.locator('.read .opt[data-pick="0"]');
    await token.waitFor({ state: 'visible' });
    await token.focus(); await token.press('Enter');
    await page.waitForTimeout(250);
    const preview = await target(page, row.i, mark.props);
    if (!preview) { detached++; return null; }
    return { ...candidate, reading, before, preview, changesStyle: JSON.stringify(before.values) !== JSON.stringify(preview.values) };
  };
  try {
    for (const candidate of candidates) {
      const selected = await pick(candidate);
      if (selected?.changesStyle) { chosen = selected; break; }
      fallback ??= selected;
      await page.evaluate(() => window.__plumb.overlay.close());
    }
    if (!chosen && fallback) chosen = await pick(fallback);
    if (!chosen) return { status: 'info', note: candidates.length
      ? `Write: ${candidates.length} exact-edit candidates detached before selection; no live exact edit remained.`
      : 'Write: no sampled placed element has a mark with one fitting token and an exact edit.', candidates: candidates.length, detached };
    const { row, mark, reading, before, preview, changesStyle } = chosen;
    const edit = mark.choices[0].edit;
    const file = resolve(app.root, reading.file), real = await fs.realpath(file);
    assert.ok(real.startsWith(resolve(scratch) + sep), 'Write target must resolve inside this frozen scratch copy');
    const response = await page.evaluate(async site => {
      const url = new URL('/__plumb/edits', location.href);
      // A computed class reading may trace to a literal elsewhere in this file.
      for (const key of ['file', 'line', 'column']) url.searchParams.set(key, site[key]);
      return (await fetch(url)).json();
    }, { file: reading.file, line: mark.line, column: mark.column });
    assert.ok(Array.isArray(response.edits), `Exact edit lookup failed: ${JSON.stringify(response)}`);
    const exact = response.edits.find(candidate => candidate.id === edit.id);
    assert.ok(exact, 'Server must still offer the selected exact edit');
    assert.equal(response.hash, reading.hash);
    assert.equal(exact.from, edit.from); assert.equal(exact.to, edit.to);
    const source = await fs.readFile(file), text = source.toString('utf8');
    assert.equal(text.slice(exact.start, exact.end), edit.from);
    const expected = Buffer.concat([source.subarray(0, Buffer.byteLength(text.slice(0, exact.start))), Buffer.from(edit.to),
      source.subarray(Buffer.byteLength(text.slice(0, exact.end)))]);
    const result = { status: 'failed', sample: row.i, file: reading.file, copyFile: file, line: mark.line, column: mark.column,
      from: edit.from, to: edit.to, token: mark.choices[0].name, id: edit.id, changesStyle, props: mark.props, before, preview,
      source: { beforeSha256: digest(source), expectedSha256: digest(expected) } };
    evidence = result;
    // Keep cleanup evidence even if a later page/CLI assertion fails.
    remember({ file, source, expected, result });
    result.checkBefore = await checkCLI(app, scratch, file, mark);
    assert.ok(result.checkBefore.sites.length, 'CLI must report the selected site before Write');
    await page.evaluate(async ({ i, file }) => {
      const probe = window.__plumbWriteProbe = { element: window.__plumbVerification.elements[i], updates: [] };
      try {
        const { createHotContext } = await import('/@vite/client');
        createHotContext('/__plumb/write-verification').on('vite:beforeUpdate', event => {
          for (const update of event.updates ?? []) {
            const path = update.path.split('?')[0].replace(/^\//, '');
            if (file === path || file.endsWith('/' + path)) probe.updates.push(update);
          }
        });
      } catch { /* A full page reload also proves the dev update. */ }
    }, { i: row.i, file: reading.file });
    gate.arm({ page, file: reading.file, hash: reading.hash, id: edit.id });
    const button = dialog.getByRole('button', { name: 'Write 1 edit', exact: true });
    await button.focus();
    page.on('response', onResponse);
    const started = performance.now();
    const [apply] = await Promise.all([
      page.waitForResponse(response => response.url() === new URL('/__plumb/apply', page.url()).href
        && response.request().method() === 'POST', { timeout: 30_000 }),
      button.press('Enter'),
    ]);
    result.apply = { status: apply.status(), body: await apply.json(), requests: gate.consumed };
    assert.ok(apply.ok(), `Overlay apply returned ${apply.status()}`);
    assert.equal(gate.consumed, 1);
    const written = await fs.readFile(file);
    result.source.afterSha256 = digest(written);
    result.source.exact = written.equals(expected);
    assert.ok(result.source.exact, 'Copy must differ by exactly the selected from/to edit, every other byte identical');
    let current;
    const deadline = started + 120_000;
    while (performance.now() < deadline) {
      try {
        current = await page.evaluate(async ({ path, tag, props, hash, key, from, classes }) => {
          let element = document.body;
          for (const index of path) element = element?.children[index];
          if (!element?.isConnected || element.localName !== tag || !window.__plumb?.overlay) return null;
          const root = document.querySelector('plumb-overlay')?.shadowRoot;
          const pending = root?.querySelector('.state')?.textContent ?? '';
          // Let the overlay's own reread finish before asking for independent proof.
          if (!/Wrote 1 edit/.test(pending) || /Reload to see/.test(pending)) return null;
          const reading = await window.__plumb.overlay.read(element, true);
          const probe = window.__plumbWriteProbe;
          const updated = !probe || probe.element !== element || probe.updates.length || element.getAttribute('class') !== classes;
          if (reading.status !== 'ready' || reading.hash === hash || reading.marks.some(mark => mark.key === key && mark.text === from)
            || !updated || !/Wrote 1 edit/.test(pending) || /Reload to see/.test(pending)) return null;
          // Closing removes any retained preview. Computed values must come from the app's own updated source.
          window.__plumb.overlay.close();
          await new Promise(resolveSettle => setTimeout(resolveSettle, 250));
          const css = getComputedStyle(element);
          return { reading, classes: element.getAttribute('class'), attribute: element.getAttribute('style'),
            values: props.map(prop => css.getPropertyValue(prop)), overlayStatus: pending,
            devUpdate: { documentReloaded: !probe, elementReplaced: !!probe && probe.element !== element, updates: probe?.updates ?? [] } };
        }, { ...before, props: mark.props, hash: reading.hash, key: mark.key, from: mark.text });
        if (current && JSON.stringify(current.values) === JSON.stringify(preview.values)) break;
      } catch (error) {
        if (!/Execution context was destroyed|Cannot find context/.test(error.message)) throw error;
      }
      await delay(100);
    }
    result.writeToCurrentMs = Number((performance.now() - started).toFixed(2));
    result.current = current;
    assert.ok(current, 'Dev server must update the element and overlay must return a current reading within 120 seconds');
    assert.equal(resolve(app.root, current.reading.file), file, 'Current reading must still refer to the edited file');
    assert.equal(current.reading.hash, result.source.afterSha256, 'Current reading must reflect the exact written bytes');
    assert.deepEqual(current.values, preview.values, 'Source-computed value must equal the preview after preview removal');
    await Promise.all(pendingResponses);
    for (const record of busy) {
      // These are read-only probes, after the real overlay has already returned current.
      // Retain the original browser answer, retry and health; no write is retried.
      record.retry = await requestEvidence(record.url);
      record.retryHealth = await requestEvidence(new URL('/__plumb/health', record.url));
      const healthy = value => value?.ok && value.body?.status === 'ready' && value.ms < 100;
      record.recovered = record.body?.status === 'busy' && record.retry.ok && healthy(record.health) && healthy(record.retryHealth);
      assert.ok(record.recovered, `Browser busy read did not recover with health <100 ms: ${record.url}`);
    }
    result.busyReads = busy;
    result.checkAfter = await checkCLI(app, scratch, file, mark);
    assert.equal(result.checkAfter.sites.length, 0, 'plumb check must no longer report the edited site');
    result.status = 'passed';
    return result;
  } catch (error) {
    return Object.assign(evidence ?? {}, { status: 'failed', error: error.stack ?? String(error) });
  } finally {
    page.off('response', onResponse);
    await Promise.all(pendingResponses);
    if (evidence) evidence.busyReads = busy;
    gate.disarm();
    await page.evaluate(() => window.__plumb?.overlay.close()).catch(() => {});
  }
}

export async function restoreWrite(write) {
  const actual = await fs.readFile(write.file);
  // Never erase unexpected bytes to make the whole-copy guard pass.
  assert.ok(actual.equals(write.expected) || actual.equals(write.source), 'Unexpected source bytes prevent restoring the selected write');
  await fs.writeFile(write.file, write.source);
  write.result.source.restoredForIntegrity = true;
}
