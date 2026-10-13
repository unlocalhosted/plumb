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
      { slug: 'findings', title: 'Findings' },
      { slug: 'the-ledger', title: 'The ledger' },
      { slug: 'habits', title: 'Habits' },
    ],
  },
  {
    title: 'Guides',
    pages: [
      { slug: 'overlay', title: 'The overlay in your app' },
      { slug: 'ci', title: 'CI and pull requests' },
      { slug: 'agents', title: 'Agents' },
      { slug: 'adopting', title: 'Adopting on a big repo' },
    ],
  },
  {
    title: 'Reference',
    pages: [
      { slug: 'cli', title: 'CLI' },
      { slug: 'configuration', title: 'Configuration' },
      { slug: 'rules', title: 'Rules' },
      { slug: 'report-format', title: 'Report format' },
    ],
  },
];

export const PAGES = SECTIONS.flatMap((s) => s.pages.map((p) => ({ ...p, section: s.title })));
export const pageFor = (slug) => PAGES.find((p) => p.slug === slug && p.load) ?? PAGES.find((p) => p.load);
