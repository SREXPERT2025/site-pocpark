
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getMainNav, getSolutionsByObject } from '@/app/lib/navigation';

export default function Footer() {
  const year = new Date().getFullYear();

    const main = getMainNav();
  const byObject = getSolutionsByObject();

  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="mb-4">
          <Image src="/logo_black.svg" alt="РОСПАРК" width={180} height={48} className="h-10 w-auto" />
          </div>
          <p className="text-sm text-neutral-600">
            Интеллектуальные парковочные системы под ключ
          </p>
          <p className="mt-4 text-sm text-neutral-500">
            © {year} РОСПАРК
          </p>
        </div>

        <div>
          <div className="mb-4 font-medium">Навигация</div>
          <ul className="space-y-2">
            {main.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-neutral-600 hover:text-neutral-900">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-4 font-medium">Решения</div>
          <ul className="space-y-2">
            {byObject.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-neutral-600 hover:text-neutral-900">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-4 font-medium">Контакты</div>
          <p className="text-sm text-neutral-600">
            info@rospark.ru
          </p>
        </div>
      </div>
    </footer>
  );
}
