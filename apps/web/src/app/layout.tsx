import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AUDAX — Gestion Stratégique des Audiences',
  description: 'Plateforme de gestion stratégique des audiences — Cabinet du Chef EMG, FARDC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased bg-carbon-950 text-cream" suppressHydrationWarning>{children}</body>
    </html>
  );
}
