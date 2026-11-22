// The foot of every page, the docs' included. The page lands on it: the toys lie on the floor (Floor.jsx) and the
// ground under them is one solid block of lilac, the hue of names and places to go, with every place on it.
import Link from 'next/link';
import { markR } from '../../overlay/src/mark.js';
import { Floor } from './Floor.jsx';
import { GitHub, LinkedIn, X } from './marks.jsx';
import { AUTHOR, GITHUB_URL, NPM_URL } from './project.js';

const MARK = markR({ h: 52, id: 'foot', leg: 'var(--rp-leg)' });
const COLUMNS = [
  ['Start', [['Quick start', '/docs/quick-start'], ['What it is', '/docs/what-plumber-is'], ['Every check', '/docs/what-plumber-checks'], ['The overlay', '/docs/overlay']]],
  ['Go further', [['CLI', '/docs/cli'], ['Agents', '/docs/agents'], ['Pull requests', '/docs/ci'], ['Configuration', '/docs/configuration']]],
  ['Project', [['Design system', '/design'], ['npm', NPM_URL], ['GitHub', GITHUB_URL], ['Changelog', `${GITHUB_URL}/blob/main/CHANGELOG.md`]]],
];

// a place on the ground: its arrow steps out of the way it goes (on this site, or out of it)
const Place = ({ text, href }) => {
  const away = href.startsWith('http');
  const inside = <>{text}<i aria-hidden="true">{away ? '↗' : '→'}</i></>;
  return away ? <a className="foot-place away" href={href}>{inside}</a> : <Link className="foot-place" href={href}>{inside}</Link>;
};

export function Foot() {
  return (
    <footer className="foot">
      <Floor />
      <div className="ground">
        <div className="ground-in">
          <div className="foot-who">
            <Link className="foot-name" href="/"><i className="toy mark" style={{ width: 44, height: 52 }} dangerouslySetInnerHTML={{ __html: MARK }} />React Plumber</Link>
            <p className="foot-says">Find what drifted from your design system, and fix it on the page.</p>
            <div className="foot-by">
              <p>Created by <a href={AUTHOR.url} rel="me">{AUTHOR.name}</a></p>
              <span className="foot-marks">
                <a className="s-btn q" href={AUTHOR.url} rel="me" aria-label={`${AUTHOR.name} on X`}><span><X />{`@${AUTHOR.x}`}</span></a>
                <a className="s-btn q only" href={AUTHOR.linkedin} rel="me" aria-label={`${AUTHOR.name} on LinkedIn`}><span><LinkedIn /></span></a>
                <a className="s-btn q only" href={GITHUB_URL} aria-label="React Plumber on GitHub"><span><GitHub /></span></a>
              </span>
            </div>
          </div>
          <nav className="foot-map" aria-label="Footer">
            {COLUMNS.map(([title, places]) => (
              <div key={title}>
                <p className="foot-group">{title}</p>
                <ul>{places.map(([text, href]) => <li key={text}><Place text={text} href={href} /></li>)}</ul>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
