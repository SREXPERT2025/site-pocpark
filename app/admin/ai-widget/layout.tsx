import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Диалоги AI-виджета',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
    },
  },
};

export default function AiWidgetAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
