// The docs' sections and pages (site/DOCS.md §2). A page with `load` exists; one without is planned and shown
// in the nav as planned, never as a link: the docs never point at a page that isn't there.
export const SECTIONS = [
  {
    title: 'Start',
    pages: [
      { slug: 'quick-start', title: 'Quick start', load: () => import('./pages/quick-start.mdx') },
      { slug: 'what-plumber-is', title: 'What React Plumber is', load: () => import('./pages/what-plumber-is.mdx') },
    ],
  },
  {
    title: 'What it checks',
    pages: [
      { slug: 'what-plumber-checks', title: 'Every check', load: () => import('./pages/what-plumber-checks.mdx') },
      { slug: 'checks-system', title: 'Design system check', load: () => import('./pages/checks/system.mdx') },
      { slug: 'checks-craft', title: 'Craft and polish', load: () => import('./pages/checks/craft.mdx') },
      { slug: 'checks-access', title: 'Accessible and correct', load: () => import('./pages/checks/access.mdx') },
      { slug: 'checks-slop', title: 'Anti-slop check', load: () => import('./pages/checks/slop.mdx') },
      { slug: 'checks-words', title: 'Words and clarity', load: () => import('./pages/checks/words.mdx') },
      { slug: 'checks-states', title: 'States and behaviour', load: () => import('./pages/checks/states.mdx') },
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
