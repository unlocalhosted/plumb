'use client';
// npm's downloads and GitHub's stars, read by the visitor's browser (both allow it, with no key). The bar and the
// hero can ask at the same moment: they share one request. A number is kept for ten minutes in the tab, so GitHub's
// limit (60 an hour for one address) isn't spent on page changes. Not here yet is undefined and no answer is
// null, so a caller can hold the room for one and say something else for the other.
import { useEffect, useState } from 'react';
import { PACKAGE, REPO } from './project.js';

const FRESH = 10 * 60 * 1000;
const SOURCES = {
  downloads: [`https://api.npmjs.org/downloads/point/last-month/${PACKAGE}`, (body) => body.downloads],
  stars: [`https://api.github.com/repos/${REPO}`, (body) => body.stargazers_count],
};
const asking = new Map();

async function read(key) {
  const at = `plumber:count:${key}`;
  try {
    const kept = JSON.parse(sessionStorage.getItem(at));
    if (kept && Date.now() - kept.at < FRESH) return kept.n;
  } catch {}
  const [url, pick] = SOURCES[key];
  try {
    const answer = await fetch(url);
    if (!answer.ok) return null;
    const n = pick(await answer.json());
    if (!Number.isFinite(n)) return null;
    try { sessionStorage.setItem(at, JSON.stringify({ n, at: Date.now() })); } catch {}
    return n;
  } catch { return null; }
}

function ask(key) {
  if (!asking.has(key)) asking.set(key, read(key).finally(() => asking.delete(key)));
  return asking.get(key);
}

export function useCount(key) {
  const [n, setN] = useState(undefined);
  useEffect(() => {
    let here = true;
    ask(key).then((got) => { if (here) setN(got); });
    return () => { here = false; };
  }, [key]);
  return n;
}

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
export const short = (n) => compact.format(n);
