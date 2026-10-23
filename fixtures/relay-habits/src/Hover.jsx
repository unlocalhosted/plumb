// Class lists copied from Relay's Button, TableRow, Sidebar and issue-card action.
const variants = {
  default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
};
export function Button({ variant, className }) {
  return <button className={cn('inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50', variants[variant], className)} />;
}
export function TableRow({ className }) {
  return <tr className={cn('border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)} />;
}
export function SidebarItem() { return <a className="hover:bg-sidebar-accent hover:text-sidebar-foreground" />; }
export function CardAction() { return <span className="group-hover:opacity-100" />; }
