'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

import MobileMenu from '@/app/components/layout/MobileMenu';
import { navigation, type NavItem } from '@/app/config/navigation';

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Закрываем мобильное меню при переходе по ссылкам
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[1100]">
        {/* TOP BAR */}
        <div className="bg-black text-white">
          <div className="mx-auto max-w-[1088px] px-4 sm:px-6">
            <div className="h-14 flex items-center justify-between">
              {/* LOGO */}
              <Link href="/" className="inline-flex items-center">
  <Image
    src="/logo.svg"
    alt="РОСПАРК"
    width={180}
    height={40}
    priority
    className="h-[20px] w-auto object-contain"
  />
</Link>


              {/* RIGHT SIDE (desktop) */}
              <div className="hidden lg:flex items-center gap-6">
                <a href="tel:+74993212040" className="text-sm text-white/90 hover:text-white">
                  +7 (499) 321-20-40
                </a>
                <Link
                  href="/contacts"
                  className="h-10 inline-flex items-center justify-center rounded-lg bg-accent-primary px-5 text-base font-medium text-white hover:bg-state-hover transition"
                >
                  Получить коммерческое предложение
                </Link>
              </div>

              {/* MOBILE TOGGLE */}
              <div className="flex items-center gap-3 lg:hidden">
                <a href="tel:+74993212040" className="text-sm text-white/90">
                  +7 (499) 321-20-40
                </a>
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="inline-flex items-center justify-center rounded-md border border-white/20 bg-white/5 p-2 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                  aria-label="Открыть меню"
                >
                  ☰
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MENU BAR */}
        <div className="bg-white border-b border-[#E6E6E6]">
          <div className="mx-auto max-w-[1088px] px-4 sm:px-6">
            {/* Высота контейнера меню 30px */}
            <div className="h-[34px] flex items-center justify-center">
              <div className="hidden lg:flex items-center w-full">
                {/* Шрифт 15px */}
                <nav className="flex w-full items-center justify-between text-[15px] leading-[22px] font-medium text-[#0B1220]">
                  {navigation.map((item) => (
                    <div key={item.label} className="flex-1 flex justify-center">
                      <DesktopNavItem item={item} />
                    </div>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ОТСТУП ПОД FIXED HEADER */}
      <div className="h-20" />

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} navItems={navigation} />
    </>
  );
}

// Новый компонент пункта меню (Hover через CSS)
function DesktopNavItem({ item }: { item: NavItem }) {
  const hasDropdown = Boolean(item.groups?.length);

  // Если нет выпадающего меню — просто ссылка
  if (!hasDropdown) {
    return (
      <Link
        href={item.href ?? '#'}
        className="h-[34px] inline-flex items-center text-[15px] hover:text-text-primary transition-colors"
      >
        {item.label}
      </Link>
    );
  }

  // Если есть выпадающее меню — Hover логика
  return (
    <div className="relative group h-[34px]">
      {/* ТРИГГЕР: Единая зона (Слово + Стрелка) */}
      <div className="flex items-center gap-1 h-[34px] cursor-pointer">
        <Link
          href={item.href ?? '#'}
          className="inline-flex items-center h-[34px] text-[15px] hover:text-text-primary transition-colors"
        >
          {item.label}
        </Link>

        {/* Стрелка (декоративная) */}
        <span
          className="inline-flex items-center h-[34px] text-text-secondary group-hover:text-text-primary transition-colors"
          aria-hidden="true"
        >
          ▾
        </span>
      </div>

      {/* DROPDOWN (Появляется при group-hover) */}
      <div
        className="
          absolute left-0 top-full
          mt-1
          w-[720px]
          rounded-md
          bg-bg-primary
          border border-border-primary
          shadow-md
          p-4
          hidden
          group-hover:block
          z-50
        "
      >
        {/* Невидимый мостик, чтобы меню не закрывалось при микро-движениях мыши */}
        <div className="absolute -top-2 left-0 w-full h-2 bg-transparent" />
        
        <div className="grid grid-cols-2 gap-6">
          {item.groups?.map((group) => (
            <div key={group.label}>
              <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                {group.label}
              </div>
              <div className="mt-3 space-y-1">
                {group.items.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block rounded-md px-3 py-3 hover:bg-bg-secondary transition-colors"
                  >
                    <div className="text-sm font-semibold text-text-primary">
                      {link.label}
                    </div>
                    {link.description ? (
                      <div className="mt-0.5 text-xs text-text-secondary">
                        {link.description}
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
