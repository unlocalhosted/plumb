// Every drift planted in Relay, on purpose, the way real code collects it. React Plumber should find each one and
// nothing else; the in-app legend (a later layer) draws this list over the page so anyone can check.
//
// screen · where (file and what) · what's wrong · the rule that should catch it · the fix the overlay should offer
export const planted = [
  { screen: 'shell', file: 'app/Sidebar.jsx', what: 'gap between sidebar sections gap-[18px]', wrong: 'off the 4px ladder', rule: 'provenance/arbitrary', fix: 'gap-4 (16px) or gap-5 (20px)' },
  { screen: 'shell', file: 'app/TopBar.jsx', what: 'hand-rolled New issue button', wrong: 'imitates Button with its own padding and radius (px-[13px], rounded-[7px])', rule: 'imitation/Button, provenance/arbitrary', fix: 'use <Button>; px-3, rounded-md' },
  { screen: 'shell', file: 'app/PersonAvatar.jsx', what: 'avatar initials text-[10px]', wrong: 'below the type scale (12px is the smallest step)', rule: 'provenance/arbitrary', fix: 'text-xs' },
  { screen: 'shell', file: 'app/PersonAvatar.jsx', what: 'avatar initials text-white', wrong: 'raw colour on a computed background', rule: 'provenance/color', fix: 'text-primary-foreground (or a token for on-avatar ink)' },
  { screen: 'shell', file: 'app/PersonAvatar.jsx', what: 'avatar stack ring ring-[#fff]', wrong: 'raw colour; stays white in dark mode', rule: 'provenance/color', fix: 'ring-background' },
  { screen: 'board', file: 'screens/Board.jsx', what: 'issue card padding p-[10px]', wrong: 'off the 4px ladder, on every card (one stamp)', rule: 'provenance/arbitrary', fix: 'p-2.5 or p-3' },
  { screen: 'board', file: 'screens/Board.jsx', what: 'issue card shadow-[0_1px_3px_rgba(0,0,0,.12)]', wrong: 'hand-written shadow, off the three elevations', rule: 'provenance/elevation', fix: 'shadow-xs or shadow-sm' },
  { screen: 'board', file: 'screens/Board.jsx', what: 'card hover duration-[250ms]', wrong: 'off the 120ms state transition', rule: 'provenance/motion', fix: 'drop it (the default is the token)' },
  { screen: 'board', file: 'screens/Board.jsx', what: 'overdue date text-[#d23a3a]', wrong: 'raw colour for a meaning the theme names', rule: 'provenance/color', fix: 'text-destructive' },
  { screen: 'board', file: 'screens/Board.jsx', what: 'In review column rounded-[10px]', wrong: 'off the radius scale, on one column only', rule: 'provenance/arbitrary', fix: 'rounded-lg' },
  { screen: 'board', file: 'screens/Board.jsx', what: 'column count bg-[#e9ebef]', wrong: 'raw colour; a light chip on a dark column in dark mode', rule: 'provenance/color', fix: 'bg-secondary' },
];
