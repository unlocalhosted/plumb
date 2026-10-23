import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

function Sheet(props) { return <SheetPrimitive.Root data-slot="sheet" {...props} />; }
function SheetClose(props) { return <SheetPrimitive.Close data-slot="sheet-close" {...props} />; }
function SheetContent({ className, children, ...props }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay data-slot="sheet-overlay" className="fixed inset-0 z-50 bg-foreground/20" />
      <SheetPrimitive.Content data-slot="sheet-content"
        className={cn('fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-xl flex-col border-l bg-background shadow-lg outline-none', className)} {...props}>
        {children}
        <SheetPrimitive.Close className="absolute top-3 right-3 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none">
          <X className="size-4" /><span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
function SheetTitle({ className, ...props }) { return <SheetPrimitive.Title data-slot="sheet-title" className={cn('text-lg font-semibold', className)} {...props} />; }
function SheetDescription({ className, ...props }) { return <SheetPrimitive.Description data-slot="sheet-description" className={cn('text-sm text-muted-foreground', className)} {...props} />; }

export { Sheet, SheetClose, SheetContent, SheetTitle, SheetDescription };
