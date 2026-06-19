import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-zinc-900 text-white shadow-soft hover:bg-zinc-800 hover:shadow-lifted',
        brand:
          'bg-gradient-brand text-white shadow-[0_4px_12px_-2px_rgb(16_185_129/0.35)] hover:shadow-glow-brand hover:brightness-110',
        outline:
          'border border-zinc-200 bg-white text-zinc-900 shadow-soft hover:border-zinc-300 hover:shadow-lifted hover:bg-zinc-50',
        ghost:
          'text-zinc-700 hover:bg-zinc-100',
        destructive:
          'bg-rose-600 text-white shadow-soft hover:bg-rose-700 hover:shadow-lifted',
        link:
          'text-brand-700 underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = 'Button';

export { buttonVariants };
