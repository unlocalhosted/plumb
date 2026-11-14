// One browser per test file, a fresh context per test (the test-setup skill's harness rule): launching Chromium costs
// a process and hundreds of MB, a context costs milliseconds. Import `browser` and `open`; never launch in a test.
import { chromium } from 'playwright';
import { after } from 'node:test';

let launched;
// registered when the file imports this helper, so it belongs to the file, not to whichever test launched first
after(async () => { if (launched) await (await launched).close(); });
/** The file's browser, launched on first use and closed when the file ends. */
export async function browser() {
  launched ??= chromium.launch({ headless: true, executablePath: (process.env.PLUMBER_CHROMIUM ?? process.env.PLUMB_CHROMIUM) || undefined });
  return launched;
}

/** A page in a fresh context, reduced motion, its page errors collected; closed with the test. */
export async function open(t, url, { width = 1280, height = 900 } = {}) {
  const context = await (await browser()).newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  t.after(() => context.close());
  const page = await context.newPage(), errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  return { page, errors };
}
