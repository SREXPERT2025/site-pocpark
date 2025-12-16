'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import { navigation } from '@/config/navigation';
import { siteConfig } from '@/config/site';

type NavItem = {
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
};

function ChevronDownIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function Header() {
  const pathname = usePathname();

  const items = useMemo(() => navigation as NavItem[], []);

  const [openKey, setOpenKey] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  // Закрывать меню при переходе по страницам
  useEffect(() => {
    setOpenKey(null);
  }, [pathname]);

  // Закрывать меню по клику вне хедера
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!headerRef.current) return;
      const target = e.target as Node;
      if (!headerRef.current.contains(target)) {
        setOpenKey(null);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  // Закрывать по ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenKey(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    // z-[1000] — чтобы framer-motion/контент НИКОГДА не перекрывал меню
    <header
      ref={headerRef as any}
      className="sticky top-0 z-[1000] border-b bg-white/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-10">
          {/* LOGO */}
          <Link href="/" className="text-lg font-bold text-slate-900">
            РОСПАРК
          </Link>

          {/* NAV */}
          <nav className="hidden items-center gap-7 md:flex">
            {items.map((item) => {
              const hasChildren = !!item.children?.length;

              if (!hasChildren) {
                return (
                  <Link
                    key={item.label}
                    href={item.href || '#'}
                    className="text-sm font-medium text-slate-700 hover:text-slate-900"
                  >
                    {item.label}
                  </Link>
                );
              }

              const isOpen = openKey === item.label;

              return (
                <div key={item.label} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenKey(isOpen ? null : item.label)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                  >
                    {item.label}
                    <ChevronDownIcon />
                  </button>

                  {isOpen && (
                    <div
                      className="absolute left-0 top-full mt-2 w-72 rounded-xl border bg-white shadow-lg"
                      style={{ zIndex: 2000 }}
                      role="menu"
                    >
                      <ul className="p-2">
                        {item.children!.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                              role="menuitem"
                              onClick={() => setOpenKey(null)}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          {/* CONTACTS */}
          <div className="hidden text-right text-sm lg:block">
            <a href={siteConfig.phoneHref} className="font-semibold text-slate-900">
              {siteConfig.phone}
            </a>
            <br />
            <a
              href={siteConfig.emailHref}
              className="text-slate-500 hover:text-slate-700"
            >
              {siteConfig.email}
            </a>
          </div>

          {/* CTA */}
          <Link
            href="/quiz"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Получить КП
          </Link>
        </div>
      </div>
    </header>
  );
}
