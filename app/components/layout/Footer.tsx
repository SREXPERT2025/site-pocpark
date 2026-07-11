'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getMainNav, getSolutionsFooterLinks } from '@/app/lib/navigation';

export default function Footer() {
  const year = new Date().getFullYear();

  const main = getMainNav();
  const solutions = getSolutionsFooterLinks();

  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-[1088px] px-4 sm:px-6 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="mb-4">
            <Image
              src="/logo_black.svg"
              alt="РОСПАРК"
              width={180}
              height={19}
              className="h-auto w-[180px] max-w-full"
            />
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
            {solutions.map((item) => (
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
            <a href="mailto:is@srexpert.su" className="hover:underline">
              is@srexpert.su
            </a>
          </p>

          <p className="mt-2 text-sm text-neutral-600">
            <a href="tel:+74993212040" className="hover:underline">
              +7 (499) 321-20-40
            </a>
          </p>

          <ul className="mt-4 space-y-2">
            <li>
              <Link href="/o-kompanii" className="text-sm text-neutral-600 hover:text-neutral-900">
                О компании
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-sm text-neutral-600 hover:text-neutral-900">
                Политика обработки персональных данных
              </Link>
            </li>
            <li>
              <Link
                href="/soglasie-na-obrabotku-personalnyh-dannyh"
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                Согласие на обработку персональных данных
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
