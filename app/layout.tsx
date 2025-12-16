import type { Metadata } from 'next';
import './globals.css';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Header from '@/app/components/layout/Header';
import Footer from '@/app/components/layout/Footer';
import PageTransition from '@/app/components/animations/PageTransition';

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
  title: {
    default: 'РОСПАРК — автоматизация парковок нового поколения',
    template: '%s — РОСПАРК',
  },
  description: 'Инженерные решения для автоматизации парковок: оборудование, проекты, внедрение.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-bg-primary text-text-primary">
        {/* ❌ Header вне PageTransition */}
        <Header />

        {/* ✅ Анимация ТОЛЬКО для контента */}
        <PageTransition>
          <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </PageTransition>

        <Footer />
      </body>
    </html>
  );
}