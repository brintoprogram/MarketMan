import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
