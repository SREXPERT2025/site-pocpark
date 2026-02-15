import type { Metadata } from 'next';
import './globals.css';
import { Inter, JetBrains_Mono } from 'next/font/google';

import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import PageTransition from '@/app/components/animations/PageTransition';

// metadataBase нужен Next.js для корректного формирования абсолютных URL
// (OpenGraph/Twitter/каноникал). В проде задаётся через env.
// Важно: NEXT_PUBLIC_SITE_URL должен быть полным URL, например:
// https://роспарк.рф или https://rospark.rf
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
let METADATA_BASE: URL;
try {
  METADATA_BASE = new URL(SITE_URL);
} catch {
  METADATA_BASE = new URL('http://localhost:3000');
}


const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: METADATA_BASE,
  title: {
    default: 'РОСПАРК — автоматизация парковок нового поколения',
    template: '%s — РОСПАРК',
  },
  description:
    'Инженерные решения для автоматизации парковок: оборудование, проекты, внедрение.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-bg-primary text-text-primary">
        {/* Header всегда виден */}
        <Header />

        {/* Анимация только для контента */}
        <PageTransition>
  {children}
</PageTransition>


        <Footer />
      </body>
    </html>
  );
}
