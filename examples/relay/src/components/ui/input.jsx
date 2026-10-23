import { cn } from '@/lib/utils';

function Input({ className, type, ...props }) {
  return <input type={type} data-slot="input"
    className={cn('h-8 w-full min-w-0 rounded-md border border-input bg-card px-2.5 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50', className)} {...props} />;
}

export { Input };
