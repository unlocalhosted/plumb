// Relay's sample workspace: people, teams and issues believable enough that the drift on top of them reads as real.
export const workspace = { name: 'Northwind', plan: 'Business' };

export const people = [
  { id: 'ada', name: 'Ada Lovelace', initials: 'AL', hue: 152 },
  { id: 'grace', name: 'Grace Hopper', initials: 'GH', hue: 28 },
  { id: 'alan', name: 'Alan Turing', initials: 'AT', hue: 262 },
  { id: 'katherine', name: 'Katherine Johnson', initials: 'KJ', hue: 205 },
  { id: 'linus', name: 'Linus Park', initials: 'LP', hue: 340 },
];
export const me = people[0];

export const teams = [
  { id: 'web', name: 'Web', key: 'WEB', open: 24 },
  { id: 'mobile', name: 'Mobile', key: 'MOB', open: 11 },
  { id: 'platform', name: 'Platform', key: 'PLT', open: 37 },
];

export const views = [
  { id: 'mine', name: 'My issues', count: 7 },
  { id: 'triage', name: 'Needs triage', count: 4 },
  { id: 'cycle', name: 'Current cycle', count: 19 },
];

// Labels carry their own colour, chosen per workspace, so the board reads it from data (computed at runtime).
export const labels = {
  bug: { name: 'Bug', hue: 25 },
  feature: { name: 'Feature', hue: 152 },
  design: { name: 'Design', hue: 300 },
  perf: { name: 'Performance', hue: 60 },
  docs: { name: 'Docs', hue: 220 },
  infra: { name: 'Infra', hue: 190 },
};

export const statuses = [
  { id: 'backlog', name: 'Backlog' },
  { id: 'todo', name: 'Todo' },
  { id: 'progress', name: 'In progress' },
  { id: 'review', name: 'In review' },
  { id: 'done', name: 'Done' },
];

const issue = (n, status, priority, title, who, labelIds, extra = {}) => ({ key: `WEB-${n}`, status, priority, title, assignee: people.find((p) => p.id === who), labels: labelIds.map((l) => labels[l]), estimate: extra.estimate ?? null, due: extra.due ?? null, overdue: !!extra.overdue, sub: extra.sub ?? null, comments: extra.comments ?? 0 });

export const issues = [
  issue(214, 'backlog', 'low', 'Export board as CSV', 'linus', ['feature'], { estimate: 2 }),
  issue(219, 'backlog', 'medium', 'Remember the last view per team', 'grace', ['feature'], { estimate: 3 }),
  issue(221, 'backlog', 'low', 'Keyboard shortcut cheat sheet', 'alan', ['docs', 'design'], {}),
  issue(226, 'backlog', 'medium', 'Lazy-load avatars in long lists', 'katherine', ['perf'], { estimate: 1 }),
  issue(198, 'todo', 'high', 'Onboarding checklist for new workspaces', 'ada', ['feature', 'design'], { estimate: 5, due: 'Oct 28', sub: [1, 4], comments: 3 }),
  issue(201, 'todo', 'urgent', 'Search returns archived issues', 'alan', ['bug'], { estimate: 2, due: 'Oct 21', overdue: true, comments: 6 }),
  issue(207, 'todo', 'medium', 'Bulk-assign from the issues table', 'grace', ['feature'], { estimate: 3 }),
  issue(210, 'todo', 'low', 'Empty state for automations', 'linus', ['design'], { estimate: 1, comments: 1 }),
  issue(212, 'todo', 'medium', 'Rate-limit webhook retries', 'katherine', ['infra'], { estimate: 3, due: 'Nov 2' }),
  issue(185, 'progress', 'urgent', 'Board drag-and-drop loses position on refresh', 'ada', ['bug'], { estimate: 3, due: 'Oct 22', overdue: true, sub: [2, 3], comments: 9 }),
  issue(190, 'progress', 'high', 'Automation builder: branch on field value', 'alan', ['feature'], { estimate: 8, sub: [3, 7], comments: 4 }),
  issue(193, 'progress', 'medium', 'Dark mode for the issue drawer', 'grace', ['design'], { estimate: 2, comments: 2 }),
  issue(196, 'progress', 'high', 'Cache team permissions on the edge', 'katherine', ['infra', 'perf'], { estimate: 5, due: 'Oct 30' }),
  issue(176, 'review', 'high', 'Comment mentions notify the right people', 'linus', ['bug'], { estimate: 2, comments: 5 }),
  issue(181, 'review', 'medium', 'Filter by label in saved views', 'ada', ['feature'], { estimate: 3, sub: [4, 4], comments: 2 }),
  issue(183, 'review', 'low', 'Tooltip copy for priority icons', 'grace', ['docs'], { estimate: 1 }),
  issue(160, 'done', 'high', 'Command palette: jump to issue by key', 'alan', ['feature'], { estimate: 3, comments: 7 }),
  issue(164, 'done', 'medium', 'Avatar stack overflow count', 'katherine', ['design'], { estimate: 1 }),
  issue(168, 'done', 'urgent', 'Webhooks fire twice on retry', 'linus', ['bug', 'infra'], { estimate: 2, comments: 3 }),
  issue(171, 'done', 'low', 'Tidy sidebar spacing', 'grace', ['design'], { estimate: 1 }),
];
