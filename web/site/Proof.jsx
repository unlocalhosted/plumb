'use client';
// The one question under the install command: does anyone use it? npm's downloads for the last 30 days and the
// repository's stars, read by the visitor's browser from npm and GitHub (both allow it, with no key), because the
// site is static files and a count built into them would be stale by the next day. Quiet: Copy stays the one loud
// thing in the hero.
//
// States: before the numbers arrive, and when a source doesn't answer, each is still a link that reads as a whole
// ("npm", "Star on GitHub"), with no number and no error. Arrived: the number rolls up into place once; reduced
// motion shows it at once.
// Where the bar shows the stars, this row leaves them to it: each fact once.
import { short, useCount } from './counts.js';
import { Download, Star } from './marks.jsx';
import { GITHUB_URL, NPM_URL } from './project.js';

const Count = ({ n }) => <b className="proof-n"><span>{short(n)}</span></b>;

export function Proof() {
  const downloads = useCount('downloads'), stars = useCount('stars');
  return (
    <ul className="proof">
      <li>
        <a href={NPM_URL}>
          <Download />
          {downloads == null ? <span>npm</span> : <><Count n={downloads} /><span>{downloads === 1 ? 'download' : 'downloads'} last month</span></>}
        </a>
      </li>
      <li className="proof-stars">
        <a href={GITHUB_URL}>
          <Star />
          {stars == null ? <span>Star on GitHub</span> : <><Count n={stars} /><span>{stars === 1 ? 'star' : 'stars'} on GitHub</span></>}
        </a>
      </li>
    </ul>
  );
}
