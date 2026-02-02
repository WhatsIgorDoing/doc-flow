import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Doc Flow - Sistema de Gestão de Documentos',
  description: 'Plataforma moderna para validação e gestão de documentos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
