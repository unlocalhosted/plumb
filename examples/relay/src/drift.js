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
  { screen: 'issues', file: 'screens/Issues.jsx', what: 'column headers text-[11px] tracking-[.06em]', wrong: 'below the type scale, tracking off the token', rule: 'provenance/arbitrary', fix: 'text-xs tracking-wide' },
  { screen: 'issues', file: 'screens/Issues.jsx', what: 'selected row bg-[#eaf6f1]', wrong: 'raw colour; a pale mint row in dark mode', rule: 'provenance/color', fix: 'bg-primary/10 or bg-accent' },
  { screen: 'issues', file: 'screens/Issues.jsx', what: 'updated time text-[#8a8f99]', wrong: 'raw grey where the theme names muted text', rule: 'provenance/color', fix: 'text-muted-foreground' },
  { screen: 'issues', file: 'screens/Issues.jsx', what: 'points cell style={{ paddingRight: 14 }}', wrong: 'inline literal, off the ladder', rule: 'provenance (inline)', fix: 'pr-3.5 or pr-4' },
  { screen: 'issues', file: 'screens/Issues.jsx', what: 'bulk bar rounded-[12px]', wrong: 'equals rounded-xl but bypasses the token', rule: 'provenance/radius by value', fix: 'rounded-xl' },
  { screen: 'drawer', file: 'screens/IssueDrawer.jsx', what: 'drawer padding px-[22px]', wrong: 'off the 4px ladder (header, body and footer)', rule: 'provenance/arbitrary', fix: 'px-5 or px-6' },
  { screen: 'drawer', file: 'screens/IssueDrawer.jsx', what: 'property labels text-[12.5px]', wrong: 'between two type steps', rule: 'provenance/arbitrary', fix: 'text-xs' },
  { screen: 'drawer', file: 'screens/IssueDrawer.jsx', what: 'inline code bg-[#f3f4f6]', wrong: 'raw colour; a light patch in dark mode', rule: 'provenance/color', fix: 'bg-muted' },
  { screen: 'drawer', file: 'screens/IssueDrawer.jsx', what: 'comment bubbles rounded-[6px]', wrong: 'equals rounded-md but bypasses the token', rule: 'provenance/radius by value', fix: 'rounded-md' },
  { screen: 'drawer', file: 'screens/IssueDrawer.jsx', what: 'comment focus ring-[#12805c]/30', wrong: "Relay's primary written as a raw colour", rule: 'provenance/color', fix: 'ring-ring/30' },
  { screen: 'automations', file: 'screens/Automations.jsx', what: 'canvas dot grid #d9dce3', wrong: 'raw colour (it is --input) in an arbitrary background', rule: 'provenance/color', fix: 'a gradient from var(--input)' },
  { screen: 'automations', file: 'screens/Automations.jsx', what: 'connectors stroke-[#9aa0ac]', wrong: 'equals --status-backlog but bypasses the token', rule: 'provenance/color by value', fix: 'stroke-status-backlog (or stroke-border)' },
  { screen: 'automations', file: 'screens/Automations.jsx', what: 'node padding px-[14px]', wrong: 'off the 4px ladder', rule: 'provenance/arbitrary', fix: 'px-3.5 or px-4' },
  { screen: 'automations', file: 'screens/Automations.jsx', what: 'node corners rounded-[14px]', wrong: 'off the radius scale', rule: 'provenance/arbitrary', fix: 'rounded-xl' },
  { screen: 'automations', file: 'screens/Automations.jsx', what: 'node type tag text-[11px]', wrong: 'below the type scale', rule: 'provenance/arbitrary', fix: 'text-xs' },
  { screen: 'automations', file: 'screens/Automations.jsx', what: 'node type colour oklch(0.55 0.13 hue)', wrong: 'a hand-written colour formula (the hue is data, the formula is not a token)', rule: 'provenance/color', fix: 'a token per node kind (--node-trigger, …)' },
  { screen: 'automations', file: 'screens/Automations.jsx', what: 'canvas inset style={{ margin: 24 }}', wrong: 'inline literal, on the ladder by value but not by token', rule: 'provenance (inline)', fix: 'm-6' },
];
