import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { getThemeBootstrapScript } from '@/lib/app-theme';

export const metadata: Metadata = {
  title: 'AUDAX — Gestion Stratégique des Audiences',
  description: 'Plateforme de gestion stratégique des audiences — Cabinet du Chef EMG, FARDC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="tactical" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }} />
      </head>
      <body className="antialiased bg-carbon-950 text-cream" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
