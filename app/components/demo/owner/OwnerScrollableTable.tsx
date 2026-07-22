'use client';

import { useId, type KeyboardEvent, type ReactNode } from 'react';

type OwnerScrollableTableProps = {
  label: string;
  children: ReactNode;
};

export default function OwnerScrollableTable({ label, children }: OwnerScrollableTableProps) {
  const hintId = useId();

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.currentTarget.scrollBy({
      left: event.key === 'ArrowRight' ? 96 : -96,
      behavior: 'auto',
    });
  }

  return (
    <>
      <p id={hintId} className="hidden items-center gap-2 border-y border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 lg:flex">
        <span aria-hidden="true" className="font-mono text-blue-700">← →</span>
        Таблица прокручивается по горизонтали. Полная детализация доступна по кнопке «Открыть».
      </p>
      <div
        role="region"
        aria-label={label}
        aria-describedby={hintId}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="hidden overflow-x-auto overscroll-x-contain lg:block [scrollbar-color:theme(colors.slate.400)_theme(colors.slate.100)] [scrollbar-width:thin] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        {children}
      </div>
    </>
  );
}
