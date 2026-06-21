import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // base: tipografia, foco visível, transição contida, sem bounce
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13.5px] font-medium tracking-tight transition-[background,border-color,box-shadow,transform,filter] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 active:translate-y-[1px]',
  {
    variants: {
      variant: {
        // CTA primário: verde brand com sombra colorida discreta
        brand:
          'bg-brand text-white shadow-[0_2px_10px_rgba(16,185,129,0.32)] hover:brightness-110',
        // CTA escuro (alternativa neutra ao brand)
        default:
          'bg-ink text-bg shadow-card hover:opacity-90',
        // Mais comum: superfície + hairline + sombra leve
        outline:
          'bg-panel text-ink border border-line-strong shadow-card hover:bg-brand-soft hover:border-brand hover:text-brand-ink',
        // Ghost: transparente, hover em brand-soft
        ghost:
          'text-ink-2 hover:bg-brand-soft hover:text-brand-ink',
        // Erro
        destructive:
          'bg-down text-white shadow-[0_2px_10px_rgba(225,29,72,0.28)] hover:brightness-110',
        // Link puro
        link:
          'text-brand-ink underline-offset-4 hover:underline px-0'
      },
      size: {
        // Brief: 42 default, 34 sm
        default: 'h-[42px] px-4',
        sm:      'h-[34px] px-3 text-[12px]',
        lg:      'h-12 px-6 text-[14px]',
        icon:    'h-9 w-9'
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
