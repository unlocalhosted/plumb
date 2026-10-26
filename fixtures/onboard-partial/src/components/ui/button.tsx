import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

const button = cva('inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground',
      outline: 'border border-border bg-background text-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Button({ variant, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>) {
  return <button className={button({ variant })} {...props} />;
}
