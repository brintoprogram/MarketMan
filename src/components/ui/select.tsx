import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * <select> nativo estilizado pra casar com Input.
 * Chevron via background-image SVG inline (currentColor adapta light/dark).
 */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-[42px] w-full appearance-none rounded-md border border-line-strong bg-panel px-3 pr-9 text-[13.5px] text-ink',
        'shadow-[inset_0_1px_0_rgba(0,0,0,0.02)]',
        'transition-[border-color,box-shadow] duration-150',
        'focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // chevron lucide (chevron-down) sutil
        'bg-[url("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2716%27%20height%3D%2716%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%23a1a1aa%27%20stroke-width%3D%272%27%20stroke-linecap%3D%27round%27%20stroke-linejoin%3D%27round%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27/%3E%3C/svg%3E")] bg-[length:16px_16px] bg-[position:right_0.75rem_center] bg-no-repeat',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';
