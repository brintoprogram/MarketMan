import * as React from 'react';
import { cn } from '@/lib/utils';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white px-4 py-2 pr-9 text-sm shadow-inner-soft transition focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15 disabled:cursor-not-allowed disabled:opacity-50',
        'bg-[url("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20viewBox%3D%270%200%2020%2020%27%20fill%3D%27%2371717a%27%3E%3Cpath%20fill-rule%3D%27evenodd%27%20d%3D%27M5.23%207.21a.75.75%200%2001.06%201.06l4.25%204.25a.75.75%200%2001-1.06%200l-4.25-4.25a.75.75%200%201.06-1.06z%27%20clip-rule%3D%27evenodd%27/%3E%3Cpath%20fill-rule%3D%27evenodd%27%20d%3D%27M14.77%207.21a.75.75%200%2010-1.06%201.06l-4.25%204.25a.75.75%200%20001.06%200l4.25-4.25a.75.75%200%2000-1.06-1.06z%27%20clip-rule%3D%27evenodd%27/%3E%3C/svg%3E")] bg-[length:18px_18px] bg-[position:right_0.75rem_center] bg-no-repeat',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';
