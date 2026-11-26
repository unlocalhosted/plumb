#!/usr/bin/env node
// Draws reviews.json as one page: each portfolio's screenshot with the reviewer's points pinned on it, and beside
// each pin what he said (in our words), what the page shows, how he got there and where the idea belongs in plumber.
// The page and the screenshots go to local/, which git ignores: the sites are other people's.
//   node docs/research/harvests/raunofreiberg-portfolio-reviews/build.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, 'reviews.json'), 'utf8'));
const tokens = readFileSync(join(here, '../../../../overlay/src/tokens.css'), 'utf8');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LEVELS = { shape: ['Shape', 'lilac'], craft: ['Craft detail', 'pink'], behaviour: ['Behaviour', 'sky'], content: ['Content and story', 'butter'] };

const CSS = `
  :host { display: block; background: var(--pl-paper-2); color: var(--pl-ink); font: var(--pl-page-small); }
  main { max-width: 1320px; margin: 0 auto; padding: var(--pl-page-space-1) var(--pl-space-8) 96px; }
  h1 { font: var(--pl-page-display-narrow); margin: 0 0 var(--pl-space-4); text-wrap: balance; }
  .lede { font: var(--pl-page-body); color: var(--pl-ink-2); max-width: 72ch; margin: 0 0 var(--pl-space-7); }
  .key { display: flex; flex-wrap: wrap; gap: var(--pl-space-6); margin: 0 0 var(--pl-page-space-1); font: var(--pl-page-meta); color: var(--pl-ink-2); }
  .key span { display: inline-flex; align-items: center; gap: var(--pl-space-3); }
  .n { --h: var(--pl-pink); --on: var(--pl-pink-on); display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; box-sizing: border-box; border-radius: 11px; background: var(--h); color: var(--on); font: 700 12px/1 var(--pl-round); }
  .n[data-l="shape"], .pin[data-l="shape"] { --h: var(--pl-lilac); --on: var(--pl-lilac-on); } .n[data-l="behaviour"], .pin[data-l="behaviour"] { --h: var(--pl-sky); --on: var(--pl-sky-on); } .n[data-l="content"], .pin[data-l="content"] { --h: var(--pl-butter); --on: var(--pl-butter-on); }
  section { margin: 0 0 96px; }
  header { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--pl-space-4) var(--pl-space-6); margin: 0 0 var(--pl-space-6); }
  h2 { font: var(--pl-page-title); margin: 0; } header a, .said a { color: inherit; } header .meta { font: var(--pl-page-meta); color: var(--pl-ink-2); }
  .pair { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(320px, 1fr); gap: var(--pl-space-8); align-items: start; }
  @media (max-width: 980px) { .pair { grid-template-columns: 1fr; } }
  .shots { display: grid; gap: var(--pl-space-6); position: sticky; top: var(--pl-space-6); max-height: calc(100vh - 32px); overflow: auto; border-radius: 12px; }
  @media (max-width: 980px) { .shots { position: static; max-height: none; } }
  figure { margin: 0; } figcaption { font: var(--pl-page-meta); color: var(--pl-ink-2); margin: 0 0 var(--pl-space-3); }
  .shot { position: relative; border-radius: 10px; overflow: hidden; background: var(--pl-paper); box-shadow: 0 1px 2px rgb(0 0 0 / .06), 0 10px 28px -14px rgb(0 0 0 / .22); }
  .shot img { position: absolute; display: block; height: auto; max-width: none; }
  .pin { --h: var(--pl-pink); --on: var(--pl-pink-on); position: absolute; box-sizing: border-box; border: 2px solid var(--h); border-radius: 5px; box-shadow: 0 0 0 1.5px var(--pl-halo), inset 0 0 0 1.5px var(--pl-halo); }
  .pin b { position: absolute; left: -2px; top: -24px; min-width: 22px; height: 22px; padding: 0 6px; box-sizing: border-box; border-radius: 11px; background: var(--h); color: var(--on); font: 700 12px/22px var(--pl-round); text-align: center; box-shadow: 0 0 0 1.5px var(--pl-halo); }
  .pin.low b { top: auto; bottom: -24px; }
  ol { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--pl-space-7); }
  li { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--pl-space-4) var(--pl-space-5); align-items: start; }
  li > div { display: grid; gap: var(--pl-space-4); }
  .said { font: var(--pl-page-body); margin: 0; } .where { font: var(--pl-card-label); letter-spacing: var(--pl-tracking-caps); text-transform: uppercase; color: var(--pl-ink-2); margin: 0; }
  dl { display: grid; grid-template-columns: 7.5em minmax(0, 1fr); gap: var(--pl-space-3) var(--pl-space-5); margin: 0; }
  dt { font: var(--pl-page-meta); color: var(--pl-ink-2); } dd { margin: 0; font: var(--pl-page-small); }
  .note { font: var(--pl-page-meta); color: var(--pl-ink-2); margin: var(--pl-space-6) 0 0; max-width: 80ch; }
`;

