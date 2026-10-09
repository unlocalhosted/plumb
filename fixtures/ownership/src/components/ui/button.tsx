import { cva } from 'class-variance-authority';
const buttonVariants = cva('bg-brand rounded-lg', {
  variants: { variant: { default: '', destructive: '', outline: '' }, size: { default: '', sm: '', lg: '' } },
});
export function Button({ className, variant, size, ...props }: { className?: string; variant?: 'default' | 'destructive' | 'outline'; size?: 'default' | 'sm' | 'lg' }) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}
export const Surface = ({ className, ...props }: { className?: string }) => <div className={className} {...props} />;
