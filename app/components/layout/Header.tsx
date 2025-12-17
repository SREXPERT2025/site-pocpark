'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);

  // закрытие при клике вне меню
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // закрытие при переходе
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-[1100] bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="h-16 flex items-center justify-between">

            {/* LOGO */}
            <Link href="/" className="text-2xl font-extrabold text-slate-900">
              РОСПАРК
            </Link>

            {/* NAV */}
            <nav className="flex items-center gap-8 text-slate-700 font-medium">

              {/* РЕШЕНИЯ */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setOpen(v => !v)}
                  className="flex items-center gap-1 hover:text-slate-900"
                >
                  Решения
                  <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
                </button>

                {open && (
                  <div className="absolute left-0 top-full mt-3 w-[340px] rounded-xl bg-white border border-slate-200 shadow-xl p-2">
                    <MenuItem
                      href="/resheniya/dlya-rukovoditeley"
                      title="Для руководителей"
                      desc="Деньги, контроль, NOI"
                    />
                    <MenuItem
                      href="/resheniya/dlya-inzhenerov"
                      title="Для инженеров"
                      desc="Схемы, API, интеграции"
                    />
                    <MenuItem
                      href="/resheniya/dlya-sluzhby-bezopasnosti"
                      title="Для службы безопасности"
                      desc="Контроль проездов, архив"
                    />

                    <div className="my-2 border-t border-slate-100" />

                    <MenuItem
                      href="/resheniya/sravnenie-podhodov"
                      title="Сравнение подходов"
                      desc="Аренда vs коробка vs под ключ"
                      accent
                    />
                  </div>
                )}
              </div>

              <Link href="/vozmozhnosti" className="hover:text-slate-900">
                Возможности
              </Link>

              <Link href="/oborudovanie" className="hover:text-slate-900">
                Оборудование
              </Link>

              <Link href="/tipovye-komplekty" className="hover:text-slate-900">
                Типовые комплекты
              </Link>

              <Link href="/keysy" className="hover:text-slate-900">
                Кейсы
              </Link>
            </nav>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <a href="tel:+74993212040" className="text-sm text-slate-600">
                +7 (499) 321-20-40
              </a>
              <Link
                href="/contacts"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              >
                Получить КП
              </Link>
            </div>

          </div>
        </div>
      </header>

      {/* ОТСТУП ПОД FIXED HEADER */}
      <div className="h-16" />
    </>
  );
}

function MenuItem({
  href,
  title,
  desc,
  accent,
}: {
  href: string;
  title: string;
  desc?: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block px-4 py-3 rounded-lg hover:bg-slate-100 ${
        accent ? 'bg-slate-50 font-semibold' : ''
      }`}
    >
      <div className="text-slate-900">{title}</div>
      {desc && <div className="text-sm text-slate-500">{desc}</div>}
    </Link>
  );
}
