import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Реестр лидов',
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

export default function LeadAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
