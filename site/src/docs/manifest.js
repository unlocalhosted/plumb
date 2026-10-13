// The docs' information architecture (site/DOCS.md §2). A page with `load` exists; one without is planned and shown
// in the nav as planned, never as a link: the docs never point at a page that isn't there.
export const SECTIONS = [
  {
    title: 'Start',
    pages: [
      { slug: 'quick-start', title: 'Quick start', load: () => import('./pages/quick-start.mdx') },
      { slug: 'what-plumb-is', title: 'What Plumb is', load: () => import('./pages/what-plumb-is.mdx') },
    ],
  },
  {
    title: 'Concepts',
    pages: [
      { slug: 'decisions', title: 'Decisions', load: () => import('./pages/decisions.mdx') },
      { slug: 'how-a-value-is-judged', title: 'How a value is judged', load: () => import('./pages/how-a-value-is-judged.mdx') },
      { slug: 'findings', title: 'Findings', load: () => import('./pages/findings.mdx') },
      { slug: 'the-ledger', title: 'The ledger', load: () => import('./pages/the-ledger.mdx') },
      { slug: 'habits', title: 'Habits', load: () => import('./pages/habits.mdx') },
    ],
  },
  {
    title: 'Guides',
    pages: [
      { slug: 'overlay', title: 'The overlay in your app', load: () => import('./pages/overlay.mdx') },
      { slug: 'ci', title: 'CI and pull requests', load: () => import('./pages/ci.mdx') },
      { slug: 'agents', title: 'Agents', load: () => import('./pages/agents.mdx') },
      { slug: 'adopting', title: 'Adopting on a big repo', load: () => import('./pages/adopting.mdx') },
    ],
  },
  {
    title: 'Reference',
    pages: [
      { slug: 'cli', title: 'CLI', load: () => import('./pages/cli.mdx') },
      { slug: 'configuration', title: 'Configuration', load: () => import('./pages/configuration.mdx') },
      { slug: 'rules', title: 'Rules', load: () => import('./pages/rules.mdx') },
      { slug: 'report-format', title: 'Report format', load: () => import('./pages/report-format.mdx') },
    ],
  },
];

export const PAGES = SECTIONS.flatMap((s) => s.pages.map((p) => ({ ...p, section: s.title })));
export const pageFor = (slug) => PAGES.find((p) => p.slug === slug && p.load) ?? PAGES.find((p) => p.load);
