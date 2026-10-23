import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

function Dialog(props) { return <DialogPrimitive.Root data-slot="dialog" {...props} />; }
function DialogTrigger(props) { return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />; }
function DialogClose(props) { return <DialogPrimitive.Close data-slot="dialog-close" {...props} />; }
function DialogContent({ className, children, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay data-slot="dialog-overlay" className="fixed inset-0 z-50 bg-foreground/30" />
      <DialogPrimitive.Content data-slot="dialog-content"
        className={cn('fixed top-1/2 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg border bg-background p-5 shadow-lg outline-none', className)} {...props}>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
function DialogHeader({ className, ...props }) { return <div data-slot="dialog-header" className={cn('flex flex-col gap-1', className)} {...props} />; }
function DialogFooter({ className, ...props }) { return <div data-slot="dialog-footer" className={cn('flex justify-end gap-2', className)} {...props} />; }
function DialogTitle({ className, ...props }) { return <DialogPrimitive.Title data-slot="dialog-title" className={cn('text-lg font-semibold', className)} {...props} />; }
function DialogDescription({ className, ...props }) { return <DialogPrimitive.Description data-slot="dialog-description" className={cn('text-sm text-muted-foreground', className)} {...props} />; }

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
