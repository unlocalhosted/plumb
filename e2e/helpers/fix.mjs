// Driving the fix panel (overlay/src/fixpanel.js) from a test, the way a person does: a click on a glow puts its cause
// in hand, the options are specimens, Enter writes the fix at once. Shared by the craft, verdict and hierarchy specs.

// What the cause in hand shows: its class, its words, its options (the pick, the value it has now), a note or a sentence.
export const cause = (overlay) => overlay.locator('.fx').evaluate((e) => {
  const sp = (s) => ({ v: s.querySelector('.v')?.textContent ?? null, tk: s.querySelector('.tk')?.textContent ?? null, pressed: s.getAttribute('aria-pressed') === 'true', off: s.classList.contains('off') });
  const all = [...e.querySelectorAll('.sp')].map(sp);
  return {
    cls: e.querySelector('.cause .cls')?.textContent ?? null, what: e.querySelector('.cause .what')?.textContent ?? null,
    nav: e.querySelector('.cause .nav')?.textContent.replace(/[^\d of]/g, '').trim() ?? null,
    say: e.querySelector('.say')?.textContent ?? null, note: e.querySelector('.note')?.textContent ?? null,
    options: all.filter((s) => !s.off), now: all.find((s) => s.off) ?? null, picked: all.find((s) => s.pressed) ?? null,
    canTake: !!e.querySelector('.take:not([disabled])'),
  };
});

// the elements the cause in hand lights, as boxes
export const lit = (page) => page.evaluate(() => [...new Set([...document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .heat .zone:is([data-stage="lit"], [data-stage="lead"], [data-stage="pointed"])')].map((z) => z.dataset.box))].map((b) => { const [x, y, w, h] = b.split(',').map(Number); return { x, y, w, h }; }));
// waits until something is lit, then says which elements
export async function litNow(page) {
  await page.waitForFunction(() => document.querySelector('plumb-overlay').shadowRoot.querySelectorAll('.bp .heat .zone:is([data-stage="lit"], [data-stage="lead"], [data-stage="pointed"])').length > 0, null, { timeout: 4000 });
  return lit(page);
}
export const same = (a, b) => Math.abs(a.x - b.x) < 1.5 && Math.abs(a.y - b.y) < 1.5 && Math.abs(a.w - b.w) < 2 && Math.abs(a.h - b.h) < 2;

// Puts a mark's cause in hand by a real click on its glow, the pointer arriving first, and says what the panel shows: the
// hint the glow gave when pointed at, the finding's line (the glow's own label), the cause (class, words), and the
// the places its cause lights, and the options when the cause has them (`options: true` waits for them to be read).
export async function openMark(page, overlay, id, { options = false } = {}) {
  const hit = overlay.locator(`.bp .hit[data-id="${id}"]`);
  const [x, y] = (await hit.getAttribute('data-at')).split(',').map(Number); // where the zone is aimed at (its first piece), not its bounding box
  await page.mouse.move(x, y);
  const hint = overlay.locator('.bp .bp-hint[data-on]');
  await hint.waitFor({ timeout: 3000 });
  const hinted = await hint.innerText();
  const line = await hit.getAttribute('aria-label');
  // pointed at, the glow lights every place of its cause (the finding goes once its fix is tried, so look now)
  const glow = await litNow(page);
  await page.mouse.click(x, y);
  await overlay.locator('.fx .cause .cls').waitFor({ timeout: 10000 });
  if (options) await overlay.locator('.fx .sp[aria-pressed="true"], .fx .note').first().waitFor({ timeout: 10000 });
  else await overlay.locator('.fx .sp, .fx .note, .fx .say').first().waitFor({ timeout: 10000 });
  await page.mouse.move(2, 2);
  const shown = await cause(overlay);
  return { hinted, line, glow, ...shown, target: shown.picked ? (shown.picked.tk ?? shown.picked.v) : null, steps: shown.options.length };
}

// Takes the cause in hand (Enter, as soon as its exact edit is read: a class swap's plan lives only until the reader
// looks at the page again): it is written at once, one guarded write, and the panel says what changed.
export async function applyFix(page, overlay) {
  const said = overlay.locator('.fx .said .t');
  const before = await said.innerText({ timeout: 200 }).catch(() => '');
  const changed = async () => (await said.innerText({ timeout: 200 }).catch(() => '')) !== before;
  for (let i = 0; i < 80 && !(await changed()); i++) {
    if (await overlay.locator('.fx .take:not([disabled])').count() && !(await overlay.locator('.fx .writing').count())) await page.keyboard.press('Enter');
    for (let k = 0; k < 10 && await overlay.locator('.fx .writing').count(); k++) await page.waitForTimeout(100); // being written
    await page.waitForTimeout(40);
  }
  if (!(await changed())) throw new Error(`the cause in hand could not be taken: ${JSON.stringify(await cause(overlay))}`);
}

// The mark on an element, by its rule, as the engine holds it (the folded findings are under it).
export const engineMark = (page, elId, rule) => page.evaluate(([elId, rule]) => {
  const m = window.__plumb.overlay.blueprintReader.items.find((x) => x.el.id === elId)?.marks.find((x) => x.rule === rule);
  return m ? { rule: m.rule, suggest: m.craft?.suggest ?? null, also: (m.also ?? []).map((a) => ({ rule: a.rule, title: a.title })) } : null;
}, [elId, rule]);
