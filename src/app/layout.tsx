import type { Metadata } from 'next';
import { Hanken_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-sans'
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono'
});

export const metadata: Metadata = {
  title: 'MarketMan — Alertas de cotação no WhatsApp',
  description:
    'Café arábica, dólar, commodities e futuros. Receba um aviso no WhatsApp quando o mercado mexer com o seu bolso.',
  openGraph: {
    title: 'MarketMan',
    description: 'Alertas de cotação no WhatsApp em tempo real.',
    type: 'website'
  }
};

// Anti-flash: aplica a classe `dark` no <html> ANTES do React hidratar,
// lendo do localStorage e fallback pro prefers-color-scheme.
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('marketman-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${hanken.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
