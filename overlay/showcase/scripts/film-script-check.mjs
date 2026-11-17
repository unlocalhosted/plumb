// The owner's rules for a film's words, as a check (.claude/skills/craft-film). The draft and the render both run it
// and refuse a film that breaks one, so the rule holds even when nobody reads the skill.
//
//   node overlay/showcase/scripts/film-script-check.mjs <N> [--origin http://localhost:4313]
//
// The limits are the approved scripts of films 3 and 37 (2026-11-15): their longest sentence is 12 words, their
// longest line two sentences, and the films hold 46 and 48 words.
export const LIMITS = { sentence: 12, sentences: 2, words: 55 };

const words = (s) => s.replace(/\*/g, '').split(/\s+/).filter(Boolean);
// what plumber reads, not what a person says: a share, an arrow, a pixel unit on a number, a class name with a digit
const READING = [[/%/, 'a percentage'], [/[↕↔→←↑↓]/, 'an arrow'], [/\d\s*px\b/i, 'a px value'], [/\b[a-z]+(?:-[a-z]+)*-[\d[]\S*/, 'a class name']];
// one declaration ("margin-block: auto"), or one value whose function carries the idea ("linear-gradient(in oklch, …)")
const ONE_PROPERTY = /^(?:[a-z-]+\s*:\s*[^;:{}]+;?|[a-z-]+\([^;:{}]*\))$/;

export function checkFilm(film) {
  if (!film?.script) return [];   // a film without words has nothing to check
  const problems = [], all = [];
  for (const { at, text } of film.script) {
    const sentences = text.split(/(?<=[.?!])\s+/).filter(Boolean);
    if (sentences.length > LIMITS.sentences) problems.push(`"${at}" has ${sentences.length} sentences (at most ${LIMITS.sentences}): ${text}`);
    for (const s of sentences) if (words(s).length > LIMITS.sentence) problems.push(`"${at}" has a ${words(s).length}-word sentence (at most ${LIMITS.sentence}): ${s}`);
    for (const [re, what] of READING) if (re.test(text)) problems.push(`"${at}" shows ${what}, a reading, not a person's words: ${text}`);
    all.push(...words(text));
  }
  if (all.length > LIMITS.words) problems.push(`the script is ${all.length} words (at most ${LIMITS.words}); cut it down`);
  if (!film.teach) problems.push('the change card has nothing to teach: add teach: { fault, fix }, one property each');
  else for (const side of ['fault', 'fix']) {
    const v = String(film.teach[side] ?? '').trim();
    if (!ONE_PROPERTY.test(v)) problems.push(`teach.${side} must be one property, like "margin-block: auto": ${v || '(empty)'}`);
  }
  return problems;
}

// Read the film's spec from its page (FilmPage sets window.__filmSpec) and check it. Returns the problems.
export async function checkPage(page) {
  // polled from here, not in the page: the render pauses the page's clock, so the page's own timers stand still
  for (let i = 0; i < 150; i++) {
    const spec = await page.evaluate(() => window.__filmSpec);
    if (spec !== undefined) return checkFilm(spec);
    await new Promise((ok) => setTimeout(ok, 100));
  }
  return ['the film page never said what its words are (window.__filmSpec): is the showcase server running?'];
}

export function refuse(n, problems) {
  console.error(`Film № ${n} breaks the owner's rules for its words (.claude/skills/craft-film):\n${problems.map((p) => `- ${p}`).join('\n')}`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { chromium } = await import('playwright');
  const args = process.argv.slice(2), n = Number(args[0]);
  if (!n) { console.error('usage: film-script-check.mjs <N> [--origin URL]'); process.exit(2); }
  const i = args.indexOf('--origin'), origin = i > 0 ? args[i + 1] : 'http://localhost:4313';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${origin}/film/${n}`);
  const problems = await checkPage(page);
  await browser.close();
  if (problems.length) refuse(n, problems);
  console.log(`Film № ${n}: the words pass.`);
}
