import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MarketMan — Alertas de cotação no WhatsApp',
  description:
    'Acompanhe café arábica, dólar, commodities e futuros. Receba alertas no WhatsApp quando o preço variar acima do seu limite.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
