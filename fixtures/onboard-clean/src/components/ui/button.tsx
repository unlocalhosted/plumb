import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

const button = cva('inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      outline: 'border border-border bg-background text-foreground',
      ghost: 'bg-muted text-foreground',
    },
    size: { default: 'px-4 py-2', sm: 'px-3 py-1 text-xs' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

export function Button({ variant, size, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>) {
  return <button className={button({ variant, size })} {...props} />;
}
