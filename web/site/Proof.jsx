'use client';
// The one question under the install command: does anyone use it? npm's downloads for the last 30 days and the
// repository's stars, read by the visitor's browser from npm and GitHub (both allow it, with no key), because the
// site is static files and a count built into them would be stale by the next day. Quiet: Copy stays the one loud
// thing in the hero.
//
// States: before the numbers arrive, and when a source doesn't answer, each is still a link that reads as a whole
// ("npm", "Star on GitHub"), with no number and no error. Arrived: the number rolls up into place once; reduced
// motion shows it at once. A number is kept for ten minutes in the tab, so GitHub's limit (60 an hour for one
// address) isn't spent on page changes.
import { useEffect, useState } from 'react';
import { GITHUB_URL, NPM_URL, PACKAGE, REPO } from './project.js';

const FRESH = 10 * 60 * 1000;
const SOURCES = {
  downloads: [`https://api.npmjs.org/downloads/point/last-month/${PACKAGE}`, (body) => body.downloads],
  stars: [`https://api.github.com/repos/${REPO}`, (body) => body.stargazers_count],
};

async function count(key, signal) {
  const at = `plumber:count:${key}`;
  try {
    const kept = JSON.parse(sessionStorage.getItem(at));
    if (kept && Date.now() - kept.at < FRESH) return kept.n;
  } catch {}
  const [url, pick] = SOURCES[key];
  try {
    const answer = await fetch(url, { signal });
    if (!answer.ok) return null;
    const n = pick(await answer.json());
    if (!Number.isFinite(n)) return null;
    try { sessionStorage.setItem(at, JSON.stringify({ n, at: Date.now() })); } catch {}
    return n;
  } catch { return null; }
}

function useCount(key) {
  const [n, setN] = useState(null);
  useEffect(() => {
    const gone = new AbortController();
    count(key, gone.signal).then((got) => { if (!gone.signal.aborted) setN(got); });
    return () => gone.abort();
  }, [key]);
  return n;
}

const shown = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const Count = ({ n }) => <b className="proof-n"><span>{shown.format(n)}</span></b>;

// two toys the product's set has no use for (overlay/src/toys.js), drawn to its rules: a download is an arrow cut
// out of a sky tile, landing on its line; a star is one butter body
const Download = () => (
  <svg className="proof-toy" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="var(--pl-sky)" />
    <path d="M12 6.4v7M8.6 10.2l3.4 3.4 3.4-3.4M7.8 17.3h8.4" fill="none" stroke="var(--pl-cut)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Star = () => (
  <svg className="proof-toy" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.6l2.5 5.3 5.8.7-4.3 4 1.2 5.7-5.2-2.9-5.2 2.9L8 13.6l-4.3-4 5.8-.7z" fill="var(--pl-butter)" stroke="var(--pl-butter)" strokeWidth="2.6" strokeLinejoin="round" />
  </svg>
);

export function Proof() {
  const downloads = useCount('downloads'), stars = useCount('stars');
  return (
    <ul className="proof">
      <li>
        <a href={NPM_URL}>
          <Download />
          {downloads === null ? <span>npm</span> : <><Count n={downloads} /><span>{downloads === 1 ? 'download' : 'downloads'} last month</span></>}
        </a>
      </li>
      <li>
        <a href={GITHUB_URL}>
          <Star />
          {stars === null ? <span>Star on GitHub</span> : <><Count n={stars} /><span>{stars === 1 ? 'star' : 'stars'} on GitHub</span></>}
        </a>
      </li>
    </ul>
  );
}
