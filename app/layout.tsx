import type { Metadata } from 'next';
import './globals.css';
import { Inter, JetBrains_Mono } from 'next/font/google';

import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import PageTransition from '@/app/components/animations/PageTransition';
import OrganizationJsonLd from '@/app/components/content/OrganizationJsonLd';
import CookieBanner from '@/app/components/legal/CookieBanner';
import { getMetadataBase } from '@/app/config/site-url';


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
  metadataBase: getMetadataBase(),
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
      <body className="min-h-screen overflow-x-hidden bg-bg-primary text-text-primary">
        <OrganizationJsonLd />

        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[1300] -translate-y-[200%] rounded-md bg-white px-4 py-3 font-semibold text-slate-950 shadow-lg focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-accent-primary"
        >
          Перейти к основному содержанию
        </a>

        {/* Header всегда виден */}
        <Header />

        {/* Анимация только для контента */}
        <PageTransition>
  {children}
</PageTransition>


        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