// a shot may name the part of the picture worth showing (crop: [x, y, w, h], in the page's own pixels)
const frame = (shot) => shot.crop ?? [0, 0, shot.w, shot.h];
const pinsOf = (review, shot) => { const [cx, cy, cw, ch] = frame(shot); return review.points.flatMap((p) => (p.pins ?? []).filter((pin) => pin.shot === shot.id)
  .map((pin) => `<i class="pin${pin.y - cy < 40 ? ' low' : ''}" data-l="${p.level}" style="left:${((pin.x - cx) / cw) * 100}%;top:${((pin.y - cy) / ch) * 100}%;width:${(pin.w / cw) * 100}%;height:${(pin.h / ch) * 100}%"><b>${p.k.split('.')[1]}</b></i>`)).join(''); };
const picture = (shot) => { const [cx, cy, cw, ch] = frame(shot); return `<div class="shot" style="aspect-ratio:${cw} / ${ch}"><img src="shots/${esc(shot.file)}" alt="${esc(shot.label)}" loading="lazy" style="width:${(shot.w / cw) * 100}%;left:${(-cx / cw) * 100}%;top:${(-cy / ch) * 100}%">`; };

const section = (r) => `<section id="r${r.n}">
  <header><h2>${r.n}. ${esc(r.who)}</h2><span class="meta"><a href="${esc(r.site)}">${esc(r.site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a> · <a href="https://x.com/raunofreiberg/status/${r.reply}">his reply</a> · ${esc(r.date)}</span></header>
  <div class="pair">
    <div class="shots">${r.shots.map((s) => `<figure><figcaption>${esc(s.label)}${existsSync(join(here, 'local/shots', s.file)) ? '' : ' (picture missing: ' + esc(s.file) + ')'}</figcaption>${picture(s)}${pinsOf(r, s)}</div></figure>`).join('')}</div>
    <ol>${r.points.map((p) => `<li><span class="n" data-l="${p.level}">${p.k.split('.')[1]}</span><div>
      <p class="where">${esc(LEVELS[p.level][0])}${p.pins?.length ? '' : ' · no single place on the page'}</p>
      <p class="said">${esc(p.says)}</p>
      <dl><dt>The page shows</dt><dd>${esc(p.shows)}</dd><dt>How he got there</dt><dd>${esc(p.how)}</dd><dt>For plumber</dt><dd>${esc(p.engine)}</dd>${p.today ? `<dt>Today</dt><dd>${esc(p.today)}</dd>` : ''}</dl></div></li>`).join('')}</ol>
  </div>${r.note ? `<p class="note">${esc(r.note)}</p>` : ''}</section>`;

const done = data.reviews.filter((r) => r.points?.length);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Portfolio reviews, pinned</title>
<style>html, body { margin: 0; }</style></head><body><review-pages></review-pages>
<template id="t"><style>${tokens}${CSS}</style><main>
  <h1>${esc(data.title)}</h1><p class="lede">${esc(data.lede)}</p>
  <p class="key">${Object.entries(LEVELS).map(([k, [name]]) => `<span><i class="n" data-l="${k}">1</i>${esc(name)}</span>`).join('')}<span>${done.length} of ${data.total} portfolios done</span></p>
  ${done.map(section).join('\n')}
</main></template>
<script>customElements.define('review-pages', class extends HTMLElement { connectedCallback() { this.attachShadow({ mode: 'open' }).append(document.getElementById('t').content.cloneNode(true)); } });</script>
</body></html>`;
writeFileSync(join(here, 'local/annotated.html'), html);
console.log(`local/annotated.html: ${done.length} of ${data.total} portfolios, ${done.reduce((n, r) => n + r.points.length, 0)} points`);
