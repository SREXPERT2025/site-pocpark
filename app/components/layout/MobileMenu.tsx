'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type RefObject } from 'react';

import type { NavItem } from '@/app/config/navigation';

export default function MobileMenu({
  id,
  open,
  onClose,
  navItems,
  triggerRef,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
  triggerRef: RefObject<HTMLButtonElement>;
}) {
  const telegramUrl = process.env.NEXT_PUBLIC_TELEGRAM_CONTACT_URL;
  const [openSections, setOpenSections] = useState<string[]>(['Решения']);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = `${id}-title`;

  function toggleSection(label: string) {
    setOpenSections((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label]
    );
  }

  useEffect(() => {
    if (!open) return;

    const overlay = overlayRef.current;
    const dialog = dialogRef.current;
    if (!overlay || !dialog) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const triggerElement = triggerRef.current;
    const previousBodyOverflow = document.body.style.overflow;

    let overlayRoot: HTMLElement = overlay;
    while (overlayRoot.parentElement && overlayRoot.parentElement !== document.body) {
      overlayRoot = overlayRoot.parentElement;
    }

    const backgroundElements = Array.from(document.body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement)
      .filter(
        (element) =>
          element !== overlayRoot && !['SCRIPT', 'STYLE', 'LINK'].includes(element.tagName)
      );
    const backgroundState = backgroundElements.map((element) => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute('aria-hidden'),
    }));

    document.body.style.overflow = 'hidden';
    backgroundElements.forEach((element) => {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    });

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const getFocusableElements = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === firstElement || !dialog.contains(activeElement))) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      backgroundState.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', ariaHidden);
        }
      });

      const focusTarget = triggerElement ?? previouslyFocused;
      if (focusTarget && document.contains(focusTarget)) {
        focusTarget.focus();
      }
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1200] overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        id={id}
        className="absolute right-0 top-0 flex h-full w-80 max-w-[85vw] flex-col overflow-hidden border-l border-border-primary bg-bg-primary p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between">
          <div id={titleId} className="text-sm font-semibold text-text-primary">Меню</div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-text-secondary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            aria-label="Закрыть меню"
          >
            ✕
          </button>
        </div>

        <nav className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <div className="space-y-6 pb-6">
            {navItems.map((item, index) => {
              const hasGroups = Boolean(item.groups?.length);
              const expanded = openSections.includes(item.label);
              const panelId = `mobile-menu-section-${index}`;

              return (
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

                  {hasGroups ? (
                    <button
                      type="button"
                      onClick={() => toggleSection(item.label)}
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      className="ml-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                    >
                      <span aria-hidden="true">{expanded ? '−' : '+'}</span>
                      <span className="sr-only">
                        {expanded ? 'Свернуть' : 'Развернуть'} раздел {item.label}
                      </span>
                    </button>
                  ) : null}
                </div>

                {hasGroups ? (
                  <div id={panelId} className="mt-3 space-y-4" hidden={!expanded}>
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
                                className="block min-w-0 rounded-md px-3 py-2 text-sm text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                              >
                                <div className="break-words font-medium">{link.label}</div>
                                {link.description ? (
                                  <div className="mt-0.5 break-words text-xs text-text-secondary">{link.description}</div>
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
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-border-primary bg-bg-primary pt-4">
          <Link
            href="/quiz?source=kp"
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
      </div>
    </div>
  );
}
