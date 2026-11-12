// react-plumber.com: the homepage, the docs with a live demo, and the design system, as one Next.js app.
// The site draws with the overlay's own source (../overlay/src), so the bundler's root is the repository.
import createMDX from '@next/mdx';
import { realpathSync } from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '..');
// a linked git worktree shares the main checkout's node_modules through a symlink: the root then has to hold both
const modules = realpathSync(path.join(repo, 'node_modules'));
const root = modules.startsWith(repo + path.sep) ? repo : path.dirname(repo);

// the docs are written in MDX (web/docs/pages); tables and task lists come from GitHub's flavour
const withMDX = createMDX({ options: { remarkPlugins: ['remark-gfm'] } });

/** @type {import('next').NextConfig} */
export default withMDX({
  pageExtensions: ['js', 'jsx', 'mdx'],
  turbopack: { root },
  // the repository has its own instructions for agents (CLAUDE.md); Next doesn't write a second set
  agentRules: false,
  // the design section is also design.react-plumber.com: on that host, the site opens at /design
  async rewrites() {
    return { beforeFiles: [{ source: '/', has: [{ type: 'host', value: 'design.(?<rest>.*)' }], destination: '/design' }] };
  },
});
