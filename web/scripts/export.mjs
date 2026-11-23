// The last step of `npm run export`: makes out/ fit to be public.
//   share     the share picture's page is left out (its photograph, public/share.png, ships)
//   research  left out: no page links to it, some of it is about private apps, and its demos bundle other people's
//             components without their licences
//   notices   every package in the shipped scripts gets its licence in out/third-party-notices.txt; a package with
//             no licence text stops the export
//   maps      deleted once they are read, because they carry the source
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const web = path.resolve(import.meta.dirname, '..'), out = path.join(web, 'out');
rmSync(path.join(out, 'research'), { recursive: true, force: true });
// the share picture's drawing board: its photograph is public/share.png
for (const f of readdirSync(out)) if (/^share(\.html|\.txt|$)|^__next\.share/.test(f)) rmSync(path.join(out, f), { recursive: true, force: true });

const read = (...at) => readFileSync(path.join(...at), 'utf8').trim();
const files = readdirSync(out, { recursive: true });
const maps = files.filter((f) => f.endsWith('.map'));
if (!maps.length) throw new Error('no source maps in out/: the licence notices cannot be worked out');

const shipped = new Set(['next']);
for (const file of maps) {
  const map = JSON.parse(read(out, file));
  for (const part of map.sections?.map((s) => s.map) ?? [map]) {
    for (const source of part.sources ?? []) {
      const name = source.match(/.*node_modules\/(next\/dist\/compiled\/(?:@[^/]+\/)?[^/]+|(?:@[^/]+\/)?[^/]+)/)?.[1];
      if (name) shipped.add(name);
    }
  }
}
// the engine is built on its own, by rolldown, which names each module it bundled in a comment
if (/^\/\/#region .*node_modules\//m.test(read(out, 'engine/craft.js'))) throw new Error('the engine now bundles a package: add its licence to scripts/export.mjs');

const notices = [...shipped].sort().map((name) => {
  const dir = [path.join(web, 'node_modules', name), path.join(web, '../node_modules', name)].find(existsSync);
  const texts = dir ? readdirSync(dir).filter((f) => /^(licen[cs]e|copying|notice)([.-]|$)/i.test(f)) : [];
  if (!texts.length) throw new Error(`no licence text for ${name}, which ships in the site`);
  return [name, texts.map((f) => read(dir, f)).join('\n\n')];
});

// Next's script for old browsers is prebuilt, so no map names what is inside it
const mit = read(web, 'node_modules/next/license.md').replace(/^[\s\S]*?(?=Permission is hereby granted)/, '');
notices.push(['core-js (in Next.js polyfills)', `Copyright (c) 2014-2024 Denis Pushkarev (zloirock.ru)\n\n${mit}`]);
notices.push(['whatwg-fetch (in Next.js polyfills)', `Copyright (c) 2014-2023 GitHub, Inc.\n\n${mit}`]);
for (const font of readdirSync(path.join(web, 'licenses'))) notices.push([font.replace(/\.txt$/, ''), read(web, 'licenses', font)]);
notices.push(['React Plumber', read(web, '../LICENSE')], ['React Plumber overlay', read(web, '../THIRD_PARTY_NOTICES')]);

writeFileSync(path.join(out, 'third-party-notices.txt'), notices.map(([name, text]) => `===== ${name} =====\n\n${text}\n`).join('\n'));

for (const file of maps) rmSync(path.join(out, file));
for (const file of readdirSync(out, { recursive: true }).filter((f) => /\.(js|css)$/.test(f))) {
  const text = read(out, file), bare = text.replace(/(\/\/[#@] sourceMappingURL=\S+|\/\*[#@] sourceMappingURL=[^*]+\*\/)\s*$/, '');
  if (bare !== text) writeFileSync(path.join(out, file), bare);
}
console.log(`out/ is ready: ${notices.length} notices, ${maps.length} maps removed, research left out`);
