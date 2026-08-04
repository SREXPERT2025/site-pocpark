'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { getMainNav, getSolutionsFooterLinks } from '@/app/lib/navigation';
import { ANALYTICS_CONSENT_OPEN_EVENT } from '@/app/lib/analytics-consent';
import LandingEntryLink from '@/app/components/landing/LandingEntryLink';

export default function Footer() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  const main = getMainNav();
  const solutions = getSolutionsFooterLinks();

  if (pathname.startsWith('/admin') || pathname === '/v4-1') return null;

  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-[1088px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-5">
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
          <div className="mb-4 font-medium">Подбор решения</div>
          <ul className="space-y-2">
            <li>
              <LandingEntryLink
                href="/parkovka"
                sourceSection="footer_solution"
                targetVariant="parkovka"
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                Организовать парковку
              </LandingEntryLink>
            </li>
            <li>
              <LandingEntryLink
                href="/parkovka-pod-klyuch"
                sourceSection="footer_solution"
                targetVariant="puzzle2"
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                Парковка под ключ
              </LandingEntryLink>
            </li>
            <li>
              <Link href="/quiz?source=footer-solution" className="text-sm text-neutral-600 hover:text-neutral-900">
                Рассчитать проект
              </Link>
            </li>
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
            <li>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new Event(ANALYTICS_CONSENT_OPEN_EVENT),
                  );
                }}
                className="text-left text-sm text-neutral-600 hover:text-neutral-900"
              >
                Настройки cookie
              </button>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
