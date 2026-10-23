// Relay's Input, TabsTrigger and Switch class lists, kept local for CLI regression.
export function Input({ className, type, ...props }) {
  return <input type={type} data-slot="input"
    className={cn('h-8 w-full min-w-0 rounded-md border border-input bg-card px-2.5 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50', className)} {...props} />;
}
export function TabsTrigger({ className, ...props }) {
  return <TabsPrimitive.Trigger data-slot="tabs-trigger"
    className={cn('inline-flex h-full items-center justify-center rounded-sm px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs', className)} {...props} />;
}
export function Switch({ className, ...props }) {
  return <SwitchPrimitive.Root data-slot="switch"
    className={cn('peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input', className)} {...props} />;
}
export const Replacements = () => <>
  <input className="outline-none focus:ring-2" />
  <input className="outline-none focus:outline-2" />
  <input className="outline-none border focus-visible:border-ring" />
  <input className="focus:outline-none border focus:border-ring" />
  <input className="outline-none focus-visible:border-2 focus-visible:border-solid" />
  <input className="outline-none border border-transparent focus-visible:border-ring" />
</>;
export const Missing = () => <>
  <input className="focus:outline-none" />
  <input className="outline-none border focus-visible:border-transparent" />
  <input className="outline-none focus-visible:border-ring" />
  <input className="outline-none border-0 focus-visible:border-ring" />
  <input className="outline-none border border-none focus-visible:border-ring" />
  <input className="outline-none border md:focus-visible:border-ring" />
  <input className="outline-none border hover:focus-visible:border-ring" />
  <input className={cn('outline-none border', ready && 'focus-visible:border-ring')} />
  <input className="outline-none" /><input className="border focus-visible:border-ring" />
  <input className="outline-none border before:focus-visible:border-ring" />
  <input className="outline-none border-transparent focus-visible:border-2" />
  <input className="outline-none before:border focus-visible:border-ring" />
</>;
