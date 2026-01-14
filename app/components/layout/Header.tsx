'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import MobileMenu from '@/app/components/layout/MobileMenu';
import { navigation, type NavItem } from '@/app/config/navigation';

export default function Header() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);

  // закрытие при клике вне навигации
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // закрытие при переходе по роуту
  useEffect(() => {
    setOpenDropdown(null);
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[1100]">
        {/* TOP BAR (как в Figma) */}
        <div className="bg-black text-white">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
            <div className="h-14 flex items-center justify-between">
              {/* LOGO */}
              <Link href="/" className="text-lg sm:text-xl font-extrabold tracking-wide text-white">
                РОСПАРК
              </Link>

              {/* RIGHT SIDE (desktop) */}
              <div className="hidden lg:flex items-center gap-6">
                <a href="tel:+74993212040" className="text-sm text-white/90 hover:text-white">
                  +7 (499) 321-20-40
                </a>
                <Link
                  href="/contacts"
                  className="h-10 inline-flex items-center justify-center rounded-lg bg-accent-primary px-5 text-[14px] font-semibold text-white hover:bg-state-hover transition"
                >
                  Получить коммерческое предложение
                </Link>
              </div>

              {/* MOBILE */}
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

        {/* MENU BAR (перенесли существующее меню ниже) */}
        <div className="bg-white border-b border-[#E6E6E6]">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
            <div className="h-6 flex items-center justify-center">
              <div ref={navRef} className="hidden lg:flex items-center">
                <nav className="flex items-center gap-[70px] text-[13px] leading-5 text-[#0B1220]">
                  {navigation.map((item) => (
                    <DesktopNavItem
                      key={item.label}
                      item={item}
                      open={openDropdown === item.label}
                      onToggle={() => setOpenDropdown((cur) => (cur === item.label ? null : item.label))}
                      onClose={() => setOpenDropdown(null)}
                    />
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ОТСТУП ПОД FIXED HEADER (56px + 24px = 80px) */}
      <div className="h-20" />

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} navItems={navigation} />
    </>
  );
}

function DesktopNavItem({
  item,
  open,
  onToggle,
  onClose,
}: {
  item: NavItem;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const hasDropdown = Boolean(item.groups?.length);

  if (!hasDropdown) {
    return (
      <Link href={item.href ?? '#'} className="hover:text-text-primary">
        {item.label}
      </Link>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        {item.href ? (
          <Link href={item.href} className="hover:text-text-primary">
            {item.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="hover:text-text-primary"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            {item.label}
          </button>
        )}

        <button
          type="button"
          onClick={onToggle}
          className="rounded-sm px-1 text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          aria-label={`Открыть меню: ${item.label}`}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className={`inline-block transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </button>
      </div>

      {open && item.groups?.length ? (
        <div
          className="absolute left-0 top-full mt-3 w-[720px] rounded-md bg-bg-primary border border-border-primary shadow-md p-4"
          role="menu"
          aria-label={item.label}
        >
          <div className="grid grid-cols-2 gap-6">
            {item.groups.map((group) => (
              <div key={group.label}>
                <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  {group.label}
                </div>
                <div className="mt-3 space-y-1">
                  {group.items.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block rounded-md px-3 py-3 hover:bg-bg-secondary"
                      onClick={onClose}
                    >
                      <div className="text-sm font-semibold text-text-primary">{link.label}</div>
                      {link.description ? (
                        <div className="mt-0.5 text-xs text-text-secondary">{link.description}</div>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
