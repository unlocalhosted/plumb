import { cva } from 'class-variance-authority';
const buttonVariants = cva('ds-button', {
  variants: { tone: { calm: 'bg-ds-canvas', danger: 'bg-ds-danger' }, size: { compact: 'p-2', roomy: 'p-4' } },
});
export function Button({ className, ...props }) { return <button className={buttonVariants({ className })} {...props} />; }
export function Textarea({ className, ...props }) { return <textarea className={`ds-field ${className}`} {...props} />; }
