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
