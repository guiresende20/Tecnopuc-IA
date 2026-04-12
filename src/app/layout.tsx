import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Assistente TecnoPUC',
  description:
    'Assistente virtual do TecnoPUC — Parque Científico e Tecnológico da PUCRS. Tire suas dúvidas sobre o parque, empresas residentes, laboratórios e serviços.',
  keywords: ['TecnoPUC', 'PUCRS', 'Parque Tecnológico', 'Inovação', 'Porto Alegre'],
  openGraph: {
    title: 'Assistente TecnoPUC',
    description: 'Assistente virtual inteligente do TecnoPUC',
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
