export function Badge({ label }: { label: string }) {
  return <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{label}</span>;
}
