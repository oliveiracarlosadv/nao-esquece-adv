import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from '@/components/Providers';

const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: 'NÃO ESQUECE ADV — Nenhuma intimação passa despercebida.',
  description: 'Monitoramento automático de publicações jurídicas, intimações e licitações. Seus dados ficam no seu computador.',
  manifest: `${base}/manifest.webmanifest`,
  applicationName: 'Não Esquece Adv',
  icons: {
    icon: [{ url: `${base}/icon-192.png`, sizes: '192x192', type: 'image/png' }, { url: `${base}/logo.svg`, type: 'image/svg+xml' }],
    apple: [{ url: `${base}/apple-touch-icon.png`, sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: 'Não Esquece', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#090D16' },
  ],
};

// Aplica o tema antes da renderização para evitar "piscar".
const themeScript = `try{var t=localStorage.getItem('nea.theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
