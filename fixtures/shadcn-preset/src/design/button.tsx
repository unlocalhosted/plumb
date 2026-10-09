import { cva as styles } from 'class-variance-authority';
const buttonVariants = styles('rounded-lg', {
  variants: { variant: { default: 'bg-black', destructive: 'bg-red-500', ghost: 'bg-transparent' }, size: { default: 'p-4', sm: 'p-2' } },
});
export function Button({ className, ...props }) { return <button className={buttonVariants({ className })} {...props} />; }
