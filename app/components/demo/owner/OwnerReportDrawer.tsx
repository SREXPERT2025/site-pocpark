'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type OwnerReportDrawerProps = {
  open: boolean;
  eyebrow: string;
  title: string;
  description: string;
  returnFocusTo?: HTMLElement | null;
  children: ReactNode;
  onClose: () => void;
};

export default function OwnerReportDrawer({
  open,
  eyebrow,
  title,
  description,
  returnFocusTo,
  children,
  onClose,
}: OwnerReportDrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const previousActive = returnFocusTo ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const previousOverflow = document.body.style.overflow;
    const overlay = overlayRef.current;
    const backgroundState: Array<{ element: HTMLElement; inert: boolean; ariaHidden: string | null }> = [];

    document.body.style.overflow = 'hidden';
    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement) || child === overlay) continue;
      backgroundState.push({ element: child, inert: child.inert, ariaHidden: child.getAttribute('aria-hidden') });
      child.inert = true;
      child.setAttribute('aria-hidden', 'true');
    }

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      for (const item of backgroundState) {
        item.element.inert = item.inert;
        if (item.ariaHidden === null) item.element.removeAttribute('aria-hidden');
        else item.element.setAttribute('aria-hidden', item.ariaHidden);
      }
      window.requestAnimationFrame(() => {
        const target = returnFocusTo?.isConnected ? returnFocusTo : previousActive;
        target?.focus();
      });
    };
  }, [open, returnFocusTo]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1400] flex justify-end bg-slate-950/60 sm:p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-report-drawer-title"
        aria-describedby="owner-report-drawer-description"
        tabIndex={-1}
        className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-slate-950 px-5 py-5 text-white sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">{eyebrow}</p>
            <h2 id="owner-report-drawer-title" className="mt-1 break-words text-[1.4rem] font-bold leading-tight sm:text-[1.75rem]">{title}</h2>
            <p id="owner-report-drawer-description" className="mt-1 text-sm leading-5 text-slate-300">{description}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 text-slate-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label="Закрыть детализацию"
          >
            <X aria-hidden="true" size={21} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
