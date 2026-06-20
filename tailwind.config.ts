import type { Config } from 'tailwindcss';

/**
 * Tokens vivem em CSS vars (globals.css). Aqui mapeamos pro Tailwind
 * pra que classes utility funcionem (bg-panel, text-ink-2, border-line, etc).
 *
 * Cores semânticas:
 *   bg           — fundo da página
 *   panel/panel-2 — superfícies em camada
 *   ink/ink-2/ink-3 — texto primário/secundário/terciário
 *   line/line-strong — hairlines
 *   brand/brand-ink/brand-soft — marca + CTA + estado de alta
 *   up/up-soft, down/down-soft — direção (alta/baixa)
 *
 * Categorias de ativo: usar como ponto colorido, não como pill.
 *   commodity #F59E0B · moeda #0EA5E9 · índice/ação #8B5CF6 · cripto #D946EF
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      colors: {
        // Surfaces
        bg: 'var(--bg)',
        panel: {
          DEFAULT: 'var(--panel)',
          2: 'var(--panel-2)'
        },
        // Ink (texto)
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)'
        },
        // Hairlines
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)'
        },
        // Marca (CTA + alta)
        brand: {
          DEFAULT: 'var(--brand)',
          ink: 'var(--brand-ink)',
          soft: 'var(--brand-soft)',
          // === LEGACY palette — manter durante a migração pra não quebrar
          // componentes ainda não migrados. Será removida no passo 2
          // (substituição dos primitivos UI).
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
        },
        // Direção (alta/baixa)
        up: {
          DEFAULT: 'var(--up)',
          soft: 'var(--up-soft)'
        },
        down: {
          DEFAULT: 'var(--down)',
          soft: 'var(--down-soft)'
        },
        // Categorias de ativo (ponto colorido)
        cat: {
          commodity: '#F59E0B',
          currency:  '#0EA5E9',
          index:     '#8B5CF6',
          stock:     '#8B5CF6',
          crypto:    '#D946EF'
        }
      },
      borderRadius: {
        // Brief: input/botão 8-10, card 12-15, pill 999px
        sm: '8px',
        DEFAULT: '10px',
        md: '10px',
        lg: '12px',
        xl: '15px',
        full: '9999px'
      },
      boxShadow: {
        // Sombra única, quase imperceptível — o hairline faz o trabalho
        card: 'var(--shadow)'
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-up':         'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-up-delay-1': 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.06s both',
        'fade-up-delay-2': 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.12s both',
        'fade-up-delay-3': 'fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both'
      }
    }
  },
  plugins: []
};

export default config;
