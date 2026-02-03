import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from 'sonner';

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
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
