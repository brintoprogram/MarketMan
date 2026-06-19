import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      colors: {
        brand: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22'
        }
      },
      boxShadow: {
        soft:    '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        lifted:  '0 4px 12px -2px rgb(0 0 0 / 0.06), 0 8px 24px -4px rgb(0 0 0 / 0.08)',
        elevated: '0 8px 32px -4px rgb(0 0 0 / 0.12), 0 16px 40px -8px rgb(0 0 0 / 0.10)',
        'glow-brand': '0 0 0 1px rgb(16 185 129 / 0.20), 0 8px 24px -4px rgb(16 185 129 / 0.25)',
        'inner-soft': 'inset 0 1px 2px 0 rgb(0 0 0 / 0.04)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'pulse-dot': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(16 185 129 / 0.55)' },
          '70%':      { boxShadow: '0 0 0 8px rgb(16 185 129 / 0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-up-delay-1': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both',
        'fade-up-delay-2': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.16s both',
        'fade-up-delay-3': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.24s both',
        'fade-in': 'fade-in 0.6s ease-out both',
        'pulse-dot': 'pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'spin-slow': 'spin-slow 12s linear infinite'
      },
      backgroundImage: {
        'grid-zinc': "linear-gradient(to right, rgb(0 0 0 / 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgb(0 0 0 / 0.04) 1px, transparent 1px)",
        'radial-fade': 'radial-gradient(ellipse 80% 60% at 50% 0%, rgb(16 185 129 / 0.10), transparent 70%)',
        'gradient-brand': 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
        'gradient-mesh': 'linear-gradient(135deg, #fafafa 0%, #ecfdf5 40%, #ffffff 100%)'
      },
      backgroundSize: {
        'grid-32': '32px 32px'
      }
    }
  },
  plugins: []
};

export default config;
