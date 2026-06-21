import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-[42px] w-full rounded-md border border-line-strong bg-panel px-3 text-[13.5px] text-ink placeholder:text-ink-3',
        'shadow-[inset_0_1px_0_rgba(0,0,0,0.02)]',
        'transition-[border-color,box-shadow] duration-150',
        'focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
