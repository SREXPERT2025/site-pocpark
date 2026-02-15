'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { clsx } from 'clsx';

import type { NavItem } from '@/app/config/navigation';

export default function MobileMenu({
  open,
  onClose,
  navItems,
}: {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
}) {
  const telegramUrl = process.env.NEXT_PUBLIC_TELEGRAM_CONTACT_URL;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <div
      className={clsx(
        'fixed inset-0 z-[1200] transition',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      aria-hidden={!open}
    >
      <div
        className={clsx(
          'absolute inset-0 bg-black/30 transition-opacity',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      <div
        className={clsx(
          'absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-bg-primary border-l border-border-primary p-6',
          'transition-transform',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Меню"
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-text-primary">Меню</div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-text-secondary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            aria-label="Закрыть меню"
          >
            ✕
          </button>
        </div>

        <nav className="mt-6">
          <div className="space-y-6">
            {navItems.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between">
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="text-sm font-semibold text-text-primary hover:text-text-primary"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <div className="text-sm font-semibold text-text-primary">{item.label}</div>
                  )}
                </div>

                {item.groups?.length ? (
                  <div className="mt-3 space-y-4">
                    {item.groups.map((group) => (
                      <div key={group.label}>
                        <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                          {group.label}
                        </div>
                        <ul className="mt-2 space-y-1">
                          {group.items.map((link) => (
                            <li key={link.href}>
                              <Link
                                href={link.href}
                                onClick={onClose}
                                className="block rounded-md px-3 py-2 text-sm text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                              >
                                <div className="font-medium">{link.label}</div>
                                {link.description ? (
                                  <div className="mt-0.5 text-xs text-text-secondary">{link.description}</div>
                                ) : null}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-border-primary pt-6">
            <Link
              href="/contacts"
              onClick={onClose}
              className="block w-full rounded-md bg-accent-primary px-4 py-3 text-center text-base font-medium text-white hover:bg-state-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              Получить коммерческое предложение
            </Link>
            <a
              href="tel:+74993212040"
              className="mt-3 block text-center text-sm text-text-secondary hover:text-text-primary"
            >
              +7 (499) 321-20-40
            </a>
            {telegramUrl ? (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-center text-sm font-semibold text-accent-primary hover:underline"
              >
                Telegram
              </a>
            ) : null}
          </div>
        </nav>
      </div>
    </div>
  );
}
