// The meant side of a picture over the main text (docs/briefs/shape-engine.md, section 17): what the picture says.
// A page's code can name a picture or mark it as decoration, and the bench reads that in the page. Whether the
// picture shows the person or the work can only be told by looking at it, so a reader is shown it.
//
//   shows(pictures)  pictures: [{ id, source }], source being what the view names the picture by (its address, or
//                  its place in the page for one drawn by script)
//                  → { read: { [id]: { says, words, why, model } } } for the pictures that have a kept reading
//                    says   'words'    the picture is mostly words: a name, a logo's words, a headline
//                           'shows'    it shows the person, the work, or something the page's words speak of
//                           'nothing'  it shows none of those
//                    words  the words in it, when says is 'words'
//
// The reader is shown the picture scaled so its longest side is always the same, and the words of the first screen.
// It is not told how large the picture is drawn or where: the seen side and the meant side are read apart.
//
// Only kept readings are returned. The call that would show a picture to a model from here is not built; the
// readings so far were made in the owner's session and put in `.words/` (not in git) under the name `keyOf` gives.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ASKED = 1; // raise when the question below changes, so old answers are not reused
const kept = join(dirname(fileURLToPath(import.meta.url)), '.words');

export const QUESTION = `You are shown one picture from the first screen of a web page, and the words of that screen. You are not told how large the picture is drawn or where it sits, and you should not guess.

Say what the picture is, as one of:
- "words": it is mostly words, such as a name, a logo's words or a headline. Give the words.
- "shows": it shows the person the page is about, their work, or something the page's words speak of.
- "nothing": it shows none of those. It sets a mood or fills a space.

Then say why in one plain sentence, for a designer.`;

export function keyOf(source) {
  return join(kept, `picture-${createHash('sha256').update(`${ASKED}\n${source}`).digest('hex').slice(0, 32)}.json`);
}

export function shows(pictures) {
  const read = {};
  for (const p of Array.isArray(pictures) ? pictures.slice(0, 20) : []) {
    const file = keyOf(String(p.source ?? ''));
    if (p.source && existsSync(file)) read[p.id] = JSON.parse(readFileSync(file, 'utf8'));
  }
  return { read };
}
