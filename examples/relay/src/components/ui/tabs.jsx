import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

function Tabs({ className, ...props }) { return <TabsPrimitive.Root data-slot="tabs" className={cn('flex flex-col gap-4', className)} {...props} />; }
function TabsList({ className, ...props }) {
  return <TabsPrimitive.List data-slot="tabs-list" className={cn('inline-flex h-8 w-fit items-center rounded-md bg-muted p-0.5 text-muted-foreground', className)} {...props} />;
}
function TabsTrigger({ className, ...props }) {
  return <TabsPrimitive.Trigger data-slot="tabs-trigger"
    className={cn('inline-flex h-full items-center justify-center rounded-sm px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs', className)} {...props} />;
}
function TabsContent({ className, ...props }) { return <TabsPrimitive.Content data-slot="tabs-content" className={cn('outline-none', className)} {...props} />; }

export { Tabs, TabsList, TabsTrigger, TabsContent };
