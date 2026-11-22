// The foot of every page, the docs' included: who makes it, and where else it lives. Plain words and links, no block.
import { AUTHOR, GITHUB_URL, NPM_URL } from './project.js';

export function Foot() {
  return (
    <footer className="foot">
      <p>Created by <a href={AUTHOR.url} rel="me">{AUTHOR.name}</a></p>
      <nav aria-label="React Plumber elsewhere">
        <a href={NPM_URL}>npm</a>
        <a href={GITHUB_URL}>GitHub</a>
        <a href={AUTHOR.url} rel="me">{`@${AUTHOR.x} on X`}</a>
      </nav>
    </footer>
  );
}
