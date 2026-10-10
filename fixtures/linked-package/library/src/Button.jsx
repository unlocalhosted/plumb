import React from 'react';
import { Button } from '@base-ui/react/button';
function cn(...values) { return values.filter(Boolean).join(' '); }
export function LibButton({ className = '', ...props }) {
  return <Button {...props} className={cn('gap-[17px]', className)} />;
}
